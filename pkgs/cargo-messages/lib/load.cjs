module.exports = require('@neon-rs/load').proxy({
  'darwin-x64': () => require('@cargo-messages/darwin-x64'),
  'win32-x64-msvc': () => require('@cargo-messages/win32-x64-msvc'),
  'win32-arm64-msvc': () => require('@cargo-messages/win32-arm64-msvc'),
  'darwin-x64': () => require('@cargo-messages/darwin-x64'),
  'darwin-arm64': () => require('@cargo-messages/darwin-arm64'),
  'linux-x64-gnu': () => require('@cargo-messages/linux-x64-gnu'),
  'linux-arm-gnueabihf': () => require('@cargo-messages/linux-arm-gnueabihf'),
  'android-arm-eabi': () => require('@cargo-messages/android-arm-eabi'),
  'linux-arm64-gnu': () => require('@cargo-messages/linux-arm64-gnu')
});
