#!/bin/bash

cargo_messages_version=$(npm view cargo-messages version)
json=$( (cd ../../pkgs/cargo-messages && node ../../dist/cli list-platforms) )

echo '[update-cargo-messages.sh] platforms as JSON:'

echo $json

echo '[update-cargo-messages.sh] platforms as line-separate list:'

echo $json | jq -r 'keys[]'

for platform in `echo $json | jq -r 'keys[]'`; do
  echo "[update-cargo-messages.sh] platform: $platform"
done

for platform in `echo $json | jq -r 'keys[]'`; do
  echo "[update-cargo-messages.sh] npm i --omit=optional -E -O @cargo-messages/$platform@$cargo_messages_version"
  npm i --omit=optional -E -O @cargo-messages/$platform@$cargo_messages_version || echo "❌ failed to update @cargo-messages/$platform"
done

echo "[update-cargo-messages.sh] npm i --omit=optional cargo-messages@$cargo_messages_version"
npm i --omit=optional cargo-messages@$cargo_messages_version || echo "❌ failed to update cargo-messages"
