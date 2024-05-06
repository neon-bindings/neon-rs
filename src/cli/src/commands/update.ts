import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { LibraryManifest } from '@neon-rs/manifest';

const OPTIONS = [
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class Update implements Command {
  static summary(): string { return 'Update configuration for all build platforms in package.json.'; }
  static syntax(): string { return 'neon update [-v]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void { }

  private _verbose: boolean;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv });

    this._verbose = !!options.verbose;
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon update] " + msg);
    }
  }

  async run() {
    this.log(`reading package.json (CWD=${process.cwd()})`);
    const libManifest = await LibraryManifest.load();
    const version = libManifest.version;
    this.log(`package.json before: ${libManifest.stringify()}`);
    this.log(`determined version: ${version}`);
    libManifest.updatePlatforms();
    if (libManifest.hasUnsavedChanges()) {
      libManifest.saveChanges(msg => this.log(msg));
    }
  }
}
