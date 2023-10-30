#!/bin/bash

cd $(dirname $0)/../../..
ROOT_DIR=$(pwd)
PROXY_DIR=${ROOT_DIR}/test/integration/proxy
LOCAL_PROXY=http://127.0.0.1:4873

cd ${PROXY_DIR}

if ! which pm2 >/dev/null ; then
  echo -e 'usage: local-proxy.sh'
  echo -e
  echo -e 'error: The required tool `pm2` was not found. Please install it first by running:'
  echo -e
  echo -e '  $ npm i -g pm2'
  echo -e
  exit 1
fi

if pm2 describe neon-test-proxy >/dev/null 2>&1 ; then
  echo -e 'usage: local-proxy.sh'
  echo -e
  echo -e 'error: There is already a pm2 app named `neon-test-proxy`. Please remove it first by running:'
  echo -e
  echo -e '  $ pm2 stop neon-test-proxy'
  echo -e '  $ pm2 delete neon-test-proxy'
  echo -e
  exit 1
fi

rm -rf ./storage ./proxy.log

# Boot the server in a background process.
pm2 start verdaccio --name neon-test-proxy --no-autorestart -- --config ./config.yml --listen ${LOCAL_PROXY}

# Wait for the server to begin listening for connections
( tail -F -n10 ./proxy.log & ) | fgrep -q "${LOCAL_PROXY}"

cat ./proxy.log

echo
echo 'Proxy `neon-test-proxy` started. You can now control it using pm2:'
echo
echo '  # Stop the proxy server:'
echo '  $ pm2 stop neon-test-proxy'
echo
echo '  # Restart the proxy server:'
echo '  $ pm2 restart neon-test-proxy'
echo
