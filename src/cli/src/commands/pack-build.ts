import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as temp from 'temp';
import commandLineArgs from 'command-line-args';
import { execa } from 'execa';
import { Command, CommandDetail } from '../command.js';
import { getTargetDescriptor, isRustTarget } from '../target.js';
import { SourceManifest, BinaryManifest } from '../manifest.js';

const mktemp = temp.track().mkdir;

const OPTIONS = [
  { name: 'file', alias: 'f', type: String, defaultValue: 'index.node' },
  { name: 'target', alias: 't', type: String, defaultValue: null },
  { name: 'in-dir', alias: 'i', type: String, defaultValue: null },
  { name: 'out-dir', alias: 'o', type: String, defaultValue: null },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false },
];

export default class PackBuild implements Command {
  static summary(): string { return 'Create an npm tarball from a prebuild.'; }
  static syntax(): string { return 'neon pack-build [-f <addon>] [-t <target>] [-i <dir>] [-o <dir>] [-v]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-f, --file <addon>', summary: 'Prebuilt .node file to pack. (Default: index.node)' },
      { name: '-t, --target <target>', summary: 'Rust target triple the addon was built for. (Default: in-dir manifest target or else rustc default host)' },
      { name: '-i, --in-dir <path>', summary: 'Input directory with package manifest, created automatically by default. (Default: temp dir)' },
      { name: '-o, --out-dir <path>', summary: 'Output directory, recursively created if needed. (Default: ./dist)' },
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void {
    return [
      { name: 'Rust platform support', summary: '<https://doc.rust-lang.org/rustc/platform-support.html>' },
      { name: 'npm pack', summary: '<https://docs.npmjs.com/cli/commands/npm-pack>' },
      { name: 'cross-rs', summary: '<https://github.com/cross-rs/cross>' }
    ];
  }

  private _target: string | null;
  private _addon: string;
  private _inDir: string | null;
  private _outDir: string;
  private _verbose: boolean;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv });

    this._target = options.target || null;
    this._addon = options.file;
    this._inDir = options['in-dir'] || null;
    this._outDir = options['out-dir'] || path.join(process.cwd(), 'dist');
    this._verbose = !!options.verbose;
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon pack-build] " + msg);
    }
  }

  async currentTarget(): Promise<string> {
    this.log(`rustc -vV`);
    const result = await execa("rustc", ["-vV"], { shell: true });

    if (result.exitCode !== 0) {
      throw new Error(`Could not determine current Rust target: ${result.stderr}`);
    }

    const hostLine = result.stdout.split(/\n/).find(line => line.startsWith('host:'));
    this.log(`found host line: ${hostLine}`);

    if (!hostLine) {
      throw new Error("Could not determine current Rust target (unexpected rustc output)");
    }

    const target = hostLine.replace(/^host:\s+/, '');
    this.log(`currentTarget result: "${target}"`);

    return target;
  }

  async createTempDir(sourceManifest: SourceManifest): Promise<string> {
    const target = this._target || await this.currentTarget();

    if (!isRustTarget(target)) {
      throw new Error(`Rust target ${target} not supported.`);
    }

    const binaryManifest = sourceManifest.manifestFor(target);
    this.log(`prebuild manifest: ${binaryManifest.stringify()}`);

    this.log("creating temp dir");
    const tmpdir = await mktemp('neon-');
    this.log(`created temp dir ${tmpdir}`);

    this.log(`creating ${tmpdir}/package.json`)
    await binaryManifest.save(tmpdir);

    this.log(`copying ${this._addon} to ${tmpdir}/index.node`);
    await fs.copyFile(this._addon, path.join(tmpdir, "index.node"));

    this.log(`creating ${tmpdir}/README.md`);
    await fs.writeFile(path.join(tmpdir, "README.md"), `# \`${binaryManifest.name}\`\n\n${binaryManifest.description}\n`);

    return tmpdir;
  }

  async prepareInDir(sourceManifest: SourceManifest): Promise<string> {
    if (!this._inDir) {
      return await this.createTempDir(sourceManifest);
    }

    const version = sourceManifest.version;
    const binaryManifest = await BinaryManifest.load(this._inDir);

    const cfg = binaryManifest.cfg();

    if (this._target && (cfg.rust !== this._target)) {
      throw new Error(`Specified target ${this._target} does not match target ${cfg.rust} in ${this._inDir}`);
    }

    const targetInfo = getTargetDescriptor(cfg.rust);

    cfg.node = targetInfo.node;
    cfg.platform = targetInfo.platform;
    cfg.arch = targetInfo.arch;
    cfg.abi = targetInfo.abi;

    // FIXME: make it possible to disable this
    binaryManifest.version = version;

    this.log(`binary manifest: ${binaryManifest.stringify()}`);

    this.log(`creating ${this._inDir}/package.json`);
    await binaryManifest.save(this._inDir);

    // FIXME: make this path configurable
    this.log(`copying ${this._addon} to ${this._inDir}/index.node`);
    await fs.copyFile(this._addon, path.join(this._inDir, "index.node"));

    return this._inDir;
  }

  async run() {
    this.log(`creating directory ${this._outDir}`);
    await fs.mkdir(this._outDir, { recursive: true });

    this.log(`reading package.json`);
    const sourceManifest = await SourceManifest.load();
    this.log(`manifest: ${sourceManifest.stringify()}`);

    const inDir = await this.prepareInDir(sourceManifest);

    this.log(`npm pack --json`);
    const result = await execa("npm", ["pack", "--json"], {
      shell: true,
      cwd: inDir,
      stdio: ['pipe', 'pipe', 'inherit']
    });

    if (result.exitCode !== 0) {
      this.log(`npm pack failed with exit code ${result.exitCode}`);
      process.exit(result.exitCode);
    }

    // FIXME: comment linking to the npm issue this fixes
    const tarball = JSON.parse(result.stdout)[0].filename.replace('@', '').replace('/', '-');
    this.log(`tarball filename: ${tarball}`);

    const dest = path.join(this._outDir, tarball);

    this.log(`copying ${path.join(inDir, tarball)} to ${dest}`);
    // Copy instead of move since e.g. GitHub Actions Windows runners host temp directories
    // on a different device (which causes fs.renameSync to fail).
    await fs.copyFile(path.join(inDir, tarball), dest);

    console.log(dest);
  };
}
