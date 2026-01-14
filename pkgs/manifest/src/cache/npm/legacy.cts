import { isNodePlatform, isRustTarget, NodePlatform, RustTarget } from "../../platform.cjs";
import { assertHasProps } from "../../util.cjs";
import { assertHasNeonCfg } from "../../library/neon.cjs";
import { BinaryCfg } from "./manifest.cjs";

type BinaryV1 = {
  binary: {
    rust: RustTarget,
    node: NodePlatform,
    platform: string,
    arch: string,
    abi: string | null
  }
};

type BinaryV2 = {
  type: "binary",
  rust: RustTarget,
  node: NodePlatform,
  platform: string,
  arch: string,
  abi: string | null
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
  if (!isNodePlatform(binary.node)) {
    throw new TypeError(`expected "neon.binary.node" to be a valid Node platform, found ${binary.node}`);
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

function assertIsBinaryV2(json: unknown): asserts json is BinaryV2 {
  if (!json || typeof json !== 'object') {
    throw new TypeError(`expected "neon" to be an object, found ${json}`);
  }
  assertHasProps(['rust', 'node', 'platform', 'arch', 'abi'], json, "neon");
  if (!isRustTarget(json.rust)) {
    throw new TypeError(`expected "neon.rust" to be a valid Rust target, found ${json.rust}`);
  }
  if (!isNodePlatform(json.node)) {
    throw new TypeError(`expected "neon.node" to be a valid Node platform, found ${json.node}`);
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

export function normalizeBinaryCfg(json: object): boolean {
  assertHasNeonCfg(json);

  // V3 format: {
  //   neon: {
  //     type: 'binary',
  //     rust: RustTarget,
  //     node: NodeTarget,
  //     os: string,
  //     arch: string,
  //     abi: string | null
  //   }
  // }
  if ('type' in json.neon && 'os' in json.neon) {
    return false;
  }

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
    json.neon = upgradeBinaryV2(json.neon);
    return true;
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

function upgradeBinaryV1(json: object): BinaryCfg {
  assertIsBinaryV1(json);
  return {
    type: 'binary',
    rust: json.binary.rust,
    node: json.binary.node,
    os: json.binary.platform,
    arch: json.binary.arch,
    abi: json.binary.abi
  };
}

function upgradeBinaryV2(json: object): BinaryCfg {
  assertIsBinaryV2(json);
  return {
    type: 'binary',
    rust: json.rust,
    node: json.node,
    os: json.platform,
    arch: json.arch,
    abi: json.abi
  };
}
