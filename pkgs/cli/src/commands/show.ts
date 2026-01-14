import commandLineArgs from 'command-line-args';
import { Command, CommandClass, CommandDetail, CommandSection } from '../command.js';
import { LibraryManifest } from '@neon-rs/manifest';
import { currentPlatform } from '@neon-rs/load';
import { NodePlatform, PlatformMap } from '@neon-rs/manifest/platform';
import Platforms from './show/platforms.js';
import CI from './show/ci.js';
import Preset from './show/preset.js';
import System from './show/system.js';

const OPTIONS = [
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false }
];

export enum Topic {
  PLATFORMS = 'platforms',
  SYSTEM = 'system',
  PRESET = 'preset',
  CI = 'ci'
}

export function subcommandFor(topic: Topic): CommandClass {
  switch (topic) {
    case Topic.CI:
      return CI;
    case Topic.PLATFORMS:
      return Platforms;
    case Topic.PRESET:
      return Preset;
    case Topic.SYSTEM:
      return System;
  }
}

function isTopic(x: string): x is Topic {
  return ['platforms', 'system', 'preset', 'ci'].includes(x);
}

export function asTopic(x: string): Topic {
  if (!isTopic(x)) {
    throw new RangeError(`expected <topic>, got ${x}`);
  }
  return x;
}

function assertIsTopic(x: string): asserts x is Topic {
  if (!isTopic(x)) {
    throw new RangeError(`expected <topic>, got ${x}`);
  }
}

export default class Show implements Command {
  static summary(): string { return 'Display information about the project or current system.'; }
  static syntax(): string { return 'neon show <topic>'; }
  static options(): CommandDetail[] {
    return [
      { name: '<topic>', summary: 'The topic to display information about.' },
      { name: '', summary: 'Run `neon help show <topic>` for details about a topic.' }
    ];
  }
  static seeAlso(): CommandDetail[] | void { }
  static extraSection(): CommandSection | void {
    return {
      title: 'Topics',
      details: [
        { name: 'ci', summary: 'CI metadata for this project\'s platforms.' },
        { name: 'platforms', summary: 'Information about this project\'s supported platforms.' },
        { name: 'preset', summary: 'Target information about a platform preset.' },
        { name: 'system', summary: 'Information about the current system.' }
      ]
    };
  }
  
  private _topic: Topic;
  private _argv: string[];

  constructor(argv: string[]) {
    const options = commandLineArgs(OPTIONS, { argv, stopAtFirstUnknown: true, partial: true });
  
    if (!options._unknown || options._unknown.length === 0) {
      throw new Error("Missing argument, expected <topic>");
    }

    assertIsTopic(options._unknown[0]);
    this._topic = options._unknown[0];
    this._argv = options._unknown.slice(1);
  }

  subcommand(): Command {
    switch (this._topic) {
      case Topic.PLATFORMS:
        return new Platforms(this._argv);
      case Topic.CI:
        return new CI(this._argv);
      case Topic.PRESET:
        return new Preset(this._argv);
      case Topic.SYSTEM:
        return new System(this._argv);
    }
  }

  async run() {
    await this.subcommand().run();
  }
}
