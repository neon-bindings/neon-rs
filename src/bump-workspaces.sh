#!/bin/bash

bash ../check-src-pollution.sh

# npm version --workspaces patch

(cd cli && npm version patch --workspaces-update=false)

bash ../check-src-pollution.sh

(cd install && npm version patch --workspaces-update=false)

bash ../check-src-pollution.sh
