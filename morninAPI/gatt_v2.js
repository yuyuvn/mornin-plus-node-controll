const noble = require('noble');
const getToken = require('./cryptor');

const AppServiceUuid = '79ab00009dfa4ae2bd46ac69d9fdd743';
const AppServiceStatusUuid = '79ab00019dfa4ae2bd46ac69d9fdd743';
const AppBatteryStatusUuid = '79ab00029dfa4ae2bd46ac69d9fdd743';
const ControlServiceUuid = '79ab10009dfa4ae2bd46ac69d9fdd743';
const ControlServiceControlUuid = '79ab10019dfa4ae2bd46ac69d9fdd743';
const ControlSettingSettingUuid = '79ab10029dfa4ae2bd46ac69d9fdd743';

const OpenCommand = Buffer.from([0, 0])
const CloseCommand = Buffer.from([0, 1])
const StopCommand = Buffer.from([0, 2])

const HightSpeedOpenCommand = Buffer.from([3, 0])
const HightSpeedCloseCommand = Buffer.from([3, 1])

let appServiceStatusCharacteristic = null;
let appBatteryCharacteristic = null;
let controlServiceControlCharacteristic = null;
let controlSettingSettingCharacteristic = null;
let mainKey = null;

let logedin = false;
let state = "idle"; // idle -> ready -> scanning -> discovered -> connecting -> connected -> disconnecting
let peripheral = null;

noble.on("stateChange", function(bleState) {
  if (bleState === "poweredOn") {
    state = "ready"
  } else {
    resetState();
    noble.stopScanning();
    state = "idle"
  }
})

async function scan() {
  if (state == "ready") {
    noble.startScanning([AppServiceUuid], false);
    state = "scanning";

    try {
      await waitFor(300, () => state != "scanning");
    } catch {
      console.error("Peripheral not found!");
      resetState();
    }
  }
}

noble.on('discover', function(discovered_peripheral) {
  noble.stopScanning(); // only support 1 decive
  peripheral = discovered_peripheral;
  peripheral.once('disconnect', () => {
    resetState();
  });
  console.log('Found peripheral:', peripheral.advertisement);

  state = "discovered";
  connect();
})

async function connect() {
  if (state == "discovered") {
    state = "connecting";
    peripheral.connect((err) => handleConnect(err, peripheral));

    try {
      await waitFor(300, () => state != "connecting");
    } catch {
      console.error("Can't connect!");
      resetState();
    }
  }
}

async function handleConnect(err) {
  if (err) throw err;

  peripheral.discoverServices([AppServiceUuid, ControlServiceUuid], function(err, services) {
    if (err) throw err;

    services.forEach(function(service) {
      // console.log('found service:', service.uuid);
      service.discoverCharacteristics([], handleDiscoverCharacteristics)
    })
  })
}

async function handleDiscoverCharacteristics(err, characteristics) {
    characteristics.forEach(function(characteristic) {
    // console.log('found characteristic:', characteristic.uuid);

    if (AppServiceStatusUuid == characteristic.uuid) {
      appServiceStatusCharacteristic = characteristic;
      await auth(mainKey);
      logedin = true;
    }
    else if (AppBatteryStatusUuid == characteristic.uuid) {
      appBatteryCharacteristic = characteristic;
    }
    else if (ControlServiceControlUuid == characteristic.uuid) {
      controlServiceControlCharacteristic = characteristic;
    }
    else if (ControlSettingSettingUuid == characteristic.uuid) {
      controlSettingSettingCharacteristic = characteristic;
    }
  })

  if (appServiceStatusCharacteristic && logedin &&
    appBatteryCharacteristic &&
    controlServiceControlCharacteristic &&
    controlSettingSettingCharacteristic) {
      state = "connected"

    setTimeout(() => {
      disconnect()
    }, 300) // Disconnect after 5 minutes
  }
}

async function auth(mainKey) {
  return new Promise((resolve, reject) => {
    appServiceStatusCharacteristic.read((error, data) => {
      if (error) {
        reject(error);
        return;
      }
      if (data.length != 19) {
        reject("Data is corrupted: ", data.toString('hex'))
        return;
      }
      const token = data.slice(11, 15);
      const encodedKey = getToken(mainKey, token);
      appServiceStatusCharacteristic.write(encodedKey, false, (err) => {
        if (!err) {
          resolve()
        } else {
          reject(err)
        }
      })
    })
  })
}

async function act(command) {
  return new Promise((resolve, reject) => {
    if (state != "connected") {
      reject("Not connected");
      return;
    }

    controlServiceControlCharacteristic.write(command, false, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve()
    })
  })
}

async function readBatteryStatus() {
  return new Promise((resolve, reject) => {
    if (state != "connected") {
      reject("Not connected");
      return;
    }

    appBatteryCharacteristic.read((error, data) => {
      if (error) {
        reject(error);
        return;
      }
      if (data.length != 2) {
        reject("Data is corrupted: ", data.toString('hex'))
        return;
      }

      resolve(batteryLevel(batteryVolt(data)))
    })
  })
}

function batteryVolt(data) {
  const volt = data.readInt16LE(0);
  return volt * 0.005315803;
}

function batteryLevel(data) {
  return Math.max(Math.ceil(((data - 3.3) / 1.2) * 100.0), 0);
}

async function disconnect() {
  if (state != "connected") {
    reset();
    return;
  }

  state = "disconnecting";
  return new Promise((resolve) => {
    peripheral.disconnect(() => {
      resetState();
      resolve();
    })
  })
}

function resetState() {
  appServiceStatusCharacteristic = null;
  appBatteryCharacteristic = null;
  controlServiceControlCharacteristic = null;
  controlSettingSettingCharacteristic = null;
  connectedWithoutAuth = false;
  state = "ready";
  peripheral = null;
  logedin = false;
}

async function waitForConnect() {
  switch(state) {
    case "idle":
    case "disconnecting":
      await waitFor(60, () => state == "ready");
    case "ready":
      await scan();
    case "scanning":
    case "discovered":
    case "connecting":
      await waitFor(60, () => state == "connected");
    case "connected":
      return true;
    default:
      throw "Unknow state";
  }
}

async function waitFor(timeout, condition) {
  return new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      clearTimeout(timeout);
      clearInterval(interval);
      reject("Timeout")
    }, timeout);
    interval = setInterval(() => {
      if (condition()) {
        clearTimeout(timeout);
        clearInterval(interval);
        resolve();
      }
    }, 100)
  })
}

module.exports = class {
  constructor(key) {
    mainKey = key;
  }

  async open(){
    await waitForConnect();
    await act(OpenCommand);
  }

  async close(){
    await waitForConnect();
    await act(CloseCommand);
  }

  async stop(){
    await waitForConnect();
    await act(StopCommand);
  }

  async hightSpeedOpen(){
    await waitForConnect();
    await act(HightSpeedOpenCommand);
  }

  async hightSpeedClose(){
    await waitForConnect();
    await act(HightSpeedCloseCommand);
  }

  async battery(){
    await waitForConnect();
    return readBatteryStatus()
  }
}
