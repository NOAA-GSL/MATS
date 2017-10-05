#!/bin/bash
# source the build environment and mongo utilities
. /builds/buildArea/MATS_for_EMB/scripts/common/mongo_utilities.source
# assign all the top level environment valuse from the build configuration to shell variables
setBuildConfigVarsForDevelopmentServer
# set up logging
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

requestedApp="$1"

echo -e "$0 ----------- started with args $*"
date
cd ${BUILD_DIRECTORY}
if [ ! -d "${DEPLOYMENT_DIRECTORY}" ]; then
    echo -e "${DEPLOYMENT_DIRECTORY} does not exist,  clone ${DEPLOYMENT_DIRECTORY}"
    cd ${DEPLOYMENT_DIRECTORY}
    /usr/bin/git clone ${BUILD_GIT_REPO}
    if [ $? -ne 0 ]; then
         echo -e "failed to /usr/bin/git clone ${BUILD_GIT_REPO} - must exit now"
        exit 1
    fi
fi

cd ${DEPLOYMENT_DIRECTORY}
echo -e checking out ${BUILD_CODE_BRANCH}
/usr/bin/git checkout ${BUILD_CODE_BRANCH}
if [ $? -ne 0 ]; then
    echo -e "${failed} to /usr/bin/git checkout ${BUILD_CODE_BRANCH} - must exit now"
    exit 1
fi

echo -e fetching
/usr/bin/git fetch
if [ $? -ne 0 ]; then
    echo -e "${failed} to /usr/bin/git fetch - must exit now"
    exit 1
fi

#build all of the apps that have changes (or if a meteor_package change just all the apps)
buildableApps=($(getBuildableAppsForServer "${SERVER}"))
echo -e buildable apps are....  ${buildableApps[*]}
diffOut=$(/usr/bin/git --no-pager diff --name-only origin/${BUILD_CODE_BRANCH})
ret=$?
if [ $ret -ne 0 ]; then
    echo -e "${failed} to /usr/bin/git diff - ret $ret - must exit now"
    exit 1
fi

diffs=$(echo $diffOut | grep -v 'appProductionStatus')
ret=$?
if [ $ret -ne 0 ]; then
    echo -e "${failed} no modified apps to build - ret $ret - must exit now"
    exit 1
fi
changedApps=($(echo -e ${diffs} | grep apps | cut -f2 -d'/'))
echo -e changedApps are ${changedApps}
meteor_package_changed=$(echo -e ${diffs}  | grep meteor_packages | cut -f2 -d'/')

unset apps
if [ "X${requestedApp}" != "X" ]; then
    if [ "${requestedApp}" == "all" ]; then
        apps=${buildableApps}
    else
        apps+=(${requestedApp})
    fi
else
    if [ "X${meteor_package_changed}" != "X"  ]; then
        # common code changed so we have to build all the apps
        echo -e common code changed - must build all buildable apps
        apps=${buildableApps}
    else
        # no common code changes do just build apps
        l2=" ${changedApps[*]} "
        for a in ${buildableApps[*]}; do
            if [[ $l2 =~ " $a " ]]; then
                apps+=($a)
            fi
        done
        echo -e modified and buildable apps are ${apps[*]}
    fi
fi
if  [ "X${apps}" == "X"  ]; then
	echo -e no apps to build - exiting
	exit 1
fi

# go ahead and merge changes
/usr/bin/git pull
if [ $ret -ne 0 ]; then
    echo -e "${failed} to ldableApps=($(getBuildableAppsForServer "${SERVER}")) - ret $ret - must exit now"
    exit 1
fi

cd ${DEPLOYMENT_DIRECTORY}/apps
echo -e "$0 building these apps ${apps[*]}"
for app in ${apps[*]}; do
    cd $app
    echo -e "$0 - building app $x"
    meteor reset
    meteor npm cache clean
    meteor npm install
    rollDevelopmentVersionAndDateForAppForServer ${app} ${SERVER}
    echo -e export the appProductionStatus collections file
    exportCollections ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    /usr/bin/git commit -m"automated export" ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    echo -e copy deployment.json to uncontrolled common area
    cat ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections/deployment.json |
        ${DEPLOYMENT_DIRECTORY}/scripts/common/makeCollectionExportValid.pl > ${DEPLOYMENT_DIRECTORY}/meteor_packages/mats-common/public/deployment/deployment.json
    echo -e building app
    meteor build /builds
    if [ $? -ne 0 ]; then
        echo -e "${failed} to meteor build - must exit now"
        exit 1
    fi
    echo -e make a tag
    buildVer=$(getVersionForAppForServer ${app} ${SERVER})
    tag="${app}-${buildVer}"
    git tag ${tag}
    cd ..
done

echo -e push appProductionStatus files and tags that we added
git push origin --tags
# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*

date
echo -e "$0 ----------------- finished" 
exit 0
