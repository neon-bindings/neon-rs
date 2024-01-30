#!/bin/bash

# This script implements a lint that ensures that generated bundles
# in the repo haven't gone stale since the source was last modified.

echo "Checking that all bundled tools are up to date..."

input_workspaces=(src/cli src/install)
dirty_workspaces=()

for input_workspace in ${input_workspaces[@]} ; do
  output_workspace=$(echo $input_workspace | sed -e 's/^src/dist/')
  input_mtime=$(git log -1 --format=%ct $input_workspace)
  output_mtime=$(git log -1 --format=%ct $output_workspace)
  if [[ $input_mtime -gt $output_mtime ]] ; then
    echo "❌ $input_workspace has changed since $output_workspace was last generated"
    dirty_workspaces+=($input_workspace)
  fi
done

if [[ ${#dirty_workspaces[@]} -gt 0 ]] ; then
  echo
  echo '💡 Re-run `npm run dist` on the following workspaces before committing:'
  for workspace in ${dirty_workspaces[*]} ; do
    echo "  • $workspace"
  done
  echo
  echo 'Or simply run `npm run dist` in the root directory.'
  exit 1
fi
