#!/bin/bash

if [ -d ./src/node_modules/@cargo-messages ]; then
  read -a pollution <<< `ls -1 ./src/node_modules/@cargo-messages`

  if [[ ${#pollution[@]} -gt 0 ]] ; then
    echo "❌ ./src/node_modules/@cargo-messages is polluted" 1>&2
  fi
fi
