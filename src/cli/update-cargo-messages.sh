#!/bin/bash

cargo_messages_version=$(npm view cargo-messages version)
read -a platforms <<< $(npm ls --json | jq -r '.dependencies."@neon-rs/cli".dependencies | keys | map(select(startswith("@cargo-messages"))) | map(sub("@cargo-messages/"; "")) | join("\n")')

for platform in ${platforms[@]} ; do
  npm i --omit=optional -E -O @cargo-messages/$platform@$cargo_messages_version
done

npm i --omit=optional cargo-messages@$cargo_messages_version
