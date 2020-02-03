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
[[ -d /usr/app/settings/${APPNAME} ]] || mkdir /usr/app/settings/${APPNAME}
if [[ ! -f /usr/app/settings/${APPNAME}/settings.json ]]; then
  # create a template - lets the app start up in configure mode
cat << EOF > /usr/app/settings/${APPNAME}/settings.json
{
  "private": {},
  "public": {}
}
EOF
  # make sure the settings sirectory and file are still modifiable.
  chmod -R 777 /usr/app/settings/${APPNAME}
fi
export METEOR_SETTINGS_DIR="/usr/app/settings"
echo "run_app settings are ..."
cat /usr/app/settings/${APPNAME}/settings.json
export METEOR_SETTINGS="$(cat /usr/app/settings/${APPNAME}/settings.json)"
echo "METEOR_SETTINGS VAR IS" "${METEOR_SETTINGS}"
cd /usr/app
if [[ $DEBUG ]]; then
    echo "run_app => Starting meteor app for DEBUG on port: " $PORT " with settings " ${METEOR_SETTINGS}
    node --inspect=0.0.0.0:9229 main.js
else
    echo "run_app => Starting meteor app  on port: " ${PORT} " with settings " ${METEOR_SETTINGS}
    node main.js
fi