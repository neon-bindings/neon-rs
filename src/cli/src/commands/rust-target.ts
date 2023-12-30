import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { isNodePlatform, NodePlatform } from '../platform.js';
import { LibraryManifest } from '../manifest.js';

const OPTIONS = [
  { name: 'os', type: String, defaultValue: null },
  { name: 'arch', type: String, defaultValue: null },
  { name: 'abi', type: String, defaultValue: null },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class RustTarget implements Command {
  static summary(): string { return 'Display the Rust target triple configured for a platform.'; }
  static syntax(): string { return 'neon rust-target <platform> | (--os <os> --arch <arch> [--abi <abi>])'; }
  static options(): CommandDetail[] {
    return [
      { name: '<platform>', summary: 'Full platform name in Node convention.' },
      { name: '--os <os>', summary: 'Target OS name.' },
      { name: '--arch <arch>', summary: 'Target architecture name.' },
      { name: '--abi <abi>', summary: 'Target ABI name. (Default: null)' },
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void { }
  
  private _os: string | null;
  private _arch: string | null;
  private _abi: string | null;
  private _platform: NodePlatform;
  private _verbose: boolean;
  
  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
    this._os = options.os || null;
    this._arch = options.arch || null;
    this._abi = options.abi || null;
    this._verbose = !!options.verbose;

    if (options.os && !options.arch) {
      throw new Error("Option --os requires option --arch to be specified as well.");
    }

    if (!options.os && options.arch) {
      throw new Error("Option --arch requires option --os to be specified as well.");
    }

    if (options.abi && (!options.os || !options.arch)) {
      throw new Error("Option --abi requires both options --os and --arch to be specified as well.");
    }

    let platform: string;

    if (!options.os && !options.arch && !options.abi) {
      if (!options._unknown || options._unknown.length === 0) {
        throw new Error("No arguments found, expected platform or --os and --arch options.");
      }
      platform = options._unknown[0];
    } else {
      platform = `${options.os}-${options.arch}`;

      if (!!options.abi) {
        platform = `${platform}-${options.abi}`;
      }
    }

    if (!isNodePlatform(platform)) {
      throw new Error(`${platform} is not a valid Node platform.`);
    }

    this._platform = platform;
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon rust-target] " + msg);
    }
  }
  
  async run() {
    this.log(`reading package.json`);
    const libManifest = await LibraryManifest.load();
    this.log(`manifest: ${libManifest.stringify()}`);

    const rust = libManifest.rustTargetFor(this._platform);
    if (!rust) {
      throw new Error(`no Rust target found for ${this._platform}`);
    }
    console.log(rust);
  }
}
