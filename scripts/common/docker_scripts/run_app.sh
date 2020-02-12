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
echo "run-app: make sure we have a /usr/app/settings/${APPNAME} directory.."
if [[ ! -d /usr/app/settings/${APPNAME} ]]; then
    echo "run-app: creating /usr/app/settings/${APPNAME}"
    mkdir -p /usr/app/settings/${APPNAME}
fi
echo "$(ls /usr/app/settings/${APPNAME})"

if [[ ! -f /usr/app/settings/${APPNAME}/settings.json ]]; then
  # create a template - lets the app start up in configure mode
  echo "run-app: creating empty settings file"
cat << EOF > /usr/app/settings/${APPNAME}/settings.json
{
  "private": {},
  "public": {}
}
EOF
  # make sure the settings directory and file are still modifiable.
  chmod -R 777 /usr/app/settings/${APPNAME}
fi
echo "MONGO URL is: " $MONOG_URL
echo "dropping database: "
echo "mongo $MONGO_URL --eval \"db.${APPNAME}.drop()\"
#mongo $MONGO_URL --eval "db.${APPNAME}.drop()"
export METEOR_SETTINGS_DIR="/usr/app/settings"
export METEOR_SETTINGS="$(cat /usr/app/settings/${APPNAME}/settings.json)"
cd /usr/app
if [[ $DEBUG ]]; then
    echo "run_app => Starting meteor app for DEBUG on port: " $PORT " with settings " ${METEOR_SETTINGS}
    node --inspect=0.0.0.0:9229 main.js
else
    echo "run_app => Starting meteor app  on port: " ${PORT} "
    node main.js
fi