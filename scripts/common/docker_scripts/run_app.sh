#!/bin/sh
set -e

# Set a delay to wait to start meteor container
if [[ $DELAY ]]; then
    echo "run_app => Delaying startup for $DELAY seconds"
    sleep $DELAY
fi

# Honour already existing PORT setup
export PORT=${PORT:-80}
export NODE_ENV=production
export METEOR_SETTINGS=$(cat /usr/app/settings/${APPNAME}/settings.json)
cd /usr/app

echo "run_app => Starting meteor app on port:$PORT with settings $METEOR_SETTINGS"
node main.js