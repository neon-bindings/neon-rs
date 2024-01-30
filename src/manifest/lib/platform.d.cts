import RUST from '../data/rust.json';
import NODE from '../data/node.json';
import PRESET from '../data/preset.json';
export type RustTarget = keyof (typeof RUST);
export declare function isRustTarget(x: unknown): x is RustTarget;
export declare function assertIsRustTarget(x: unknown): asserts x is RustTarget;
export type NodePlatform = keyof (typeof NODE);
export declare function isNodePlatform(x: unknown): x is NodePlatform;
export declare function assertIsNodePlatform(x: unknown): asserts x is NodePlatform;
export type PlatformPreset = keyof (typeof PRESET);
export declare function isPlatformPreset(x: unknown): x is PlatformPreset;
export declare function assertIsPlatformPreset(x: unknown): asserts x is PlatformPreset;
export type TargetPair = {
    node: NodePlatform;
    rust: RustTarget;
};
export type PlatformMap = {
    [key in NodePlatform]?: RustTarget;
};
export type PlatformFamily = PlatformPreset | PlatformPreset[] | PlatformMap;
export declare function expandPlatformPreset(preset: PlatformPreset): PlatformMap;
export declare function expandPlatformFamily(family: PlatformFamily): PlatformMap;
export type PlatformDescriptor = {
    node: NodePlatform;
    os: string;
    arch: string;
    abi: string | null;
    llvm: RustTarget[];
};
export declare function getTargetDescriptor(target: RustTarget): PlatformDescriptor;
export declare function node2Rust(target: NodePlatform): RustTarget[];
export declare function rust2Node(target: RustTarget): NodePlatform;
