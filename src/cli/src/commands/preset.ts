import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { assertIsPlatformPreset, expandPlatformPreset, PlatformPreset } from '../platform.js';

const OPTIONS = [
  { name: 'pretty', alias: 'p', type: Boolean, defaultValue: true },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class Preset implements Command {
  static summary(): string { return 'Display the JSON target data for a platform preset.'; }
  static syntax(): string { return 'neon preset [-v] <preset>'; }
  static options(): CommandDetail[] {
    return [
      { name: '<preset>', summary: 'The target family preset to look up.' },
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void { }
  
  private _verbose: boolean;
  private _preset: PlatformPreset;
  
  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
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
      console.error("[neon preset] " + msg);
    }
  }
  
  async run() {
    const map = expandPlatformPreset(this._preset);
    console.log(JSON.stringify(map, null, 2));
  }
}
