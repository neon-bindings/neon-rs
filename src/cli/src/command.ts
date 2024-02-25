import Dist from './commands/dist.js';
import Bump from './commands/bump.js';
import AddPlatform from './commands/add-platform.js';
import UpdatePlatforms from './commands/update-platforms.js';
import ListPlatforms from './commands/list-platforms.js';
import CurrentPlatform from './commands/current-platform.js';
import Preset from './commands/preset.js';
import Ci from './commands/ci.js';
import Help from './commands/help.js';

export interface Command {
  run(): Promise<void>;
}

export type CommandSection = { title: string, details: CommandDetail[] };

export interface CommandStatics {
  summary(): string;
  syntax(): string;
  options(): CommandDetail[];
  seeAlso(): CommandDetail[] | void;
  extraSection(): CommandSection | void;
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
  AddPlatform = 'add-platform',
  UpdatePlatforms = 'update-platforms',
  ListPlatforms = 'list-platforms',
  CurrentPlatform = 'current-platform',
  Preset = 'preset',
  Ci = 'ci'
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
  [CommandName.AddPlatform]: AddPlatform,
  [CommandName.UpdatePlatforms]: UpdatePlatforms,
  [CommandName.ListPlatforms]: ListPlatforms,
  [CommandName.CurrentPlatform]: CurrentPlatform,
  [CommandName.Preset]: Preset,
  [CommandName.Ci]: Ci
};

export function commandFor(name: CommandName): CommandClass {
  return COMMANDS[name];
}

export function summaries(): CommandDetail[] {
  return [
    { name: CommandName.Help, summary: Help.summary() },
    { name: CommandName.Dist, summary: Dist.summary() },
    { name: CommandName.Bump, summary: Bump.summary() },
    { name: CommandName.AddPlatform, summary: AddPlatform.summary() },
    { name: CommandName.UpdatePlatforms, summary: UpdatePlatforms.summary() },
    { name: CommandName.ListPlatforms, summary: ListPlatforms.summary() },
    { name: CommandName.CurrentPlatform, summary: CurrentPlatform.summary() },
    { name: CommandName.Preset, summary: Preset.summary() },
    { name: CommandName.Ci, summary: Ci.summary() }
  ];
}
