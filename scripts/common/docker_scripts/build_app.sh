#!/bin/sh
set -e

if [ -d /usr/app ]; then
    cd /usr/app
    echo "build_app => building app"
    npm cache clean -f
    npm install -g n
    # NOTE this HAS TO MATCH what meteor node -v returns or the fibers won't install
    n 8.11.4
    npm install -g
else
    echo "build_app =>  You don't have an meteor app to run in this image."
    exit 1
fi
