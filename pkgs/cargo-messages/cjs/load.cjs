const { currentTarget } = require('@neon-rs/load');

function lazy(loaders, exports) {
  let loaded = null;

  function load() {
    if (loaded) {
      return loaded;
    }
    const target = currentTarget();
    if (!loaders.hasOwnProperty(target)) {
      throw new Error(`no precompiled module found for ${target}`);
    }
    loaded = loaders[target]();
    return loaded;
  }

  let module = {};

  for (const key of exports) {
    Object.defineProperty(module, key, { get() { return load()[key]; } });
  }

  return module;
}

module.exports = lazy({
  'darwin-x64': () => require('@cargo-messages/darwin-x64'),
  'win32-x64-msvc': () => require('@cargo-messages/win32-x64-msvc'),
  'aarch64-pc-windows-msvc': () => require('@cargo-messages/win32-arm64-msvc'),
  'darwin-x64': () => require('@cargo-messages/darwin-x64'),
  'darwin-arm64': () => require('@cargo-messages/darwin-arm64'),
  'linux-x64-gnu': () => require('@cargo-messages/linux-x64-gnu'),
  'linux-arm-gnueabihf': () => require('@cargo-messages/linux-arm-gnueabihf'),
  'android-arm-eabi': () => require('@cargo-messages/android-arm-eabi')
}, [
  'fromFile',
  'fromStdin',
  'findArtifact',
  'findFileByCrateType'
]);
