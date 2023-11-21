#!/bin/bash

PROXY_DIR=$(dirname $0)
cd ${PROXY_DIR}/../../..
ROOT_DIR=$(pwd)

PROXY_USER=ci
PROXY_PASSWORD=dummycipassword
PROXY_EMAIL=ci@neon-bindings.com
PROXY_SERVER=http://127.0.0.1:4873/

npx npm-cli-adduser -u ${PROXY_USER} -p ${PROXY_PASSWORD} -e ${PROXY_EMAIL} -r ${PROXY_SERVER}
(cd pkgs/load && npm publish --registry $PROXY_SERVER)
(cd pkgs/cli && npm publish --registry $PROXY_SERVER)

cd test/integration/sniff-bytes
npm i
npm run build
mkdir -p dist
PACKAGE_TARBALL=$(npx neon tarball --out-dir dist | tail -1)
npm publish ./${PACKAGE_TARBALL} --registry $PROXY_SERVER
npm publish --registry $PROXY_SERVER
