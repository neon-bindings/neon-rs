#!/bin/bash

ncc build src/index.ts -o ../../dist/cli
crlf --set=LF ../../dist/cli/index.js

echo === BEGIN BUNDLE ===
cat ../../dist/cli/index.js
echo === END BUNDLE ===

cp README.md LICENSE* ../../dist/cli
cat package.json | jq -f bundle.jq > ../../dist/cli/package.json
