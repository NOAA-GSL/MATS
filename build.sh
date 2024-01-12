#!/bin/bash

set -euo pipefail

apps=(
    "cb-metar"
    "ceil-vis"
    "ceil-vis15"
    "ensemble"
    "landuse"
    "precipAccum"
    "precipGauge"
    "precipitation1hr"
    "ptype"
    "radar"
    "scorecard"
    "surface"
    "surfrad"
    "upperair"
)
branch=$(git branch --show-current)
commit=$(git rev-parse HEAD)
version=$(git describe --exact-match --tags HEAD 2>/dev/null || echo "") # Store the git tag if it points to current sha

# For each app, build the container
for app in "${apps[@]}"; do
    echo "Info - Currently building: ${app}"
    docker build \
        --build-arg APPNAME="${app}" \
        --build-arg BUILDVER="${version:-"dev"}" \
        --build-arg COMMITBRANCH="${branch}" \
        --build-arg COMMITSHA="${commit}" \
        -t mats/development/"${app}":"${version:-"dev"}" \
        .
    echo "Info - Built: ${app}"
done
