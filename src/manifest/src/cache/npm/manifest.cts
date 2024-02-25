import { RustTarget, isRustTarget, NodePlatform, isNodePlatform, describeTarget } from '../../platform.cjs';
import { assertHasNeonCfg } from '../../library/neon.cjs';
import { assertHasProps, AbstractManifest, Preamble } from '../../util.cjs';
import { normalizeBinaryCfg } from './legacy.cjs';

export const SCHEMA_VERSION = 3;

export interface BinaryCfg {
  type: "binary",
  rust: RustTarget,
  node: NodePlatform,
  os: string,
  arch: string,
  abi: string | null
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

type HasBinaryCfg = { neon: BinaryCfg };

function assertHasBinaryCfg(json: object): asserts json is HasBinaryCfg {
  assertHasNeonCfg(json);
  assertIsBinaryCfg(json.neon);
}

export class BinaryManifest extends AbstractManifest {
  private _binaryJSON: HasBinaryCfg;
  readonly dir: string;
  private _schemaUpgraded: boolean;
  private _targetChanged: boolean;
  private _new: boolean;

  constructor(dir: string, json: Preamble, isNew: boolean) {
    super(json);
    this.dir = dir;
    this._schemaUpgraded = normalizeBinaryCfg(this._json);
    this._targetChanged = false;
    assertHasBinaryCfg(this._json);
    this._binaryJSON = this._json;
    this._new = isNew;
  }

  get isNew(): boolean {
    return this._new;
  }

  get schemaUpgraded(): boolean {
    return this._schemaUpgraded;
  }

  get targetChanged(): boolean {
    return this._targetChanged;
  }

  cfg(): BinaryCfg {
    return this._binaryJSON.neon;
  }

  setTarget(target: RustTarget) {
    const targetInfo = describeTarget(target);
    this._json.os = targetInfo.os;
    this._json.cpu = targetInfo.arch;
    this._binaryJSON.neon.rust = target;
    this._binaryJSON.neon.os = targetInfo.os;
    this._binaryJSON.neon.arch = targetInfo.arch;
    this._binaryJSON.neon.abi = targetInfo.abi;
    this._targetChanged = true;
  }

  hasUnsavedChanges(): boolean {
    return this._new || this._schemaUpgraded || this._targetChanged;
  }

  async save(log: (msg: string) => void): Promise<void> {
    await super.save(log);
    this._new = false;
    this._schemaUpgraded = false;
    this._targetChanged = false;
  }
}
