#!/bin/sh
set -e

echo "Running app ${APPNAME} date: $(date)"

# Set a delay to wait to start meteor container

if [ $DELAY ]; then
    echo "run_app => Delaying startup for $DELAY seconds"
    sleep $DELAY
fi

# Honour already existing PORT setup
export PORT=${PORT:-80}
export NODE_ENV=production
# check for persisted meteor settings and if not present create a template
# secret settings are added to the persistent settings.json by the app itself durring configuration
echo "run-app: make sure we have a ${APP_FOLDER}/settings/${APPNAME} directory.."
if [ ! -d ${APP_FOLDER}/settings/${APPNAME} ]; then
    echo "run-app: creating ${APP_FOLDER}/settings/${APPNAME}"
    mkdir -p ${APP_FOLDER}/settings/${APPNAME}
fi

ls ${APP_FOLDER}/settings/${APPNAME}
whoami

if [ ! -f ${APP_FOLDER}/settings/${APPNAME}/settings.json ]; then
  # create a template - lets the app start up in configure mode
  echo "run-app: creating empty settings file"
cat << EOF > ${APP_FOLDER}/settings/${APPNAME}/settings.json
{
  "private": {},
  "public": {}
}
EOF
  # make sure the settings directory and file are still modifiable.
  chmod -R 777 ${APP_FOLDER}/settings/${APPNAME}
fi

echo "MONGO URL is: " $MONGO_URL
export METEOR_SETTINGS_DIR="${APP_FOLDER}/settings"
METEOR_SETTINGS="$(cat ${APP_FOLDER}/settings/${APPNAME}/settings.json)"
export METEOR_SETTINGS


cd $APP_BUNDLE_FOLDER/bundle
pwd

if [ $DEBUG ]; then
    echo "run_app => Starting meteor app for DEBUG"
    node --inspect=0.0.0.0:9229 main.js
else
    echo "run_app => Starting meteor app"
    node main.js
fi
