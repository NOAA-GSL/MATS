#!/bin/sh
#
# Used to copy existing Apps and part od .meteor to the production server
#logDir="/builds/buildArea/logs"
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

rsync -ravl --rsh=ssh --delete  --include-from=/builds/buildArea/MATS_for_EMB/scripts/meteor_includes /web/  ${server}:
rsync -ravl --rsh=ssh --delete  --include-from=/builds/buildArea/MATS_for_EMB/scripts/project_includes /web/*  ${server}:

echo "do not forget to restart nginx on ${server}, and to check the links for node and npm that are in /usrlocal/bin"

exit 0
