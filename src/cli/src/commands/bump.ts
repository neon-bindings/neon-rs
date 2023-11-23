import { execa } from 'execa';
import commandLineArgs from 'command-line-args';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Command, CommandDetail, CommandSection } from '../command.js';

const OPTIONS = [
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false },
  { name: 'dir', alias: 'd', type: String, defaultValue: null },
  { name: 'workspaces', type: Boolean, defaultValue: false },
  { name: 'binaries', alias: 'b', type: String, defaultValue: null }
];

async function subdirs(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);

  let dirs = [];

  for (const entry of entries) {
    if ((await fs.stat(path.join(dir, entry))).isDirectory()) {
      dirs.push(entry);
    }
  }

  return dirs;
}

export default class Bump implements Command {
  static summary(): string { return 'Portably bump package versions in a project tree.'; }
  static syntax(): string { return 'neon bump [-v] (-d <dir>|--workspaces|-b <dir>) [<version>|major|minor|patch]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-d, --dir <dir>', summary: 'Run `npm version <version>` in another directory.' },
      { name: '--workspaces', summary: 'Run `npm version --workspaces <version>` in the current directory.' },
      { name: '-b, --binaries <dir>', summary: 'Run `npm version --force <version>` on all binary packages in <dir>.' },
      { name: '', summary: 'The --force parameter causes npm to ignore `os` and `cpu` constraints in the binary packages\' manifests that might not match the current system.' },
      { name: '<version>', summary: 'The new package version. (Default: $npm_package_version)' },
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void {
    return [
      { name: 'npm version', summary: '<https://docs.npmjs.com/cli/commands/npm-version>' }
    ];
  }
  static extraSection(): CommandSection | void { }

  private _verbose: boolean;
  private _dir: string | null;
  private _workspaces: boolean;
  private _binaries: string | null;
  private _version: string;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, partial: true });

    this._verbose = options.verbose;
    this._dir = options.dir || null;
    this._workspaces = options.workspaces;
    this._binaries = options.binaries || null;

    if ([this._dir, this._workspaces, this._binaries].filter(x => !!x).length > 1) {
      throw new Error("Only one of --dir, --workspaces, or --binaries can be specified.");
    }

    this._version = (!options._unknown || !options._unknown.length)
      ? process.env.npm_package_version
      : options[0];
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon bump] " + msg);
    }
  }

  async bumpDir(dir: string) {
    this.log(`CWD=${dir} npm version ${this._version}`);
    const result = await execa('npm', ['version', this._version], { cwd: dir, shell: true });
    if (result.exitCode !== 0) {
      console.error(result.stderr);
      process.exit(result.exitCode);
    }
  }

  async bumpWorkspaces() {
    this.log(`npm version --workspaces ${this._version}`);
    const result = await execa('npm', ['version', "--workspaces", this._version], { shell: true });
    if (result.exitCode !== 0) {
      console.error(result.stderr);
      process.exit(result.exitCode);
    }
  }

  async bumpBinaries(binaries: string) {
    const binariesPath = path.join(...binaries.split('/'));
    const dirs = await subdirs(binariesPath);
    for (const dir of dirs) {
      const dirPath = path.join(binariesPath, dir);
      this.log(`CWD=${dirPath} npm version --force ${this._version}`);
      const result = await execa('npm', ['version', "--force", this._version], { cwd: dirPath, shell: true });
      if (result.exitCode !== 0) {
        console.error(result.stderr);
        process.exit(result.exitCode);
      }
    }
  }

  async run() {
    if (this._dir) {
      await this.bumpDir(this._dir);
    } else if (this._workspaces) {
      await this.bumpWorkspaces();
    } else if (this._binaries) {
      await this.bumpBinaries(this._binaries);
    }
  }
}
