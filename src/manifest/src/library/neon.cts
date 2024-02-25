import { assertIsObject } from "../util.cjs";

export type HasNeonCfg = { neon: object };

export function assertHasNeonCfg(json: object): asserts json is HasNeonCfg {
  if (!('neon' in json)) {
    throw new TypeError('property "neon" not found');
  }
  assertIsObject(json.neon, "neon");
}
