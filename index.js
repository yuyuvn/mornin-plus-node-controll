const PORT = process.env.PORT || 5322
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
const Chicken = require('./morninAPI/gatt');

let chicken;
let connections = 0;

SUPPORTED_COMMANDS = ['open', 'close', 'stop', 'hightSpeedOpen', 'hightSpeedClose']

async function connect(token) {
  if (chiecken) {
    connections += 1;
    return;
  }

  chicken = new Chicken(token);
  return chicken.connect();
}

function disconnect() {
  if (!chicken) return;

  connections -= 1;
  if (connections > 0) return;

  chicken.disconnect();
  chicken = null;
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
    disconnect();
  })
})

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`))
