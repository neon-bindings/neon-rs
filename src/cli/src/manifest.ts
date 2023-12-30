import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { assertIsPlatformPreset, RustTarget, NodePlatform, isRustTarget, isNodePlatform, assertIsRustTarget, assertIsNodePlatform, getTargetDescriptor, node2Rust, rust2Node, PlatformFamily, PlatformMap, TargetPair, PlatformPreset, expandPlatformFamily } from './platform.js';
import js, { ASTPath, ObjectExpression } from 'jscodeshift';

export interface BinaryCfg {
  type: "binary",
  rust: RustTarget,
  node: NodePlatform,
  os: string,
  arch: string,
  abi: string | null
}

type LibraryV1 = {[key in RustTarget]?: string};

type BinaryV1 = {
  binary: {
    rust: RustTarget,
    node: NodePlatform,
    platform: string,
    arch: string,
    abi: string | null
  }
};

type BinaryV2 = {
  type: "binary",
  rust: RustTarget,
  node: NodePlatform,
  platform: string,
  arch: string,
  abi: string | null
}

function assertIsObject(json: unknown, path: string): asserts json is object {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected "${path}" property to be an object, found ${json}`);
  }
}

// Idea thanks to https://www.lucaspaganini.com/academy/assertion-functions-typescript-narrowing-5
function assertHasProps<K extends string>(keys: ReadonlyArray<K>, json: unknown, path: string): asserts json is Record<K, unknown> {
  assertIsObject(json, path);
  for (const key of keys) {
    if (!(key in json)) {
      throw new TypeError(`property "${path}.${key}" not found`);
    }
  }
}

function assertIsBinaryCfg(json: unknown): asserts json is BinaryCfg {
  assertHasProps(['type', 'rust', 'node', 'os', 'arch', 'abi'], json, "neon");
  if (json.type !== 'binary') {
    throw new TypeError(`expected "neon.type" property to be "binary", found ${json.type}`)
  }
  if (typeof json.rust !== 'string' || !isRustTarget(json.rust)) {
    throw new TypeError(`expected "neon.rust" to be a valid Rust target, found ${json.rust}`);
  }
  if (typeof json.node !== 'string' || !isNodePlatform(json.node)) {
    throw new TypeError(`expected "neon.node" to be a valid Node target, found ${json.node}`);
  }
  if (typeof json.os !== 'string') {
    throw new TypeError(`expected "neon.os" to be a string, found ${json.os}`);
  }
  if (typeof json.arch !== 'string') {
    throw new TypeError(`expected "neon.arch" to be a string, found ${json.arch}`);
  }
  if (json.abi !== null && typeof json.abi !== 'string') {
    throw new TypeError(`expected "neon.abi" to be a string or null, found ${json.abi}`);
  }
}

function assertIsPlatformMap(json: unknown, path: string): asserts json is PlatformMap {
  assertIsObject(json, path);
  for (const key in json) {
    const value: unknown = json[key as keyof typeof json];
    if (!isNodePlatform(key)) {
      throw new TypeError(`platform table key ${key} is not a valid Node platform`);
    }
    if (typeof value !== 'string' || !isRustTarget(value)) {
      throw new TypeError(`platform table value ${value} is not a valid Rust target`);
    }
  }
}

function assertIsPlatformFamily(json: unknown, path: string): asserts json is PlatformFamily {
  if (typeof json === 'string') {
    assertIsPlatformPreset(json);
    return;
  }

  if (Array.isArray(json)) {
    for (const elt of json) {
      assertIsPlatformPreset(elt);
    }
    return;
  }

  assertIsPlatformMap(json, path);
}

function assertIsBinaryV2(json: unknown): asserts json is BinaryV2 {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected "neon" to be an object, found ${json}`);
  }
  assertHasProps(['rust', 'node', 'platform', 'arch', 'abi'], json, "neon");
  if (!isRustTarget(json.rust)) {
    throw new TypeError(`expected "neon.rust" to be a valid Rust target, found ${json.rust}`);
  }
  if (!isNodePlatform(json.node)) {
    throw new TypeError(`expected "neon.node" to be a valid Node platform, found ${json.node}`);
  }
  if (typeof json.platform !== 'string') {
    throw new TypeError(`expected "neon.platform" to be a string, found ${json.platform}`);
  }
  if (typeof json.arch !== 'string') {
    throw new TypeError(`expected "neon.arch" to be a string, found ${json.arch}`);
  }
  if (json.abi !== null && typeof json.abi !== 'string') {
    throw new TypeError(`expected "neon.abi" to be a string or null, found ${json.abi}`);
  }
}

