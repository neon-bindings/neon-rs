#!/usr/bin/env node

import commandLineCommands from 'command-line-commands';
import { printUsage, printError } from './print.js';
import dist from './commands/dist.js';
import crossDist from './commands/cross-dist.js';
import crossPack from './commands/cross-pack.js';
import crossInstall from './commands/cross-install.js';
import help from './commands/help.js';
import { CommandParser, Command } from './command.js';

export type CommandName =
  | 'help'
  | 'dist'
  | 'cross-dist'
  | 'cross-pack'
  | 'cross-install';

const COMMANDS: Record<string, CommandParser> = {
  'help': help,
  'dist': dist,
  'cross-dist': crossDist,
  'cross-pack': crossPack,
  'cross-install': crossInstall
};

const VALID_COMMANDS: (CommandName | null)[] =
  [null, 'help', 'dist', 'cross-dist', 'cross-pack', 'cross-install'];

function parse(): Command {
  try {
    const { command, argv } = commandLineCommands(VALID_COMMANDS);

    if (!command) {
      throw null;
    }

    return COMMANDS[command](argv);
  } catch (e) {
    printUsage();

    if (e instanceof Error) {
      printError(e.message);
    }

    process.exit(1);
  }
}

async function main() {
  const command: Command = parse();

  try {
    await command();
  } catch (e) {
    printError((e instanceof Error) ? e.message : String(e));
    process.exit(1);
  }
}

main();
