#!/bin/sh
set -e

if [ -d /usr/app ]; then
    cd /usr/app
    cd /usr/app/programs/server/
    npm install
else
    echo "=> You don't have an meteor app to run in this image."
    exit 1
fi
