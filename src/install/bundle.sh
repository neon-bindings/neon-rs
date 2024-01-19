#!/bin/bash

ncc build src/index.ts -o ../../dist/install
crlf --set=LF ../../dist/install/index.js

echo === BEGIN BUNDLE ===
cat ../../dist/install/index.js
echo === END BUNDLE ===

cat package.json | jq -f bundle.jq > ../../dist/install/package.json
