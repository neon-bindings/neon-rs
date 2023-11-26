import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { isNodeTarget, NodeTarget } from '../target.js';
import { SourceManifest } from '../manifest.js';

const OPTIONS = [
  { name: 'platform', alias: 'p', type: String, defaultValue: null },
  { name: 'arch', alias: 'a', type: String, defaultValue: null },
  { name: 'abi', type: String, defaultValue: null },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class RustTarget implements Command {
  static summary(): string { return 'Look up the Rust target triple for a given build target.'; }
  static syntax(): string { return 'neon rust-target <target> | (-p <plat> -a <arch> [--abi <abi>])'; }
  static options(): CommandDetail[] {
    return [
      { name: '<target>', summary: 'Full target name in Node convention.' },
      { name: '-p, --platform <plat>', summary: 'Target platform name.' },
      { name: '-a, --arch <arch>', summary: 'Target architecture name.' },
      { name: '--abi <abi>', summary: 'Target ABI name. (Default: null)' },
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void { }
  
  private _platform: string | null;
  private _arch: string | null;
  private _abi: string | null;
  private _target: NodeTarget;
  private _verbose: boolean;
  
  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
    this._platform = options.platform || null;
    this._arch = options.arch || null;
    this._abi = options.abi || null;
    this._verbose = !!options.verbose;

    if (options.platform && !options.arch) {
      throw new Error("Option --platform requires option --arch to be specified as well.");
    }

    if (!options.platform && options.arch) {
      throw new Error("Option --arch requires option --platform to be specified as well.");
    }

    if (options.abi && (!options.platform || !options.arch)) {
      throw new Error("Option --abi requires both options --platform and --arch to be specified as well.");
    }

    let target: string;

    if (!options.platform && !options.arch && !options.abi) {
      if (!options._unknown || options._unknown.length === 0) {
        throw new Error("No arguments found, expected <target> or -p and -a options.");
      }
      target = options._unknown[0];
    } else {
      target = `${options.platform}-${options.arch}`;

      if (!!options.abi) {
        target = `${target}-${options.abi}`;
      }
    }

    if (!isNodeTarget(target)) {
      throw new Error(`${target} is not a valid Node target.`);
    }

    this._target = target;
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon rust-target] " + msg);
    }
  }
  
  async run() {
    this.log(`reading package.json`);
    const sourceManifest = await SourceManifest.load();
    this.log(`manifest: ${sourceManifest.stringify()}`);

    const rust = sourceManifest.rustTargetFor(this._target);
    if (!rust) {
      throw new Error(`no Rust target found for ${this._target}`);
    }
    console.log(rust);
  }
}
