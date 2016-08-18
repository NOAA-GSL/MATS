#!/usr/bin/bash
# 
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

echo "$0 ----------- started"
date
 
if [ ! -d MATS_for_EMB ]; then
	echo "no MATS_for_EMB directory here - git clone gerrit:MATS_for_EMB"
	exit 1
fi

cd MATS_for_EMB
echo "checkout master branch"
git checkout master
echo "git pull --rebase"
git reset --hard HEAD
git pull --rebase
if [ $? -ne 0 ]
then
	echo "git pull --rebase of master failed - must exit"
	exit 1
fi

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
export PACKAGE_DIRS=`find $PWD -name meteor_packages`
if [[ ! "$PACKAGE_DIRS" =~ "meteor_packages" ]]; then
	echo "failed to find the meteor packages subdirectory - what gives here? - must exit now"
	exit 1
fi
# create new minor versions for apps (build date)
cd meteor_packages
julian=`date +%Y%j`
find . -name version.html | while read x
do
	cat $x | sed "s|<i>[0-9]*</i>|<i>${julian}</i>|" > /tmp/version.html
	mv /tmp/version.html $x
	git commit -m"versioned per build" $x
done
cd ..

#git push gerrit:MATS_for_EMB origin:master
git push

#build the apps
cd apps
find . -maxdepth 1 -type d -not -path "." | while read x
do
	cd $x
	echo "building app $x"
	meteor reset
	meteor build /builds
	cd ..
done

# commit builds
buildDate=`date | tr ':' '-' | tr ' ' '_'`
cd /builds
git add .
git commit -a -m "built on $buildDate"
git tag -a "$buildDate" -m "built on $buildDate"
date
echo "$0 ----------------- finished" 
