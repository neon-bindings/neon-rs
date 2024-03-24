#!/bin/bash

# This script implements a lint that ensures that the src/ subtree
# maintains the build invariant that there are no binary builds of
# @cargo-messages packages in any node_modules subtree, which is a
# requirement for ncc to codegen its require() calls correctly.

mydir=$(dirname $0)
cd $mydir/../..

dirty_subtrees=()

for subtree in ./src ./src/cli ; do
  if [ -d $subtree/node_modules/@cargo-messages ]; then
    read -a binaries <<< $(ls -1 $subtree/node_modules/@cargo-messages)
    if [[ ${#binaries[@]} -gt 0 ]]; then
      echo "❌ $subtree installation contains binary @cargo-messages packages"
      dirty_subtrees+=($subtree)
    fi
  fi
done

if [[ ${#dirty_subtrees[@]} -gt 0 ]]; then
  echo
  echo 'The src/ tree installation contains binary @cargo-messages packages.'
  echo 'This will lead to invalid code generation when running `npm run dist`.'
  echo 'Delete the node_modules trees in the detected subtrees and rerun the'
  echo 'installation.'
  exit 1
fi
