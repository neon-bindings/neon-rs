#!/usr/bin/env node

import commandLineCommands from 'command-line-commands';
import { printErrorWithUsage, printError, printMainUsage } from './print.js';
import { Command, CommandName, CommandClass, asCommandName, commandFor } from './command.js';

import { createRequire } from 'node:module';

const absoluteRequire = createRequire(import.meta.url);

global['require'] = function(spec: string) {
  return absoluteRequire(spec);
} as any;

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
  console.error("DEBUGGING: WE ARE RUNNING THE LATEST!");
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
