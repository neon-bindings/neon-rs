import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { getCurrentTarget, isNodePlatform, isRustTarget, isPlatformPreset, TargetPair } from '../platform.js';
import { SourceManifest } from '../manifest.js';

function optionArray<T>(option: T | undefined | null): T[] {
  return option == null ? [] : [option];
}

const OPTIONS = [
  { name: 'bundle', alias: 'b', type: String, defaultValue: null },
  { name: 'os', type: String, defaultValue: null },
  { name: 'arch', type: String, defaultValue: null },
  { name: 'abi', type: String, defaultValue: null },
  { name: 'out-dir', alias: 'o', type: String, defaultValue: 'platforms' },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class AddPlatform implements Command {
    static summary(): string { return 'Add a platform or platform preset to a Neon project.'; }
    static syntax(): string { return 'neon add-platform [<p> | --os <a> --arch <b> [--abi <c>]] [-o <d>] [-b <f>]'; }
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
        { name: '-b, --bundle <f>', summary: 'File to generate bundling metadata. (Default: none)' },
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
    private _bundle: string | null;
    private _verbose: boolean;
  
    constructor(argv: string[]) {
      const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
      this._os = options.os || null;
      this._arch = options.arch || null;
      this._abi = options.abi || null;
      this._outDir = options['out-dir'];
      this._bundle = options.bundle || null;
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
        console.error("[neon add-platform] " + msg);
      }
    }
  
    async addPlatform(sourceManifest: SourceManifest): Promise<TargetPair[]> {
      if (!this._platform) {
        this.log('adding default system platform');
        return optionArray(await sourceManifest.addRustTarget(await getCurrentTarget(msg => this.log(msg))));
      } else if (isRustTarget(this._platform)) {
        this.log(`adding Rust target ${this._platform}`);
        return optionArray(await sourceManifest.addRustTarget(this._platform));
      } else if (isNodePlatform(this._platform)) {
        this.log(`adding Node platform ${this._platform}`);
        return optionArray(await sourceManifest.addNodePlatform(this._platform));
      } else if (isPlatformPreset(this._platform)) {
        return sourceManifest.addPlatformPreset(this._platform);
      } else {
        throw new Error(`unrecognized platform or preset ${this._platform}`);
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

      const modified = await this.addPlatform(sourceManifest);
      if (modified.length) {
        sourceManifest.updateTargets(msg => this.log(msg), this._bundle);
        for (const pair of modified) {
          await this.createTemplateTree(sourceManifest, pair);
        }
      }
    }
  }
  