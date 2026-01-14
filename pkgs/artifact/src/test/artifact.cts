import { assert } from 'chai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { copyArtifact } from '../index.cjs';

describe("copyArtifact tests", () => {
  let temp: string | null = null;

  beforeEach(async () => {
    temp = await fs.mkdtemp('art-');
  });

  afterEach(async () => {
    fs.rm(temp!, { recursive: true });
  })

  it("successfully copies a newer artifact", async () => {
    const older = path.join(temp!, 'older.txt');
    const newer = path.join(temp!, 'newer.txt');

    await fs.writeFile(older, 'older data');
    await fs.writeFile(newer, 'newer data');
    await copyArtifact(newer, older);
    const data = await fs.readFile(newer, { encoding: 'utf8' });
    assert.strictEqual(data, 'newer data');
  });

  it("refuses to copy an older artifact", async () => {
    const older = path.join(temp!, 'older.txt');
    const newer = path.join(temp!, 'newer.txt');

    await fs.writeFile(older, 'older data');
    await fs.writeFile(newer, 'newer data');
    await copyArtifact(older, newer);
    const data = await fs.readFile(newer, { encoding: 'utf8' });
    assert.strictEqual(data, 'newer data');
  });

  it("creates the output directory when needed", async () => {
    const dest = path.join(temp!, 'does/not/yet/exist/dest.txt');
    const src = path.join(temp!, 'src.txt');

    await fs.writeFile(src, "data");
    await copyArtifact(src, dest);

    const destDirStats = await fs.stat(path.dirname(dest));
    assert.isTrue(destDirStats.isDirectory());

    const destFileStats = await fs.stat(dest);
    assert.isTrue(destFileStats.isFile());

    const data = await fs.readFile(dest, { encoding: 'utf8' });
    assert.strictEqual(data, "data");
  });
});
