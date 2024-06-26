import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../../command.js';
import { LibraryManifest } from '@neon-rs/manifest';

const OPTIONS = [
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class Platforms implements Command {
  static summary(): string { return 'Display information about this project\'s supported platforms.'; }
  static syntax(): string { return 'neon show platforms [-v]'; }
  static options(): CommandDetail[] {
    return [
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void { }
  
  private _verbose: boolean;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
    this._verbose = !!options.verbose;
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon show platforms] " + msg);
    }
  }

  async run() {
    this.log(`reading package.json`);
    const libManifest = await LibraryManifest.load();
    this.log(`manifest: ${libManifest.stringify()}`);
    const platforms = libManifest.allPlatforms();
    console.log(JSON.stringify(platforms, null, 2));
  }
}
