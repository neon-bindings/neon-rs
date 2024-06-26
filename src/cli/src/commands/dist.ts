import { createReadStream } from 'node:fs';
import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { CargoReader } from 'cargo-messages';
import { LibraryManifest } from '@neon-rs/manifest';
import { assertIsNodePlatform } from '@neon-rs/manifest/platform';
import { copyArtifact } from '@neon-rs/artifact';

// Starting around Rust 1.78 or 1.79, cargo will begin normalizing
// crate names in the JSON output, so to support both old and new
// versions of cargo, we need to compare against both variants.
//
// See: https://github.com/rust-lang/cargo/issues/13867
function normalize(crateName: string): string {
  return crateName.replaceAll(/-/g, "_");
}

// FIXME: add options to infer crate name from manifests
// --package <path/to/package.json>
// --crate <path/to/Cargo.toml>
const OPTIONS = [
  { name: 'name', alias: 'n', type: String, defaultValue: null },
  { name: 'file', alias: 'f', type: String, defaultValue: null },
  { name: 'log', alias: 'l', type: String, defaultValue: null },
  { name: 'mount', alias: 'm', type: String, defaultValue: null },
  { name: 'manifest-path', type: String, defaultValue: null },
  { name: 'out', alias: 'o', type: String, defaultValue: null }, // DEPRECATED: 0.2
  { name: 'platform', alias: 'p', type: String, defaultValue: null },
  { name: 'debug', alias: 'd', type: Boolean, defaultValue: false },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

function createInputStream(file: string | null): NodeJS.ReadableStream {
  return file ? createReadStream(file) : process.stdin;
}

function basename(crateName: string): string {
  return crateName.replace(/^@[^/]*\//, '');
}

function ensureDefined(str: string | undefined, msg: string): string {
  if (str === undefined) {
    throw new Error(`${msg} is not defined`);
  }
  return str;
}

type OutputFileParse = {
  path: string,
  option: 'debug' | 'out' | 'platform'
};

function parseOutputFile(debug: boolean, out: string | undefined, platform: string | undefined): Promise<OutputFileParse> {
  if (debug && out) {
    throw new Error("Options --debug and --out cannot both be enabled.");
  } else if (debug && platform) {
    throw new Error("Options --debug and --platform cannot both be enabled.");
  } else if (out && platform) {
    throw new Error("Options --out and --platform cannot both be enabled.");
  }

  const NEON_DIST_OUTPUT = process.env['NEON_DIST_OUTPUT'];
  const NEON_BUILD_PLATFORM = process.env['NEON_BUILD_PLATFORM'];

  if (platform || (!debug && NEON_BUILD_PLATFORM)) {
    const p = platform || NEON_BUILD_PLATFORM;
    assertIsNodePlatform(p);
    return LibraryManifest.load().then(manifest => {
      const path = manifest.getPlatformOutputPath(p);
      if (!path) {
        throw new Error(`Platform ${p} not supported by this library.`);
      }
      return {
        path, option: 'platform'
      };
    });
  } else if (out || (!debug && NEON_DIST_OUTPUT)) {
    const path = out || NEON_DIST_OUTPUT;
    return Promise.resolve(path!).then(path => ({ path, option: 'out' }));
  } else {
    return Promise.resolve({ path: 'index.node', option: 'debug' });
  }
}

export default class Dist implements Command {
  static summary(): string { return 'Generate a binary .node file from a cargo output log.'; }
  static syntax(): string { return 'neon dist [-n <name>] [-f <file>|[-l <log>] [-m <path>]] [-p <platform> | -d]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-n, --name', summary: 'Crate name. (Default: $npm_package_name)' },
      { name: '-f, --file <file>', summary: 'Build .node from dylib file <file>.' },
      { name: '-l, --log <log>', summary: 'Find dylib path from cargo messages <log>. (Default: stdin)' },
      {
        name: '-m, --mount <path>',
        summary: 'Mounted path of target directory in virtual filesystem. This is used to map paths from the log data back to their real paths, needed when tools such as cross-rs report messages from within a mounted Docker filesystem.'
      },
      { name: '--manifest-path <path>', summary: 'Real path to Cargo.toml. (Default: cargo behavior)' },
      { name: '-p, --platform <platform>', summary: 'Stage output file for caching to platform <platform>. (Default: $NEON_BUILD_PLATFORM or -d)' },
      { name: '-d, --debug', summary: 'Generate output file for debugging (./index.node)' },
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void {
    return [
      { name: 'cargo messages', summary: '<https://doc.rust-lang.org/cargo/reference/external-tools.html>' },
      { name: 'cross-rs', summary: '<https://github.com/cross-rs/cross>' }
    ];
  }
  static extraSection(): CommandSection | void { }

  private _log: string | null;
  private _file: string | null;
  private _mount: string | null;
  private _manifestPath: string | null;
  private _crateName: string;
  private _normalizedCrateName: string;
  private _out: Promise<OutputFileParse>;
  private _verbose: boolean;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv });

    if (options.log && options.file) {
      throw new Error("Options --log and --file cannot both be enabled.");
    }

    if (options.file && options.mount) {
      throw new Error("Options --mount and --file cannot both be enabled.");
    }

    if (options['manifest-path'] && !options.mount) {
      throw new Error("Option --manifest-path requires option --mount to be provided.");
    }

    this._log = options.log ?? null;
    this._file = options.file ?? null;
    this._mount = options.mount;
    this._manifestPath = options['manifest-path'];
    this._crateName = options.name ||
      basename(ensureDefined(process.env['npm_package_name'], '$npm_package_name'));
    this._normalizedCrateName = normalize(this._crateName);
    this._out = parseOutputFile(options.debug, options.out, options.platform);
    this._verbose = !!options.verbose;

    this.log(`crate name = "${this._crateName}"`);
  }

  async findArtifact(): Promise<string> {
    const reader: CargoReader = new CargoReader(createInputStream(this._log), {
      mount: this._mount || undefined,
      manifestPath: this._manifestPath || undefined,
      verbose: this._verbose
    });

    let file: string | null = null;

    for await (const msg of reader) {
      if (!file && msg.isCompilerArtifact() && normalize(msg.crateName()) === this._normalizedCrateName) {
        file = msg.findFileByCrateType('cdylib');
      }
    }

    if (!file) {
      throw new Error(`No artifacts were generated for crate ${this._crateName}`);
    }

    return file;
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon dist] " + msg);
    }
  }

  async run() {
    const file = this._file || (await this.findArtifact());
    const { option, path } = await this._out;

    this.log(`output type = ${option}`);
    this.log(`output file = ${path}`);

    await copyArtifact(file, path);
  }
}
