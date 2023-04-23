import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import * as temp from 'temp';
import commandLineArgs from 'command-line-args';
import { execa } from 'execa';
import { Command, CommandDetail } from '../command.js';

const mktemp = temp.track().mkdir;

const OPTIONS = [
  { name: 'file', alias: 'f', type: String, defaultValue: 'index.node' },
  { name: 'target', alias: 't', type: String, defaultValue: null },
  { name: 'out-dir', alias: 'd', type: String, defaultValue: null }
];

const require = createRequire(import.meta.url);

const LLVM = require('../../data/llvm.json');
const NODE = require('../../data/node.json');

type TargetDescriptor = {
  platform: string,
  arch: string,
  abi: string | null,
  node: string,
  llvm: string
};

function lookup(target: string): TargetDescriptor {
  const path = LLVM[target];
  if (!path) {
    throw new Error(`Rust target ${target} not supported`);
  }
  const [platform, arch, abi] = path;
  return NODE[platform][arch][abi];
}

export default class PackBuild implements Command {
  static summary(): string { return 'Create an npm tarball from a prebuild.'; }
  static syntax(): string { return 'neon pack-build [-f <addon>] [-t <target>] [-d <dir>]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-f, --file <addon>', summary: 'Prebuilt .node file to pack. (Default: index.node)' },
      { name: '-t, --target <target>', summary: 'Rust target triple the addon was built for. (Default: rustc default host)' },
      { name: '-d, --out-dir <path>', summary: 'Output directory, recursively created if needed. (Default: ./dist)' }
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
  private _outDir: string;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv });

    this._target = options.target || null;
    this._addon = options.file;
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

  async run() {
   await fs.mkdir(this._outDir, { recursive: true });

    const manifest = JSON.parse(await fs.readFile('package.json', { encoding: 'utf8' }));

    const version = manifest.version;
    const targets = manifest.neon.targets;
    const target = this._target || await this.currentTarget();
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
      files: ["README.md", "index.node"]
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

    const result = await execa("npm", ["pack", "--json"], {
      shell: true,
      cwd: tmpdir,
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
    await fs.copyFile(path.join(tmpdir, tarball), dest);

    console.log(dest);
  };
}
