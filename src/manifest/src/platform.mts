export {
  RustTarget, isRustTarget, assertIsRustTarget,
  NodePlatform, isNodePlatform, assertIsNodePlatform,
  PlatformPreset, isPlatformPreset, assertIsPlatformPreset,
  TargetPair,
  PlatformMap, assertIsPlatformMap,
  PlatformFamily, assertIsPlatformFamily,
  expandPlatformPreset,
  expandPlatformFamily,
  PlatformDescriptor,
  describeTarget,
  node2Rust,
  rust2Node
} from './platform.cjs';
