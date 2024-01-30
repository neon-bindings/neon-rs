export {
  RustTarget, isRustTarget, assertIsRustTarget,
  NodePlatform, isNodePlatform, assertIsNodePlatform,
  PlatformPreset, isPlatformPreset, assertIsPlatformPreset,
  TargetPair,
  PlatformMap,
  PlatformFamily,
  expandPlatformPreset,
  expandPlatformFamily,
  PlatformDescriptor,
  getTargetDescriptor,
  node2Rust,
  rust2Node
} from './platform.cjs';
