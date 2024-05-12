import { assertIsPlatformFamily, PlatformFamily, PlatformMap, PlatformPreset, expandPlatformFamily, NodePlatform, RustTarget, TargetPair, node2Rust, rust2Node } from "../platform.cjs";
import { assertHasNeonCfg } from "./neon.cjs";
import { assertHasProps, AbstractManifest, Preamble, readManifest } from "../util.cjs";
import { CacheCfg } from "../cache/cache.cjs";
import { normalizeLibraryCfg } from "./legacy.cjs";
import { NPMCacheCfg } from "../cache/npm/npm.cjs";

export interface LibraryCfg {
  type: "library";
  org: string;
  platforms: PlatformFamily;
  load?: string;
}

function assertIsLibraryCfg(json: unknown): asserts json is LibraryCfg {
  assertHasProps(['type', 'org', 'platforms'], json, "neon");
  if (json.type !== 'library') {
    throw new TypeError(`expected "neon.type" property to be "library", found ${json.type}`)
  }
  if (typeof json.org !== 'string') {
    throw new TypeError(`expected "neon.org" to be a string, found ${json.org}`);
  }
  assertIsPlatformFamily(json.platforms, "neon.platforms");
  if ('load' in json) {
    if (typeof json.load !== 'string' && typeof json.load !== 'undefined') {
      throw new TypeError(`expected "neon.load" to be a string, found ${json.load}`);
    }
  }
}

function isEmptyFamily(family: PlatformFamily): boolean {
  if (typeof family === 'string') {
    return false;
  }
  if (Array.isArray(family)) {
    return family.length === 0;
  }
  return Object.keys(family).length === 0;
}

type HasLibraryCfg = { neon: LibraryCfg };

function assertHasLibraryCfg(json: object): asserts json is HasLibraryCfg {
  assertHasNeonCfg(json);
  assertIsLibraryCfg(json.neon);
}

export const SCHEMA_VERSION = 5;

// The source manifest is the source of truth for all Neon
// project metadata. This means you never need to go searching
// for any other files to query the Neon project's metadata.
// (Some data is replicated in the binary manifests, however,
// since they are independently published in npm.)
export class LibraryManifest extends AbstractManifest {
  private _sourceJSON: HasLibraryCfg;
  private _expandedPlatforms: PlatformMap;
  private _cacheCfg: CacheCfg | null;
  private _normalized: boolean;
  private _updatedPlatforms: boolean;

  readonly dir: string;

  constructor(dir: string, json: Preamble) {
    super(json);
    this.dir = dir;
    this._normalized = normalizeLibraryCfg(this._json);
    this._updatedPlatforms = false;
    assertHasLibraryCfg(this._json);
    this._sourceJSON = this._json;
    this._expandedPlatforms = expandPlatformFamily(this._sourceJSON.neon.platforms);
    this._cacheCfg = ('org' in this._sourceJSON.neon) ? new NPMCacheCfg(this) : null;
  }

  hasUnsavedChanges(): boolean {
    return this._normalized ||
      this._updatedPlatforms ||
      !!(this._cacheCfg && this._cacheCfg.hasUnsavedChanges());
  }

  static async load(dir: string = process.cwd()): Promise<LibraryManifest> {
    return new LibraryManifest(dir, await readManifest(dir));
  }

  async saveChanges(log: (msg: string) => void): Promise<void> {
    if (!this.hasUnsavedChanges()) {
      return;
    }

    await this.save(log);

    if (this._cacheCfg) {
      await this._cacheCfg.saveChanges(log);
    }

    this._normalized = false;
    this._updatedPlatforms = false;
  }

  get preamble(): Preamble {
    return this._json;
  }

  cfg(): LibraryCfg {
    return this._sourceJSON.neon;
  }

  allPlatforms(): PlatformMap {
    return this._expandedPlatforms;
  }

  async addTargetPair(pair: TargetPair): Promise<void> {
    const { node, rust } = pair;

    if (this._expandedPlatforms[node] === rust) {
      return;
    }

    this._expandedPlatforms[node] = rust;

    if (this._cacheCfg) {
      this._cacheCfg.setPlatformTarget(node, rust);
    }
  }

  async addNodePlatform(platform: NodePlatform): Promise<void> {
    const targets = node2Rust(platform);
    if (targets.length > 1) {
      throw new Error(`multiple Rust targets found for Node platform ${platform}; please specify one of ${targets.join(', ')}`);
    }
    await this.addTargetPair({ node: platform, rust: targets[0] });
  }

  async addRustTarget(target: RustTarget): Promise<void> {
    await this.addTargetPair({ node: rust2Node(target), rust: target });
  }

  private filterChanges(family: PlatformMap): PlatformMap {
    let changes = Object.create(null);

    for (const [key, value] of Object.entries(family)) {
      const node: NodePlatform = key as NodePlatform;
      const rust: RustTarget = value;

      if (this._expandedPlatforms[node] === rust) {
        continue;
      }

      changes[node] = rust;
    }

    return changes;
  }

  private async addPlatforms(map: PlatformMap): Promise<PlatformMap> {
    let changes = this.filterChanges(map);

    for (const [key, value] of Object.entries(changes)) {
      const node: NodePlatform = key as NodePlatform;
      const rust: RustTarget = value;
      if (this._cacheCfg) {
        await this._cacheCfg.setPlatformTarget(node, rust);
      }
      this._expandedPlatforms[node] = rust;
    }

    return changes;
  }

  async addPlatformPreset(preset: PlatformPreset): Promise<void> {
    const platformsSrc = this.cfg().platforms;

    if (typeof platformsSrc === 'string') {
      this.cfg().platforms = [platformsSrc, preset];
      await this.addPlatforms(expandPlatformFamily(preset));
    }

    // Edge case: use the string shorthand source format for a single preset
    else if (isEmptyFamily(platformsSrc)) {
      this.cfg().platforms = preset;
      await this.addPlatforms(expandPlatformFamily(preset));
    }

    else if (Array.isArray(platformsSrc)) {
      platformsSrc.push(preset);
      await this.addPlatforms(expandPlatformFamily(preset));
    }

    else {
      const added = await this.addPlatforms(expandPlatformFamily(preset));
      Object.assign(platformsSrc, added);
    }
  }

  updatePlatforms() {
    if (this._cacheCfg && this._cacheCfg.updatePlatforms(this)) {
      this._updatedPlatforms = true;
    }
  }

  getPlatformOutputPath(platform: NodePlatform): string | undefined {
    return this._cacheCfg
      ? this._cacheCfg.getPlatformOutputPath(platform)
      : undefined;
  }
}
