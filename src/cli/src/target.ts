import RUST from '../data/rust.json';

import NODE from '../data/node.json';

export type RustTarget = keyof(typeof RUST);

export function isRustTarget(x: string): x is RustTarget {
  return (x in RUST);
}

export function checkRustTarget(x: string): RustTarget {
  if (!isRustTarget(x)) {
    throw new RangeError(`invalid Rust target: ${x}`);
  }
  return x;
}

export type NodeTarget = keyof(typeof NODE);

// FIXME: isNodeTarget taking any is inconsistent with isRustTarget taking string
export function isNodeTarget(x: any): x is NodeTarget {
  return (typeof x === 'string') && (x in NODE);
}

export function checkNodeTarget(x: string): NodeTarget {
  if (!isNodeTarget(x)) {
    throw new RangeError(`invalid Node target: ${x}`);
  }
  return x;
}

export type TargetDescriptor = {
  node: string,
  platform: string,
  arch: string,
  abi: string | null,
  llvm: string[]
};

export function getTargetDescriptor(target: RustTarget): TargetDescriptor {
  const node = RUST[target];
  if (!isNodeTarget(node)) {
    throw new Error(`Rust target ${target} not supported`);
  }

  return { node, ...NODE[node] };
}
