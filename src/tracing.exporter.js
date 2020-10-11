/*
 * moleculer
 * Copyright (c) 2020 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ 				= require("lodash");
const BaseExporter      = require("moleculer").TracerExporters.Base;

class AppSignalTracingExporter extends BaseExporter {

	/**
	 * Creates an instance of AppSignalTracingExporter.
	 * @param {Object?} opts
	 * @memberof AppSignalTracingExporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			appSignal: {
				active: true,
				name: "Moleculer project",
			},
			namespace: "moleculer",

			/** @type {Object?} Default span tags */
			defaultTags: null
		});
	}

	/**
	 * Initialize Trace Exporter.
	 *
	 * @param {Tracer} tracer
	 * @memberof AppSignalTracingExporter
	 */
	init(tracer) {
		super.init(tracer);

		try {
			const { Appsignal } = require("@appsignal/nodejs");
			this.appSignal = new Appsignal(this.opts.appSignal);
			this.tracer = this.appSignal.tracer();
			
		} catch(err) {
			/* istanbul ignore next */
			this.tracer.broker.fatal("The '@appsignal/nodejs' package is missing! Please install it with 'npm install @appsignal/nodejs --save' command!", err, true);
		}

		this.defaultTags = _.isFunction(this.opts.defaultTags) ? this.opts.defaultTags.call(this, tracer) : this.opts.defaultTags;
		if (this.defaultTags) {
			this.defaultTags = this.flattenTags(this.defaultTags);
		}
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof AppSignalTracingExporter
	 */
	spanFinished(span) {
		const serviceName = span.service ? span.service.fullName : null;

		const asSpan = this.tracer.createSpan({
			namespace: this.opts.namespace,
			startTime: span.startTime
		});

		asSpan.setName(span.name);
		asSpan.setCategory(serviceName);
		if (span.error) {
			span.addError(span.error);
		}

		const tags = this.flattenTags(_.defaultsDeep({}, span.tags, this.defaultTags));

		this.addTags(asSpan, tags);

		asSpan.close(span.finishTime);
	}

	/**
	 * Add tags to span
	 *
	 * @param {Object} span
	 * @param {String} key
	 * @param {any} value
	 * @param {String?} prefix
	 */
	addTags(span, key, value, prefix) {
		const name = prefix ? `${prefix}.${key}` : key;
		if (value != null && typeof value == "object") {
			Object.keys(value).forEach(k => this.addTags(span, k, value[k], name));
		} else if (value !== undefined) {
			span.set(name, value);
		}
	}
}

module.exports = AppSignalTracingExporter;
