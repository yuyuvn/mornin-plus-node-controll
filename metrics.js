const metrics = require('metrics');
const Gauge = require('metrics/metrics/gauge');

const metricsServer = new metrics.Server(9091);
const batteryGauge = new CachedGauge(() => {
  let value;

}, 3600000)


app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`))

metricsServer.addMetric('jp.robit.chicken2.battery', batteryGauge);

setInterval(() => {

}, 3600000)