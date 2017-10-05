#!/bin/sh
echo "$0 - starting with args $*"
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root- exiting" 2>&1
   exit 1
fi

requestedApp="$1"

cd /builds/buildArea
su - www-data -c "cd /builds/buildArea && /bin/bash /builds/buildArea/MATS_for_EMB/scripts/common/build_deploy_apps-dev.sh ${requestedApp}" 2>&1
if [ $? -ne 0 ]; then
   echo $0  - /builds/buildArea/MATS_for_EMB/scripts/common/build_deploy_apps-dev.sh failed - exiting
   exit 1
fi
su - www-data -c "cd /builds/buildArea && /bin/bash /builds/buildArea/MATS_for_EMB/scripts/common/build_applist-dev.sh" 2>&1
if [ $? -ne 0 ]; then
   echo $0  - /builds/buildArea/MATS_for_EMB/scripts/common/build_applist-dev.sh failed - exiting
   exit 1
fi
echo restarting nginx
/bin/systemctl restart nginx 2>&1
exit 0
