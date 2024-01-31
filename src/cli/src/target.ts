import { execa } from 'execa';

import { RustTarget, assertIsRustTarget } from './platform.js';

export async function getCurrentTarget(log: (msg: string) => void): Promise<RustTarget> {
  log(`rustc -vV`);
  const result = await execa("rustc", ["-vV"], { shell: true });

  if (result.exitCode !== 0) {
    throw new Error(`Could not determine current Rust target: ${result.stderr}`);
  }

  const hostLine = result.stdout.split(/\n/).find(line => line.startsWith('host:'));
  log(`found host line: ${hostLine}`);

  if (!hostLine) {
    throw new Error("Could not determine current Rust target (unexpected rustc output)");
  }

  const target = hostLine.replace(/^host:\s+/, '');
  log(`currentTarget result: "${target}"`);

  assertIsRustTarget(target);

  return target;
}
