import { copyFile } from 'node:fs/promises';
import commandLineArgs from 'command-line-args';
import { Command, CommandDetail } from '../command.js';
import { CargoMessages } from 'cargo-messages';

// FIXME: add options to infer crate name from manifests
// --package <path/to/package.json>
// --crate <path/to/Cargo.toml>
const OPTIONS = [
  { name: 'name', alias: 'n', type: String, defaultValue: null },
  { name: 'file', alias: 'f', type: String, defaultValue: null },
  { name: 'log', alias: 'l', type: String, defaultValue: null },
  { name: 'mount', alias: 'm', type: String, defaultValue: null },
  { name: 'manifest-path', type: String, defaultValue: null },
  { name: 'out', alias: 'o', type: String, defaultValue: 'index.node' }
];

export default class Dist implements Command {
  static summary(): string { return 'Generate a .node file from a build.'; }
  static syntax(): string { return 'neon dist [-n <name>] [-f <dylib>|[-l <log>] [-m <path>]] [-o <dist>]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-n, --name', summary: 'Crate name. (Default: $npm_package_name)' },
      { name: '-f, --file <dylib>', summary: 'Build .node from dylib file <dylib>.' },
      { name: '-l, --log <log>', summary: 'Find dylib path from cargo messages <log>. (Default: stdin)' },
      {
        name: '-m, --mount <path>',
        summary: 'Mounted path of target directory in virtual filesystem. This is used to map paths from the log data back to their real paths, needed when tools such as cross-rs report messages from within a mounted Docker filesystem.'
      },
      { name: '--manifest-path <path>', summary: 'Real path to Cargo.toml. (Default: cargo behavior)' },
      { name: '-o, --out <dist>', summary: 'Copy output to file <dist>. (Default: index.node)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void {
    return [
      { name: 'cargo messages', summary: '<https://doc.rust-lang.org/cargo/reference/external-tools.html>' },
      { name: 'cross-rs', summary: '<https://github.com/cross-rs/cross>' }
    ];
  }

  private _log: string | null;
  private _file: string | null;
  private _mount: string | null;
  private _manifestPath: string | null;
  private _crateName: string;
  private _out: string;

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
    this._crateName = options.name || process.env['npm_package_name'];
    this._out = options.out;
  }

  findArtifact(): string {
    const messages: CargoMessages = new CargoMessages({
      mount: this._mount || undefined,
      manifestPath: this._manifestPath || undefined,
      file: this._log || undefined
    });

    const artifact = messages.findArtifact(this._crateName);
    if (!artifact) {
      throw new Error(`No artifacts were generated for crate ${this._crateName}`);
    }

    const file = artifact.findFileByCrateType('cdylib');
    if (!file) {
      throw new Error(`No cdylib artifact found for crate ${this._crateName}`);
    }

    return file;
  }

  async run() {
    const file = this._file || this.findArtifact();

    // FIXME: needs all the logic of cargo-cp-artifact (timestamp check, M1 workaround, async, errors)
    await copyFile(file, this._out);
  }
}
