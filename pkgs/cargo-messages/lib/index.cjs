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
      const { kernel, kind } = addon.readline(this._kernel, line);
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

class CargoMessage {
  isCompilerArtifact() { return false; }
  isCompilerMessage() { return false; }
  isBuildScriptExecuted() { return false; }
  isBuildFinished() { return false; }
  isTextLine() { return false; }
}

class CompilerArtifact extends CargoMessage {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'CompilerArtifact');
    this._kernel = kernel;
  }

  isCompilerArtifact() { return true; }

  crateName() {
    return addon.compilerArtifactCrateName(this._kernel);
  }

  findFileByCrateType(crateType) {
    return addon.compilerArtifactFindFileByCrateType(this._kernel, crateType);
  }
}

class CompilerMessage extends CargoMessage {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'CompilerMessage');
    this._kernel = kernel;
  }

  isCompilerMessage() { return true; }
}

class BuildScriptExecuted extends CargoMessage {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'BuildScriptExecuted');
    this._kernel = kernel;
  }

  isBuildScriptExecuted() { return true; }
}

class BuildFinished extends CargoMessage {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'BuildFinished');
    this._kernel = kernel;
  }

  isBuildFinished() { return true; }
}

class TextLine extends CargoMessage {
  constructor(nonce, kernel) {
    enforcePrivate(nonce, 'TextLine');
    this._kernel = kernel;
  }

  isTextLine() { return true; }
}

module.exports = {
  CargoMessages,
  CargoReader
};
