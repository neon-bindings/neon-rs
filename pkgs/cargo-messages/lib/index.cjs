const addon = require('./load.cjs');
const readline = require('node:readline');

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

class CargoReader {
  constructor(input, options) {
    options = options || {};
    this._mount = options.mount || null;
    this._manifestPath = options.manifestPath || null;
    this._verbose = options.verbose || false;
    this._input = input;
    this._kernel = addon.createReader(this._mount, this._manifestPath, this._verbose);
  }

  async *[Symbol.asyncIterator]() {
    const rl = readline.createInterface({
      input: this._input
    });
    for await (const line of rl) {
      const { kernel, kind } = addon.readline(line);
      switch (kind) {
        case 0:
          yield new CompilerArtifact(PRIVATE, kernel);
          break;

        case 1:
          yield new CompilerMessage(PRIVATE, kernel);
          break;

        case 2:
          yield new BuildScriptExecuted(PRIVATE, kernel);
          break;

        case 3:
          yield new BuildFinished(PRIVATE, kernel);
          break;

        case 4:
          yield new TextLine(PRIVATE, kernel);
          break;
      }
    }
  }
}

class CompilerArtifact {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'CompilerArtifact');
    this._kernel = kernel;
  }

  crateName() {
    return addon.compilerArtifactCrateName(this._kernel);
  }

  findFileByCrateType(crateType) {
    return addon.compilerArtifactFindFileByCrateType(this._kernel, crateType);
  }
}

class CompilerMessage {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'CompilerMessage');
    this._kernel = kernel;
  }
}

class BuildScriptExecuted {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'BuildScriptExecuted');
    this._kernel = kernel;
  }
}

class BuildFinished {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'BuildFinished');
    this._kernel = kernel;
  }
}

class TextLine {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'TextLine');
    this._kernel = kernel;
  }
}

module.exports = {
  CargoMessages,
  CargoReader
};
