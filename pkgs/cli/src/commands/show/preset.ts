import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../../command.js';
import { assertIsPlatformPreset, expandPlatformPreset, PlatformPreset, NodePlatform, PlatformMap } from '@neon-rs/manifest/platform';

const OPTIONS = [
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class Preset implements Command {
  static summary(): string { return 'Display target information about a platform preset.'; }
  static syntax(): string { return 'neon show preset [-v] <preset>'; }
  static options(): CommandDetail[] {
    return [
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' },
      { name: '<preset>', summary: 'The target family preset to look up.' },
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void { }
  
  private _json: boolean;
  private _verbose: boolean;
  private _preset: PlatformPreset;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
    this._json = options.json || false;
    this._verbose = !!options.verbose;

    if (!options._unknown || options._unknown.length === 0) {
      throw new Error("Missing argument, expected <preset>");
    }

    if (options._unknown.length > 1) {
      throw new Error(`Unexpected argument ${options._unknown[1]}`);
    }

    assertIsPlatformPreset(options._unknown[0]);
    this._preset = options._unknown[0];
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon show preset] " + msg);
    }
  }

  async run() {
    const map = expandPlatformPreset(this._preset);
    console.log(JSON.stringify(map, null, 2));
  }
}
