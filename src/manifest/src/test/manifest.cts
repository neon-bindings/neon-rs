import { assert } from 'chai';
import { LibraryManifest } from '../index.cjs';
import { createTempDirectory, ITempDirectory } from 'create-temp-directory';
import * as path from 'path';
import * as fs from 'fs/promises';

const FIXTURES = path.join(__dirname, '..', '..', 'fixtures');

describe("simple manifest", () => {
  let temp: ITempDirectory;

  beforeEach(async () => {
    temp = await createTempDirectory();
  });

  afterEach(async () => {
    await temp.remove();
  });

  async function fixture(name: string): Promise<string> {
    const dest = path.join(temp.path, name);
    await fs.cp(path.join(FIXTURES, name), dest, { recursive: true });
    return dest;
  }

  async function library(name: string): Promise<LibraryManifest> {
    const dir = await fixture(name);
    return LibraryManifest.load(dir);
  }

  it("has expected package metadata", async () => {
    const lib = await library('empty-object-platforms');
    assert.strictEqual(lib.name, 'empty-object-platforms');
    assert.strictEqual(lib.version, '0.1.17');
  });

  async function testEmptyPlatforms(lib: LibraryManifest, name: string, version: string) {
    await lib.addNodePlatform('darwin-arm64');
    assert.isTrue(lib.hasUnsavedChanges());
    await lib.saveChanges(msg => {});
    assert.isFalse(lib.hasUnsavedChanges());
    const contents = await fs.readFile(path.join(lib.dir, 'lib', 'load.cjs'), 'utf8');
    assert.include(contents, `'darwin-arm64': () => require('@${name}/darwin-arm64')`);
    const stats = await fs.stat(path.join(lib.dir, 'platforms', 'darwin-arm64'));
    assert.isTrue(stats.isDirectory());
    const binary = await fs.readFile(path.join(lib.dir, 'platforms', 'darwin-arm64', 'package.json'), 'utf8');
    const manifest = JSON.parse(binary);
    assert.strictEqual(manifest.name, `@${name}/darwin-arm64`);
    assert.strictEqual(manifest.version, version);
    assert.deepEqual(manifest.os, ['darwin']);
    assert.deepEqual(manifest.cpu, ['arm64']);
    assert.strictEqual(manifest.main, 'index.node');
    assert.strictEqual(manifest.neon.type, 'binary');
    assert.strictEqual(manifest.neon.rust, 'aarch64-apple-darwin');
    assert.strictEqual(manifest.neon.node, 'darwin-arm64');
    assert.strictEqual(manifest.neon.os, 'darwin');
    assert.strictEqual(manifest.neon.arch, 'arm64');
    assert.isNull(manifest.neon.abi);
  }

  it("can add a platform to an empty object", async () => {
    const lib = await library('empty-object-platforms');
    await testEmptyPlatforms(lib, 'empty-object-platforms', '0.1.17');
  });

  it("can add a platform to an empty array", async () => {
    const lib = await library('empty-array-platforms');
    await testEmptyPlatforms(lib, 'empty-array-platforms', '0.2.42');
  });

  it("can update optionalDependencies", async () => {
    const lib = await library('empty-object-platforms');
    await lib.addNodePlatform('darwin-arm64');
    lib.updatePlatforms();
    await lib.saveChanges(msg => {});
    const json: any = lib.toJSON();
    assert.strictEqual(json.optionalDependencies['@empty-object-platforms/darwin-arm64'], lib.version);
  });
});
