const {createBluetooth} = require('node-ble');
const getToken = require('./cryptor');

const AppServiceUuid            = '79ab0000-9dfa-4ae2-bd46-ac69d9fdd743';
const AppServiceStatusUuid      = '79ab0001-9dfa-4ae2-bd46-ac69d9fdd743';
const AppBatteryStatusUuid      = '79ab0002-9dfa-4ae2-bd46-ac69d9fdd743';
const ControlServiceUuid        = '79ab1000-9dfa-4ae2-bd46-ac69d9fdd743';
const ControlServiceControlUuid = '79ab1001-9dfa-4ae2-bd46-ac69d9fdd743';
const ControlSettingSettingUuid = '79ab1002-9dfa-4ae2-bd46-ac69d9fdd743';

const OpenCommand = Buffer.from([0, 0])
const CloseCommand = Buffer.from([0, 1])
const StopCommand = Buffer.from([0, 2])

const HightSpeedOpenCommand = Buffer.from([3, 0])
const HightSpeedCloseCommand = Buffer.from([3, 1])
let mainKey = null;
let deviceMacAddress = null;

let state = "ready"; // ready -> connecting -> connected -> disconnecting
let device = null;
let sessionTimeout = null;

let sessionDestroy;

const CONNECT_TIOMEOUT = 2 * 60 * 1000;
const SESSION_TIOMEOUT = 5 * 60 * 1000;

const DEBUG = process.env.DEBUG;

async function scan() {
  if (state == "ready") {
    let {bluetooth, destroy} = createBluetooth();
    sessionDestroy = destroy

    const adapter = await retry(5, async () => await bluetooth.defaultAdapter());

    if (DEBUG) console.debug("Get adapter completed")

    if (! await adapter.isPowered()) {
      throw "Adapter is not working"
    }

    state = "connecting"

    if (! await adapter.isDiscovering())
      await adapter.startDiscovery()
    else {
      if (DEBUG) {
        console.debug("Already discovering...")
      }
    }

    if (DEBUG) console.debug("Start discovery")

    device = await adapter.waitDevice(deviceMacAddress)

    if (DEBUG) console.debug("Device found!")

    await device.connect()

    console.log("Connected!")

    const gattServer = await device.gatt()

    if (DEBUG) {
      console.debug("List of services: ", await gattServer.services())
    }

    await login(gattServer)
    extendSession()
    state = "connected"
  }
}

async function login(gattServer) {
  if (DEBUG) {
    console.debug("Loging in")
  }

  const service = await gattServer.getPrimaryService(AppServiceUuid)
  const characteristic = await service.getCharacteristic(AppServiceStatusUuid)
  const data = await characteristic.readValue()
  const token = data.slice(11, 15)
  const encodedKey = getToken(mainKey, token)
  await characteristic.writeValue(encodedKey)
}

async function act(command) {
  if (DEBUG) {
    console.debug("Sending command: ", command)
  }

  extendSession()
  const gattServer = await device.gatt()
  const service = await gattServer.getPrimaryService(ControlServiceUuid)
  const characteristic = await service.getCharacteristic(ControlServiceControlUuid)
  await characteristic.writeValue(command)
}

async function readBatteryStatus() {
  if (DEBUG) {
    console.debug("Reading battery status")
  }
  extendSession()
  const gattServer = await device.gatt()
  const service = await gattServer.getPrimaryService(AppServiceUuid)
  const characteristic = await service.getCharacteristic(AppBatteryStatusUuid)
  const data = await characteristic.readValue()
  if (DEBUG) {
    console.debug("Data received: ", data)
  }
  return batteryLevel(batteryVolt(data))
}

function batteryVolt(data) {
  const volt = data.readInt16LE(0);
  return volt * 0.005315803;
}

function batteryLevel(data) {
  return Math.max(Math.ceil(((data - 3.3) / 1.2) * 100.0), 0);
}

function extendSession() {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout)
    sessionTimeout = null
  }

  sessionTimeout = setTimeout(timeout, SESSION_TIOMEOUT)
}

async function timeout() {
  if (DEBUG) {
    console.debug("Session Timeout!")
  }

  await disconnect();
  sessionTimeout = null;
}

async function disconnect() {
  state = "disconnecting"
  await device.disconnect()
  sessionDestroy()
  resetState()
}

function resetState() {
  state = "ready";
  device = null;
}

async function waitForConnect() {
  if (DEBUG) {
    console.debug("Current state: ", state)
  }
  try {
    switch(state) {
      case "disconnecting":
        await waitFor(CONNECT_TIOMEOUT, () => state == "ready");
      case "ready":
        await scan();
      case "connecting":
        await waitFor(CONNECT_TIOMEOUT, () => state == "connected");
      case "connected":
        return true;
      default:
        throw "Unknow state";
    }
  } catch (err) {
    resetState()
    throw err
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(retries, job) {
  try {
    return await job()
  } catch (err) {
    if (retries > 0) {
      await sleep(1000);
      return retry(retries - 1, job);
    } else throw err;
  }
}

module.exports = class {
  constructor(key, macAddress) {
    mainKey = key;
    deviceMacAddress = macAddress;
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
    return await readBatteryStatus()
  }
}
