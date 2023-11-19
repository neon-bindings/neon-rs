import Dist from './commands/dist.js';
import Bump from './commands/bump.js';
import Tarball from './commands/tarball.js';
import AddTarget from './commands/add-target.js';
import UpdateTargets from './commands/update-targets.js';
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
  Bump = 'bump',
  PackBuild = 'pack-build', // deprecated but retained for compat
  Tarball = 'tarball',
  AddTarget = 'add-target',
  InstallBuilds = 'install-builds', // deprecated but retained for compat
  UpdateTargets = 'update-targets'
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
  [CommandName.Bump]: Bump,
  [CommandName.PackBuild]: Tarball, // deprecated but retained for compat
  [CommandName.Tarball]: Tarball,
  [CommandName.AddTarget]: AddTarget,
  [CommandName.InstallBuilds]: UpdateTargets, // deprecated but retained for compat
  [CommandName.UpdateTargets]: UpdateTargets
};

export function commandFor(name: CommandName): CommandClass {
  return COMMANDS[name];
}

export function summaries(): CommandDetail[] {
  return [
    { name: CommandName.Help, summary: Help.summary() },
    { name: CommandName.Dist, summary: Dist.summary() },
    { name: CommandName.Bump, summary: Bump.summary() },
    { name: CommandName.Tarball, summary: Tarball.summary() },
    { name: CommandName.AddTarget, summary: AddTarget.summary() },
    { name: CommandName.UpdateTargets, summary: UpdateTargets.summary() }
  ];
}
