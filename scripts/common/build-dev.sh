#!/bin/sh

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root- exiting" 2>&1
   exit 1
fi

requestedApp="$1"

cd /builds/buildArea
if [ -d MATS_for_EMB ]
su - www-data -c "cd /builds/buildArea && /bin/bash /builds/buildArea/scripts/common/build_deploy_apps-dev.sh ${requestedApp}" 2>&1

/bin/bash MATS_for_EMB/scripts/common/build_applist-dev.sh

/bin/systemctl restart nginx 2>&1



exit 0
