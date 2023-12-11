import { execa } from 'execa';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { assertIsTargetPreset, RustTarget, NodeTarget, isRustTarget, isNodeTarget, assertIsRustTarget, assertIsNodeTarget, getTargetDescriptor, node2Rust, rust2Node, TargetFamily, TargetMap, TargetPair, TargetPreset, expandTargetFamily } from './target.js';
import js, { ASTPath, ObjectExpression } from 'jscodeshift';

export interface BinaryCfg {
  type: "binary",
  rust: RustTarget,
  node: NodeTarget,
  platform: string,
  arch: string,
  abi: string | null
}

type SourceV1 = {[key in RustTarget]?: string};

type BinaryV1 = {
  binary: {
    rust: RustTarget,
    node: NodeTarget,
    platform: string,
    arch: string,
    abi: string | null
  }
};

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
  assertHasProps(['type', 'rust', 'node', 'platform', 'arch', 'abi'], json, "neon");
  if (json.type !== 'binary') {
    throw new TypeError(`expected "neon.type" property to be "binary", found ${json.type}`)
  }
  if (typeof json.rust !== 'string' || !isRustTarget(json.rust)) {
    throw new TypeError(`expected "neon.rust" to be a valid Rust target, found ${json.rust}`);
  }
  if (typeof json.node !== 'string' || !isNodeTarget(json.node)) {
    throw new TypeError(`expected "neon.node" to be a valid Node target, found ${json.node}`);
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

function assertIsTargetMap(json: unknown, path: string): asserts json is TargetMap {
  assertIsObject(json, path);
  for (const key in json) {
    const value: unknown = json[key as keyof typeof json];
    if (!isNodeTarget(key)) {
      throw new TypeError(`target table key ${key} is not a valid Node target`);
    }
    if (typeof value !== 'string' || !isRustTarget(value)) {
      throw new TypeError(`target table value ${value} is not a valid Rust target`);
    }
  }
}

function assertIsTargetFamily(json: unknown, path: string): asserts json is TargetFamily {
  if (typeof json === 'string') {
    assertIsTargetPreset(json);
    return;
  }

  if (Array.isArray(json)) {
    for (const elt of json) {
      assertIsTargetPreset(elt);
    }
    return;
  }

  assertIsTargetMap(json, path);
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
  if (!isNodeTarget(binary.node)) {
    throw new TypeError(`expected "neon.binary.node" to be a valid Node target, found ${binary.node}`);
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

function assertIsSourceV1(json: unknown): asserts json is SourceV1 {
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

export interface SourceCfg {
  type: "source";
  org: string;
  targets: TargetFamily;
  load?: string;
}

function assertIsSourceCfg(json: unknown): asserts json is SourceCfg {
  assertHasProps(['type', 'org', 'targets'], json, "neon");
  if (json.type !== 'source') {
    throw new TypeError(`expected "neon.type" property to be "source", found ${json.type}`)
  }
  if (typeof json.org !== 'string') {
    throw new TypeError(`expected "neon.org" to be a string, found ${json.org}`);
  }
  assertIsTargetFamily(json.targets, "neon.targets");
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
type HasSourceCfg = { neon: SourceCfg };
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

function assertHasSourceCfg(json: object): asserts json is HasSourceCfg {
  assertHasCfg(json);
  assertIsSourceCfg(json.neon);
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
    return false;
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

function normalizeSourceCfg(json: object): boolean {
  assertHasCfg(json);

  // V3 format: {
  //   neon: {
  //     type: 'source',
  //     org: string,
  //     targets: { Node => Rust }
  //   }
  // }
  if ('type' in json.neon) {
    return false;
  }

  // V2 format: {
  //   neon: {
  //     org: string,
  //     targets: { Node => Rust }
  //   }
  // }
  if ('org' in json.neon) {
    const targets: unknown = json.neon['targets' as keyof typeof json.neon];

    assertIsTargetMap(targets, "neon.targets");

    json.neon = {
      type: 'source',
      org: json.neon.org,
      targets
    };

    return true;
  }

  // V1 format: {
  //   neon: {
  //     targets: { Rust => fully-qualified package name }
  //   }
  // }
  const targets: unknown = json.neon['targets' as keyof typeof json.neon];
  assertIsSourceV1(targets);
  json.neon = upgradeSourceV1(targets);
  return true;
}

type AddTargetsOptions = { targetsSrc?: TargetMap };

export class SourceManifest extends AbstractManifest {
  private _sourceJSON: HasSourceCfg;
  private _expandedTargets: TargetMap;

  constructor(json: unknown) {
    super(json);
    this._upgraded = normalizeSourceCfg(this._json);
    assertHasSourceCfg(this._json);
    this._sourceJSON = this._json;
    this._expandedTargets = expandTargetFamily(this._sourceJSON.neon.targets);
  }

  static async load(dir?: string | undefined): Promise<SourceManifest> {
    return new SourceManifest(await readManifest(dir));
  }

  cfg(): SourceCfg {
    return this._sourceJSON.neon;
  }

  packageNames(): string[] {
    const cfg = this.cfg();
    return Object.keys(this._expandedTargets).map(key => `${cfg.org}/${key}`);
  }

  packageFor(target: RustTarget): string | undefined {
    const cfg = this.cfg();
    for (const key in this._expandedTargets) {
      const value = this._expandedTargets[key as NodeTarget];
      if (value === target) {
        return `${cfg.org}/${key}`;
      }
    }
    return undefined;
  }

  rustTargetFor(node: NodeTarget): RustTarget | undefined {
    return this._expandedTargets[node];
  }

  manifestFor(target: RustTarget): BinaryManifest {
    const targetInfo = getTargetDescriptor(target);
    const name = this.packageFor(target);

    if (!name) {
      throw new Error(`Rust target ${target} not found in "neon.targets" table.`);
    }

    const json: any = {
      name,
      description: `Prebuilt binary package for \`${this.name}\` on \`${targetInfo.node}\`.`,
      version: this.version,
      os: [targetInfo.platform],
      cpu: [targetInfo.arch],
      main: "index.node",
      files: ["index.node"],
      neon: {
        type: "binary",
        rust: target,
        node: targetInfo.node,
        platform: targetInfo.platform,
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

  async addLoaderTargets(targets: NodeTarget[]) {
    const cfg = this.cfg();
    if (!cfg.load) {
      return;
    }

    const loader = await fs.readFile(cfg.load, 'utf8');

    function isTargetTable(p: ASTPath<ObjectExpression>) {
      return p.value.properties.every(p => {
        return p.type === 'Property' &&
          p.key.type === 'Literal' &&
          isNodeTarget(p.key.value);
      });
    }

    const result = js(loader)
      .find(js.ObjectExpression)
      .filter(isTargetTable)
      .replaceWith((p: ASTPath<ObjectExpression>) => {
        const newProps = targets.map(target => {
          return js.property(
            'init',
            js.literal(target),
            js.arrowFunctionExpression(
              [],
              js.callExpression(
                js.identifier('require'),
                [js.literal(`${cfg.org}/${target}`)]
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

    if (this._expandedTargets[node] === rust) {
      return null;
    }

    this._expandedTargets[node] = rust;
    await this.save();
    await this.addLoaderTargets([node]);
    return pair;
  }

  async addNodeTarget(target: NodeTarget): Promise<TargetPair | null> {
    const rt = node2Rust(target);
    if (rt.length > 1) {
      throw new Error(`multiple Rust targets found for Node target ${target}; please specify one of ${rt.join(', ')}`);
    }
    return await this.addTargetPair({ node: target, rust: rt[0] });
  }

  async addRustTarget(target: RustTarget): Promise<TargetPair | null> {
    return await this.addTargetPair({ node: rust2Node(target), rust: target });
  }

  filterNewTargets(family: TargetMap): TargetPair[] {
    let newTargets = [];

    for (const [key, value] of Object.entries(family)) {
      const node: NodeTarget = key as NodeTarget;
      const rust: RustTarget = value;

      if (this._expandedTargets[node] === rust) {
        continue;
      }

      newTargets.push({ node, rust });
    }

    return newTargets;
  }

  async addTargets(family: TargetMap, opts: AddTargetsOptions = {}): Promise<TargetPair[]> {
    let newTargets = this.filterNewTargets(family);
    if (!newTargets.length) {
      return [];
    }

    for (const { node, rust } of newTargets) {
      if (opts.targetsSrc) {
        opts.targetsSrc[node] = rust;
      }
      this._expandedTargets[node] = rust;
    }
    await this.save();
    await this.addLoaderTargets(newTargets.map(({node}) => node));
    return newTargets;
  }

  async addTargetPreset(preset: TargetPreset): Promise<TargetPair[]> {
    const targetsSrc = this.cfg().targets;

    if (typeof targetsSrc === 'string') {
      this.cfg().targets = [targetsSrc, preset];
      return this.addTargets(expandTargetFamily(preset));
    }

    if (Array.isArray(targetsSrc)) {
      targetsSrc.push(preset);
      return this.addTargets(expandTargetFamily(preset));
    }

    return this.addTargets(expandTargetFamily(preset), { targetsSrc });
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

export type Manifest = SourceManifest | BinaryManifest;

function upgradeSourceV1(object: SourceV1): SourceCfg
{
  function splitSwap([key, value]: [string, string]): [NodeTarget, RustTarget] {
    if (!/^@.*\//.test(value)) {
      throw new TypeError(`expected namespaced npm package name, found ${value}`);
    }

    const pkg = value.split('/')[1];
    assertIsNodeTarget(pkg);
    assertIsRustTarget(key);
    return [pkg, key];
  }

  const entries: [NodeTarget, RustTarget][] = Object.entries(object).map(splitSwap);

  const orgs: Set<string> = new Set(Object.values(object).map(v => v.split('/')[0]));

  if (orgs.size === 0) {
    throw new Error("empty target table");
  } else if (orgs.size > 1) {
    throw new Error(`multiple npm orgs found: ${orgs}`);
  }

  return {
    type: 'source',
    org: [...orgs][0],
    targets: Object.fromEntries(entries)
  };
}

function upgradeBinaryV1(json: object): BinaryCfg {
  assertIsBinaryV1(json);
  return {
    type: 'binary',
    rust: json.binary.rust,
    node: json.binary.node,
    platform: json.binary.platform,
    arch: json.binary.arch,
    abi: json.binary.abi
  };
}
