module.exports = require('@neon-rs/load').lazy({
  targets: {
    'linux-x64-gnu': () => require('@sniff-bytes/linux-x64-gnu')
  },
  exports: [
    'sniffBytes'
  ],
  debug: () => require('../index.node')
});
