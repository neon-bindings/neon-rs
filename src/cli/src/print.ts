import commandLineUsage from 'command-line-usage';
import chalk from 'chalk';
import { CommandName, CommandStatics, commandFor, summaries } from './command.js';
import { Topic, subcommandFor } from './commands/show.js';

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

function purple(text: string): string {
  return chalk.bold.magentaBright(text);
}

function commandUsage(name: string, command: CommandStatics): string {
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

  const extraSection = command.extraSection();
  if (extraSection) {
    sections.push({ header: purple(extraSection.title + ':'), content: extraSection.details });
  }

  return commandLineUsage(sections).trimStart();
}

function mainUsage(): string {
  const sections = [
    {
      content: `${pink('Neon:')} the npm packaging tool for Rust addons`,
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

  return commandLineUsage(sections).trim();
}

export function printShowTopicUsage(topic: Topic) {
  console.error(commandUsage(topic, subcommandFor(topic)));
}

export function printCommandUsage(name: CommandName) {
  console.error(commandUsage(name, commandFor(name)));
}

export function printMainUsage() {
  console.error(mainUsage());
  console.error();
  console.error("See 'neon help <command>' for more information on a specific command.");
}

export function printErrorWithUsage(e: any) {
  console.error(mainUsage());
  console.error();
  printError(e);
}

export function printError(e: any) {
  console.error(chalk.bold.red("error:") + " " + ((e instanceof Error) ? e.message : String(e)));
}
