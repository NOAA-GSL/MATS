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
echo "MONGO URL is: " $MONGO_URL
cd /usr/app
if [[ $DEBUG ]]; then
    node --inspect=0.0.0.0:9229  main.js
else
    echo "run_app => Starting mats home app"
    node main.js
fi