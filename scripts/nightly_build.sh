#!/bin/sh

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root- exiting" 2>&1
   exit 1
fi

requestedApp="$1"

cd /builds/buildArea

su - www-data -c "./build_deploy_apps.sh ${requestedApp}" 2>&1

service nginx restart 2>&1

exit 0