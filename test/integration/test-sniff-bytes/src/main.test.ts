import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { sniffBytes, FileFormat } from '@neon-integration-tests/sniff-bytes';

type FF = FileFormat;

async function loadFixture(name: string) {
  return (await readFile(path.join('.', 'fixtures', name))).buffer;
}

describe('main', () => {
  test('sniff JPEG bytes', async () => {
    const jpg = await loadFixture('pit-droids.jpg');
    const metadata: FF = sniffBytes(jpg);
    expect(metadata.shortName).toBe('JPEG');
    expect(metadata.mediaType).toBe('image/jpeg');
    expect(metadata.extension).toBe('jpg');
  });

  test('sniff GIF bytes', async () => {
    const gif = await loadFixture('squirrel.gif');
    const metadata: FF = sniffBytes(gif);
    expect(metadata.shortName).toBe('GIF');
    expect(metadata.mediaType).toBe('image/gif');
    expect(metadata.extension).toBe('gif');
  });
});
