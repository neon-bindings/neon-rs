{
  name: "@neon-rs/cli",
  version: .version,
  description: .description,
  type: .type,
  exports: "./index.js",
  files: [
    "LICENSE*",
    "index.js"
  ],
  bin: {
    "neon": "./index.js"
  },
  author: .author,
  repository: .repository,
  keywords: .keywords,
  license: .license,
  bugs: .bugs,
  homepage: .homepage,
  optionalDependences: .optionalDependencies
}
