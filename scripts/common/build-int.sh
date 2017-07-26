#!/bin/sh
echo "$USER  $0 - starting with args $*"
export apps=""
export tag=""
export taggedApp=""
export usage="$0 [all | tag appname]"

while getopts "at:n:" o; do
    case "${o}" in
        a)
            unset apps
            unset tag
            ;;
        t)
            tag=${OPTARG}
            ;;
        n)
            taggedApp=${OPTARG}
            ;;
        *)
            usage
            ;;
    esac
done
shift $((OPTIND-1))

if [[ $EUID -ne 0 ]]; then
   echo "$USER $0 - This script must be run as root- exiting" 2>&1
   exit 1
fi

# extra cd because the su - p preserves the PWD
cd /builds/buildArea/MATS_for_EMB
su - www-data <<%EOFS
    cd /builds/buildArea
    # if the local repo exists find out which apps are different from the local master branch and the fetched origin
    # this gives us an app list that represents apps that need to be rebuilt. If the mats-common
    # package has changed and an app needs the new version then it will have a different package list
    # reflecting the dependency on the new mats-common, and will therefore differ
    if [ -d MATS_for_EMB ]
    then
        cd /builds/buildArea/MATS_for_EMB
        # make certain that we are on the master branch
        git checkout master
        /usr/bin/git fetch
        apps=( $(/usr/bin/git --no-pager diff master origin/master --name-only | grep apps | cut -f2 -d'/') )
        echo "building these apps - ${apps[*]}"

    else
        # there was no local repo so there is no changed app list. All the apps should get built
        echo "$USER $0 no local repo - building all apps"
        unset apps
    fi

    # blow away the local repo and re-clone - just to be absolutely clear that we are building from the latest
    cd /builds/buildArea
    rm -rf MATS_for_EMB
    /usr/bin/git clone gerrit:MATS_for_EMB
    cd /builds/buildArea/MATS_for_EMB

    # Might need to implement git checkout tag
    if [ "X" != "X${tag}" ]
    then
        # tag is requested so only build the tagged app to the specified tag
        echo "$USER $0 - checking app ${taggedApp} against the tag ${tag}"
        if [ "X" == "X${taggedApp}" ]
        then
            echo "$USER $0 - If you specify a tag you MUST also specify a tagged application - you did not specify a tagged application - exiting"
            echo $usage
            echo "valid tags are"
            /usr/bin/git show-ref --tags
            exit 1
        fi
        /usr/bin/git  rev-parse ${tag} > /dev/null 2>&1
        if [ $? -ne 0 ]
        then
            echo "$USER $0 - your specified tag does not exist in the repo - exiting"
            echo $usage
            echo "valid tags are"
            /usr/bin/git show-ref --tags
            exit 1
        fi
        echo "$USER $0 - building app ${taggedApp} against the tag ${tag}"
        /usr/bin/git checkout tags/${tag} -b master
        cd /builds/buildArea/MATS_for_EMB
        /bin/bash -x /builds/buildArea/MATS_for_EMB/scripts/common/build_deploy_apps-int.sh ${taggedApp}
        /bin/bash -x /builds/buildArea/MATS_for_EMB/scripts/common/build_applist-int.sh
        exit 0
    fi

    echo "$USER $0 - building ${apps} against the latest revision"
    cd /builds/buildArea/MATS_for_EMB
    if [ "X" == "X${apps}" ]
    then
        echo "$USER $0 - building all the apps to the latest revision"
        /bin/bash -x /builds/buildArea/MATS_for_EMB/scripts/common/build_deploy_apps-int.sh 2>&1
    else
        echo "$USER $0 - building ${apps[@]} to the latest revision"
        for app in "${apps[@]}"
        do
            /bin/bash -x /builds/buildArea/MATS_for_EMB/scripts/common/build_deploy_apps-int.sh ${app} 2>&1
        done
    fi
    echo "$USER $0 - building the applist"
    /bin/bash -x /builds/buildArea/MATS_for_EMB/scripts/common/build_applist-int.sh
%EOFS
echo "$0 - restarting nginx"
/bin/systemctl restart nginx 2>&1

exit 0