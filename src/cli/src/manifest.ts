import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { RustTarget, NodeTarget, isRustTarget, isNodeTarget, checkRustTarget, checkNodeTarget, getTargetDescriptor } from './target.js';

export interface BinaryCfg {
  type: "binary",
  rust: RustTarget,
  node: NodeTarget,
  platform: string,
  arch: string,
  abi: string | null
}

function checkBinaryCfg(json: unknown): BinaryCfg {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected "neon" property to be an object, found ${json}`);
  }
  if (!('type' in json)) {
    throw new TypeError('property "neon.type" not found');
  }
  if (json.type !== 'binary') {
    throw new TypeError(`expected "neon.type" property to be "binary", found ${json.type}`)
  }
  if (!('rust' in json)) {
    throw new TypeError('property "neon.rust" not found');
  }
  if (typeof json.rust !== 'string' || !isRustTarget(json.rust)) {
    throw new TypeError(`expected "neon.type" to be a valid Rust target, found ${json.rust}`);
  }
  if (!('node' in json)) {
    throw new TypeError('property "neon.node" not found');
  }
  if (typeof json.node !== 'string' || !isNodeTarget(json.rust)) {
    throw new TypeError(`expected "neon.node" to be a valid Node target, found ${json.node}`);
  }
  if (!('platform' in json)) {
    throw new TypeError('property "neon.platform" not found');
  }
  if (typeof json.platform !== 'string') {
    throw new TypeError(`expected "neon.platform" to be a string, found ${json.platform}`);
  }
  if (!('arch' in json)) {
    throw new TypeError('property "neon.arch" not found');
  }
  if (typeof json.arch !== 'string') {
    throw new TypeError(`expected "neon.arch" to be a string, found ${json.arch}`);
  }
  if (!('abi' in json)) {
    throw new TypeError('property "neon.abi" not found');
  }
  if (json.abi !== null && typeof json.abi !== 'string') {
    throw new TypeError(`expected "neon.abi" to be a string or null, found ${json.abi}`);
  }
  return json as BinaryCfg;
}

export type TargetMap = {[key in NodeTarget]?: RustTarget};

function checkTargetMap(json: unknown): TargetMap {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected { Node => Rust } target table, found ${json}`);
  }
  for (const key in json) {
    const value: unknown = json[key as keyof typeof json];
    if (!isNodeTarget(key)) {
      throw new TypeError(`target table key ${key} is not a valid Node target`);
    }
    if (typeof value !== 'string' || !isRustTarget(value)) {
      throw new TypeError(`target table value ${value} is not a valid Rust target`);
    }
  }
  return json as TargetMap;
}

function checkTargetMapV1(json: unknown): TargetMapV1 {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected { Rust => string } target table, found ${json}`);
  }
  for (const key in json) {
    const value: unknown = json[key as keyof typeof json];
    if (!isRustTarget(key)) {
      throw new TypeError(`target table key ${key} is not a valid Rust target`);
    }
    if (typeof value !== 'string') {
      throw new TypeError(`target table value ${value} is not a string`);
    }
  }
  return json as TargetMapV1;
}

type TargetMapV1 = {[key in RustTarget]?: string};

export interface SourceCfg {
  type: "source";
  org: string;
  targets: TargetMap;
}

function checkSourceCfg(json: unknown): SourceCfg {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected "neon" property to be an object, found ${json}`);
  }
  if (!('type' in json)) {
    throw new TypeError('property "neon.type" not found');
  }
  if (json.type !== 'source') {
    throw new TypeError(`expected "neon.type" property to be "source", found ${json.type}`)
  }
  if (!('org' in json)) {
    throw new TypeError('property "neon.org" not found');
  }
  if (typeof json.org !== 'string') {
    throw new TypeError(`expected "neon.org" to be a string, found ${json.org}`);
  }
  if (!('targets' in json)) {
    throw new TypeError('property "neon.targets" not found');
  }
  checkTargetMap(json.targets);
  return json as SourceCfg;
}

