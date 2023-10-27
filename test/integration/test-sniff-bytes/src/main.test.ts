import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { sniffBytes } from '@neon-integration-tests/sniff-bytes';

async function loadFixture(name: string) {
  return (await readFile(path.join('.', 'fixtures', name))).buffer;
}

describe('main', () => {
  test('first test', () => {
    expect(1 + 2).toBe(3);
  });

  test('load a fixture', async () => {
    const jpg = await loadFixture('pit-droids.jpg');
    const metadata = sniffBytes(jpg);
    console.error(metadata);
  });
});
