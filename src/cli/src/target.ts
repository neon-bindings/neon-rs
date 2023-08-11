import RUST from '../data/rust.json';

import NODE from '../data/node.json';

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
