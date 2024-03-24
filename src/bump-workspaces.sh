#!/bin/bash

bash ../check-src-pollution.sh

# npm version --workspaces patch

(cd cli && npm version patch)

bash ../check-src-pollution.sh

(cd install && npm version patch)

bash ../check-src-pollution.sh
