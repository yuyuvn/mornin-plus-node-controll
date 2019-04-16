const PORT = process.env.PORT || 5322
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
const Chicken = require('./morninAPI/gatt');

let chicken;

SUPPORTED_COMMANDS = ['open', 'close', 'stop', 'hightSpeedOpen', 'hightSpeedClose']

async function connect(token) {
  chicken = new Chicken(token);
  try {
    return chicken.connect();
  } catch (err) {
    if (!(err instanceof UnhandledPromiseRejectionWarning)) throw err;
  }
}

SUPPORTED_COMMANDS.forEach((command) => {
  app.post(`/act/${command}`, jsonParser, async (req, res) => {
    try {
      console.log("Received command: ", command)
      const token = req.body.token;
      await connect(token);
  
      chicken[command]();
      res.send("Done!")
    } catch(e) {
      console.error(e)
      res.send(e)
    }
  })
})

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`))
