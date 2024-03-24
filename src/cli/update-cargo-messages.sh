#!/bin/bash

cargo_messages_version=$(npm view cargo-messages version)

read -a platforms <<< $( (cd ../../pkgs/cargo-messages && node ../../dist/cli list-platforms) | jq -r 'keys | join("\n")' )

for platform in ${platforms[@]} ; do
  echo "npm i --omit=optional -E -O @cargo-messages/$platform@$cargo_messages_version"
  npm i --omit=optional -E -O @cargo-messages/$platform@$cargo_messages_version
done

echo "npm i --omit=optional cargo-messages@$cargo_messages_version"
npm i --omit=optional cargo-messages@$cargo_messages_version
