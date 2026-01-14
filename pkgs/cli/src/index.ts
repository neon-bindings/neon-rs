#!/usr/bin/env node

import commandLineCommands from 'command-line-commands';
import { printErrorWithUsage, printError, printMainUsage } from './print.js';
import { Command, CommandName, CommandClass, asCommandName, commandFor } from './command.js';

import { createRequire } from 'node:module';

const absoluteRequire = createRequire(import.meta.url);

// When compiling with ncc, the default global `require` function does
// not know how to find the binary `@cargo-messages/*` modules, but the
// compiled result of `createRequire` does. So this replaces the global
// `require` with that one. This way when the `cargo-messages` loader
// module attempts to load the right binary module for the device, the
// call to `require` succeeds.
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
  const cli = new Cli();
  const command = cli.parse();
  try {
    await command.run();
  } catch (e) {
    printError(e);
    process.exit(1);
  }
}

await main();