function assertIsBinaryV1(json: unknown): asserts json is BinaryV1 {
  assertHasProps(['binary'], json, "neon");
  const binary = json.binary;
  if (!binary || typeof binary !== 'object') {
    throw new TypeError(`expected "neon.binary" to be an object, found ${binary}`);
  }

  assertHasProps(['rust', 'node', 'platform', 'arch', 'abi'], binary, "neon.binary");
  if (typeof binary.rust !== 'string' || !isRustTarget(binary.rust)) {
    throw new TypeError(`expected "neon.binary.rust" to be a valid Rust target, found ${binary.rust}`);
  }
  if (!isNodePlatform(binary.node)) {
    throw new TypeError(`expected "neon.binary.node" to be a valid Node platform, found ${binary.node}`);
  }
  if (typeof binary.platform !== 'string') {
    throw new TypeError(`expected "neon.binary.platform" to be a string, found ${binary.platform}`);
  }
  if (typeof binary.arch !== 'string') {
    throw new TypeError(`expected "neon.binary.arch" to be a string, found ${binary.arch}`);
  }
  if (binary.abi !== null && typeof binary.abi !== 'string') {
    throw new TypeError(`expected "neon.binary.abi" to be a string or null, found ${binary.abi}`);
  }
}

function assertIsLibraryV1(json: unknown): asserts json is LibraryV1 {
  assertIsObject(json, "neon");
  for (const key in json) {
    const value: unknown = json[key as keyof typeof json];
    if (!isRustTarget(key)) {
      throw new TypeError(`target table key ${key} is not a valid Rust target`);
    }
    if (typeof value !== 'string') {
      throw new TypeError(`target table value ${value} is not a string`);
    }
  }
}

export interface LibraryCfg {
  type: "source";
  org: string;
  platforms: PlatformFamily;
  load?: string;
}

