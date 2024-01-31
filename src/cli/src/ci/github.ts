import { Provider } from '../provider.js';
import { NodePlatform, PlatformMap } from '@neon-rs/manifest/platform';
import GITHUB from '../../data/github.json';

export type GitHubMetadata = {
  macOS: NodePlatform[],
  Windows: NodePlatform[],
  Linux: NodePlatform[],
  unsupported: NodePlatform[]
};

function sort(platforms: NodePlatform[]): GitHubMetadata {
  const macOS: Set<NodePlatform> = new Set();
  const Windows: Set<NodePlatform> = new Set();
  const Linux: Set<NodePlatform> = new Set();
  const unsupported: Set<NodePlatform> = new Set();

  for (const platform of platforms) {
    switch (GITHUB[platform]) {
      case 'macOS':
        macOS.add(platform);
        break;
      case 'Windows':
        Windows.add(platform);
        break;
      case 'Linux':
        Linux.add(platform);
        break;
      default:
        unsupported.add(platform);
        break;
    }
  }

  return {
    macOS: [...macOS],
    Windows: [...Windows],
    Linux: [...Linux],
    unsupported: [...unsupported]
  };
}

export class GitHub implements Provider {
  metadata(platforms: PlatformMap): GitHubMetadata {
    return sort(Object.keys(platforms) as NodePlatform[]);
  }
}
