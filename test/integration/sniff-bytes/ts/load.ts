import { proxy } from '@neon-rs/load';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default proxy({
  platforms: {
    'linux-x64-gnu': () => require('@sniff-bytes/linux-x64-gnu'),
    'darwin-arm64': () => require('@sniff-bytes/darwin-arm64')
  },
  debug: () => require('../index.node')
});
