import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as temp from 'temp';
import commandLineArgs from 'command-line-args';
import { execa } from 'execa';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { getTargetDescriptor, isRustTarget } from '../platform.js';
import { LibraryManifest, BinaryManifest } from '../manifest.js';
import { getCurrentTarget } from '../target.js';

const mktemp = temp.track().mkdir;

const OPTIONS = [
  { name: 'file', alias: 'f', type: String, defaultValue: 'index.node' },
  { name: 'target', alias: 't', type: String, defaultValue: null },
  { name: 'in-dir', alias: 'i', type: String, defaultValue: null },
  { name: 'out-dir', alias: 'o', type: String, defaultValue: null },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false },
];

export default class Tarball implements Command {
  static summary(): string { return 'Create an npm tarball from a binary .node file.'; }
  static syntax(): string { return 'neon tarball [-f <addon>] [-t <target>] [-i <dir>] [-o <dir>] [-v]'; }
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
  static extraSection(): CommandSection | void { }

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
      console.error("[neon tarball] " + msg);
    }
  }

  async createTempDir(libManifest: LibraryManifest): Promise<string> {
    const target = this._target || await getCurrentTarget(msg => this.log(msg));

    if (!isRustTarget(target)) {
      throw new Error(`Rust target ${target} not supported.`);
    }

    const binaryManifest = libManifest.manifestFor(target);
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

  async prepareInDir(libManifest: LibraryManifest): Promise<string> {
    if (!this._inDir) {
      return await this.createTempDir(libManifest);
    }

    const version = libManifest.version;
    const binaryManifest = await BinaryManifest.load(this._inDir);

    const cfg = binaryManifest.cfg();

    // Since the source manifest is the source of truth, any time there's a
    // metadata mismatch between source and binary manifests, binary is wrong.
    if (this._target && (cfg.rust !== this._target)) {
      throw new Error(`Specified target ${this._target} does not match target ${cfg.rust} in ${this._inDir}`);
    }

    const targetInfo = getTargetDescriptor(cfg.rust);

    cfg.node = targetInfo.node;
    cfg.os = targetInfo.os;
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
    const libManifest = await LibraryManifest.load();
    this.log(`manifest: ${libManifest.stringify()}`);

    const inDir = await this.prepareInDir(libManifest);

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

    // NOTE: This is a workaround for https://github.com/npm/cli/issues/3405
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
