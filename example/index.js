"use strict";

const path = require("path");
const { ServiceBroker } = require("moleculer");
const { AppSignalMetricReporter, AppSignalTracingExporter } = require("../");

const broker = new ServiceBroker({
	nodeID: "metrics",
	logger: {
		type: "Console",
		options: {
			formatter: "short"
		}
	},

	transporter: "TCP",
	metrics: {
		enabled: true,
		reporter: [
			new AppSignalMetricReporter({
				appSignal: {
					debug: true,
					logPath: path.resolve(__dirname, "../appsignal.log")  
				}
			}),
			/*{
				type: "Console",
				options: {
					onlyChanges: false,
					//interval: 1000,
					includes: ["moleculer.event.received.*", "os.memory.*"],
					//excludes: ["moleculer.transit.publish.total", "moleculer.transit.receive.total"]
				}
			},*/
		]
	},

	tracing: {
		enabled: true,
		exporter: [
			new AppSignalTracingExporter({
				appSignal: {
					debug: true,
					logPath: path.resolve(__dirname, "../appsignal.log")  
				}
			})
		]
	}
});

broker.createService({
	name: "greeter",
	actions: {
		async hello(ctx) {
			await this.Promise.delay(Math.random() * 100);
			ctx.emit("something.happened", { a: 5 });
			return "Hello Metrics";
		}
	}
});

broker.createService({
	name: "event-handler",
	events: {
		async "something.happened"(ctx) {
			this.logger.info("Event received");
			await this.Promise.delay(Math.random() * 500);
		}
	}
});

broker.start()
	.then(() => {
		broker.repl();

		let c = 20;
		const timer = setInterval(() => {
			broker.call("greeter.hello")
				.then(res => broker.logger.info("OK"))
				.catch(err => broker.logger.error(err));
			//c--;
			if (c <= 0)
				clearInterval(timer);
		}, 1000);

	});
