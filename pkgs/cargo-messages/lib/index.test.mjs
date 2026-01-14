import { CargoReader } from './index.cjs';
import { createReadStream } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';

test('findFileByCrateType without mount', async (t) => {
  const reader = new CargoReader(createReadStream(new URL('../test/cargo.log', import.meta.url)));

  let found = null;
  for await (const message of reader) {
    if (message.isCompilerArtifact() && message.crateName() === 'cargo-messages') {
      found = message.findFileByCrateType('cdylib');
    }
  }

  assert.strictEqual(found, '/Users/dherman/Sources/neon-rs/target/release/libcargo_messages.dylib');
});

test('findFileByCrateType with mount', async (t) => {
  const manifestPath = new URL('../test/Cargo.toml', import.meta.url).pathname;

  const reader = new CargoReader(createReadStream(new URL('../test/cross.log', import.meta.url)), {
    mount: '/target',
    manifestPath,
  });

  let found = null;
  for await (const message of reader) {
    if (message.isCompilerArtifact() && message.crateName() === 'cargo-messages') {
      found = message.findFileByCrateType('cdylib');
    }
  }

  assert.strictEqual(found, path.join(path.dirname(manifestPath), 'target/release/libcargo_messages.dylib'));
});
