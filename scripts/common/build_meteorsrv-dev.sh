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

cd /builds/buildArea
echo "remove and clone MATS_for_EMB"
/usr/bin/rm -rf MATS_for_EMB
/usr/bin/git clone gerrit:MATS_for_EMB
cd MATS_for_EMB
/usr/bin/git checkout development_v1.0
# pick up any possible version number changes
#/usr/bin/git merge master
#test current dir is MATS_FOR_EMB
remote_origin=`/usr/bin/git config --get remote.origin.url`

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

#build all of the apps
cd apps
find . -maxdepth 1 -type d -not -path "." | while read x
do
    if  [[ $#  -eq 1 ]] && [[ ! $x == "./${requestedApp}" ]]; then
        continue
    fi
    cd $x
    echo "$0 - building app $x"
    /usr/bin/git pull
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
