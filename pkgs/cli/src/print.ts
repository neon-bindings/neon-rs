import { createRequire } from 'node:module';
import commandLineUsage from 'command-line-usage';
import chalk from 'chalk';
import { CommandName, CommandStatics, commandFor, summaries } from './command.js';

function pink(text: string): string {
  return chalk.bold.hex('#e75480')(text);
}

function blue(text: string): string {
  return chalk.bold.cyanBright(text);
}

function yellow(text: string): string {
  return chalk.bold.yellowBright(text);
}

function green(text: string): string {
  return chalk.bold.greenBright(text);
}

function commandUsage(name: CommandName, command: CommandStatics): string {
  const sections = [
    {
      content: `${pink('Neon:')} ${name} - ${command.summary()}`,
      raw: true
    },
    {
      header: blue('Usage:'),
      content: `${blue('$')} ${command.syntax()}`
    },
    {
      header: yellow('Options:'),
      content: command.options()
    }
  ];

  const seeAlso = command.seeAlso();
  if (seeAlso) {
    sections.push({ header: green('See Also:'), content: seeAlso });
  }

  return commandLineUsage(sections);
}

function mainUsage(): string {
  const require = createRequire(import.meta.url);
  const version = require('../package.json').version;

  const sections = [
    {
      content: `${pink('Neon:')} CLI v${version}`,
      raw: true
    },
    {
      header: blue('Usage:'),
      content: `${blue('$')} neon <command> <options>`
    },
    {
      header: yellow('Commands:'),
      content: summaries()
    }
  ];

  return commandLineUsage(sections);
}

export function printUsage(command?: CommandName) {
  if (command) {
    console.error(commandUsage(command, commandFor(command)));
  } else {
    console.error(mainUsage());
  }
}

export function printError(message?: string) {
  if (message) {
    console.error(chalk.bold.red("error:") + " " + message);
  } else {
    console.error();
  }
}
