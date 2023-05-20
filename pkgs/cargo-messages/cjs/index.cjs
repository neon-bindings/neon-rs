const { currentTarget } = require('@neon-rs/load');

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
