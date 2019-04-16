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
let connected = false;

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

  console.log('found peripheral:', peripheral.advertisement);
})

async function connect() {
  if (!peripheral) throw "Peripheral not found"
  await peripheral.connect(handleConnect);

  return new Promise((resolve, reject) => {
    let checker;
    let timeout = setTimeout(() => {
      if (checker) {
        clearInterval(checker);
      }
      disconnect();
      reject("Timeout!");
    }, 60000);

    checker = setInterval(() => {
      if (connected) {
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
        console.log('found service:', service.uuid);
        service.discoverCharacteristics([], handleDiscoverCharacteristics)
      })

      resolve()
    })
  })
}

async function handleDiscoverCharacteristics(err, characteristics) {
  return new Promise((resolve) => {
    characteristics.forEach(function(characteristic) {
      console.log('found characteristic:', characteristic.uuid);
  
      if (AppServiceStatusUuid == characteristic.uuid) {
        appServiceStatusCharacteristic = characteristic;
        auth();
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
      resolve();
    }
  })
}

async function auth() {
  return new Promise((resolve, reject) => {
    appServiceStatusCharacteristic.read(function(error, data) {
      if (error) {
        reject(error);
        return;
      }
      if (data.length != 19) {
        reject("Data is corrupted: ", data.toString('hex'))
        return;
      }
      const token = data.slice(11, 15);
      const encodedKey = getToken('197657223841bce26def52bc7d78d092', token);
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

    controlServiceControlCharacteristic.write(command, true, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve()
    })
  })
}

async function disconnect() {
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
  connected = false;
}

module.exports = {
  open: async () => act(OpenCommand),
  close: async () => act(CloseCommand),
  stop: async () => act(StopCommand),

  hightSpeedOpen: async () => act(HightSpeedOpenCommand),
  hightSpeedClose: async () => act(HightSpeedCloseCommand),

  disconnect: disconnect,
  connect: connect
}
