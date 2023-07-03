const addon = require('./load.cjs');

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
    return addon.findFileByCrateType(this._kernel, crateType);
  }
}

class CargoMessages {
  constructor(options) {
    options = options || {};
    this._mount = options.mount || null;
    this._manifestPath = options.manifestPath || null;
    this._verbose = options.verbose || false;
    this._kernel = options.file
      ? addon.fromFile(options.file, this._mount, this._manifestPath, this._verbose)
      : (process.stdin.resume(), addon.fromStdin(this._mount, this._manifestPath, this._verbose));
  }

  findArtifact(crateName) {
    const found = addon.findArtifact(this._kernel, crateName);
    return found
      ? new CargoArtifact(PRIVATE, found)
      : null;
  }
}

module.exports = {
  CargoMessages
};
