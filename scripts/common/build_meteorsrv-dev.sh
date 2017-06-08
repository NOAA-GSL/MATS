#!/bin/bash
# 
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

requestedApp="$1"

echo "$0 ----------- started"
date

cd /builds/buildArea
echo "remove and clone MATS_for_EMB"
/usr/bin/rm -rf MATS_for_EMB
git clone gerrit:MATS_for_EMB
cd MATS_for_EMB
git checkout development_v1.0

#test current dir is MATS_FOR_EMB
remote_origin=`git config --get remote.origin.url`

if [ "$remote_origin" = "gerrit:MATS_for_EMB" ]
then 
	echo "In a MATS_for_EMB clone - good - I will continue"
else
	echo "NOT in a MATS_for_EMB clone - not good"
	echo "try git clone gerrit:MATS_for_EMB MATS_for_EMB"
	echo "then execute this script from inside MATS_for_EMB"
	echo "quiting now."
	exit 1
fi

#build all the apps
export METEOR_PACKAGE_DIRS=`find $PWD -name meteor_packages`
if [[ ! "$METEOR_PACKAGE_DIRS" =~ "meteor_packages" ]]; then
	echo "failed to find the meteor packages subdirectory - what gives here? - must exit now"
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
	echo "building app $x"
	meteor reset
	#meteor npm cache clean
    echo "create new build version for app (append build date)"
    if [ ! -d "private" ]; then
        echo "failed to find the 'private' subdirectory - what gives here? Versioning depends on private/version- must exit now"
        exit 1
    fi
    vdate=`date +%Y.%m.%d.%H.%M`
    while IFS='-' read -r mversion prerelease
    do
        # overwrite the vdate part and then write the tmpversion file
        echo "${mversion}-${vdate}" > private/versiontmp
    done < private/version
    mv private/versiontmp private/version

    git commit -m"new version" private/version
    git push gerrit:MATS_for_EMB origin:development_v1.0
    git push
	meteor build /builds
	cd ..
done
date
echo "$0 ----------------- finished" 
