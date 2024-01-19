#!/usr/bin/env node

import { execa } from 'execa';

// Inherit the install command (`install` vs `ci`) from the current running npm command (if any).
const cmd = process.env.npm_command === 'ci' ? 'ci' : 'install';
const args = process.argv;
const cwd = args[2];
const rest = args.slice(3);

console.error(`[install] $npm_command=${process.env.npm_command}`);
console.error(`[install] running in working directory: ${cwd}`)
console.error(`[install] running command: npm ${cmd} ${rest.join(' ')}`);

const result = await execa('npm', [cmd].concat(rest), {
  shell: true,
  stdout: 'inherit',
  stderr: 'inherit',
  cwd
});

process.exit(result.exitCode);
