#!/bin/sh
# 
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

echo "git fetch origin"
git fetch origin
if [ $? -ne 0 ]
then
echo "git fetch failed - must exit"
exit 1
fi

echo "git reset --hard origin/master"
git reset --hard origin/master
if [ $? -ne 0 ]
then
echo "git  reset failed - must exit"
exit 1
fi

export PACKAGE_DIRS=`find $PWD -name meteor_packages`
if [[ ! "$PACKAGE_DIRS" =~ "meteor_packages" ]]; then
	echo "failed to find the meteor packages subdirectory - what gives here? - must exit now"
	exit 1
fi
cd meteor_packages
julian=`date +%Y%j`
find . -name version.html | while read x
do
	cat $x | sed 's|<i>\d+</i>|<i>2015328</i>|' > /tmp/version.html
	mv /tmp/version.html $x
	git commit -m"versioned per build" $x
done
git git push gerrit:MATS_for_EMB origin:master


cd apps
find . -maxdepth 1 -type d -not -path "." | while read x
do
	cd $x
	echo "building app $x"
	meteor reset
	meteor build /tmp/builds
	cd ..
done

