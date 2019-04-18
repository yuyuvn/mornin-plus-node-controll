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
let peripheral = null;
let connectedWithoutAuth = false;
let connected = false;

let mainKey = null;

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log('scanning...');
    noble.startScanning([AppServiceUuid], false);
  }
  else {
    reset();
    noble.stopScanning();
  }
})

noble.on('discover', function(discovered_peripheral) {
  noble.stopScanning();
  peripheral = discovered_peripheral;
  peripheral.once('disconnect', () => {
    reset()
  })

  console.log('found peripheral:', peripheral.advertisement);
})

async function connectPeripheral() {
  if (!peripheral) throw "Peripheral not found"
  await peripheral.connect(handleConnect);

  return new Promise((resolve, reject) => {
    let checker;
    let timeout = setTimeout(() => {
      if (checker) {
        clearInterval(checker);
      }
      disconnectPeripheral();
      reject("Timeout!");
    }, 60000);

    checker = setInterval(() => {
      if (connected || connectedWithoutAuth) {
        clearTimeout(timeout);
        clearInterval(checker);
        resolve();
      }
    }, 100)
  })
}

async function handleConnect(err) {
  return new Promise((resolve, reject) => {
    if (err) {
      reject(err);
      return;
    }

    peripheral.discoverServices([AppServiceUuid, ControlServiceUuid], function(err, services) {
      if (err) {
        reject(err);
        return;
      }

      services.forEach(function(service) {
        // console.log('found service:', service.uuid);
        service.discoverCharacteristics([], handleDiscoverCharacteristics)
      })

      resolve()
    })
  })
}

async function handleDiscoverCharacteristics(err, characteristics) {
  return new Promise((resolve) => {
    characteristics.forEach(function(characteristic) {
      // console.log('found characteristic:', characteristic.uuid);
  
      if (AppServiceStatusUuid == characteristic.uuid) {
        appServiceStatusCharacteristic = characteristic;
        if (mainKey) auth();
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

    if (appServiceStatusCharacteristic &&
      appBatteryCharacteristic &&
      controlServiceControlCharacteristic &&
      controlSettingSettingCharacteristic) {
      if (!mainKey) connectedWithoutAuth = true;
      resolve();
    }
  })
}

async function auth() {
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
          connected = true;
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
    if (!connected) {
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
    if (!appBatteryCharacteristic) {
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

async function disconnectPeripheral() {
  return new Promise((resolve, reject) => {
    if (!peripheral) {
      reject("Not connected");
      return;
    }

    peripheral.disconnect((error) => {
      if (error) {
        reject(error);
        return;
      }

      reset();
      resolve();
    })
  })
}

function reset() {
  appServiceStatusCharacteristic = null;
  appBatteryCharacteristic = null;
  controlServiceControlCharacteristic = null;
  controlSettingSettingCharacteristic = null;
  connectedWithoutAuth = false;
  connected = false;
  peripheral = null;
}

module.exports = class {
  constructor(key) {
    if (key) mainKey = key;
  }

  async open(){
    await act(OpenCommand);
  }
  
  async close(){
    await act(CloseCommand);
  } 

  async stop(){
    await act(StopCommand);
  }

  async hightSpeedOpen(){
    await act(HightSpeedOpenCommand);
  }

  async hightSpeedClose(){
    await act(HightSpeedCloseCommand);
  }

  async battery(){
    return readBatteryStatus()
  }

  async connect() {
    await connectPeripheral();
  }

  async disconnect() {
    await disconnectPeripheral();
  }

  startScan() {
    noble.startScanning([AppServiceUuid], false);
  }

  get connectedPeripheral() {
    return peripheral;
  }
}
