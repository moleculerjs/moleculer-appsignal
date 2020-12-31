"use strict";

const path = require("path");
const _ = require("lodash");
const { ServiceBroker } = require("moleculer");
const { MoleculerError } = require("moleculer").Errors;
const { AppSignalMetricReporter, AppSignalTracingExporter } = require("../");

const THROW_ERR = false;

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
			})
		]
	},

	tracing: {
		enabled: true,
		events: true,
		exporter: [
			new AppSignalTracingExporter({
				appSignal: {
					debug: true,
					logPath: path.resolve(__dirname, "../appsignal.log")
				}
			}),
			"Console"
		]
	}
});

const POSTS = [
	{ id: 1, title: "First post", content: "Content of first post", author: 2 },
	{ id: 2, title: "Second post", content: "Content of second post", author: 1 },
	{ id: 3, title: "3rd post", content: "Content of 3rd post", author: 2 },
];

const USERS = [
	{ id: 1, name: "John Doe" },
	{ id: 2, name: "Jane Doe" },
];

broker.createService({
	name: "posts",
	actions: {
		find: {
			tracing: {
				spanName: "List all posts"
			},
			//cache: true,
			async handler(ctx) {
				const span1 = ctx.startSpan("cloning posts");
				const posts = _.cloneDeep(POSTS);
				ctx.finishSpan(span1);

				const span2 = ctx.startSpan("populate posts");
				//await this.Promise.delay(10);
				await this.Promise.mapSeries(posts, async post => {
					const span3 = ctx.startSpan("populate #" + post.id, { tags: {
						id: post.id
					} });
					//await this.Promise.delay(15);

					span2.log("Populating", { postID: post.id });

					await this.Promise.all([
						ctx.call("users.get", { id: post.author }).then(author => post.author = author),
						//ctx.call("votes.count", { postID: post.id }).then(votes => post.votes = votes),
					]);

					ctx.finishSpan(span3);

					//return res;
				});

				ctx.finishSpan(span2);

				const span4 = ctx.startSpan("sorting");
				posts.sort((a,b) => a.id - b.id);
				ctx.finishSpan(span4);
				return posts;
			}
		}
	}
});

broker.createService({
	name: "users",
	actions: {
		async get(ctx) {
			ctx.emit("user.access", ctx.params.id);
			const user = USERS.find(user => user.id == ctx.params.id);
			if (user) {
				const res = _.cloneDeep(user);
				await this.Promise.delay(Math.random() * 50);
				res.friends = await ctx.call("friends.count", { userID: user.id });
				return res;
			}
		}
	}
});

broker.createService({
	name: "friends",

	actions: {
		count: {
			tracing: true,
			async handler(ctx) {
				if (THROW_ERR && ctx.params.userID == 1)
					throw new MoleculerError("Friends is not found!", 404, "FRIENDS_NOT_FOUND", { userID: ctx.params.userID });

				await this.Promise.delay(_.random(10));
				return ctx.params.userID * 3;
			}
		}
	}
});

broker.createService({
	name: "event-handler",
	events: {
		async "user.access"(ctx) {
			this.logger.info(`Event '${ctx.eventName}' received.`);
			await this.Promise.delay(Math.random() * 50);
		}
	}
});

broker.start()
	.then(() => {
		broker.repl();

		//let c = 20;
		const timer = setInterval(() => {
			broker
				.call("posts.find", { limit: 5 }, { meta: { loggedIn: { username: "Adam" } } })
				//.call("greeter.hello")
				.then(() => broker.logger.info("OK"))
				.catch(err => broker.logger.error(err));
			//c--;
			//if (c <= 0)
			//	clearInterval(timer);
		}, 5000);

	});
