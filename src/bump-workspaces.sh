#!/bin/bash

bash ../check-src-pollution.sh

npm version --workspaces patch

bash ../check-src-pollution.sh
