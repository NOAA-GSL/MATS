#!/bin/bash
# 
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

requestedApp="$1"

echo "$0 ----------- started with args $*"
date

#test current dir is MATS_FOR_EMB
remote_origin=`/usr/bin/git config --get remote.origin.url`

if [ "$remote_origin" = "gerrit:MATS_for_EMB" ]
then 
	echo "$0 In a MATS_for_EMB clone - good - I will continue"
else
	echo "$0 NOT in a MATS_for_EMB clone - not good"
	echo "try git clone gerrit:MATS_for_EMB MATS_for_EMB"
	echo "then execute this script from inside MATS_for_EMB"
	echo "quiting now."
	exit 1
fi

#build all the apps
cd /builds/buildArea/MATS_for_EMB
echo "PWD is $PWD"
export METEOR_PACKAGE_DIRS=`find $PWD -name meteor_packages`
if [[ ! "$METEOR_PACKAGE_DIRS" =~ "meteor_packages" ]]; then
	echo "$0 failed to find the meteor packages subdirectory - what gives here? - must exit now"
	exit 1
fi

#build the apps
cd apps
find . -maxdepth 1 -type d -not -path "." | while read appName
do
    if  [[ $#  -eq 1 ]] && [[ ! ${appName} == "./${requestedApp}" ]]; then
        continue
    fi
	cd ${appName}
    # do a pull just in case an application was pushed by someone else while we were building the previous apps
    /usr/bin/git pull
    # build the tag and roll the patch number
    IFS="-" read dversion ddate <<< `jq -r .development private/version`
    export dversion
    export ddate
    # overwrite the patch part of the version - roll the patch
    dmajor=`echo "${dversion}" | cut -d'.' -f1`
    dminor=`echo "${dversion}" | cut -d'.' -f2`
    pversion=`jq -r .production private/version`
    # overwrite the patch part of the version - roll the patch
    major=`echo "${pversion}" | cut -d'.' -f1`
    minor=`echo "${pversion}" | cut -d'.' -f2`
    patch_old=`echo "${pversion}" | cut -d'.' -f3`
    patch_new=$((patch_old + 1))
    #make the development patch number one higher than the integration patch number - roll the dev patch
    dpatch_new=$((patch_new + 1))
    export dversion="${dmajor}.${dminor}.${dpatch_new}-${ddate}"
    export pversion="$major.${minor}.${patch_new}"
    jq -M -r ". | {development:env.dversion,production:env.pversion}" private/version > private/versiontmp
    mv private/versiontmp private/version
    # build the tag
    vdate=`date +%Y.%m.%d.%H.%M`
    appBaseName=`basename ${appName}`
    tag="int-${appBaseName}-${version}-${vdate}"
    /usr/bin/git tag -a ${tag} -m "automatic build ${appBaseName} ${tag}"
    /usr/bin/git commit -a -m"new integration tag"
    /usr/bin/git push --follow-tags

    /usr/bin/git commit -a -m"new integration version"
    /usr/bin/git push origin master -f
	echo "$0 - building app ${appBaseName}"
	echo "METEOR_PACKAGE_DIRS is $METEOR_PACKAGE_DIRS"
	meteor reset
	meteor npm cache clean
	meteor npm install
	meteor build /builds
	cd ..
done

# clean up /tmp files
echo "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*
date
echo "$0 ----------------- finished" 
