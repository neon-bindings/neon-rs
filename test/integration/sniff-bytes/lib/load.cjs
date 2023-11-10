module.exports = require('@neon-rs/load').lazy({
  targets: {
    'linux-x64-gnu': () => require('@sniff-bytes/linux-x64-gnu'),
    'darwin-arm64': () => require('@sniff-bytes/darwin-arm64')
  },
  exports: [
    'sniffBytes'
  ],
  debug: () => require('../index.node')
});
