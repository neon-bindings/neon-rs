const readline = require('node:readline');
const path = require('node:path');
const child_process = require('node:child_process');

const PRIVATE = {};

function enforcePrivate(nonce, className) {
  if (nonce !== PRIVATE) {
    throw new Error(`${className} constructor is private`);
  }
}

// Starting around Rust 1.78 or 1.79, cargo began normalizing crate
// names in the JSON output, so to support both old and new versions
// of cargo, we need to compare against both variants.
//
// See: https://github.com/rust-lang/cargo/issues/13867
function normalize(crateName) {
  return crateName.replace(/-/g, '_');
}

function unmountOptions(options, filename) {
   return options?.mount ? unmount(options.mount, options.manifestPath, filename) : filename;
}

function unmount(mount, manifestPath, filename) {
  const rel = path.relative(mount, filename);
  const hostBase = JSON.parse(child_process.execSync('cargo', [
    'metadata',
    '--format-version', '1',
    '--no-deps',
    ...(manifestPath ? ['--manifest-path', manifestPath] : [])
  ])).target_directory;
  return path.join(hostBase, rel);
}

function parseLine(line) {
  try {
    const parsed = JSON.parse(line);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.reason === 'string') {
      return parsed;
    }
  } catch (e) { }

  return { reason: 'text', text: line };
}

class CargoReader {
  constructor(input, options) {
    options = options || {};
    this._mount = options.mount || null;
    this._manifestPath = options.manifestPath || null;
    this._verbose = options.verbose || false;
    this._options = options;
    this._input = input;
  }

  async *[Symbol.asyncIterator]() {
    const rl = readline.createInterface({
      input: this._input
    });

    for await (const line of rl) {
      const parsed = parseLine(line);

      switch (parsed.reason) {
        case 'compiler-artifact':
          yield new CompilerArtifact(PRIVATE, parsed, this._options);
          break;

        case 'compiler-message':
          yield new CompilerMessage(PRIVATE, parsed, this._options);
          break;

        case 'build-script-executed':
          yield new BuildScriptExecuted(PRIVATE, parsed, this._options);
          break;

        case 'build-finished':
          yield new BuildFinished(PRIVATE, parsed, this._options);
          break;

        default:
          const textLine = new TextLine(PRIVATE, parsed, this._options);
          textLine.text = line;
          yield textLine;
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
  constructor(nonce, line, options) {
    super();
    enforcePrivate(nonce, 'CompilerArtifact');
    this._line = line;
    this._options = options;
  }

  isCompilerArtifact() { return true; }

  crateName() {
    return this._line.target.name;
  }

  findFileByCrateType(crateType) {
    const i = this._line.target.crate_types.indexOf(crateType);
    return i !== -1 ? unmountOptions(this._options, this._line.filenames[i]) : null;
  }
}

class CompilerMessage extends CargoMessage {
  constructor(nonce, line, options) {
    super();
    enforcePrivate(nonce, 'CompilerMessage');
    this._line = line;
    this._options = options;
  }

  isCompilerMessage() { return true; }
}

class BuildScriptExecuted extends CargoMessage {
  constructor(nonce, line, options) {
    super();
    enforcePrivate(nonce, 'BuildScriptExecuted');
    this._line = line;
    this._options = options;
  }

  isBuildScriptExecuted() { return true; }
}

class BuildFinished extends CargoMessage {
  constructor(nonce, line, options) {
    super();
    enforcePrivate(nonce, 'BuildFinished');
    this._line = line;
    this._options = options;
  }

  isBuildFinished() { return true; }
}

class TextLine extends CargoMessage {
  constructor(nonce, line, options) {
    super();
    enforcePrivate(nonce, 'TextLine');
    this._line = line;
    this._options = options;
  }

  isTextLine() { return true; }
}

module.exports = {
  CargoReader
};
