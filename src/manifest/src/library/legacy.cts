import { assertIsNodePlatform, assertIsRustTarget, assertIsPlatformFamily, assertIsPlatformMap, isRustTarget, NodePlatform, RustTarget } from "../platform.cjs";
import { assertIsObject } from "../util.cjs";
import { assertHasNeonCfg } from "./neon.cjs";
import { LibraryCfg } from "./library.cjs";

type LibraryV1 = {[key in RustTarget]?: string};

function assertIsLibraryV1(json: unknown): asserts json is LibraryV1 {
  assertIsObject(json, "neon");
  for (const key in json) {
    const value: unknown = json[key as keyof typeof json];
    if (!isRustTarget(key)) {
      throw new TypeError(`target table key ${key} is not a valid Rust target`);
    }
    if (typeof value !== 'string') {
      throw new TypeError(`target table value ${value} is not a string`);
    }
  }
}

export function normalizeLibraryCfg(json: object): boolean {
  assertHasNeonCfg(json);

  // V5 format: {
  //   type: 'library',
  //   org: string,
  //   platforms: PlatformFamily,
  //   load?: string | undefined
  // }
  if ('type' in json.neon && json.neon.type === 'library') {
    return false;
  }

  // V4 format: {
  //   neon: {
  //     type: 'source',
  //     org: string,
  //     platforms: PlatformFamily,
  //     load?: string | undefined
  //   }
  // }
  if ('type' in json.neon && 'platforms' in json.neon) {
    json.neon.type = 'library';
    return true;
  }

  // V3 format: {
  //   neon: {
  //     type: 'source',
  //     org: string,
  //     targets: PlatformFamily
  //   }
  // }
  if ('type' in json.neon) {
    const org: unknown = json.neon['org' as keyof typeof json.neon];
    const targets: unknown = json.neon['targets' as keyof typeof json.neon];
    assertIsPlatformFamily(targets, "neon.targets");
    json.neon = {
      type: 'library',
      org,
      platforms: targets
    };
    return true;
  }

  // V2 format: {
  //   neon: {
  //     org: string,
  //     targets: { Node => Rust }
  //   }
  // }
  if ('org' in json.neon) {
    const platforms: unknown = json.neon['targets' as keyof typeof json.neon];

    assertIsPlatformMap(platforms, "neon.targets");

    json.neon = {
      type: 'library',
      org: json.neon.org,
      platforms
    };

    return true;
  }

  // V1 format: {
  //   neon: {
  //     targets: { Rust => fully-qualified package name }
  //   }
  // }
  const targets: unknown = json.neon['targets' as keyof typeof json.neon];
  assertIsLibraryV1(targets);
  json.neon = upgradeLibraryV1(targets);
  return true;
}

function upgradeLibraryV1(object: LibraryV1): LibraryCfg
{
  function splitSwap([key, value]: [string, string]): [NodePlatform, RustTarget] {
    if (!/^@.*\//.test(value)) {
      throw new TypeError(`expected namespaced npm package name, found ${value}`);
    }

    const pkg = value.split('/')[1];
    assertIsNodePlatform(pkg);
    assertIsRustTarget(key);
    return [pkg, key];
  }

  const entries: [NodePlatform, RustTarget][] = Object.entries(object).map(splitSwap);

  const orgs: Set<string> = new Set(Object.values(object).map(v => v.split('/')[0]));

  if (orgs.size === 0) {
    throw new Error("empty target table");
  } else if (orgs.size > 1) {
    throw new Error(`multiple npm orgs found: ${orgs}`);
  }

  return {
    type: 'library',
    org: [...orgs][0],
    platforms: Object.fromEntries(entries)
  };
}
