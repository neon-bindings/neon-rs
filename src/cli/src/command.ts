import Dist from './commands/dist.js';
import Bump from './commands/bump.js';
import Add from './commands/add.js';
import Update from './commands/update.js';
import ListPlatforms from './commands/list-platforms.js';
import CurrentPlatform from './commands/current-platform.js';
import Preset from './commands/preset.js';
import Ci from './commands/ci.js';
import Help from './commands/help.js';
import Show from './commands/show.js';

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
  Add = 'add',
  Update = 'update',
  AddPlatform = 'add-platform', // DEPRECATED(0.2)
  UpdatePlatforms = 'update-platforms', // DEPRECATED(0.2)
  ListPlatforms = 'list-platforms', // DEPRECATED(0.2)
  CurrentPlatform = 'current-platform', // DEPRECATED(0.2)
  Preset = 'preset', // DEPRECATED(0.2)
  Ci = 'ci', // DEPRECATED(0.2)
  Show = 'show'
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
  [CommandName.Add]: Add,
  [CommandName.Update]: Update,
  [CommandName.AddPlatform]: Add,
  [CommandName.UpdatePlatforms]: Update,
  [CommandName.ListPlatforms]: ListPlatforms,
  [CommandName.CurrentPlatform]: CurrentPlatform,
  [CommandName.Preset]: Preset,
  [CommandName.Ci]: Ci,
  [CommandName.Show]: Show
};

export function commandFor(name: CommandName): CommandClass {
  return COMMANDS[name];
}

export function summaries(): CommandDetail[] {
  return [
    { name: CommandName.Help, summary: Help.summary() },
    { name: CommandName.Dist, summary: Dist.summary() },
    { name: CommandName.Bump, summary: Bump.summary() },
    { name: CommandName.Add, summary: Add.summary() },
    { name: CommandName.Update, summary: Update.summary() },
    { name: CommandName.Show, summary: Show.summary() }
  ];
}
