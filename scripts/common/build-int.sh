#!/bin/sh

export iam=`/usr/bin/whoami`
if [[ ${iam} -ne "nginx" ]]; then
   echo "This script must be run as nginx- exiting" 2>&1
   exit 1
fi

tag="$1"
taggedApp="$2"
cd /builds/buildArea
export apps=""
if [ -d MATS_for_EMB ]
then
    cd MATS_for_EMB
    git checkout master
    apps=( $(git diff --name-only  origin | grep apps | cut -f2 -d'/') )
    cd ..
else
    unset apps
fi

rm -rf MATS_for_EMB
git clone gerrit:MATS_for_EMB
git checkout master
# NEED to implement git checkout tag
cd MATS_for_EMB
if [ "X" == "X${tag}" ]
then
    # tag is requested so just build the app to the specified tag
    git checkout tags/${tag} -b master
    su - www-data -c "cd /builds/buildArea && /bin/bash /builds/buildArea/build_deploy_apps-int.sh" ${taggedApp} 2>&1
fi

if [ "X" == "X${apps}" ]
then
    su - www-data -c "cd /builds/buildArea && /bin/bash /builds/buildArea/build_deploy_apps-int.sh" 2>&1
else
    for app in "${apps[@]}"
    do
        su - www-data -c "cd /builds/buildArea && /bin/bash /builds/buildArea/build_deploy_apps-int.sh ${app}" 2>&1
    done
fi

su - www-data -c "/bin/bash MATS_for_EMB/scripts/common/build_applist-int.sh" 2>&1

su - www-data -c "/bin/bash MATS_for_EMB/scripts/common/update_apps.sh" 2>&1

/bin/systemctl restart nginx 2>&1

exit 0