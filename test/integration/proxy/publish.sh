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

npx npm-cli-adduser -u ${PROXY_USER} -p ${PROXY_PASSWORD} -e ${PROXY_EMAIL} -r ${PROXY_SERVER}
(cd pkgs/load && npm publish --registry $PROXY_SERVER)
(cd pkgs/cli && npm publish --registry $PROXY_SERVER)

cd test/integration/sniff-bytes
npm i
NEON_DIST_OUTPUT=platforms/${CURRENT_PLATFORM}/index.node npm run build
mkdir -p dist
# NOTE: `xargs basename` is a workaround for https://github.com/npm/cli/issues/3405
PACKAGE_TARBALL=$( (cd platforms/$CURRENT_PLATFORM && npm pack --json | jq '.[0].filename' | xargs basename) )
mv ./platforms/${CURRENT_PLATFORM}/${PACKAGE_TARBALL} ./dist/
npm publish ./dist/${PACKAGE_TARBALL} --registry $PROXY_SERVER
npm publish --registry $PROXY_SERVER
