#!/bin/bash

ncc build src/index.ts -o ../../dist/install
crlf --set=LF ../../dist/install/index.js

if [[ $DEBUG_BUNDLE != '' ]]; then
  echo === BEGIN BUNDLE ===
  cat ../../dist/install/index.js
  echo === END BUNDLE ===
fi

cat package.json | jq -f bundle.jq > ../../dist/install/package.json
