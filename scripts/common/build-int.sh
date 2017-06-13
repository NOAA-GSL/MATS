#!/bin/sh

export iam=`/usr/bin/whoami`
if [[ ${iam} != "root" ]]; then
   echo "This script must be run as root - exiting" 2>&1
   exit 1
fi

su -p www-data <<%EOFS
    tag="$1"
    taggedApp="$2"
    export apps=""
    if [ -d MATS_for_EMB ]
    then
        cd MATS_for_EMB
        git fetch
        apps=( $(git --no-pager diff master origin/master --name-only | grep apps | cut -f2 -d'/') )
    else
        unset apps
    fi

    cd /builds/buildArea
    rm -rf MATS_for_EMB
    git clone gerrit:MATS_for_EMB
    cd MATS_for_EMB

    # NEED to implement git checkout tag
    if [ "X" != "X${tag}" ]
    then
        # tag is requested so just build the app to the specified tag
        git checkout tags/${tag} -b master
        cd /builds/buildArea && /bin/bash /builds/buildArea/build_deploy_apps-int.sh ${taggedApp} 2>&1
    fi

    if [ "X" != "X${apps}" ]
    then
        cd /builds/buildArea && /bin/bash /builds/buildArea/build_deploy_apps-int.sh 2>&1
    else
        for app in "${apps[@]}"
        do
            cd /builds/buildArea && /bin/bash /builds/buildArea/build_deploy_apps-int.sh ${app} 2>&1
        done
    fi

    #/bin/bash MATS_for_EMB/scripts/common/build_applist-int.sh 2>&1

    #/bin/bash MATS_for_EMB/scripts/common/update_apps.sh 2>&1
%EOFS

/bin/systemctl restart nginx 2>&1

exit 0