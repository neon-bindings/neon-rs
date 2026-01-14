import RUST from '../data/rust.json';
import NODE from '../data/node.json';
import PRESET from '../data/preset.json';

import { assertIsObject } from './util.cjs';

export type RustTarget = keyof(typeof RUST);

export function isRustTarget(x: unknown): x is RustTarget {
  return (typeof x === 'string') && (x in RUST);
}

export function assertIsRustTarget(x: unknown): asserts x is RustTarget {
  if (!isRustTarget(x)) {
    throw new RangeError(`invalid Rust target: ${x}`);
  }
}

export type NodePlatform = keyof(typeof NODE);

export function isNodePlatform(x: unknown): x is NodePlatform {
  return (typeof x === 'string') && (x in NODE);
}

export function assertIsNodePlatform(x: unknown): asserts x is NodePlatform {
  if (!isNodePlatform(x)) {
    throw new RangeError(`invalid platform: ${x}`);
  }
}

export type PlatformPreset = keyof(typeof PRESET);

export function isPlatformPreset(x: unknown): x is PlatformPreset {
  return (typeof x === 'string') && (x in PRESET);
}

export type PlatformName = NodePlatform | PlatformPreset;

export function assertIsPlatformName(x: unknown): asserts x is PlatformName {
  if (!isPlatformPreset(x) && !isNodePlatform(x)) {
    throw new RangeError(`invalid platform name: ${x}`);
  }
}

export function assertIsPlatformPreset(x: unknown): asserts x is PlatformPreset {
  if (!isPlatformPreset(x)) {
    throw new RangeError(`invalid platform family preset: ${x}`);
  }
}

export function assertIsPlatformMap(json: unknown, path: string): asserts json is PlatformMap {
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

export function assertIsPlatformFamily(json: unknown, path: string): asserts json is PlatformFamily {
  if (typeof json === 'string') {
    assertIsPlatformName(json);
    return;
  }

  if (Array.isArray(json)) {
    for (const elt of json) {
      assertIsPlatformName(elt);
    }
    return;
  }

  assertIsPlatformMap(json, path);
}

export type TargetPair = { node: NodePlatform, rust: RustTarget };
export type PlatformMap = { [key in NodePlatform]?: RustTarget };

export type PlatformFamily =
    PlatformName
  | PlatformName[]
  | PlatformMap;

function lookupPlatformPreset(key: PlatformPreset): PlatformFamily {
  return PRESET[key] as PlatformFamily;
}

function merge(maps: PlatformMap[]): PlatformMap {
  const merged = Object.create(null);
  for (const map of maps) {
    Object.assign(merged, map);
  }
  return merged;
}

export function expandPlatformPreset(preset: PlatformPreset): PlatformMap {
  return expandPlatformFamily(lookupPlatformPreset(preset));
}

export function expandPlatformFamily(family: PlatformFamily): PlatformMap {
  return isPlatformPreset(family)
    ? expandPlatformPreset(family)
    : isNodePlatform(family)
    ? { [family]: node2Rust(family)[0] }
    : Array.isArray(family)
    ? merge(family.map(expandPlatformFamily))
    : family;
}

export type PlatformDescriptor = {
  node: NodePlatform,
  os: string,
  arch: string,
  abi: string | null,
  llvm: RustTarget[]
};

export function describeTarget(target: RustTarget): PlatformDescriptor {
  const node = RUST[target];
  if (!isNodePlatform(node)) {
    throw new Error(`Rust target ${target} not supported`);
  }

  const nodeDescriptor = NODE[node];

  const badTarget = nodeDescriptor.llvm.find(t => !isRustTarget(t));
  if (badTarget) {
    throw new Error(`Rust target ${badTarget} not supported`);
  }

  return {
    node,
    os: nodeDescriptor.os,
    arch: nodeDescriptor.arch,
    abi: nodeDescriptor.abi,
    llvm: nodeDescriptor.llvm as RustTarget[]
  };
}

export function node2Rust(target: NodePlatform): RustTarget[] {
  return NODE[target].llvm.map(rt => {
    assertIsRustTarget(rt);
    return rt;
  });
}

export function rust2Node(target: RustTarget): NodePlatform {
  const nt = RUST[target];
  assertIsNodePlatform(nt);
  return nt;
}
