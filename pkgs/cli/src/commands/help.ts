import { printUsage } from '../print.js';
import { Command, CommandName, CommandDetail, asCommandName } from '../command.js';

export default class Help implements Command {
  static summary(): string { return 'Display help information about Neon'; }
  static syntax(): string { return 'neon help <command>'; }
  static options(): CommandDetail[] {
    return [
      { name: '<command>', summary: 'Command to display help information about.' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }

  private _name?: CommandName;

  constructor(argv: string[]) {
    this._name = argv.length > 0 ? asCommandName(argv[0]) : undefined;
    if (argv.length > 1) {
      throw new Error(`Unexpected argument: ${argv[1]}`);
    }
  }

  async run() {
    printUsage(this._name);
  }
}
