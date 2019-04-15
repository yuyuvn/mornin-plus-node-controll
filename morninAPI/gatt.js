const noble = require('noble');
const cryptor = require('./cryptor');

const AppServiceUuid = '79ab00009dfa4ae2bd46ac69d9fdd743';
const AppServiceStatusUuid = '79ab00019dfa4ae2bd46ac69d9fdd743';
const AppBatteryStatusUuid = '79ab00029dfa4ae2bd46ac69d9fdd743';
const ControlServiceUuid = '79ab10009dfa4ae2bd46ac69d9fdd743';
const ControlServiceControlUuid = '79ab10019dfa4ae2bd46ac69d9fdd743';
const ControlSettingSettingUuid = '79ab10029dfa4ae2bd46ac69d9fdd743';

const OpenCommand = Buffer.alloc(0x0000)
const CloseCommand = Buffer.alloc(0x0001)
const StopCommand = Buffer.alloc(0x0002)

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log('scanning...');
    noble.startScanning([AppServiceUuid], false);
  }
  else {
    noble.stopScanning();
  }
})

let appServiceStatusCharacteristic = null;
let appBatteryCharacteristic = null;
let controlServiceControlCharacteristic = null;
let controlSettingSettingCharacteristic = null;

noble.on('discover', function(peripheral) {
  // we found a peripheral, stop scanning
  noble.stopScanning();

  //
  // The advertisment data contains a name, power level (if available),
  // certain advertised service uuids, as well as manufacturer data,
  // which could be formatted as an iBeacon.
  //
  console.log('found peripheral:', peripheral.advertisement);
  //
  // Once the peripheral has been discovered, then connect to it.
  //
  peripheral.connect(function(err) {
    //
    // Once the peripheral has been connected, then discover the
    // services and characteristics of interest.
    //
    peripheral.discoverServices([AppServiceUuid, ControlServiceUuid], function(err, services) {
      services.forEach(function(service) {
        //
        // This must be the service we were looking for.
        //
        console.log('found service:', service.uuid);

        //
        // So, discover its characteristics.
        //
        service.discoverCharacteristics([], function(err, characteristics) {

          characteristics.forEach(function(characteristic) {
            //
            // Loop through each characteristic and match them to the
            // UUIDs that we know about.
            //
            console.log('found characteristic:', characteristic.uuid);

            if (AppServiceStatusUuid == characteristic.uuid) {
              appServiceStatusCharacteristic = characteristic;
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

          //
          // Check to see if we found all of our characteristics.
          //
          if (appServiceStatusCharacteristic &&
            appBatteryCharacteristic &&
            controlServiceControlCharacteristic &&
            controlSettingSettingCharacteristic) {
            await auth();
          }
        })
      })
    })
  })
})

async function auth() {
  return new Promise((resolve, reject) => {
    const data = await appServiceStatusCharacteristic.read(function(error, data) {
      if (error) {
        reject(error);
        return;
      }
      if (data.length != 19) {
        reject("Data is corrupted: ", data.toString())
        return;
      }
      const token = data.slice(11, 15);
      const encodedKey = cryptor.encodedKey(token);
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
    controlServiceControlCharacteristic.write(command, true, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve()
    })
  })
}
