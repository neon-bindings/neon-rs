const load = require('@neon-rs/load');

const {
  fromStdin,
  fromFile,
  findArtifact,
  findFileByCrateType
} = load.scope("@cargo-messages");

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
    return findFileByCrateType(this._kernel, crateType);
  }
}

class CargoMessages {
  constructor(options) {
    options = options || {};
    this._mount = options.mount || null;
    this._manifestPath = options.manifestPath || null;
    this._kernel = options.file
      ? fromFile(options.file, this._mount, this._manifestPath)
      : fromStdin(this._mount, this._manifestPath);
  }

  findArtifact(crateName) {
    const found = findArtifact(this._kernel, crateName);
    return found
      ? new CargoArtifact(PRIVATE, found)
      : null;
  }
}

module.exports = {
  CargoMessages
};