function assertIsLibraryCfg(json: unknown): asserts json is LibraryCfg {
  assertHasProps(['type', 'org', 'platforms'], json, "neon");
  if (json.type !== 'source') {
    throw new TypeError(`expected "neon.type" property to be "source", found ${json.type}`)
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

type Preamble = {
  name: string,
  version: string,
  optionalDependencies?: Record<string, string> | undefined
};

function assertIsPreamble(json: unknown): asserts json is Preamble {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected binary Neon package manifest, found ${json}`);
  }
  if (!('version' in json) || typeof json.version !== 'string') {
    throw new TypeError('valid "version" string not found in Neon package manifest');
  }
  if (!('name' in json) || typeof json.name !== 'string') {
    throw new TypeError('valid "name" string not found in Neon package manifest');
  }
}

class AbstractManifest implements Preamble {
  protected _json: Preamble;
  protected _upgraded: boolean;

  constructor(json: unknown) {
    assertIsPreamble(json);
    this._json = json;
    this._upgraded = false;
  }

  get name(): string { return this._json.name; }
  set name(value: string) { this._json.name = value; }

  get version(): string { return this._json.version; }
  set version(value: string) { this._json.version = value; }

  get description(): string { return (this._json as any).description ?? ""; }

  get upgraded(): boolean { return this._upgraded; }

  async save(dir?: string | undefined): Promise<undefined> {
    dir = dir ?? process.cwd();
    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify(this._json, null, 2), { encoding: 'utf8' });
  }

  stringify(): string {
    return JSON.stringify(this._json);
  }
}

type HasBinaryCfg = { neon: BinaryCfg };
type HasLibraryCfg = { neon: LibraryCfg };
type HasCfg = { neon: object };

function assertHasCfg(json: object): asserts json is HasCfg {
  if (!('neon' in json)) {
    throw new TypeError('property "neon" not found');
  }
  assertIsObject(json.neon, "neon");
}

function assertHasBinaryCfg(json: object): asserts json is HasBinaryCfg {
  assertHasCfg(json);
  assertIsBinaryCfg(json.neon);
}

function assertHasLibraryCfg(json: object): asserts json is HasLibraryCfg {
  assertHasCfg(json);
  assertIsLibraryCfg(json.neon);
}

async function readManifest(dir?: string | undefined): Promise<unknown> {
  dir = dir ?? process.cwd();
  return JSON.parse(await fs.readFile(path.join(dir, "package.json"), { encoding: 'utf8' }));
}

export class BinaryManifest extends AbstractManifest {
  private _binaryJSON: HasBinaryCfg;

  constructor(json: unknown) {
    super(json);
    this._upgraded = normalizeBinaryCfg(this._json);
    assertHasBinaryCfg(this._json);
    this._binaryJSON = this._json;
  }

  cfg(): BinaryCfg {
    return this._binaryJSON.neon;
  }

  static async load(dir?: string | undefined): Promise<BinaryManifest> {
    return new BinaryManifest(await readManifest(dir));
  }
}

function normalizeBinaryCfg(json: object): boolean {
  assertHasCfg(json);

  // V3 format: {
  //   neon: {
  //     type: 'binary',
  //     rust: RustTarget,
  //     node: NodeTarget,
  //     os: string,
  //     arch: string,
  //     abi: string | null
  //   }
  // }
  if ('type' in json.neon && 'os' in json.neon) {
    return false;
  }

  // V2 format: {
  //   neon: {
  //     type: 'binary',
  //     rust: RustTarget,
  //     node: NodeTarget,
  //     platform: string,
  //     arch: string,
  //     abi: string | null
  //   }
  // }
  if ('type' in json.neon) {
    json.neon = upgradeBinaryV2(json.neon);
    return true;
  }

  // V1 format: {
  //   neon: {
  //     binary: {
  //       rust: RustTarget,
  //       node: NodeTarget,
  //       platform: string,
  //       arch: string,
  //       abi: string | null
  //     }
  //   }
  // }
  json.neon = upgradeBinaryV1(json.neon);
  return true;
}

function normalizeLibraryCfg(json: object): boolean {
  assertHasCfg(json);

  // V4 format: {
  //   neon: {
  //     type: 'source',
  //     org: string,
  //     platforms: PlatformFamily,
  //     load?: string | undefined
  //   }
  // }
  if ('type' in json.neon && 'platforms' in json.neon) {
    return false;
  }

  // V3 format: {
  //   neon: {
  //     type: 'source',
  //     org: string,
  //     targets: PlatformFamily
  //   }
  // }
  if ('type' in json.neon) {
    const org: unknown = json.neon['org' as keyof typeof json.neon];
    const targets: unknown = json.neon['targets' as keyof typeof json.neon];
    assertIsPlatformFamily(targets, "neon.targets");
    json.neon = {
      type: 'source',
      org,
      platforms: targets
    };
    return true;
  }

  // V2 format: {
  //   neon: {
  //     org: string,
  //     targets: { Node => Rust }
  //   }
  // }
  if ('org' in json.neon) {
    const platforms: unknown = json.neon['targets' as keyof typeof json.neon];

    assertIsPlatformMap(platforms, "neon.targets");

    json.neon = {
      type: 'source',
      org: json.neon.org,
      platforms
    };

    return true;
  }

  // V1 format: {
  //   neon: {
  //     targets: { Rust => fully-qualified package name }
  //   }
  // }
  const targets: unknown = json.neon['targets' as keyof typeof json.neon];
  assertIsLibraryV1(targets);
  json.neon = upgradeLibraryV1(targets);
  return true;
}

type AddPlatformsOptions = { platformsSrc?: PlatformMap };

// The source manifest is the source of truth for all Neon
// project metadata. This means you never need to go searching
// for any other files to query the Neon project's metadata.
// (Some data is replicated in the binary manifests, however,
// since they are independently published in npm.)
export class LibraryManifest extends AbstractManifest {
  private _sourceJSON: HasLibraryCfg;
  private _expandedPlatforms: PlatformMap;

  constructor(json: unknown) {
    super(json);
    this._upgraded = normalizeLibraryCfg(this._json);
    assertHasLibraryCfg(this._json);
    this._sourceJSON = this._json;
    this._expandedPlatforms = expandPlatformFamily(this._sourceJSON.neon.platforms);
  }

  static async load(dir?: string | undefined): Promise<LibraryManifest> {
    return new LibraryManifest(await readManifest(dir));
  }

  cfg(): LibraryCfg {
    return this._sourceJSON.neon;
  }

  packageNames(): string[] {
    const cfg = this.cfg();
    return Object.keys(this._expandedPlatforms).map(key => `${cfg.org}/${key}`);
  }

  packageFor(target: RustTarget): string | undefined {
    const cfg = this.cfg();
    for (const key in this._expandedPlatforms) {
      const value = this._expandedPlatforms[key as NodePlatform];
      if (value === target) {
        return `${cfg.org}/${key}`;
      }
    }
    return undefined;
  }

  allPlatforms(): PlatformMap {
    return this._expandedPlatforms;
  }

  rustTargetFor(node: NodePlatform): RustTarget | undefined {
    return this._expandedPlatforms[node];
  }

  manifestFor(target: RustTarget): BinaryManifest {
    const targetInfo = getTargetDescriptor(target);
    const name = this.packageFor(target);

    if (!name) {
      throw new Error(`Rust target ${target} not found in "neon.platforms" table.`);
    }

    const json: any = {
      name,
      description: `Prebuilt binary package for \`${this.name}\` on \`${targetInfo.node}\`.`,
      version: this.version,
      os: [targetInfo.os],
      cpu: [targetInfo.arch],
      main: "index.node",
      files: ["index.node"],
      neon: {
        type: "binary",
        rust: target,
        node: targetInfo.node,
        os: targetInfo.os,
        arch: targetInfo.arch,
        abi: targetInfo.abi
      }
    };

    const OPTIONAL_KEYS = [
      'author', 'repository', 'keywords', 'bugs', 'homepage', 'license', 'engines'
    ];

    for (const key of OPTIONAL_KEYS) {
      if (key in this._json) {
        json[key] = this._json[key as keyof typeof this._json];
      }
    }

    return new BinaryManifest(json);
  }

  async updateLoader(platforms: NodePlatform[]) {
    const cfg = this.cfg();
    if (!cfg.load) {
      return;
    }

    const loader = await fs.readFile(cfg.load, 'utf8');

    function isPlatformTable(p: ASTPath<ObjectExpression>) {
      return p.value.properties.every(p => {
        return p.type === 'Property' &&
          p.key.type === 'Literal' &&
          isNodePlatform(p.key.value);
      });
    }

    const result = js(loader)
      .find(js.ObjectExpression)
      .filter(isPlatformTable)
      .replaceWith((p: ASTPath<ObjectExpression>) => {
        const newProps = platforms.map(platform => {
          return js.property(
            'init',
            js.literal(platform),
            js.arrowFunctionExpression(
              [],
              js.callExpression(
                js.identifier('require'),
                [js.literal(`${cfg.org}/${platform}`)]
              )
            )
          );
        });
        return js.objectExpression([...p.value.properties, ...newProps]);
      })
      .toSource({ quote: 'single' });
    await fs.writeFile(cfg.load, result, 'utf8');
  }

  async addTargetPair(pair: TargetPair): Promise<TargetPair | null> {
    const { node, rust } = pair;

    if (this._expandedPlatforms[node] === rust) {
      return null;
    }

    this._expandedPlatforms[node] = rust;
    await this.save();
    await this.updateLoader([node]);
    return pair;
  }

  async addNodePlatform(platform: NodePlatform): Promise<TargetPair | null> {
    const targets = node2Rust(platform);
    if (targets.length > 1) {
      throw new Error(`multiple Rust targets found for Node platform ${platform}; please specify one of ${targets.join(', ')}`);
    }
    return await this.addTargetPair({ node: platform, rust: targets[0] });
  }

  async addRustTarget(target: RustTarget): Promise<TargetPair | null> {
    return await this.addTargetPair({ node: rust2Node(target), rust: target });
  }

  filterNewTargets(family: PlatformMap): TargetPair[] {
    let newTargets = [];

    for (const [key, value] of Object.entries(family)) {
      const node: NodePlatform = key as NodePlatform;
      const rust: RustTarget = value;

      if (this._expandedPlatforms[node] === rust) {
        continue;
      }

      newTargets.push({ node, rust });
    }

    return newTargets;
  }

  async addPlatforms(family: PlatformMap, opts: AddPlatformsOptions = {}): Promise<TargetPair[]> {
    let newTargets = this.filterNewTargets(family);
    if (!newTargets.length) {
      return [];
    }

    for (const { node, rust } of newTargets) {
      if (opts.platformsSrc) {
        opts.platformsSrc[node] = rust;
      }
      this._expandedPlatforms[node] = rust;
    }
    await this.save();
    await this.updateLoader(newTargets.map(({node}) => node));
    return newTargets;
  }

  async addPlatformPreset(preset: PlatformPreset): Promise<TargetPair[]> {
    const platformsSrc = this.cfg().platforms;

    if (typeof platformsSrc === 'string') {
      this.cfg().platforms = [platformsSrc, preset];
      return this.addPlatforms(expandPlatformFamily(preset));
    }

    if (Array.isArray(platformsSrc)) {
      platformsSrc.push(preset);
      return this.addPlatforms(expandPlatformFamily(preset));
    }

    return this.addPlatforms(expandPlatformFamily(preset), { platformsSrc });
  }

  async updateTargets(log: (msg: string) => void, bundle: string | null) {
    if (!this._json.optionalDependencies) {
      this._json.optionalDependencies = {};
    }

    const packages = this.packageNames();

    for (const pkg of packages) {
      if (!(pkg in this._json.optionalDependencies)) {
        this._json.optionalDependencies[pkg] = this.version;
      }
    }

    this.save();
    log(`package.json after: ${await fs.readFile(path.join(process.cwd(), "package.json"))}`);

    if (!bundle) {
      return;
    }

    const PREAMBLE =
`// AUTOMATICALLY GENERATED FILE. DO NOT EDIT.
//
// This code is never executed but is detected by the static analysis of
// bundlers such as \`@vercel/ncc\`. The require() expression that selects
// the right binary module for the current platform is too dynamic to be
// analyzable by bundler analyses, so this module provides an exhaustive
// static list for those analyses.

if (0) {
`;

    const requires = packages.map(name => `  require('${name}');`).join('\n');

    log(`generating bundler compatibility module at ${bundle}`);
    await fs.writeFile(bundle, PREAMBLE + requires + '\n}\n');
  }
}

