#!/usr/bin/env node

import commandLineCommands from 'command-line-commands';
import { printUsage, printError } from './print.js';
import { Command, CommandName, CommandClass, isCommandName, commandFor } from './command.js';

class Cli {
  parse(): Command {
    try {
      const { command, argv } = commandLineCommands([null, ...Object.values(CommandName)]);
      if (!command || !isCommandName(command)) {
        throw null;
      }
      const ctor: CommandClass = commandFor(command);
      return new ctor(argv);
    } catch (e) {
      printUsage();
      if (e instanceof Error) {
        printError(e.message);
      }
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
    printError((e instanceof Error) ? e.message : String(e));
    process.exit(1);
  }
}

main();
