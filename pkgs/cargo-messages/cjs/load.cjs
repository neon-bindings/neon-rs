const { currentTarget } = require('@neon-rs/load');

const TABLE = {
  'darwin-x64': () => require('@cargo-messages/darwin-x64'),
  'win32-x64-msvc': () => require('@cargo-messages/win32-x64-msvc'),
  'aarch64-pc-windows-msvc': () => require('@cargo-messages/win32-arm64-msvc'),
  'darwin-x64': () => require('@cargo-messages/darwin-x64'),
  'darwin-arm64': () => require('@cargo-messages/darwin-arm64'),
  'linux-x64-gnu': () => require('@cargo-messages/linux-x64-gnu'),
  'linux-arm-gnueabihf': () => require('@cargo-messages/linux-arm-gnueabihf'),
  'android-arm-eabi': () => require('@cargo-messages/android-arm-eabi')
};

let loaded = null;

function load() {
  if (loaded) {
    return loaded;
  }
  const target = currentTarget();
  if (!TABLE.hasOwnProperty(target)) {
    throw new Error(`no precompiled module found for ${target}`);
  }
  loaded = TABLE[target]();
  return loaded;
}

module.exports = {
  get fromFile() { return load().fromFile; },
  get fromStdin() { return load().fromStdin; },
  get findArtifact() { return load().findArtifact; },
  get findFileByCrateType() { return load().findFileByCrateType; }
};
