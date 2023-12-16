module.exports = require('@neon-rs/load').proxy({
  platforms: {
    'linux-x64-gnu': () => require('@sniff-bytes/linux-x64-gnu'),
    'darwin-arm64': () => require('@sniff-bytes/darwin-arm64')
  },
  debug: () => require('../index.node')
});
