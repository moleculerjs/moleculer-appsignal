jest.mock("@appsignal/nodejs");
const { Appsignal } = require("@appsignal/nodejs");

const fakeAppSignalMetrics = { a: 5 };
const fakeAppSignalInstance = {
	metrics: jest.fn(() => fakeAppSignalMetrics)
};
Appsignal.mockImplementation(() => fakeAppSignalInstance);

const { AppSignalMetricReporter } = require("../");
const { ServiceBroker } = require("moleculer");

describe("Test AppSignalMetricReporter", () => {

	describe("Test constructor", () => {
		it("should create instance with default options", async () => {
			const reporter = new AppSignalMetricReporter();

			expect(reporter.appSignal).toBeNull();
			expect(reporter.opts).toEqual({
				appSignal: {
					active: true,
					name: "Moleculer project"
				},
				defaultLabels: expect.any(Function),
				excludes: null,
				includes: null,
				labelNameFormatter: null,
				metricNameFormatter: null,
				metricNamePrefix: null,
				metricNameSuffix: null,
			});
		});

		it("should create instance with custom options", async () => {
			const reporter = new AppSignalMetricReporter({
				includes: ["moleculer.**"],
				appSignal: {
					active: false,
					debug: true,
					apiKey: "123456"
				}
			});

			expect(reporter.appSignal).toBeNull();
			expect(reporter.opts).toEqual({
				appSignal: {
					active: false,
					name: "Moleculer project",
					debug: true,
					apiKey: "123456"
				},
				defaultLabels: expect.any(Function),
				excludes: null,
				includes: ["moleculer.**"],
				labelNameFormatter: null,
				metricNameFormatter: null,
				metricNamePrefix: null,
				metricNameSuffix: null,
			});
		});
	});

	describe("Test init", () => {
		const broker = new ServiceBroker({ logger: false, nodeID: "node-123", namespace: "test" });
		const registry = broker.metrics;

		it("should create Appsignal client", async () => {
			Appsignal.mockClear();
			fakeAppSignalInstance.metrics.mockClear();
			const reporter = new AppSignalMetricReporter();
			reporter.processAllMetrics = jest.fn();

			reporter.init(registry);

			expect(reporter.appSignal).toBe(fakeAppSignalInstance);
			expect(Appsignal).toBeCalledTimes(1);
			expect(Appsignal).toBeCalledWith(reporter.opts.appSignal);

			expect(reporter.meter).toBe(fakeAppSignalMetrics);
			expect(fakeAppSignalInstance.metrics).toBeCalledTimes(1);

			expect(reporter.processAllMetrics).toBeCalledTimes(1);

			expect(reporter.defaultLabels).toEqual({
				nodeID: "node-123",
				namespace: "test"
			});
		});
	});

	describe("Test processAllMetrics", () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.metrics;

		it("should create Appsignal client", async () => {
			const reporter = new AppSignalMetricReporter();
			reporter.processMetric = jest.fn();
			reporter.init(registry);

			registry.list = jest.fn(() => ([1,2,3]));

			reporter.processAllMetrics();

			expect(registry.list).toBeCalledTimes(1);

			expect(reporter.processMetric).toBeCalledTimes(3);
			expect(reporter.processMetric).toBeCalledWith(1);
			expect(reporter.processMetric).toBeCalledWith(2);
			expect(reporter.processMetric).toBeCalledWith(3);
		});
	});

	describe("Test processMetric", () => {
		const broker = new ServiceBroker({ logger: false });
		const registry = broker.metrics;
		const reporter = new AppSignalMetricReporter({ defaultLabels: null });
		reporter.init(registry);
		reporter.meter.setGauge = jest.fn();
		reporter.meter.addDistributionValue = jest.fn();

		it("should call meter.setGauge for counter metric", async () => {
			reporter.meter.setGauge.mockClear();

			const metric = {
				name: "custom.counter",
				type: "counter",
				values: [
					{ labels: { a: 5 }, value: 15, rate: { rate: 4.5 } }
				]
			};

			reporter.processMetric(metric);

			expect(reporter.meter.setGauge).toBeCalledTimes(2);
			expect(reporter.meter.setGauge).toBeCalledWith("custom.counter", 15, { a : "5" });
			expect(reporter.meter.setGauge).toBeCalledWith("custom.counter.rate", 4.5, { a : "5" });
		});

		it("should call meter.setGauge for gauge metric", async () => {
			reporter.meter.setGauge.mockClear();

			const metric = {
				name: "custom.gauge",
				type: "gauge",
				values: [
					{ labels: { b: "bob" }, value: 100 }
				]
			};

			reporter.processMetric(metric);

			expect(reporter.meter.setGauge).toBeCalledTimes(1);
			expect(reporter.meter.setGauge).toBeCalledWith("custom.gauge", 100, { b : "bob" });
		});

		it("should call meter.addDistributionValue for histogram metric", async () => {
			reporter.meter.setGauge.mockClear();
			reporter.meter.addDistributionValue.mockClear();

			const metric = {
				name: "custom.histogram",
				type: "histogram",
				values: [
					{ labels: { a: 5 }, lastValue: 123 },
					{ labels: { b: "bob" }, lastValue: 234, rate: { rate: 1.25 } }
				]
			};

			reporter.processMetric(metric, 987);

			expect(reporter.meter.addDistributionValue).toBeCalledTimes(2);
			expect(reporter.meter.addDistributionValue).toBeCalledWith("custom.histogram", 987, { a : "5" });
			expect(reporter.meter.addDistributionValue).toBeCalledWith("custom.histogram", 987, { b : "bob" });

			expect(reporter.meter.setGauge).toBeCalledTimes(1);
			expect(reporter.meter.setGauge).toBeCalledWith("custom.histogram.rate", 1.25, { b : "bob" });
		});
	});

	describe("Test convertLabels", () => {
		const broker = new ServiceBroker({ logger: false, nodeID: "node-100", namespace: "dev" });
		const registry = broker.metrics;

		it("should merge static default labels & remove null values", async () => {
			const reporter = new AppSignalMetricReporter({
				defaultLabels: {
					stage: "testing"
				}
			});
			reporter.init(registry);

			const res = reporter.convertLabels({ a: 5, b: "bob", c: true, d: null });

			expect(res).toEqual({
				a: "5",
				b: "bob",
				c: "true",
				stage: "testing"
			});
		});

		it("should merge function default labels & remove null values", async () => {
			const reporter = new AppSignalMetricReporter();
			reporter.init(registry);

			const res = reporter.convertLabels({ a: 5, b: "bob", c: true, d: null });

			expect(res).toEqual({
				a: "5",
				b: "bob",
				c: "true",
				namespace: "dev",
				nodeID: "node-100"
			});
		});

		it("should return null if no labels", async () => {
			const reporter = new AppSignalMetricReporter({ defaultLabels: null });
			reporter.init(registry);

			const res = reporter.convertLabels({});

			expect(res).toEqual(null);
		});
	});
});
