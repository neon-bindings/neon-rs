import { printMainUsage, printCommandUsage, printShowTopicUsage } from '../print.js';
import { Command, CommandName, CommandDetail, CommandSection, asCommandName } from '../command.js';
import { Topic, asTopic } from './show.js';

export default class Help implements Command {
  static summary(): string { return 'Display help information about Neon.'; }
  static syntax(): string { return 'neon help <command>'; }
  static options(): CommandDetail[] {
    return [
      { name: '<command>', summary: 'Command to display help information about.' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void { }

  private _name?: CommandName;
  private _topic?: Topic;

  constructor(argv: string[]) {
    this._name = argv.length > 0 ? asCommandName(argv[0]) : undefined;
    this._topic = undefined;

    if (this._name === CommandName.Show) {
      if (argv.length === 2) {
        this._topic = asTopic(argv[1]);
      }
      if (argv.length > 2) {
        throw new Error(`Unexpected argument: ${argv[2]}`);
      }
    } else if (argv.length > 1) {
      throw new Error(`Unexpected argument: ${argv[1]}`);
    }
  }

  async run() {
    if (this._topic) {
      printShowTopicUsage(this._topic);
    } else if (this._name) {
      printCommandUsage(this._name);
    } else {
      printMainUsage();
    }
  }
}
