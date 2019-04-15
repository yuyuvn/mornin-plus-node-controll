const noble = require('noble');

const AppServiceUuid = '79ab00009dfa4ae2bd46ac69d9fdd743';
const AppServiceStatusUuid = '79ab00019dfa4ae2bd46ac69d9fdd743';
const AppBatteryStatusUuid = '79ab00029dfa4ae2bd46ac69d9fdd743';
const ControlServiceUuid = '79ab10009dfa4ae2bd46ac69d9fdd743';
const ControlServiceControlUuid = '79ab10019dfa4ae2bd46ac69d9fdd743';
const ControlSettingSettingUuid = '79ab10029dfa4ae2bd46ac69d9fdd743';

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log('scanning...');
    noble.startScanning(['79ab00009dfa4ae2bd46ac69d9fdd743'], false);
  } else {
      noble.stopScanning();
  }
})

noble.on('discover', function(peripheral) {
  noble.stopScanning();

  console.log('found peripheral:', peripheral.advertisement);

  peripheral.connect(function(err) {
    peripheral.discoverServices([AppServiceUuid, ControlServiceUuid], function(err, services) {
      services.forEach(function(service) {
        console.log('found service:', service.uuid);

        service.discoverCharacteristics([], function(err, characteristics) {

          characteristics.forEach(function(characteristic) {
            console.log('found characteristic:', characteristic.uuid);
          })
        })
      })
    })
  })
})