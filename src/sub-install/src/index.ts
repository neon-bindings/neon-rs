#!/usr/bin/env node

import { execa } from 'execa';

const cmd = process.env.npm_command === 'ci' ? 'ci' : 'install';

console.error(`[sub-install] $npm_command=${process.env.npm_command}`);
console.error(`[sub-install] running command: npm ${cmd} ${process.argv.slice(2).join(' ')}`);

const result = await execa('npm', [cmd].concat(process.argv.slice(2)), {
  shell: true,
  stdout: 'inherit',
  stderr: 'inherit'
});

process.exit(result.exitCode);
