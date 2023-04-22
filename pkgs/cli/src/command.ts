import Dist from './commands/dist.js';
import CrossDist from './commands/cross-dist.js';
import CrossPack from './commands/cross-pack.js';
import CrossInstall from './commands/cross-install.js';
import Help from './commands/help.js';

export interface Command {
  run(): Promise<void>;
}

export interface CommandStatics {
  summary(): string;
  syntax(): string;
  options(): CommandDetail[];
  seeAlso(): CommandDetail[] | void;
}

export type CommandClass = (new (argv: string[]) => Command) & CommandStatics;

export type CommandDetail = {
  name: string,
  summary: string
};

export enum CommandName {
  Help = 'help',
  Dist = 'dist',
  CrossDist = 'cross-dist',
  CrossPack = 'cross-pack',
  CrossInstall = 'cross-install'
};

export function isCommandName(s: string): s is CommandName {
  const keys: string[] = Object.values(CommandName);
  return keys.includes(s);
}

export function asCommandName(name: string): CommandName {
  if (!isCommandName(name)) {
    throw new RangeError(`Unrecognized command: ${name}`);
  }
  return name;
}

const COMMANDS: Record<CommandName, CommandClass> = {
  [CommandName.Help]: Help,
  [CommandName.Dist]: Dist,
  [CommandName.CrossDist]: CrossDist,
  [CommandName.CrossPack]: CrossPack,
  [CommandName.CrossInstall]: CrossInstall
};

export function commandFor(name: CommandName): CommandClass {
  return COMMANDS[name];
}

export function summaries(): CommandDetail[] {
  return [
    { name: CommandName.Help, summary: Help.summary() },
    { name: CommandName.Dist, summary: Dist.summary() },
    { name: CommandName.CrossDist, summary: CrossDist.summary() },
    { name: CommandName.CrossPack, summary: CrossPack.summary() },
    { name: CommandName.CrossInstall, summary: CrossInstall.summary() }
  ];
}
