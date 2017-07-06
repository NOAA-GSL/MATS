#!/bin/sh

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root- exiting" 2>&1
   exit 1
fi
export usage="$0 [appdir | tag appname]"
# extra cd because the su - p preserves the PWD
cd /builds/buildArea/MATS_for_EMB
su -p www-data <<%EOFS
    tag="$1"
    taggedApp="$2"
    export apps=""
    cd /builds/buildArea
    # if the local repo exists find out which apps are different from the local master branch and the fetched origin
    # this gives us an app list that represents apps that need to be rebuilt. If the mats-common
    # package has changed and an app needs the new version then it will have a different package list
    # reflecting the dependency on the new mats-common, and will therefore differ
    if [ -d MATS_for_EMB ]
    then
        cd /builds/buildArea/MATS_for_EMB
        /usr/bin/git fetch
        apps=( $(/usr/bin/git --no-pager diff master origin/master --name-only | grep apps | cut -f2 -d'/') )
    else
        # there was no local repo so there is no changed app list. All the apps should get built
        unset apps
    fi

    # blow away the local and reclone - just to be absolutely clear that we are building from the latest
    rm -rf MATS_for_EMB
    /usr/bin/git clone gerrit:MATS_for_EMB
    cd MATS_for_EMB

    # Might need to implement git checkout tag
    if [ "X" != "X${tag}" ]
    then
        # tag is requested so only build the tagged app to the specified tag
        if [ "X" == "X${taggedApp}" ]
            then
                echo "If you specify a tag you MUST also specify a tagged application - you did not specify a tagged application - exiting"
                echo $usage
                echo "valid tags are"
                /usr/bin/git show-ref --tags
                exit 1
            fi
        /usr/bin/git  rev-parse ${taggedApp} > /dev/null 2>&1
        if [ $? -ne 0 ]
        then
            echo "your specified tag does not exist in the repo - exiting"
            echo $usage
            echo "valid tags are"
            /usr/bin/git show-ref --tags
            exit 1
        ]
        /usr/bin/git checkout tags/${tag} -b master
        cd /builds/buildArea
        /bin/bash /builds/buildArea/MATS_for_EMB/scripts/common/build_deploy_apps-int.sh ${taggedApp}
        /bin/bash /builds/buildArea/MATS_for_EMB/scripts/common/build_applist-int.sh
        exit 0
    fi

    cd /builds/buildArea
    if [ "X" != "X${apps}" ]
    then
        /bin/bash /builds/buildArea/build_deploy_apps-int.sh 2>&1
    else
        for app in "${apps[@]}"
        do
            /bin/bash /builds/buildArea/build_deploy_apps-int.sh ${app} 2>&1
        done
    fi
    /bin/bash /builds/buildArea/MATS_for_EMB/scripts/common/build_applist-int.sh
%EOFS

/bin/systemctl restart nginx 2>&1

exit 0