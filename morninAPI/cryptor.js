const crypto = require('crypto');

const CMD_VALIDATE_ENCRYPTED_MAIN_TOKEN = Buffer.from([0x02])

function string2Buffer(string) {
  return Buffer.from(string, 'hex');
}

function encryptMain(key, seed) {
  return encryptWithKeyAndToken(key, buildMainToken(seed));
}

function buildMainToken(seed) {
  const prepend = Buffer.from([92, 101, 44, 182, 81, 212, 239, 235, 137, 90, 188, 111])
  return Buffer.concat([prepend, seed])
}

function encryptWithKeyAndToken(key, mainToken) {
  const cipher = crypto.createCipheriv('aes-128-ecb', key, '');
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(mainToken), cipher.final()]);
}

module.exports = function (key, authSeed) {
  const encryptedToken = encryptMain(string2Buffer(key), authSeed);

  return new Buffer.concat([CMD_VALIDATE_ENCRYPTED_MAIN_TOKEN, encryptedToken])
}
