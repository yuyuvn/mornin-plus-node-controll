const PORT = process.env.PORT || 5322
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
const Chicken = require('./morninAPI/gatt_v2');

let chicken = new Chicken(process.env.CHICKEN_TOKEN);

SUPPORTED_COMMANDS = ['open', 'close', 'stop', 'hightSpeedOpen', 'hightSpeedClose']

SUPPORTED_COMMANDS.forEach((command) => {
  app.post(`/act/${command}`, jsonParser, async (req, res, next) => {
    try {
      const token = req.body.token;

      if (token != process.env.CHICKEN_TOKEN) throw 'Wrong token';

      console.log("Received command: ", command)
      await chicken[command]();
      res.send("Done!")
    } catch(e) {
      next(e)
    }
  })
})

app.get('/metrics', async (req, res, next) => {
  try {
    console.log("Scraping metrics");
    const batteryStatus = await chicken.battery();
    output = `# HELP chicken_battery Robot battery level
# TYPE chicken_battery gauge
chicken_battery{} ${batteryStatus}
`;
    res.send(output);
  } catch(e) {
    next(e)
  }
})

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`))
