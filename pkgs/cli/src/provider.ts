import { PlatformMap } from '@neon-rs/manifest/platform';
import { GitHub } from './ci/github.js';

export enum ProviderName {
  GitHub = 'github'
};

export type ProviderClass = (new () => Provider);

export interface Provider {
  metadata(platforms: PlatformMap): object;
}

const PROVIDERS: Record<ProviderName, ProviderClass> = {
  [ProviderName.GitHub]: GitHub
};

export function isProviderName(s: string): s is ProviderName {
  const keys: string[] = Object.values(ProviderName);
  return keys.includes(s);
}

export function asProviderName(name: string): ProviderName {
  if (!isProviderName(name)) {
    throw new RangeError(`CI provider not recognized: ${name}`);
  }
  return name;
}

export function providerFor(name: ProviderName): ProviderClass {
  return PROVIDERS[name];
}
