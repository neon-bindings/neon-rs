#!/usr/bin/env node

import commandLineCommands from 'command-line-commands';
import { printUsage, die } from './usage.js';
import dist from './commands/dist.js';
import crossDist from './commands/cross-dist.js';
import crossPack from './commands/cross-pack.js';
import crossInstall from './commands/cross-install.js';

export type CommandName =
  | 'help'
  | 'dist'
  | 'cross-dist'
  | 'cross-pack'
  | 'cross-install';

const VALID_COMMANDS: (CommandName | null)[] =
  [null, 'help', 'dist', 'cross-dist', 'cross-pack', 'cross-install'];

export function expectCommandName(name: string): CommandName {
  switch (name) {
    case 'help':
    case 'dist':
    case 'cross-dist':
    case 'cross-pack':
    case 'cross-install':
      return name;

    default:
      throw new RangeError(`Unrecognized command: ${name}`);
  }
}

async function main() {
  try {
    const { command, argv } = commandLineCommands(VALID_COMMANDS);
  
    switch (command) {
      case 'dist':
        await dist(argv);
        break;

      case 'cross-dist':
        await crossDist(argv);
        break;

      case 'cross-pack':
        await crossPack(argv);
        break;

      case 'cross-install':
        await crossInstall(argv);
        break;

      case 'help':
        if (argv.length > 0) {
          printUsage(expectCommandName(argv[0]));
          process.exit(0);
        }
        // FALL THROUGH

      case null:
        printUsage();
    }

    process.exit(0);
  } catch (e) {
    die((e instanceof Error) ? e.message : null);
  }
}

main();
