import { execa } from 'execa';

import RUST from '../data/rust.json';
import NODE from '../data/node.json';
import PRESET from '../data/preset.json';

export type RustTarget = keyof(typeof RUST);

export function isRustTarget(x: unknown): x is RustTarget {
  return (typeof x === 'string') && (x in RUST);
}

export function assertIsRustTarget(x: unknown): asserts x is RustTarget {
  if (!isRustTarget(x)) {
    throw new RangeError(`invalid Rust target: ${x}`);
  }
}

export type NodeTarget = keyof(typeof NODE);

export function isNodeTarget(x: unknown): x is NodeTarget {
  return (typeof x === 'string') && (x in NODE);
}

export function assertIsNodeTarget(x: unknown): asserts x is NodeTarget {
  if (!isNodeTarget(x)) {
    throw new RangeError(`invalid Node target: ${x}`);
  }
}

export type TargetPreset = keyof(typeof PRESET);

export function isTargetPreset(x: unknown): x is TargetPreset {
  return (typeof x === 'string') && (x in PRESET);
}

export function assertIsTargetPreset(x: unknown): asserts x is TargetPreset {
  if (!isTargetPreset(x)) {
    throw new RangeError(`invalid target family preset: ${x}`);
  }
}

export type TargetPair = { node: NodeTarget, rust: RustTarget };
export type TargetMap = { [key in NodeTarget]?: RustTarget };

export type TargetFamily =
    TargetPreset
  | TargetPreset[]
  | TargetMap;

function lookupTargetPreset(key: TargetPreset): TargetFamily {
  return PRESET[key] as TargetFamily;
}

function merge(maps: TargetMap[]): TargetMap {
  const merged = Object.create(null);
  for (const map of maps) {
    Object.assign(merged, map);
  }
  return merged;
}

export function expandTargetPreset(preset: TargetPreset): TargetMap {
  return expandTargetFamily(lookupTargetPreset(preset));
}

export function expandTargetFamily(family: TargetFamily): TargetMap {
  return isTargetPreset(family)
    ? expandTargetPreset(family)
    : Array.isArray(family)
    ? merge(family.map(expandTargetFamily))
    : family;
}

export type TargetDescriptor = {
  node: NodeTarget,
  platform: string,
  arch: string,
  abi: string | null,
  llvm: RustTarget[]
};

export function getTargetDescriptor(target: RustTarget): TargetDescriptor {
  const node = RUST[target];
  if (!isNodeTarget(node)) {
    throw new Error(`Rust target ${target} not supported`);
  }

  const nodeDescriptor = NODE[node];

  const badTarget = nodeDescriptor.llvm.find(t => !isRustTarget(t));
  if (badTarget) {
    throw new Error(`Rust target ${badTarget} not supported`);
  }

  return {
    node,
    platform: nodeDescriptor.platform,
    arch: nodeDescriptor.arch,
    abi: nodeDescriptor.abi,
    llvm: nodeDescriptor.llvm as RustTarget[]
  };
}

export function node2Rust(target: NodeTarget): RustTarget[] {
  return NODE[target].llvm.map(rt => {
    assertIsRustTarget(rt);
    return rt;
  });
}

export function rust2Node(target: RustTarget): NodeTarget {
  const nt = RUST[target];
  assertIsNodeTarget(nt);
  return nt;
}

export async function getCurrentTarget(log: (msg: string) => void): Promise<RustTarget> {
  log(`rustc -vV`);
  const result = await execa("rustc", ["-vV"], { shell: true });

  if (result.exitCode !== 0) {
    throw new Error(`Could not determine current Rust target: ${result.stderr}`);
  }

  const hostLine = result.stdout.split(/\n/).find(line => line.startsWith('host:'));
  log(`found host line: ${hostLine}`);

  if (!hostLine) {
    throw new Error("Could not determine current Rust target (unexpected rustc output)");
  }

  const target = hostLine.replace(/^host:\s+/, '');
  log(`currentTarget result: "${target}"`);

  assertIsRustTarget(target);

  return target;
}
