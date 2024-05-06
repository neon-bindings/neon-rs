import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { isNodePlatform, isRustTarget, isPlatformPreset, TargetPair } from '@neon-rs/manifest/platform';
import { LibraryManifest } from '@neon-rs/manifest';
import { getCurrentTarget } from '../target.js';

function optionArray<T>(option: T | undefined | null): T[] {
  return option == null ? [] : [option];
}

const OPTIONS = [
  { name: 'os', type: String, defaultValue: null },
  { name: 'arch', type: String, defaultValue: null },
  { name: 'abi', type: String, defaultValue: null },
  { name: 'out-dir', alias: 'o', type: String, defaultValue: 'platforms' },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class Add implements Command {
    static summary(): string { return 'Add a platform or platform preset to a Neon project.'; }
    static syntax(): string { return 'neon add [<p> | --os <a> --arch <b> [--abi <c>]] [-o <d>] [-b <f>]'; }
    static options(): CommandDetail[] {
      return [
        { name: '<p>', summary: 'A Node platform or platform preset.' },
        {
          name: '',
          summary: 'This can be a specific Node platform or one of the Neon platform family presets described below. (Default: current platform)'
        },
        { name: '--os <a>', summary: 'Platform OS name. (Default: current OS)' },
        { name: '--arch <b>', summary: 'Platform architecture name. (Default: current arch)' },
        { name: '--abi <c>', summary: 'Platform ABI name. (Default: current ABI)' },
        { name: '-o, --out-dir <d>', summary: 'Output directory for platform template tree. (Default: ./platforms)' },
        { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
    }
    static seeAlso(): CommandDetail[] | void { }
    static extraSection(): CommandSection | void {
      return {
        title: 'Platform Family Presets',
        details: [
          { name: 'linux', summary: 'Common desktop Linux platforms.' },
          { name: 'macos', summary: 'Common desktop macOS platforms.' },
          { name: 'windows', summary: 'Common desktop Windows platforms.' },
          { name: 'mobile', summary: 'Common mobile and tablet platforms.' },
          { name: 'desktop', summary: 'All common desktop platforms.' },
          { name: 'common', summary: 'All common platforms.' },
          { name: 'extended', summary: 'All supported platforms.' }
        ]
      };
    }
  
    private _os: string | null;
    private _arch: string | null;
    private _abi: string | null;
    private _platform: string | null;
    private _outDir: string;
    private _verbose: boolean;
  
    constructor(argv: string[]) {
      const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
      this._os = options.os || null;
      this._arch = options.arch || null;
      this._abi = options.abi || null;
      this._outDir = options['out-dir'];
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

      if (!options.os && !options.arch && !options.abi) {
        if (!options._unknown || options._unknown.length === 0) {
          throw new Error("No arguments found, expected platform or --os and --arch options.");
        }
        this._platform = options._unknown[0];
      } else {
        this._platform = `${options.os}-${options.arch}`;

        if (!!options.abi) {
          this._platform = `${this._platform}-${options.abi}`;
        }
      }
    }

    log(msg: string) {
      if (this._verbose) {
        console.error("[neon add] " + msg);
      }
    }
  
    async addPlatform(libManifest: LibraryManifest): Promise<void> {
      if (!this._platform) {
        this.log('adding default system platform');
        await libManifest.addRustTarget(await getCurrentTarget(msg => this.log(msg)));
      } else if (isRustTarget(this._platform)) {
        this.log(`adding Rust target ${this._platform}`);
        await libManifest.addRustTarget(this._platform);
      } else if (isNodePlatform(this._platform)) {
        this.log(`adding Node platform ${this._platform}`);
        await libManifest.addNodePlatform(this._platform);
      } else if (isPlatformPreset(this._platform)) {
        await libManifest.addPlatformPreset(this._platform);
      } else {
        throw new Error(`unrecognized platform or preset ${this._platform}`);
      }
    }

    async run() {
      this.log(`reading package.json`);
      const libManifest = await LibraryManifest.load();
      this.log(`manifest: ${libManifest.stringify()}`);

      await this.addPlatform(libManifest);
      if (libManifest.hasUnsavedChanges()) {
        libManifest.updatePlatforms();
        libManifest.saveChanges(msg => this.log(msg));
      }
    }
  }
  