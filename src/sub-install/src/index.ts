#!/usr/bin/env node

import { execa } from 'execa';

const cmd = process.env.npm_command === 'ci' ? 'ci' : 'install';
const args = process.argv;

console.error(`[sub-install] $npm_command=${process.env.npm_command}`);
console.error(`[sub-install] running in working directory: ${args[2]}`)
console.error(`[sub-install] running command: npm ${cmd} ${args.slice(3).join(' ')}`);

const result = await execa('npm', [cmd].concat(args.slice(3)), {
  shell: true,
  stdout: 'inherit',
  stderr: 'inherit',
  cwd: args[2]
});

process.exit(result.exitCode);
