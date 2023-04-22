#!/usr/bin/env node

import commandLineCommands from 'command-line-commands';
import { printErrorWithUsage, printError, printMainUsage } from './print.js';
import { Command, CommandName, CommandClass, asCommandName, commandFor } from './command.js';

class Cli {
  parse(): Command {
    try {
      const { command, argv } = commandLineCommands([null, ...Object.values(CommandName)]);

      if (!command) {
        printMainUsage();
        process.exit(0);
      }

      const ctor: CommandClass = commandFor(asCommandName(command));
      return new ctor(argv);
    } catch (e) {
      printErrorWithUsage(e);
      process.exit(1);
    }
  }
}

async function main() {
  const cli = new Cli();
  const command = cli.parse();
  try {
    await command.run();
  } catch (e) {
    printError(e);
    process.exit(1);
  }
}

main();
