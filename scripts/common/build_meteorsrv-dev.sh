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

echo "$0 ----------- started with args $*"
date
cd ${BUILD_DIRECTORY}
if [ ! -d "${DEPLOYMENT_DIRECTORY}" ]; then
    echo "${DEPLOYMENT_DIRECTORY} does not exist,  clone ${DEPLOYMENT_DIRECTORY}"
    cd ${DEPLOYMENT_DIRECTORY}
    /usr/bin/git clone ${BUILD_GIT_REPO}
    if [ $? -ne 0 ]; then
        echo "failed to /usr/bin/git clone ${BUILD_GIT_REPO} - must exit now"
        exit 1
    fi
fi

cd ${DEPLOYMENT_DIRECTORY}
echo checking out ${BUILD_CODE_BRANCH}
/usr/bin/git checkout ${BUILD_CODE_BRANCH}
if [ $? -ne 0 ]; then
    echo "failed to /usr/bin/git checkout ${BUILD_CODE_BRANCH} - must exit now"
    exit 1
fi

echo fetching
/usr/bin/git fetch
if [ $? -ne 0 ]; then
    echo "failed to /usr/bin/git fetch - must exit now"
    exit 1
fi

#build all of the apps that have changes (or if a meteor_package change just all the apps)
buildableApps=($(getBuildableAppsForServer "${SERVER}"))
echo buildable apps are....
echo ${buildableApps[*]}
echo working in $(pwd) BUILD_CODE_BRANCH is ${BUILD_CODE_BRANCH}
diffs=$(/usr/bin/git --no-pager diff --name-only origin/${BUILD_CODE_BRANCH} | grep -v 'appProductionStatus')
if [ $? -ne 0 ]; then
    echo "failed to /usr/bin/git diff - must exit now"
    exit 1
fi
changedApps=($(echo ${diffs} | grep apps | cut -f2 -d'/'))
echo changedApps are ${changedApps}
meteor_package_changed=$(echo ${diffs}  | grep meteor_packages | cut -f2 -d'/')

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
        echo common code changed - must build all buildable apps
        apps=${buildableApps}
    else
        # no common code changes do just build apps
        l2=" ${changedApps[*]} "
        for a in ${buildableApps}; do
            if [[ $l2 =~ " $a " ]]; then
                apps+=($a)
            fi
        done
        echo modified and buildable apps are ${apps[*]}
    fi
fi
echo "$0 building these apps ${apps[*]}"
for app in ${apps[*]}; do
    cd $app
    echo "$0 - building app $x"
    meteor reset
    meteor npm cache clean
    meteor npm install
    rollDevelopmentVersionAndDateForAppForServer ${app} ${SERVER}
    echo export the appProductionStatus collections file
    exportCollections ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    /usr/bin/git commit -m"automated export" ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    echo copy deployment.json to uncontrolled common area
    cat ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections/deployment.json |
        ${DEPLOYMENT_DIRECTORY}/scripts/common/makeCollectionExportValid.pl > ${DEPLOYMENT_DIRECTORY}/meteor_packages/mats-common/public/deployment/deployment.json
    echo building app
    meteor build /builds
    if [ $? -ne 0 ]; then
        echo "failed to meteor build - must exit now"
        exit 1
    fi
    echo make a tag
    buildVer=$(getVersionForAppForServer ${app} ${SERVER})
    tag="${app}-${buildVer}"
    git tag ${tag}
    cd ..
done

echo push appProductionStatus files and tags that we added
git push origin --tags
# clean up /tmp files
echo "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*

date
echo "$0 ----------------- finished" 
exit 0