import { createRequire } from 'node:module';
import commandLineUsage from 'command-line-usage';
import chalk from 'chalk';
import type { CommandName } from './index.js';

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

function commandUsage(name: CommandName, command: CommandUsage): string {
  const sections = [
    {
      content: `${pink('Neon:')} ${name} - ${COMMAND_SUMMARIES[name]}`,
      raw: true
    },
    {
      header: blue('Usage:'),
      content: `${blue('$')} ${command.syntax}`
    },
    {
      header: yellow('Options:'),
      content: command.options
    }
  ];

  if (command.seeAlso) {
    sections.push({
      header: green('See Also:'),
      content: command.seeAlso
    });
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
      content: [
        { name: 'help', summary: COMMAND_SUMMARIES['help'] + '.' },
        { name: 'dist', summary: COMMAND_SUMMARIES['dist'] + '.' },
        { name: 'cross-dist', summary: COMMAND_SUMMARIES['cross-dist'] + '.' },
        { name: 'cross-pack', summary: COMMAND_SUMMARIES['cross-pack'] + '.' },
        { name: 'cross-install', summary: COMMAND_SUMMARIES['cross-install'] + '.' }
      ]
    }
  ];

  return commandLineUsage(sections);
}

const COMMAND_SUMMARIES = {
  'help': 'Display help information about Neon',
  'dist': 'Generate a .node file from a build',
  'cross-dist': 'Generate a .node file from a cross-compiled prebuild',
  'cross-pack': 'Create an npm tarball from a cross-compiled prebuild',
  'cross-install': 'Install dependencies on cross-compiled prebuilds'
};

type CommandUsage = {
  syntax: string,
  options: any[],
  seeAlso?: any[]
};

const COMMAND_USAGES: Record<CommandName, CommandUsage> = {
  'help': {
    syntax: 'neon help <command>',
    options: [
      { name: '<command>', summary: 'Command to display help information about.' }
    ]
  },

  'dist': {
    syntax: 'neon dist [-n <name>] [-l <log>|-f <dylib>] [-o <dist>]',
    options: [
      { name: '-n, --name', summary: 'Crate name. (Default: $npm_package_name)' },
      { name: '-l, --log <log>', summary: 'Find dylib path from cargo messages <log>. (Default: stdin)' },
      { name: '-f, --file <dylib>', summary: 'Build .node from dylib file <dylib>.' },
      { name: '-o, --out <dist>', summary: 'Copy output to file <dist>. (Default: index.node)' }
    ],
    seeAlso: [
      { name: 'cargo messages', summary: '<https://doc.rust-lang.org/cargo/reference/external-tools.html>' }
    ]
  },

  'cross-dist': {
    syntax: 'neon cross-dist [-n <name>] [-l <log>|-f <dylib>] [-d <dir>] [-o <dist>]',
    options: [
      { name: '-n, --name', summary: 'Crate name. (Default: $npm_package_name)' },
      { name: '-l, --log <log>', summary: 'Find dylib path from cargo messages <log>. (Default: stdin)' },
      { name: '-d, --dir <dir>', summary: 'Crate workspace root directory. (Default: .)' },
      {
        name: '',
        summary: 'This is needed to normalize paths from the log data, which cross-rs provides from within the mounted Docker filesystem, back to the host filesystem.'
      },
      { name: '-f, --file <dylib>', summary: 'Build .node from dylib file <dylib>.' },
      { name: '-o, --out <dist>', summary: 'Copy output to file <dist>. (Default: index.node)' }
    ],
    seeAlso: [
      { name: 'cargo messages', summary: '<https://doc.rust-lang.org/cargo/reference/external-tools.html>' },
      { name: 'cross-rs', summary: '<https://github.com/cross-rs/cross>' }
    ]
  },

  'cross-pack': {
    syntax: 'neon cross-pack [-f <addon>] <target>',
    options: [
      { name: '-f, --file <addon>', summary: 'Prebuilt .node file to pack. (Default: index.node)' },
      { name: '<target>', summary: 'Rust target triple the addon was built for.' }
    ],
    seeAlso: [
      { name: 'Rust platform support', summary: '<https://doc.rust-lang.org/rustc/platform-support.html>' },
      { name: 'npm pack', summary: '<https://docs.npmjs.com/cli/commands/npm-pack>' },
      { name: 'cross-rs', summary: '<https://github.com/cross-rs/cross>' }
    ]
  },

  'cross-install': {
    syntax: 'neon cross-install [-b <file>|-B]',
    options: [
      { name: '-b, --bundle <file>', summary: 'File to generate bundling metadata. (Default: .targets)' },
      {
        name: '',
        summary: 'This generated file ensures support for bundlers (e.g. @vercel/ncc), which rely on static analysis to detect and enable any addons used by the library.'
      },
      { name: '-B, --no-bundle', summary: 'Do not generate bundling metadata.' }
    ],
    seeAlso: [
      { name: 'ncc', summary: '<https://github.com/vercel/ncc>' }
    ]
  }
};

export function printUsage(command?: CommandName) {
  if (command) {
    console.error(commandUsage(command, COMMAND_USAGES[command]));
  } else {
    console.error(mainUsage());
  }
}

export function die(msg?: string | null) {
  printUsage();

  if (msg) {
    console.error();
    console.error(msg);
  }

  process.exit(1);
}
