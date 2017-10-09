#!/usr/bin/env bash
# source the build environment and mongo utilities
. /builds/buildArea/MATS_for_EMB/scripts/common/app_production_utilities.source
#
# Used to copy all the existing meteor apps and part of .meteor to a production server

# This script should be modified in the following way...
# There should be a previous location on the target.
# the contents of the /web directory on the target server should be a link to a directory named after the publish date. i.e. 2016xxx where xxx is the julian day.
# initially this directory is a copy (cp -a) of the existing /web.
# there is a directory named previous that contains the contents of the website as it existed prior to the last update.
# 1. the current /web is rsynced (with delete) to the "previous"
# 1. the existing /web is archived to a new directory that is named after the publish date. i.e. 2016xxx where xxx is the julian day.
# 2. the new publication /web (from the dev server) is rsync'd to this new directory.
# 3. the /web link is re-established to the newly rsync'd directory.
# 4. the old directory is removed

# This is like a copy on write and minimizes the time that the web pages are in transition, thereby minimizing the chance that incomplete content might be accessed.
# It also gives us a backup copy of what was actually deployed previously.


logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
#exec > >(tee -i $logname)
#exec 2>&1
echo "$0 ----------- started"
date

usage="$0 [server || help]"

server=$1
requestedApp=$2

if [ "$1" == "help" ]; then
    cat <<xxxxxENDxxxx
This program will rsync the current /web directory to the production server named in the first parameter. It copies a selected list of apps that are found in
MATS_for_EMB/scripts/common/project_includes, and then a slected subset of the /web/.meteor directory. This meteor stuff is neccessary for
the node part of phusion passenger.
xxxxxENDxxxx
    exit 0
fi
# rsync the meteor stuff
rsync -ralW --rsh=ssh --delete  --include '.meteor/packages/meteor-tool/***' --exclude '.meteor/packages/*'  /web/.meteor  ${server}:/web

publishApps=$(getPublishableApps)
if [ "X" == "X${requestedApp}" ]; then
    # build them all
    for pa in "${publishApps[@]}"; do
        rsync -ralW --rsh=ssh --delete  --include "+ ${pa}/***" --exclude='*' /web/*  ${server}:/web/gsd/mats
    done
else
    rsync -ralW --rsh=ssh --delete  --include "+ ${requestedApp}/***"  --exclude='*' /web/*  ${server}:/web/gsd/mats
fi
ssh @${sever} "cd /web; ln -sf gsd/mats/* ."

nodepath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/node
npmpath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/npm
servernodepath=`ssh ${server} readlink -e /usr/local/bin/node`
servernpmpath=`ssh ${server} readlink -e /usr/local/bin/npm`

echo "do not forget to restart nginx on ${server}."
if [ "$servernodepath" != "$servernodepath"  ];
then
    echo "Check the link for node that is in /usr/local/bin on ${server} to see if it is correct. If the meteor install has changed (due to meteor upgrade), fix this link"
    echo "server node path is : $servernodepath"
    echo " should be : $nodepath"
    echo "ln -sf ${nodepath} /usr/local/bin/node"
fi
if [ "$npmpath" != "$servernpmpath"  ];
then
    echo "Check the link for npm that is in /usr/local/bin on ${server} to see if it is correct. If the meteor install has changed (due to meteor upgrade), fix this link"
    echo "server node path is : $servernpmpath"
    echo " should be : $npmpath"
    echo "ln -sf ${npmpath} /usr/local/bin/npm"
fi
exit 0
