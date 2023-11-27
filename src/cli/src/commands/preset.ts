import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../command.js';
import { assertIsTargetPreset, expandTargetPreset, TargetPreset } from '../target.js';

const OPTIONS = [
  { name: 'pretty', alias: 'p', type: Boolean, defaultValue: false },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class Preset implements Command {
  static summary(): string { return 'Display the target JSON data for a given preset.'; }
  static syntax(): string { return 'neon preset [-p] [-v] <preset>'; }
  static options(): CommandDetail[] {
    return [
      { name: '<preset>', summary: 'The target family preset to look up.' },
      { name: '-p, --pretty', summary: 'Pretty-print the JSON output. (Default: false)' },
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void { }
  
  private _pretty: boolean;
  private _verbose: boolean;
  private _preset: TargetPreset;
  
  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
    this._pretty = options.pretty || false;
    this._verbose = !!options.verbose;

    if (!options._unknown || options._unknown.length === 0) {
      throw new Error("Missing argument, expected <preset>");
    }

    if (options._unknown.length > 1) {
      throw new Error(`Unexpected argument ${options._unknown[1]}`);
    }

    assertIsTargetPreset(options._unknown[0]);
    this._preset = options._unknown[0];
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon preset] " + msg);
    }
  }
  
  async run() {
    const map = expandTargetPreset(this._preset);
    const output = this._pretty
      ? JSON.stringify(map, null, 2)
      : JSON.stringify(map);
    console.log(output);
  }
}
