#!/bin/bash

cargo_messages_version=$(npm view cargo-messages version)

read -a platforms <<< $( (cd ../../pkgs/cargo-messages && node ../../dist/cli list-platforms) | jq -r 'keys | join("\n")' )

echo "[update-cargo-messages.sh] platforms: ${platforms[@]}"

for platform in ${platforms[@]} ; do
  echo "[update-cargo-messages.sh] npm i --omit=optional -E -O @cargo-messages/$platform@$cargo_messages_version"
  npm i --omit=optional -E -O @cargo-messages/$platform@$cargo_messages_version || echo "❌ failed to update @cargo-messages/$platform"
done

echo "[update-cargo-messages.sh] npm i --omit=optional cargo-messages@$cargo_messages_version"
npm i --omit=optional cargo-messages@$cargo_messages_version || echo "❌ failed to update cargo-messages"
