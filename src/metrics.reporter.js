const METRIC = require("moleculer").METRIC;
const BaseReporter = require("moleculer").MetricReporters.Base;
const _ = require("lodash");

class AppSignalReporter extends BaseReporter {

	/**
	 * Creates an instance of EventReporter.
	 * @param {Object} opts
	 * @memberof AppSignalReporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			appSignal: {
				active: true,
				name: "Moleculer project",
			}
		});

		this.appSignal = null;
	}

	/**
	 * Initialize reporter.
	 *
	 * @param {MetricRegistry} registry
	 * @memberof AppSignalReporter
	 */
	init(registry) {
		super.init(registry);

		try {
			const { Appsignal } = require("@appsignal/nodejs");

			this.appSignal = new Appsignal(this.opts.appSignal);
			this.meter = this.appSignal.metrics();

			this.processAllMetrics();

		} catch(err) {
			/* istanbul ignore next */
			this.broker.fatal("The '@appsignal/nodejs' package is missing! Please install it with 'npm install @appsignal/nodejs --save' command!", err, true);
		}
	}

	/**
	 * Process all metrics
	 * @memberof AppSignalReporter
	 */
	processAllMetrics() {
		const list = this.registry.list({
			types: this.opts.types,
			includes: this.opts.includes,
			excludes: this.opts.excludes,
		});

		list.forEach(metric => this.processMetric(metric));
	}

	/**
	 * Process the given metric.
     * 
	 * @param {BaseMetric} metric
     * @param {Number} lastValue
	 * @memberof AppSignalReporter
	 */
	processMetric(metric, lastValue) {
		if (!this.matchMetricName(metric.name)) return;

		metric.values.forEach(item => {
			switch(metric.type) {
			case METRIC.TYPE_COUNTER:
			case METRIC.TYPE_GAUGE: {
				this.meter.setGauge(metric.name, item.value, this.convertLabels(item.labels));
				if (item.rate != null)
					this.meter.setGauge(metric.name + ".rate", item.rate.rate, this.convertLabels(item.labels));
				break;
			}
			case METRIC.TYPE_HISTOGRAM: {
				if (item.rate != null) {
					this.meter.addDistributionValue(metric.name, lastValue || item.lastValue, this.convertLabels(item.labels));
					this.meter.setGauge(metric.name + ".rate", item.rate.rate, this.convertLabels(item.labels));
				}
				break;
			}
			}
		});
	}

	/**
     * Convert labels. Remove `null` label values.
     * 
     * @param {Object} itemLabels 
	 * @memberof AppSignalReporter
     */
	convertLabels(itemLabels) {
		const labels = Object.assign({}, this.defaultLabels || {}, itemLabels || {});
		const keys = Object.keys(labels);
		if (keys.length == 0)
			return null;

		return keys.reduce((res, key) => {
			const v = labels[key];
			if (v != null)
				res[key] = "" + v;
			return res;
		}, {});
	}


	/**
	 * Some metric has been changed.
	 *
	 * @param {BaseMetric} metric
     * @param {Number} value
	 * @memberof AppSignalReporter
	 */
	metricChanged(metric, value) {
		this.processMetric(metric, value);
	}
}

module.exports = AppSignalReporter;
