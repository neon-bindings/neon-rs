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

  test('sniff JPEG bytes', async () => {
    const jpg = await loadFixture('pit-droids.jpg');
    const metadata = sniffBytes(jpg);
    expect(metadata.mediaType).toBe('JPEG');
    expect(metadata.extension).toBe('jpg');
    console.error(metadata);
  });

  test('sniff GIF bytes', async () => {
    const gif = await loadFixture('squirrel.gif');
    const metadata = sniffBytes(gif);
    expect(metadata.mediaType).toBe('GIF');
    expect(metadata.extension).toBe('gif');
  });
});
