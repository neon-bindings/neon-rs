// const addon = require('./load.cjs');
const readline = require('node:readline');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const child_process = require('node:child_process');

// const RUST = true;

const PRIVATE = {};

function enforcePrivate(nonce, className) {
  if (nonce !== PRIVATE) {
    throw new Error(`${className} constructor is private`);
  }
}

// class CargoArtifact {
//   constructor(nonce, kernel) {
//     enforcePrivate(nonce, 'CargoArtifact');
//     this._kernel = kernel;
//   }

//   findFileByCrateType(crateType) {
//     return addon.findFileByCrateType(this._kernel, crateType);
//   }
// }

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

// class CargoMessages {
//   constructor(options) {
//     options = options || {};
//     this._mount = options.mount || null;
//     this._manifestPath = options.manifestPath || null;
//     this._verbose = options.verbose || false;
//     if (RUST) {
//       this._kernel = options.file
//         ? addon.fromFile(options.file, this._mount, this._manifestPath, this._verbose)
//         : (process.stdin.resume(), addon.fromStdin(this._mount, this._manifestPath, this._verbose));
//     } else {
//       this._kernel = options.file
//         ? createReadStream(options.file, { encoding: 'utf8' })
//         : (process.stdin.resume(), process.stdin);
//     }
//   }

//   async findArtifact(crateName) {
//     if (RUST) {
//       const found = addon.findArtifact(this._kernel, crateName);
//       return found
//         ? new CargoArtifact(PRIVATE, found)
//         : null;
//     }

//     let count = 0;
//     let result = null;

//     const normalizedCrateName = normalize(crateName);

//     for await (const msg of this._kernel) {
//       count++;
//       if (msg.reason === 'compiler-artifact') {
//         if (this._verbose) {
//           console.info(`[cargo-messages] found artifact for ${msg.target.name}`);
//         }
//         if (result === null && normalize(msg?.target?.name === normalizedCrateName)) {
//           result = msg;
//         }
//       } else if (msg.reason === 'build-finished') {
//         if (this._verbose) {
//           console.info(`[cargo-messages] build finished (${msg.success ? 'succeeded' : 'failed'})`);
//         }
//       }
//     }

//     if (this._verbose) {
//       console.info(`[cargo-messages] no${count === 0 ? '' : ' more'} artifacts`);
//     }

//     return result;
//   }
// }

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
    // if (RUST) {
    //   this._kernel = addon.createReader(this._mount, this._manifestPath, this._verbose);
    // } else {
    //   this._kernel = null;
    // }
  }

  async *[Symbol.asyncIterator]() {
    const rl = readline.createInterface({
      input: this._input
    });

    for await (const line of rl) {
      // if (RUST) {
      //   const { kernel, kind } = addon.readline(this._kernel, line);
      //   switch (kind) {
      //     case 0:
      //       yield new CompilerArtifact(PRIVATE, kernel, parseLine(line), this._options);
      //       break;

      //     case 1:
      //       yield new CompilerMessage(PRIVATE, kernel, parseLine(line), this._options);
      //       break;

      //     case 2:
      //       yield new BuildScriptExecuted(PRIVATE, kernel, parseLine(line), this._options);
      //       break;

      //     case 3:
      //       yield new BuildFinished(PRIVATE, kernel, parseLine(line), this._options);
      //       break;

      //     case 4:
      //       yield new TextLine(PRIVATE, kernel, parseLine(line), this._options);
      //       break;
      //   }
      // }
      // else {
        const parsed = parseLine(line);

        switch (parsed.reason) {
          case 'compiler-artifact':
            yield new CompilerArtifact(PRIVATE, null, parsed, this._options);
            break;

          case 'compiler-message':
            yield new CompilerMessage(PRIVATE, null, parsed, this._options);
            break;

          case 'build-script-executed':
            yield new BuildScriptExecuted(PRIVATE, null, parsed, this._options);
            break;

          case 'build-finished':
            yield new BuildFinished(PRIVATE, null, parsed, this._options);
            break;

          default:
            const textLine = new TextLine(PRIVATE, null, parsed, this._options);
            textLine.text = line;
            yield textLine;
            break;
        // }
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
  constructor(nonce, kernel, line, options) {
    super();
    enforcePrivate(nonce, 'CompilerArtifact');
    this._kernel = kernel;
    this._line = line;
    this._options = options;
  }

  isCompilerArtifact() { return true; }

  crateName() {
    // if (RUST) {
    //   return this._crateName_RUST();
    // } else {
      return this._crateName_JS();
    // }
  }

  // _crateName_RUST() {
  //   return addon.compilerArtifactCrateName(this._kernel);
  // }

  _crateName_JS() {
    return this._line.target.name;
  }

  findFileByCrateType(crateType) {
    // if (RUST) {
    //   const result = this._findFileByCrateType_RUST(crateType);
    //   try {
    //     const refactor = this._findFileByCrateType_JS(crateType);
    //     if (refactor === result) {
    //       console.info(`[cargo-messages] findFileByCrateType consistent for crateType=${crateType}: ${result}`);
    //     } else {
    //       console.warn(`[cargo-messages] findFileByCrateType inconsistent for crateType=${crateType}: RUST=${result} vs JS=${refactor}`);
    //     }
    //   } catch (e) {
    //     console.warn(`[cargo-messages] findFileByCrateType JS threw for crateType=${crateType}: ${e}`);
    //   }
    //   return result;
    // } else {
      return this._findFileByCrateType_JS(crateType);
    // }
  }

  // _findFileByCrateType_RUST(crateType) {
  //   return addon.compilerArtifactFindFileByCrateType(this._kernel, crateType);
  // }

  _findFileByCrateType_JS(crateType) {
    const i = this._line.target.crate_types.indexOf(crateType);
    return i !== -1 ? unmountOptions(this._options, this._line.filenames[i]) : null;
  }
}

class CompilerMessage extends CargoMessage {
  constructor(nonce, kernel, line, options) {
    super();
    enforcePrivate(nonce, 'CompilerMessage');
    this._kernel = kernel;
    this._line = line;
    this._options = options;
  }

  isCompilerMessage() { return true; }
}

class BuildScriptExecuted extends CargoMessage {
  constructor(nonce, kernel, line, options) {
    super();
    enforcePrivate(nonce, 'BuildScriptExecuted');
    this._kernel = kernel;
    this._line = line;
    this._options = options;
  }

  isBuildScriptExecuted() { return true; }
}

class BuildFinished extends CargoMessage {
  constructor(nonce, kernel, line, options) {
    super();
    enforcePrivate(nonce, 'BuildFinished');
    this._kernel = kernel;
    this._line = line;
    this._options = options;
  }

  isBuildFinished() { return true; }
}

class TextLine extends CargoMessage {
  constructor(nonce, kernel, line, options) {
    super();
    enforcePrivate(nonce, 'TextLine');
    this._kernel = kernel;
    this._line = line;
    this._options = options;
  }

  isTextLine() { return true; }
}

module.exports = {
  CargoReader
};
