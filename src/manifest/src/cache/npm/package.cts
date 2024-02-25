import { NPMCacheCfg } from "./npm.cjs";
import { describeTarget, RustTarget, NodePlatform } from "../../platform.cjs";
import { BinaryManifest } from "./manifest.cjs";
import { readManifest } from "../../util.cjs";

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

async function loadManifest(cacheCfg: NPMCacheCfg, node: NodePlatform, rust: RustTarget): Promise<BinaryManifest> {
    const dir = path.join(cacheCfg.dir, node);
    const json = await readManifest(dir);
    return new BinaryManifest(dir, json, false);
}

export class BinaryPackage {
  private _cacheCfg: NPMCacheCfg;
  private _node: NodePlatform;
  private _rust: RustTarget;
  private _manifest: BinaryManifest | null;

  constructor(cacheCfg: NPMCacheCfg, node: NodePlatform, rust: RustTarget, manifest: BinaryManifest | null) {
    this._cacheCfg = cacheCfg;
    this._node = node;
    this._rust = rust;
    this._manifest = manifest;
  }

  async manifest(): Promise<BinaryManifest> {
    if (!this._manifest) {
      this._manifest = await loadManifest(this._cacheCfg, this._node, this._rust);
    }
    return this._manifest;
  }

  isNew(): boolean {
    return !!(this._manifest && this._manifest.isNew);
  }

  schemaUpgraded(): boolean {
    return !!(this._manifest && this._manifest.schemaUpgraded);
  }

  targetChanged(): boolean {
    return !!(this._manifest && this._manifest.targetChanged);
  }

  hasUnsavedChanges(): boolean {
    return this.isNew() || this.schemaUpgraded() || this.targetChanged();
  }

  async saveChanges(log: (msg: string) => void): Promise<void> {
    const manifest = await this.manifest();

    if (this.isNew()) {
      log(`prebuild manifest: ${manifest.stringify()}`);

      log(`creating ${manifest.dir}`);
      await fs.mkdir(manifest.dir, { recursive: true });
      log(`created ${manifest.dir}`);

      log(`creating ${manifest.dir}/README.md`);
      await fs.writeFile(path.join(manifest.dir, "README.md"), `# \`${manifest.name}\`\n\n${manifest.description}\n`);

      log(`creating ${manifest.dir}/package.json`);
      await manifest.save(log);
    } else if (manifest.hasUnsavedChanges()) {
      log(`saved changes to ${manifest.dir}/package.json`);
      await manifest.save(log);
    }
  }

  async setTarget(target: RustTarget): Promise<void> {
    (await this.manifest()).setTarget(target);
  }

  // Lazily load a package. The manifest will actually be read from
  // disk via this.manifest() the first time it's invoked.
  static defer(cacheCfg: NPMCacheCfg, node: NodePlatform, rust: RustTarget): BinaryPackage {
    return new BinaryPackage(cacheCfg, node, rust, null);
  }

  static create(cacheCfg: NPMCacheCfg, node: NodePlatform, rust: RustTarget): BinaryPackage {
    const targetInfo = describeTarget(rust);
    const libraryManifest = cacheCfg.manifest;
    const org = libraryManifest.cfg().org;
    const name = `${org}/${node}`;
    const json: any = {
      name,
      description: `Prebuilt binary package for \`${libraryManifest.name}\` on \`${targetInfo.node}\`.`,
      version: libraryManifest.version,
      os: [targetInfo.os],
      cpu: [targetInfo.arch],
      main: "index.node",
      files: ["index.node"],
      neon: {
        type: "binary",
        rust: rust,
        node: targetInfo.node,
        os: targetInfo.os,
        arch: targetInfo.arch,
        abi: targetInfo.abi
      }
    };

    libraryManifest.copyOptionalKeys(json);

    const binaryManifest = new BinaryManifest(path.join(cacheCfg.dir, node), json, true);

    return new BinaryPackage(cacheCfg, node, rust, binaryManifest);
  }
}
