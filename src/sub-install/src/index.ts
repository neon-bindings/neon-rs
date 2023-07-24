#!/usr/bin/env node

import { execa } from 'execa';

const cmd = process.env.npm_command === 'ci' ? 'ci' : 'install';

const result = await execa('npm', [cmd].concat(process.argv.slice(2)), {
  shell: true,
  stdout: 'inherit',
  stderr: 'inherit'
});

process.exit(result.exitCode);
