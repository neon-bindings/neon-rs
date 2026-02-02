#!/bin/bash

# This script implements a lint that ensures that versions
# are kept in lockstep for the following packages in the monorepo:
#
#   - @neon-rs/cli
#   - cargo-messages

echo "Checking that all manifest versions match..."

expected=$(jq -r .version ./package.json)

echo "Expected manifest version: $expected"

dist_dirs=(dist dist/cli)
pkgs_dirs=(pkgs pkgs/cargo-messages pkgs/cli pkgs/load)
for d in ${dist_dirs[@]} ${pkgs_dirs[@]} ; do
  actual=$(jq -r .version $d/package.json)
  if [[ $actual != $expected ]]; then
    echo "❌ $d: $actual"
    failed=true
  fi
done

if [[ $failed = true ]]; then
  exit 1
fi
