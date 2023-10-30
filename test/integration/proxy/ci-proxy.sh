#!/bin/bash

CIPROXY=$1

if [ $# -ne 1 ]; then
  echo -e 'usage: proxy.sh <url>[:<port>]'
  echo -e '  <url>   registry server URL'
  echo -e '  <port>  optional registry server port (default: 80)'
  echo -e
  echo -e 'error: <url> not specified'
  exit 1
fi

# Boot the server in a background process.
nohup npx verdaccio --config ./config.yml --listen $CIPROXY &

# Wait for the server to begin listening for connections
( tail -F -n10 proxy.log & ) | fgrep -q $CIPROXY

cat proxy.log
