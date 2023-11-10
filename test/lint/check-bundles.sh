#!/bin/bash

# This script implements a lint that ensures that generated bundles
# in the repo haven't gone stale since the source was last modified.

echo "Checking that all bundled tools are up to date..."

dirty_workspaces=()

for input_workspace in `find src -type d -mindepth 1 -maxdepth 1 -not -name node_modules` ; do
  output_workspace=$(echo $input_workspace | sed -e 's/^src/pkgs/')
  input_mtime=$(git log -1 --format=%ct $input_workspace)
  output_mtime=$(git log -1 --format=%ct $output_workspace)
  if [[ $input_mtime -gt $output_mtime ]] ; then
    echo "❌ $input_workspace has changed since $output_workspace was last generated"
    dirty_workspaces+=($input_workspace)
  fi
done

if [[ ${#dirty_workspaces[@]} -gt 0 ]] ; then
  echo
  echo '💡 Re-run `npm run bundle` on the following workspaces before committing:'
  for workspace in ${dirty_workspaces[*]} ; do
    echo "  • $workspace"
  done
  exit 1
fi
