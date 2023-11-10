#!/bin/bash

# This script is used by CI to start up the npm proxy.

CIPROXY=http://127.0.0.1:4873

# Boot the server in a background process.
nohup npx verdaccio --config ./config.yml --listen $CIPROXY &

# Wait for the server to begin listening for connections
( tail -F -n10 proxy.log & ) | fgrep -q $CIPROXY

cat proxy.log
