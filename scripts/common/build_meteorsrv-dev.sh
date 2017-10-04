#!/bin/bash
#
. /builds/buildArea/MATS_for_EMB/scripts/common/mongo_utilities.source
setBuildConfigVarsForDevelopmentServer

logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

requestedApp="$1"

echo "$0 ----------- started with args $*"
date

cd ${BUILD_DIRECTORY}
echo "remove and clone MATS_for_EMB"
/usr/bin/rm -rf MATS_for_EMB
/usr/bin/git clone ${BUILD_GIT_REPO}
cd MATS_for_EMB
/usr/bin/git fetch ${BUILD_CODE_BRANCH}
#build all of the apps that have changes (or if a meteor_package change just all the apps)
buildableApps=$(getBuildableAppsForServer "${SERVER}")
changes=$(git diff origin/development_v1.0 --no-pager  --name-only)
changedApps=$(echo ${changes} | grep apps | cut -f2 -d'/')
meteor_package=$(echo ${changes}  | grep meteor_packages | cut -f2 -d'/')


for app in ${buildableApps[@]}; do
    if  [[ $#  -eq 1 ]] && [[ ! $app == "./${requestedApp}" ]]; then
        continue
    fi
    cd $app
    echo "$0 - building app $x"
    meteor reset
    meteor npm cache clean
    meteor npm install
    echo "create new build version for app (append build date)"
    if [ ! -d "private" ]; then
        echo "failed to find the 'private' subdirectory - what gives here? Versioning depends on private/version- must exit now"
        exit 1
    fi
    export vdate=`date +%Y.%m.%d.%H.%M`
    jq -r .development private/version | while IFS="-" read dversion ddate
    do
        export dversion
        export ddate
        export developmentVersion="${dversion}-${vdate}"
        jq -M -r ". | {development:env.developmentVersion,integration,production}" private/version
    done >> private/versiontmp
    mv private/versiontmp private/version
    /usr/bin/git commit -m"new development version" private/version
    # we just did a pull so go ahead and force this push with the new version
    /usr/bin/git push origin development_v1.0 -f

    echo "$0 - building app ${x}"
	   meteor build /builds
	   cd ..
done
# clean up /tmp files
echo "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*

date
echo "$0 ----------------- finished" 
