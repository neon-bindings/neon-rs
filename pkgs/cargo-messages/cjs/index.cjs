const { currentTarget } = require('@neon-rs/load');

/*
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
*/

let saved = null;

function addon() {
  if (saved) {
    return saved;
  }
  const target = currentTarget();
  switch (target) {
    case 'darwin-x64': saved = require('@cargo-messages/darwin-x64'); break;
    default: throw new Error(`no binary @cargo-messages module found for ${target}`);
  }
  return addon();
}

/*
const {
  findArtifact,
  findFileByCrateType,
  fromFile,
  fromStdin
} = addon();
*/

const PRIVATE = {};

function enforcePrivate(nonce, className) {
  if (nonce !== PRIVATE) {
    throw new Error(`${className} constructor is private`);
  }
}

class CargoArtifact {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'CargoArtifact');
    this._kernel = kernel;
  }

  findFileByCrateType(crateType) {
    return addon().findFileByCrateType(this._kernel, crateType);
  }
}

class CargoMessages {
  constructor(options) {
    options = options || {};
    this._mount = options.mount || null;
    this._manifestPath = options.manifestPath || null;
    this._kernel = options.file
      ? addon().fromFile(options.file, this._mount, this._manifestPath)
      : addon().fromStdin(this._mount, this._manifestPath);
  }

  findArtifact(crateName) {
    const found = addon().findArtifact(this._kernel, crateName);
    return found
      ? new CargoArtifact(PRIVATE, found)
      : null;
  }
}

module.exports = {
  CargoMessages
};
