#!/bin/bash

ncc build src/index.ts -o ../../dist/cli
crlf --set=LF ../../dist/cli/index.js

if [[ $DEBUG_BUNDLE != '' ]]; then
  echo === BEGIN BUNDLE ===
  cat ../../dist/cli/index.js
  echo === END BUNDLE ===
fi

cp README.md LICENSE* ../../dist/cli
cat package.json | jq -f bundle.jq > ../../dist/cli/package.json
