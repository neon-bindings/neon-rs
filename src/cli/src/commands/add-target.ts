import commandLineArgs from 'command-line-args';
import { Command, CommandDetail } from '../command.js';
import { getCurrentTarget, isNodeTarget, isRustTarget } from '../target.js';
import { SourceManifest } from '../manifest.js';

const OPTIONS = [
  { name: 'bundle', alias: 'b', type: String, defaultValue: null },
  { name: 'platform', alias: 'p', type: String, defaultValue: null },
  { name: 'arch', alias: 'a', type: String, defaultValue: null },
  { name: 'abi', type: String, defaultValue: null },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class AddTarget implements Command {
    static summary(): string { return 'Add a new build target to package.json.'; }
    static syntax(): string { return 'neon add-target [<target> | -p <plat> -a <arch> [--abi <abi>]] [-b <file>]'; }
    static options(): CommandDetail[] {
      return [
        { name: '<target>', summary: 'Full target name, in either Node or Rust convention. (Default: current target)' },
        { name: '-p, --platform <plat>', summary: 'Target platform name. (Default: current platform)' },
        { name: '-a, --arch <arch>', summary: 'Target architecture name. (Default: current arch)' },
        { name: '--abi <abi>', summary: 'Target ABI name. (Default: current ABI)' },
        { name: '-b, --bundle <file>', summary: 'File to generate bundling metadata.' },
        {
          name: '',
          summary: 'This generated file ensures support for bundlers (e.g. @vercel/ncc), which rely on static analysis to detect and enable any addons used by the library.'
        },
        { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
    }
    static seeAlso(): CommandDetail[] | void {
      return [
      ];
    }
  
    private _platform: string | null;
    private _arch: string | null;
    private _abi: string | null;
    private _target: string | null;
    private _bundle: string | null;
    private _verbose: boolean;
  
    constructor(argv: string[]) {
      const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
      this._platform = options.platform || null;
      this._arch = options.arch || null;
      this._abi = options.abi || null;
      this._bundle = options.bundle || null;
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

      if (!options.platform && !options.arch && !options.abi) {
        if (!options._unknown || options._unknown.length === 0) {
          throw new Error("No arguments found, expected <target> or -p and -a options.");
        }
        this._target = options._unknown[0];
      } else {
        this._target = null;
      }
    }

    log(msg: string) {
      if (this._verbose) {
        console.error("[neon add-target] " + msg);
      }
    }
  
    async addTarget(sourceManifest: SourceManifest): Promise<boolean> {
      if (!this._target) {
        this.log('adding default system target');
        return sourceManifest.addRustTarget(await getCurrentTarget(msg => this.log(msg)));
      } else if (isRustTarget(this._target)) {
        this.log(`adding Rust target ${this._target}`);
        return sourceManifest.addRustTarget(this._target);
      } else if (isNodeTarget(this._target)) {
        this.log(`adding Node target ${this._target}`);
        return sourceManifest.addNodeTarget(this._target);
      } else {
        throw new Error(`unrecognized target ${this._target}`);
      }
    }

    async run() {
      this.log(`reading package.json`);
      const sourceManifest = await SourceManifest.load();
      this.log(`manifest: ${sourceManifest.stringify()}`);

      if (await this.addTarget(sourceManifest)) {
        sourceManifest.updateTargets(msg => this.log(msg), this._bundle);
      }
    }
  }
  