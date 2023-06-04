import Dist from './commands/dist.js';
import PackBuild from './commands/pack-build.js';
import InstallBuilds from './commands/install-builds.js';
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
  PackBuild = 'pack-build',
  InstallBuilds = 'install-builds'
};

export function isCommandName(s: string): s is CommandName {
  const keys: string[] = Object.values(CommandName);
  return keys.includes(s);
}

export function asCommandName(name: string): CommandName {
  if (!isCommandName(name)) {
    throw new RangeError(`Command not recognized: ${name}`);
  }
  return name;
}

const COMMANDS: Record<CommandName, CommandClass> = {
  [CommandName.Help]: Help,
  [CommandName.Dist]: Dist,
  [CommandName.PackBuild]: PackBuild,
  [CommandName.InstallBuilds]: InstallBuilds
};

export function commandFor(name: CommandName): CommandClass {
  return COMMANDS[name];
}

export function summaries(): CommandDetail[] {
  return [
    { name: CommandName.Help, summary: Help.summary() },
    { name: CommandName.Dist, summary: Dist.summary() },
    { name: CommandName.PackBuild, summary: PackBuild.summary() },
    { name: CommandName.InstallBuilds, summary: InstallBuilds.summary() }
  ];
}
