import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as temp from 'temp';
import commandLineArgs from 'command-line-args';
import { execa } from 'execa';
import { Command, CommandDetail } from '../command.js';

const mktemp = temp.track().mkdir;

const OPTIONS = [
  { name: 'file', alias: 'f', type: String, defaultValue: 'index.node' },
  { name: 'target', alias: 't', type: String, defaultValue: null },
  { name: 'in-dir', alias: 'i', type: String, defaultValue: null },
  { name: 'out-dir', alias: 'o', type: String, defaultValue: null }
];

import RUST from '../../data/rust.json';

type RustTarget = keyof(typeof RUST);

function isRustTarget(x: string): x is RustTarget {
  return (x in RUST);
}

import NODE from '../../data/node.json';

type NodeTarget = keyof(typeof NODE);

function isNodeTarget(x: any): x is NodeTarget {
  return (typeof x === 'string') && (x in NODE);
}

type TargetDescriptor = {
  node: string,
  platform: string,
  arch: string,
  abi: string | null,
  llvm: string[]
};

function lookup(target: RustTarget): TargetDescriptor {
  const node = RUST[target];
  if (!isNodeTarget(node)) {
    throw new Error(`Rust target ${target} not supported`);
  }

  return { node, ...NODE[node] };
}

export default class PackBuild implements Command {
  static summary(): string { return 'Create an npm tarball from a prebuild.'; }
  static syntax(): string { return 'neon pack-build [-f <addon>] [-t <target>] [-d <dir>]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-f, --file <addon>', summary: 'Prebuilt .node file to pack. (Default: index.node)' },
      { name: '-t, --target <target>', summary: 'Rust target triple the addon was built for. (Default: in-dir manifest target or else rustc default host)' },
      { name: '-i, --in-dir <path>', summary: 'Input directory with package manifest, created automatically by default. (Default: temp dir)' },
      { name: '-o, --out-dir <path>', summary: 'Output directory, recursively created if needed. (Default: ./dist)' }
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

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv });

    this._target = options.target || null;
    this._addon = options.file;
    this._inDir = options['in-dir'] || null;
    this._outDir = options['out-dir'] || path.join(process.cwd(), 'dist');
  }

  async currentTarget(): Promise<string> {
    const result = await execa("rustc", ["-vV"], { shell: true });

    if (result.exitCode !== 0) {
      throw new Error(`Could not determine current Rust target: ${result.stderr}`);
    }

    const hostLine = result.stdout.split(/\n/).find(line => line.startsWith('host:'));

    if (!hostLine) {
      throw new Error("Could not determine current Rust target (unexpected rustc output)");
    }

    return hostLine.replace(/^host:\s+/, '');
  }

  async createTempDir(manifest: any): Promise<string> {
    const version = manifest.version;
    const targets = manifest.neon.targets;
    const target = this._target || await this.currentTarget();

    if (!isRustTarget(target)) {
      throw new Error(`Rust target ${target} not supported.`);
    }

    const name = targets[target];

    if (!name) {
      throw new Error(`Rust target ${target} not found in package.json.`);
    }

    const targetInfo = lookup(target);
    const description = `Prebuilt binary package for \`${manifest.name}\` on \`${targetInfo.node}\`.`;

    let prebuildManifest: Record<string, any> = {
      name,
      description,
      version,
      os: [targetInfo.platform],
      cpu: [targetInfo.arch],
      main: "index.node",
      files: ["index.node"],
      neon: {
        binary: {
          rust: target,
          node: targetInfo.node,
          platform: targetInfo.platform,
          arch: targetInfo.arch,
          abi: targetInfo.abi
        }
      }
    };

    const OPTIONAL_KEYS = [
      'author', 'repository', 'keywords', 'bugs', 'homepage', 'license', 'engines'
    ];

    for (const key of OPTIONAL_KEYS) {
      if (manifest[key]) {
        prebuildManifest[key] = manifest[key];
      }
    }

    const tmpdir = await mktemp('neon-');

    await fs.writeFile(path.join(tmpdir, "package.json"), JSON.stringify(prebuildManifest, null, 2));
    await fs.copyFile(this._addon, path.join(tmpdir, "index.node"));
    await fs.writeFile(path.join(tmpdir, "README.md"), `# \`${name}\`\n\n${description}\n`);

    return tmpdir;
  }

  async prepareInDir(manifest: any): Promise<string> {
    if (!this._inDir) {
      return await this.createTempDir(manifest);
    }

    const version = manifest.version;
    const binaryManifest = JSON.parse(await fs.readFile(path.join(this._inDir, 'package.json'), { encoding: 'utf8' }));

    const binaryTarget = binaryManifest.neon.binary.rust || null;

    if (binaryTarget && this._target && (binaryTarget !== this._target)) {
      throw new Error(`Specified target ${this._target} does not match target ${binaryTarget} in ${this._inDir}`);
    }

    const target = binaryTarget || this._target || await this.currentTarget();
    if (!isRustTarget(target)) {
      throw new Error(`Rust target ${target} not supported.`);
    }

    const descriptor = lookup(target);
    binaryManifest.neon = binaryManifest.neon || {};
    binaryManifest.neon.binary = {
      rust: target,
      node: descriptor.node,
      platform: descriptor.platform,
      arch: descriptor.arch,
      abi: descriptor.abi
    };
    // FIXME: make it possible to disable this
    binaryManifest.version = version;

    await fs.writeFile(path.join(this._inDir, 'package.json'), JSON.stringify(binaryManifest, null, 2), { encoding: 'utf8' });
    // FIXME: make this path configurable
    await fs.copyFile(this._addon, path.join(this._inDir, "index.node"));

    return this._inDir;
  }

  async run() {
   await fs.mkdir(this._outDir, { recursive: true });

    const manifest = JSON.parse(await fs.readFile('package.json', { encoding: 'utf8' }));

    const inDir = await this.prepareInDir(manifest);

    const result = await execa("npm", ["pack", "--json"], {
      shell: true,
      cwd: inDir,
      stdio: ['pipe', 'pipe', 'inherit']
    });

    if (result.exitCode !== 0) {
      process.exit(result.exitCode);
    }

    // FIXME: comment linking to the npm issue this fixes
    const tarball = JSON.parse(result.stdout)[0].filename.replace('@', '').replace('/', '-');

    const dest = path.join(this._outDir, tarball);

    // Copy instead of move since e.g. GitHub Actions Windows runners host temp directories
    // on a different device (which causes fs.renameSync to fail).
    await fs.copyFile(path.join(inDir, tarball), dest);

    console.log(dest);
  };
}
