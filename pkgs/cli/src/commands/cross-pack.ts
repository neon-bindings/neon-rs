import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import * as temp from 'temp';
import commandLineArgs from 'command-line-args';
import { execa } from 'execa';
import { Command } from '../command.js';

const mktemp = temp.track().mkdir;

const OPTIONS = [
  { name: 'file', alias: 'f', type: String, defaultValue: 'index.node' },
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

export default function parse(argv: string[]): Command {
  const options = commandLineArgs(OPTIONS, { argv, stopAtFirstUnknown: true });

  argv = options._unknown || [];

  if (argv.length === 0) {
    throw new Error("Expected <target>.");
  }

  if (argv.length > 1) {
    throw new Error(`Unexpected argument \`${argv[1]}\`.`)
  }

  const target = argv[0];

  const addon: string = options.file;

  const outDir: string = options['out-dir'] || path.join(process.cwd(), 'dist');

  return async () => {
    await fs.mkdir(outDir, { recursive: true });

    const manifest = JSON.parse(await fs.readFile('package.json', { encoding: 'utf8' }));

    const version = manifest.version;
    const targets = manifest.neon.targets;
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
    await fs.copyFile(addon, path.join(tmpdir, "index.node"));
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

    const dest = path.join(outDir, tarball);

    // Copy instead of move since e.g. GitHub Actions Windows runners host temp directories
    // on a different device (which causes fs.renameSync to fail).
    await fs.copyFile(path.join(tmpdir, tarball), dest);

    console.log(dest);
  };
}
