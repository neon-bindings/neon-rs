import { copyFile } from 'node:fs/promises';
import commandLineArgs from 'command-line-args';
import { CargoMessage, MessageStream, isCompilerArtifact } from '../cargo.js';
import { Command, CommandDetail } from '../command.js';

// FIXME: add options to infer crate name from manifests
// --package <path/to/package.json>
// --crate <path/to/Cargo.toml>
const OPTIONS = [
  { name: 'name', alias: 'n', type: String, defaultValue: null },
  { name: 'log', alias: 'l', type: String, defaultValue: null },
  { name: 'file', alias: 'f', type: String, defaultValue: null },
  { name: 'out', alias: 'o', type: String, defaultValue: 'index.node' }
];

async function findArtifact(log: string | null, crateName: string): Promise<string | null> {
  const stream = new MessageStream(log);
  return await stream.findPath((msg: CargoMessage) => {
    if (!isCompilerArtifact(msg) || (msg.target.name !== crateName)) {
      return null;
    }
    const index = msg.target.crate_types.indexOf('cdylib');
    return (index < 0) ? null : msg.filenames[index];
  });
}

export default class Dist implements Command {
  static summary(): string { return 'Generate a .node file from a build'; }
  static syntax(): string { return 'neon dist [-n <name>] [-l <log>|-f <dylib>] [-o <dist>]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-n, --name', summary: 'Crate name. (Default: $npm_package_name)' },
      { name: '-l, --log <log>', summary: 'Find dylib path from cargo messages <log>. (Default: stdin)' },
      { name: '-f, --file <dylib>', summary: 'Build .node from dylib file <dylib>.' },
      { name: '-o, --out <dist>', summary: 'Copy output to file <dist>. (Default: index.node)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void {
    return [
      { name: 'cargo messages', summary: '<https://doc.rust-lang.org/cargo/reference/external-tools.html>' }
    ];
  }

  private _log: string | null;
  private _file: string | null;
  private _crateName: string;
  private _out: string;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv });

    if (options.log && options.file) {
      throw new Error("Options --log and --file cannot both be enabled.");
    }

    this._log = options.log ?? null;
    this._file = options.file ?? null;
    this._crateName = options.name || process.env['npm_package_name'];
    this._out = options.out;
  }

  async run() {
    const file = this._file ?? await findArtifact(this._log, this._crateName);

    if (!file) {
      throw new Error(`No library found for crate ${this._crateName}`);
    }

    // FIXME: needs all the logic of cargo-cp-artifact (timestamp check, M1 workaround, async, errors)
    await copyFile(file, this._out);
  }
}
