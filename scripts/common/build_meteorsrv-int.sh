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
export METEOR_PACKAGE_DIRS=`find $PWD -name meteor_packages`
if [[ ! "$METEOR_PACKAGE_DIRS" =~ "meteor_packages" ]]; then
	echo "$0 failed to find the meteor packages subdirectory - what gives here? - must exit now"
	exit 1
fi

#build the apps
cd apps
find . -maxdepth 1 -type d -not -path "." | while read x
do
    if  [[ $#  -eq 1 ]] && [[ ! $x == "./${requestedApp}" ]]; then
        continue
    fi
	cd $x
    # do a pull just in case an application was pushed by someone else while we were building the previous apps
    /usr/bin/git pull
    # build the tag
    while IFS='-' read -r version prerelease
    do
        # overwrite the vdate part and then write the tmpversion file
        echo "${version}" > private/versiontmp
    done < private/version
    version=`cat private/versiontmp`
    mv private/versiontmp private/version
    /usr/bin/git tag -a ${version} -m "automatic build ${x} ${version}"
    /usr/bin/git commit -a
    /usr/bin/git push --tags origin master
	echo "building app ${x}"
	meteor reset
	meteor npm cache clean
	meteor npm install
	meteor build /builds
	cd ..
done
date
echo "$0 ----------------- finished" 