type Preamble = {
  name: string,
  version: string
};

function checkPreamble(json: unknown): Preamble {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected binary Neon package manifest, found ${json}`);
  }
  if (!('version' in json) || typeof json.version !== 'string') {
    throw new TypeError('valid "version" string not found in Neon package manifest');
  }
  if (!('name' in json) || typeof json.name !== 'string') {
    throw new TypeError('valid "name" string not found in Neon package manifest');
  }
  return json as Preamble;
}

class AbstractManifest implements Preamble {
  protected _json: Preamble;
  protected _upgraded: boolean;

  constructor(json: unknown) {
    this._json = checkPreamble(json);
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

function checkHasBinaryCfg(json: object): HasBinaryCfg {
  if (!('neon' in json)) {
    throw new TypeError('property "neon" not found');
  }
  checkBinaryCfg(json.neon);
  return json as HasBinaryCfg;
}

function checkHasSourceCfg(json: object): HasSourceCfg {
  if (!('neon' in json)) {
    throw new TypeError('property "neon" not found');
  }
  checkSourceCfg(json.neon);
  return json as HasSourceCfg;
}

async function readManifest(dir?: string | undefined): Promise<unknown> {
  dir = dir ?? process.cwd();
  return JSON.parse(await fs.readFile(path.join(dir, "package.json"), { encoding: 'utf8' }));
}

export class BinaryManifest extends AbstractManifest {
  private _binaryJSON: HasBinaryCfg;

  constructor(json: unknown) {
    super(json);
    this._binaryJSON = checkHasBinaryCfg(this._json);
  }

  cfg(): BinaryCfg {
    return this._binaryJSON.neon;
  }

  static async load(dir?: string | undefined): Promise<BinaryManifest> {
    return new BinaryManifest(await readManifest(dir));
  }
}

function normalizeSourceCfg(json: object): boolean {
  if (!('neon' in json)) {
    throw new TypeError('property "neon" not found');
  }
  if (!json.neon || typeof json.neon !== 'object') {
    throw new TypeError(`expected "neon" property to be an object, found ${json.neon}`);
  }

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
    json.neon = {
      type: 'source',
      org: json.neon.org,
      targets: checkTargetMap(json.neon['targets' as keyof typeof json.neon])
    };
    return true;
  }

  // V1 format: {
  //   neon: {
  //     targets: { Rust => fully-qualified package name }
  //   }
  // }
  json.neon = upgradeSourceV1(checkTargetMapV1(json.neon['targets' as keyof typeof json.neon]));
  return true;
}

export class SourceManifest extends AbstractManifest {
  private _sourceJSON: HasSourceCfg;

  constructor(json: unknown) {
    super(json);
    this._upgraded = normalizeSourceCfg(this._json);
    this._sourceJSON = checkHasSourceCfg(this._json);
  }

  static async load(dir?: string | undefined): Promise<SourceManifest> {
    return new SourceManifest(await readManifest(dir));
  }

  cfg(): SourceCfg {
    return this._sourceJSON.neon;
  }

  packageNames(): string[] {
    const cfg = this.cfg();
    return Object.keys(cfg.targets).map(key => `${cfg.org}/${key}`);
  }

  packageFor(target: RustTarget): string | undefined {
    const cfg = this.cfg();
    for (const key in cfg.targets) {
      const value = cfg.targets[key as NodeTarget];
      if (value === target) {
        return `${cfg.org}/${key}`;
      }
    }
    return undefined;
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
}

export type Manifest = SourceManifest | BinaryManifest;

function upgradeSourceV1(object: TargetMapV1): SourceCfg
{
  function splitSwap([key, value]: [string, string]): [NodeTarget, RustTarget] {
    if (!/^@.*\//.test(value)) {
      throw new TypeError(`expected namespaced npm package name, found ${value}`);
    }

    return [checkNodeTarget(value.split('/')[1]), checkRustTarget(key)];
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
