import { execa } from 'execa';
import commandLineArgs from 'command-line-args';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Command, CommandDetail } from '../command.js';

const OPTIONS = [
  { name: 'bundle', alias: 'b', type: String, defaultValue: null },
  { name: 'no-bundle', alias: 'B', type: String, defaultValue: null }
];

export default class CrossInstall implements Command {
  static summary(): string { return 'Install dependencies on cross-compiled prebuilds'; }
  static syntax(): string { return 'neon cross-install [-b <file>|-B]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-b, --bundle <file>', summary: 'File to generate bundling metadata. (Default: .targets)' },
      {
        name: '',
        summary: 'This generated file ensures support for bundlers (e.g. @vercel/ncc), which rely on static analysis to detect and enable any addons used by the library.'
      },
      { name: '-B, --no-bundle', summary: 'Do not generate bundling metadata.' }
    ];
  }
  static seeAlso(): CommandDetail[] | void {
    return [
      { name: 'ncc', summary: '<https://github.com/vercel/ncc>' }
    ];
  }

  private _bundle: string | null;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv });

    if (options.bundle && options['no-bundle']) {
      throw new Error("Options --bundle and --no-bundle cannot both be enabled.");
    }

    this._bundle = options['no-bundle']
      ? null
      : !options.bundle
      ? '.targets'
      : options.bundle;
  }

  async run() {
    const manifest = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json'), { encoding: 'utf8' }));
    const version = manifest.version;

    const targets = Object.values(manifest.neon.targets);
    const specs = targets.map(name => `${name}@${version}`);

    const result = await execa('npm', ['install', '--save-exact', '-O', ...specs], { shell: true });
    if (result.exitCode !== 0) {
      console.error(result.stderr);
      process.exit(result.exitCode);
    }

    if (!this._bundle) {
      return;
    }

    const PREAMBLE =
`// AUTOMATICALLY GENERATED FILE. DO NOT EDIT.
//
// This code is never executed but is detected by the static analysis of
// bundlers such as \`@vercel/ncc\`. The require() expression that selects
// the right binary module for the current platform is too dynamic to be
// analyzable by bundler analyses, so this module provides an exhaustive
// static list for those analyses.

return;

`;

    const requires = targets.map(name => `require('${name}');`).join('\n');

    await fs.writeFile(this._bundle, PREAMBLE + requires + '\n');
  }
}
