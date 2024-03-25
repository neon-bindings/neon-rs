#!/bin/bash

cargo_messages_version=$(npm view cargo-messages version)

echo '[update-cargo-messages.sh] platforms as JSON:'

(cd ../../pkgs/cargo-messages && node ../../dist/cli list-platforms)

echo '[update-cargo-messages.sh] platforms as line-separate list:'

(cd ../../pkgs/cargo-messages && node ../../dist/cli list-platforms) | jq -r 'keys | join("\n")'

declare -a allplatforms
read -a allplatforms <<< $( (cd ../../pkgs/cargo-messages && node ../../dist/cli list-platforms) | jq -r 'keys | join("\n")' )

echo "[update-cargo-messages.sh] platforms: ${allplatforms[@]}"

for platform in ${allplatforms[@]} ; do
  echo "[update-cargo-messages.sh] npm i --omit=optional -E -O @cargo-messages/$platform@$cargo_messages_version"
  npm i --omit=optional -E -O @cargo-messages/$platform@$cargo_messages_version || echo "❌ failed to update @cargo-messages/$platform"
done

echo "[update-cargo-messages.sh] npm i --omit=optional cargo-messages@$cargo_messages_version"
npm i --omit=optional cargo-messages@$cargo_messages_version || echo "❌ failed to update cargo-messages"
