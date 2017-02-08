#!/bin/sh
#
# Used to copy existing Apps and part of .meteor to the production server
#logDir="/builds/buildArea/logs"

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

if [ "$1" == "help" ]; then
        cat <<xxxxxENDxxxx
This program will rsync the current /web directory to the production server named in the first parameter. It copies a selected list of apps that are found in
MATS_for_EMB/scripts/project_includes, and then a slected subset of the /web/.meteor directory. This meteor stuff is neccessary for
the node part of phusion passenger.
xxxxxENDxxxx
exit 0
fi
rsync -ral --rsh=ssh --delete  --include-from=/builds/buildArea/MATS_for_EMB/scripts/meteor_includes /web/.meteor  ${server}:/web
rsync -ral --rsh=ssh --delete  --include-from=/builds/buildArea/MATS_for_EMB/scripts/project_includes /web/*  ${server}:/web
nodepath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/node
npmpath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/npm

echo "do not forget to restart nginx on ${server}."
echo "and check the links for node and npm that are in /usr/local/bin on ${server} are correct. If the meteor install has changed (due to meteor upgrade), fix these links"
echo "ln -sf ${nodepath} /usr/local/bin/node"
echo "ln -sf ${npmpath} /usr/local/bin/npm"
exit 0
