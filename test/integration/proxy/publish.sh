#!/bin/bash

PROXY_DIR=$(dirname $0)
cd ${PROXY_DIR}/../../..
ROOT_DIR=$(pwd)

if [ $# -lt 1 ]; then
  echo -e 'usage: publish.sh <platform>'
  echo -e ''
  echo -e '  <platform>  Node platform name'
  echo -e ''
  echo -e 'error: missing <platform> argument'
  exit 1
fi

CURRENT_PLATFORM=$1

PROXY_USER=ci
PROXY_PASSWORD=dummycipassword
PROXY_EMAIL=ci@neon-bindings.com
PROXY_SERVER=http://127.0.0.1:4873/

NPM_AUTH_TOKEN=$(
curl -s \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -X PUT -d@- \
  --user ${PROXY_USER}:${PROXY_PASSWORD} \
  ${PROXY_SERVER}-/user/org.couchdb.user:${PROXY_USER} << EOF | jq -r .token
{"name": "${PROXY_USER}", "password": "${PROXY_PASSWORD}", "type": "user"}
EOF
)

echo "${PROXY_SERVER:5}:_authToken=${NPM_AUTH_TOKEN}" > ~/.npmrc
(cd pkgs/load && npm publish --registry $PROXY_SERVER)
(cd dist/cli && npm publish --registry $PROXY_SERVER)

cd test/integration/sniff-bytes
npm i
NEON_BUILD_PLATFORM=${CURRENT_PLATFORM} npm run build
mkdir -p dist
# NOTE: `basename` is a workaround for https://github.com/npm/cli/issues/3405
PACKAGE_TARBALL=$(basename $(npm pack ./platforms/$CURRENT_PLATFORM --pack-destination=./dist --json | jq -r '.[0].filename'))
npm publish ./dist/${PACKAGE_TARBALL} --registry $PROXY_SERVER
npm publish --registry $PROXY_SERVER
