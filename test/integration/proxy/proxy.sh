#!/bin/bash

# Boot the server in a background process.
nohup npx verdaccio --config ./config.yml --listen ${{ env.PROXY }} &

# Wait for the server to begin listening for connections
( tail -F -n10 proxy.log & ) | fgrep -q 'http://127.0.0.1:4873/'

cat proxy.log
