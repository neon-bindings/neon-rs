import commandLineArgs from 'command-line-args';
import { Command, CommandDetail, CommandSection } from '../../command.js';
import { currentPlatform } from '@neon-rs/load';

const OPTIONS = [
  { name: 'json', type: Boolean, defaultValue: false },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export default class System implements Command {
  static summary(): string { return 'Display information about the current system.'; }
  static syntax(): string { return 'neon show system [--json] [-v]'; }
  static options(): CommandDetail[] {
    return [
      { name: '--json', summary: 'Display platform info in JSON format. (Default: false)' },
      { name: '-v, --verbose', summary: 'Enable verbose logging. (Default: false)' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void { }
  
  private _json: boolean;
  private _verbose: boolean;

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, partial: true });
  
    this._json = options.json || false;
    this._verbose = !!options.verbose;
  }

  log(msg: string) {
    if (this._verbose) {
      console.error("[neon show system] " + msg);
    }
  }

  async run() {
    if (this._json) {
      const [os, arch, abi] = currentPlatform().split('-');
      const json = {
        os,
        arch,
        abi: abi || null
      };
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log(currentPlatform());
    }
  }
}
