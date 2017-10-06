#!/usr/bin/env bash
# This utility will perform a meteor update on all the apps on a deployment server, build or integration.
# Becuase meteor never removes old releases and each app must have a complete meteor environment we can get a
# build up of old meteor releases that are no loger used and that take up lots and lots of disk space.
# this utility will determine which ones are actually used, remove the old unused ones, and then make
# links to the newest used meteor npm and node. The system (things like ppassenger) is linked to these links.
# The utility performs these steps for each app.
# 1) meteor reset
# 2) remove node modules
# 3) meteor update (all packages)
# 4) meteor install babel runtime - I don't know why we have to do this....
# 5) clean up the meteor releases by removing unused ones
# 6) re-link the node and npm executibliles in .meteor to the newest ones in the newest meteor packages

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

cd MATS_for_EMB/apps
export METEOR_PACKAGE_DIRS=`ls -rt -d -1 "$PWD"/../meteor_packages/`

# update all the apps
for app in $(find . -maxdepth 1 -type d -not -path ".")
    do
        cd $app;
        pwd;
        meteor reset
        rm -rf node_modules
        meteor update --all-packages;
        meteor npm install --save babel-runtime
        cd ..;
    done

# clean up meteor releases for all the apps
shopt -s nullglob
releases=(`find . -name release | while read r; do cat $r | cut -d'@' -f2 | uniq; done | uniq | sed 's/\.\([^.]\)$/_\1/'`)
ls -1 ~/.meteor/packages/meteor-tool/ | while read mt
do
	contained="false"
	for i in "${releases[@]}"
		do
		if [[ "$i" = "$mt" ]]
		then
			contained="true"
		fi
	done
	if [[ "$contained" = "false" ]]
	then
		echo removing "~/.meteor/packages/meteor-tool/$mt"
		rm -rf ~/.meteor/packages/meteor-tool/$mt
		echo removing "~/.meteor/packages/meteor-tool/.$mt.*/"
		rm -rf ~/.meteor/packages/meteor-tool/.$mt.*/
	else
		echo leaving $mt
	fi
done

# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*

nodepath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/node
npmpath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/npm

rm -rf ~/.meteor/node
rm -rf ~/.meteor/npm
ln -sf $nodepath ~/.meteor/node
ln -sf $npmpath ~/.meteor/npm

cd ..

