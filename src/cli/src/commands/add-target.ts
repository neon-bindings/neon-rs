import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { expandTargetFamily, getCurrentTarget, isNodeTarget, isRustTarget, isTargetFamilyKey, NodeTarget, RustTarget, TargetPair } from '../target.js';
import { SourceManifest } from '../manifest.js';

const OPTIONS = [
  { name: 'bundle', alias: 'b', type: String, defaultValue: null },
  { name: 'platform', alias: 'p', type: String, defaultValue: null },
  { name: 'arch', alias: 'a', type: String, defaultValue: null },
  { name: 'abi', type: String, defaultValue: null },
  { name: 'out-dir', alias: 'o', type: String, defaultValue: 'npm' },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class AddTarget implements Command {
    static summary(): string { return 'Add a new build target to package.json.'; }
    static syntax(): string { return 'neon add-target [<t> | -p <p> -a <arch> [--abi <abi>]] [-o <d>] [-b <f>]'; }
    static options(): CommandDetail[] {
      return [
        { name: '<t>', summary: 'Full target name, in either Node or Rust convention.' },
        {
          name: '',
          summary: 'This may be a target name in either Node or Rust convention, or one of the Neon target family presets described below. (Default: current target)'
        },
        { name: '-p, --platform <p>', summary: 'Target platform name. (Default: current platform)' },
        { name: '-a, --arch <arch>', summary: 'Target architecture name. (Default: current arch)' },
        { name: '--abi <abi>', summary: 'Target ABI name. (Default: current ABI)' },
        { name: '-o, --out-dir <d>', summary: 'Output directory for target template tree. (Default: npm)' },
        { name: '-b, --bundle <f>', summary: 'File to generate bundling metadata.' },
        {
          name: '',
          summary: 'This generated file ensures support for bundlers (e.g. @vercel/ncc), which rely on static analysis to detect and enable any addons used by the library.'
        },
        { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
    }
    static seeAlso(): CommandDetail[] | void { }
    static extraSection(): CommandSection | void {
      return {
        title: 'Target Family Presets',
        details: [
          { name: 'linux', summary: 'Common desktop Linux targets.' },
          { name: 'macos', summary: 'Common desktop macOS targets.' },
          { name: 'windows', summary: 'Common desktop Windows targets.' },
          { name: 'mobile', summary: 'Common mobile and tablet targets.' },
          { name: 'desktop', summary: 'All common desktop targets.' },
          { name: 'common', summary: 'All common targets.' },
          { name: 'extended', summary: 'All supported targets.' }
        ]
      };
    }
  
    private _platform: string | null;
    private _arch: string | null;
    private _abi: string | null;
    private _target: string | null;
    private _outDir: string;
    private _bundle: string | null;
    private _verbose: boolean;
  
    constructor(argv: string[]) {
      const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
      this._platform = options.platform || null;
      this._arch = options.arch || null;
      this._abi = options.abi || null;
      this._outDir = options['out-dir'] || path.join(process.cwd(), 'dist');
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
        this._target = `${options.platform}-${options.arch}`;

        if (!!options.abi) {
          this._target = `${this._target}-${options.abi}`;
        }
      }
    }

    log(msg: string) {
      if (this._verbose) {
        console.error("[neon add-target] " + msg);
      }
    }
  
    async addTarget(sourceManifest: SourceManifest): Promise<TargetPair[]> {
      if (!this._target) {
        this.log('adding default system target');
        const pair = await sourceManifest.addRustTarget(await getCurrentTarget(msg => this.log(msg)));
        return pair ? [pair] : [];
      } else if (isRustTarget(this._target)) {
        this.log(`adding Rust target ${this._target}`);
        const pair = await sourceManifest.addRustTarget(this._target);
        return pair ? [pair] : [];
      } else if (isNodeTarget(this._target)) {
        this.log(`adding Node target ${this._target}`);
        const pair = await sourceManifest.addNodeTarget(this._target);
        return pair ? [pair] : [];
      } else if (isTargetFamilyKey(this._target)) {
        return sourceManifest.addTargets(expandTargetFamily(this._target));
      } else {
        throw new Error(`unrecognized target ${this._target}`);
      }
    }

    async createTemplateTree(sourceManifest: SourceManifest, pair: TargetPair): Promise<void> {
      const { node, rust } = pair;
      const binaryManifest = sourceManifest.manifestFor(rust);
      this.log(`prebuild manifest: ${binaryManifest.stringify()}`);

      const treeDir = path.join(this._outDir, node);

      this.log(`creating ${treeDir}`);
      await fs.mkdir(treeDir, { recursive: true });
      this.log(`created ${treeDir}`);

      this.log(`creating ${treeDir}/package.json`);
      await binaryManifest.save(treeDir);

      this.log(`creating ${treeDir}/README.md`);
      await fs.writeFile(path.join(treeDir, "README.md"), `# \`${binaryManifest.name}\`\n\n${binaryManifest.description}\n`);
    }

    async run() {
      this.log(`reading package.json`);
      const sourceManifest = await SourceManifest.load();
      this.log(`manifest: ${sourceManifest.stringify()}`);

      const modified = await this.addTarget(sourceManifest);
      if (modified.length) {
        sourceManifest.updateTargets(msg => this.log(msg), this._bundle);
        for (const pair of modified) {
          await this.createTemplateTree(sourceManifest, pair);
        }
      }
    }
  }
  