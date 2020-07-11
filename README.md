# AppSignal for Moleculer framework
Moleculer Metrics reporter and Tracing exporter for [AppSignal](https://appsignal.com/).

## Install

```
$ npm i moleculer-appsignal
```

>Please note, AppSignal's Agent works only on Linux OS.

## Usage

You should set your AppSignal API key. Use the `APPSIGNAL_PUSH_API_KEY` environment variable or set the `apiKey` in reporter options under `appSignal` property.

### Metrics
```js
// moleculer.config.js
const { AppSignalReporter } = require("moleculer-appsignal");

module.exports = {
    nodeID: "demo",

    metrics: {
        enabled: true,
        reporter: new AppSignalReporter({
            // Common reporter options. More info: https://moleculer.services/docs/0.14/metrics.html#Metrics-Reporters
            appSignal: {
                // AppSignal options. More info: https://docs.appsignal.com/nodejs/configuration
            }
        })
    }
};
```

#### Dashboards
**Main common dashboard**

[Download the dashboard](dashboards/Moleculer-Main.json)

![Dashboard image](https://user-images.githubusercontent.com/306521/87221154-16853600-c36a-11ea-80e3-04c8b7a0e4fe.png)


## Test
```
$ npm test
```

In development with watching

```
$ npm run ci
```

## Contribution
Please send pull requests improving the usage and fixing bugs, improving documentation and providing better examples, or providing some testing, because these things are important.

## License
The project is available under the [MIT license](https://tldrlegal.com/license/mit-license).

## Contact
Copyright (c) 2020 MoleculerJS

[![@MoleculerJS](https://img.shields.io/badge/github-moleculerjs-green.svg)](https://github.com/moleculerjs) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)