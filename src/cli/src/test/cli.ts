import { assert } from 'chai';
import * as path from 'node:path';
import Dist from '../commands/dist.js';
import { fileURLToPath } from 'node:url';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(DIRNAME, '..', '..', '..', 'fixtures');

describe("simple manifest", () => {
  function fixture(name: string): string {
    return path.join(FIXTURES, name);
  }

  it("successfully finds a cdylib in a hybrid crate", async () => {
    const log = fixture("hybrid-crate.log");
    const dist = new Dist(["--name", "create-neon-manual-test-project", "--log", log]);
    const artifact = await dist.findArtifact();
    assert.strictEqual(artifact, "/private/tmp/create-neon-manual-test-project/target/release/libcreate_neon_manual_test_project.dylib");
  });
});
