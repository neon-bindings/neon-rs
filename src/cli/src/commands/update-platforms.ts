import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { LibraryManifest } from '@neon-rs/manifest';

const OPTIONS = [
  { name: 'bundle', alias: 'b', type: String, defaultValue: null },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class UpdatePlatforms implements Command {
  static summary(): string { return 'Update dependencies for all build targets in package.json.'; }
  static syntax(): string { return 'neon update-platforms [-b <file>]'; }
  static options(): CommandDetail[] {
    return [
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
      { name: 'ncc', summary: '<https://github.com/vercel/ncc>' }
    ];
  }
  static extraSection(): CommandSection | void { }

  private _bundle: string | null;
  private _verbose: boolean;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv });

    this._bundle = options.bundle || null;
    this._verbose = !!options.verbose;
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon update-platforms] " + msg);
    }
  }

  async run() {
    this.log(`reading package.json (CWD=${process.cwd()})`);
    const libManifest = await LibraryManifest.load();
    const version = libManifest.version;
    this.log(`package.json before: ${libManifest.stringify()}`);
    this.log(`determined version: ${version}`);

    if (libManifest.upgraded) {
      this.log(`upgrading manifest format`);
      await libManifest.save();
    }

    libManifest.updateTargets(msg => this.log(msg), this._bundle);
  }
}
