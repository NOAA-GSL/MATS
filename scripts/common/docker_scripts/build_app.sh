#!/bin/sh
set -e

if [ -d /usr/app ]; then
    cd /usr/app
    echo "build_app => building app"
    npm cache clean -f
    npm install -g n
    npm install -g fibers
    # NOTE this HAS TO MATCH what meteor node -v returns or the fibers won't install
    echo "build_app => n ${METEOR_NODE_VERSION}"
    n ${METEOR_NODE_VERSION}
    npm install -g --production
else
    echo "build_app =>  You don't have an meteor app to run in this image."
    exit 1
fi