export type Manifest = LibraryManifest | BinaryManifest;

function upgradeLibraryV1(object: LibraryV1): LibraryCfg
{
  function splitSwap([key, value]: [string, string]): [NodePlatform, RustTarget] {
    if (!/^@.*\//.test(value)) {
      throw new TypeError(`expected namespaced npm package name, found ${value}`);
    }

    const pkg = value.split('/')[1];
    assertIsNodePlatform(pkg);
    assertIsRustTarget(key);
    return [pkg, key];
  }

  const entries: [NodePlatform, RustTarget][] = Object.entries(object).map(splitSwap);

  const orgs: Set<string> = new Set(Object.values(object).map(v => v.split('/')[0]));

  if (orgs.size === 0) {
    throw new Error("empty target table");
  } else if (orgs.size > 1) {
    throw new Error(`multiple npm orgs found: ${orgs}`);
  }

  return {
    type: 'source',
    org: [...orgs][0],
    platforms: Object.fromEntries(entries)
  };
}

function upgradeBinaryV1(json: object): BinaryCfg {
  assertIsBinaryV1(json);
  return {
    type: 'binary',
    rust: json.binary.rust,
    node: json.binary.node,
    os: json.binary.platform,
    arch: json.binary.arch,
    abi: json.binary.abi
  };
}

function upgradeBinaryV2(json: object): BinaryCfg {
  assertIsBinaryV2(json);
  return {
    type: 'binary',
    rust: json.rust,
    node: json.node,
    os: json.platform,
    arch: json.arch,
    abi: json.abi
  };
}
