#!/usr/bin/env bash
# This utility will perform a meteor update on all the apps on a deployment server, build or integration.
# Becuase meteor never removes old releases and each app must have a complete meteor environment we can get a
# build up of old meteor releases that are no loger used and that take up lots and lots of disk space.
# this utility will determine which ones are actually used, remove the old unused ones, and then make
# links to the newest used meteor npm and node. The system (things like ppassenger) is linked to these links.
# The utility performs these steps for each app.
# 1) meteor reset
# 2) remove .meteor/local
# 3) meteor update (all packages)
# 4) remove node modules
# 5) meteor npm install
# 4) meteor npm install specific babel runtime - I don't know why we have to do this.... I think I hate babel-runtime
# 5) clean up the meteor releases by removing unused ones
# 6) re-link the node and npm executibliles in .meteor to the newest ones in the newest meteor packages

logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

echo "$0 ----------- started"
date

if [ ! -d MATS ]; then
	echo "no MATS directory here - git clone git@github.com:NOAA-GSL/MATS.git"
	exit 1
fi

cd MATS/apps
#export METEOR_PACKAGE_DIRS=`ls -rt -d -1 "$PWD"/../meteor_packages/`

# update all the apps
for app in $(find . -maxdepth 1 -type d -not -path ".")
    do
        cd $app;
        pwd;
        rm -rf .meteor/local
      	meteor reset
        meteor update
        meteor update --all-packages
        meteor npm uninstall fibers
        meteor npm install fibers
        meteor npm audit fix --force
        meteor npm list
        cd ..
    done
