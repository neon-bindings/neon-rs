#!/bin/bash

# This script implements a lint that ensures that versions
# are kept in lockstep for most packages in the monorepo.
#

echo "Checking that all manifest versions match..."

expected=$(jq -r .version ./package.json)

echo "Expected manifest version: $expected"

pkgs_dirs=(pkgs/cargo-messages pkgs/cli pkgs/load pkgs/manifest)
for d in ${pkgs_dirs[@]} ; do
  actual=$(jq -r .version $d/package.json)
  if [[ $actual != $expected ]]; then
    echo "❌ $d: $actual"
    failed=true
  fi
done

if [[ $failed = true ]]; then
  exit 1
fi
