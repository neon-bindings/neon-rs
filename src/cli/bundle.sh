#!/bin/bash

if [ -e ../../dist/cli/index.node ]; then
  mv ../../dist/cli/index.node ../../dist/cli/index.node.bak
fi

ncc build src/index.ts -o ../../dist/cli

if [ -e ../../dist/cli/index.node.bak ]; then
  mv ../../dist/cli/index.node.bak ../../dist/cli/index.node
fi

crlf --set=LF ../../dist/cli/index.js

if [[ $DEBUG_BUNDLE != '' ]]; then
  echo === BEGIN BUNDLE ===
  cat ../../dist/cli/index.js
  echo === END BUNDLE ===
fi

cp README.md LICENSE* ../../dist/cli
cat package.json | jq -f bundle.jq > ../../dist/cli/package.json
