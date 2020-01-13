#!/bin/sh
set -e

echo "Running app ${APPNAME} date: $(date)"
# Set a delay to wait to start meteor container
if [[ $DELAY ]]; then
    echo "run_app => Delaying startup for $DELAY seconds"
    sleep $DELAY
fi

# Honour already existing PORT setup
export PORT=${PORT:-80}
export NODE_ENV=production
# check for persisted meteor settings and if not present create a template
# secret settings are added to the persistent settings.json by the app itself durring configuration
if [[ ! -f /usr/app/settings/${APPNAME}/settings.json ]]; then
  # create a template
cat << EOF > /usr/app/settings/${APPNAME}/settings.json
{
  "private": {},
  "public": {}
}
EOF
fi
#export METEOR_SETTINGS=$(cat /usr/app/settings/${APPNAME}/settings.json)
cd /usr/app
if [[ $DEBUG ]]; then
    #echo "run_app => Starting meteor app for DEBUG on port:$PORT with settings $METEOR_SETTINGS"
    node --inspect=0.0.0.0:9229  --settings=/usr/app/settings/${APPNAME}/settings.json main.js
else
    #echo "run_app => Starting meteor app  on port:$PORT with settings $METEOR_SETTINGS"
    node --settings=/usr/app/settings/${APPNAME}/settings.json main.js
fi