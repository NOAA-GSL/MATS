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
echo -e "${GRN}$0 ----------- started${NC}"
date

usage="$0 [server [app] || help]"
if [ $# -lt 1 ]; then
    echo -e "${RED}$0 - wrong number of params - usage: $usage${NC}"
    exit 1
fi
server=$1
requestedApp=""
if [ $# -eq 2 ]; then
    requestedApp=$2
fi

if [ "$1" == "help" ]; then
    cat <<xxxxxENDxxxx
This program will rsync the current /web directory to the production server named in the first parameter. It copies a selected list of apps that are found in
the appProductionStatus database and are returned by getPublishableApps, and then a slected subset of the /web/.meteor directory. This meteor stuff is neccessary for
the node part of phusion passenger.
xxxxxENDxxxx
    exit 0
fi
# rsync the meteor stuff
echo -e "${GRN}rsync meteor${NC}"
/usr/bin/rsync -ralWq --no-motd --rsh=ssh --delete  --include '.meteor/packages/meteor-tool/***' --exclude '.meteor/packages/*'  /web/.meteor  ${server}:/web

# get the publication app list
publishApps=($(getPublishableApps))
if [ "X" == "X${requestedApp}" ]; then
    # publish them all
    for pa in "${publishApps[@]}"; do
        /usr/bin/rsync -ralW --rsh=ssh --delete  --include "+ ${pa}/***" --exclude='*' /web/*  ${server}:/web/gsd/mats
        promoteApp ${pa}
    done
else
    # publish just the requested one
    echo "rsyncing ${requestedApp}"
    /usr/bin/rsync -ralW --rsh=ssh --delete  --include "+ ${requestedApp}/***"  --exclude='*' /web/*  ${server}:/web/gsd/mats
    promoteApp ${pa}
fi

# fix up some linksa for the public service endpoint
echo -e "${GRN}linking /gsd/mats${NC}"
/usr/bin/ssh ${server} "cd /web; ln -sf gsd/mats/* ."

nodepath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/node
npmpath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/npm
servernodepath=`ssh ${server} readlink -e /usr/local/bin/node`
servernpmpath=`ssh ${server} readlink -e /usr/local/bin/npm`

if [ "$servernodepath" != "$servernodepath"  ];
then
    echo -e "${GRN}Check the link for node that is in /usr/local/bin on ${server} to see if it is correct. If the meteor install has changed (due to meteor upgrade), fix this link${NC}"
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

echo -e "${RED}do not forget to restart nginx on ${server}.${GRN}"
exit 0
