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
echo -e "${GRN}rsyncing meteor${NC}"
/usr/bin/rsync -ralWq --no-motd --rsh=ssh --delete  --include '.meteor/packages/meteor-tool/***' --exclude '.meteor/packages/*'  /web/.meteor  ${server}:/web 2>&1 | grep -v "^\*.*\*$"

# get the publication app list
publishApps=($(getPublishableApps))
if [ "X" == "X${requestedApp}" ]; then
    # publish them all
    for pa in "${publishApps[@]}"; do
        echo -e "${GRN}rsyncing ${pa}${NC}"
        /usr/bin/rsync -ralW --rsh=ssh --delete  --include "+ ${pa}/***" --exclude='*' /web/*  ${server}:/web/gsd/mats 2>&1 | grep -v "^\*.*\*$"
	# promote the production versions and dates
        versionDate=$(promoteApp ${pa})
	version=$(echo ${versionDate} | cut -f1 -d' ')
	buildDate=$(echo ${versionDate} | cut -f2 -d' ')
	deploymentFile="/web/gsd/mats/${pa}/bundle/programs/server/assets/packages/randyp_mats-common/public/deployment/deployment.json"
	tmpfile="/web/gsd/mats/${pa}/bundle/programs/server/assets/packages/randyp_mats-common/public/deployment/deployment.json.tmp"
	cmd=$(cat <<-%EODpublish
		chmod +w ${deploymentFile};
		jq -r '(.[] | select (.deployment_environment == "production") | .apps[]? | select(.app == "${pa}") | .buildDate) |="${buildDate}" | (.[] | select (.deployment_environment == "production") | .apps[]? | select(.app == "${pa}") | .version) |="${version}"' ${deploymentFile}} > ${tmpfile}; 
		cp ${tmpfile} ${deploymentFile};
                chmod -w ${deploymentFile};
	%EODpublish
	)
	/usr/bin/ssh -q ${server} ${cmd}
    done
else
    # publish just the requested one
    echo -e "${GRN}rsyncing ${requestedApp}${NC}"
    /usr/bin/rsync -ralW --rsh=ssh --delete  --include "+ ${requestedApp}/***"  --exclude='*' /web/*  ${server}:/web/gsd/mats 2>&1 | grep -v "^\*.*\*$"
    # promote the production version and date
    versionDate=$(promoteApp ${pa})
    version=$(echo ${versionDate} | cut -f1 -d' ')
    buildDate=$(echo ${versionDate} | cut -f2 -d' ')
    deploymentFile="/web/gsd/mats/${pa}/bundle/programs/server/assets/packages/randyp_mats-common/public/deployment/deployment.json"
    tmpfile="/web/gsd/mats/${pa}/bundle/programs/server/assets/packages/randyp_mats-common/public/deployment/deployment.json.tmp"
    cmd=$(cat <<-%EODpublish
	chmod +w ${deploymentFile};
	jq -r '(.[] | select (.deployment_environment == "production") | .apps[]? | select(.app == "${pa}") | .buildDate) |="${buildDate}" | (.[] | select (.deployment_environment == "production") | .apps[]? | select(.app == "${pa}") | .version) |="${version}"' ${deploymentFile}} > ${tmpfile}; 
	cp ${tmpfile} ${deploymentFile};
	chmod -w ${deploymentFile};
    %EODpublish
    )
    /usr/bin/ssh -q ${server} ${cmd}
fi

# fix up some linksa for the public service endpoint
echo -e "${GRN}linking /gsd/mats${NC}"
/usr/bin/ssh -q ${server} "cd /web; ln -sf gsd/mats/* ."

echo -e "${RED}do not forget to restart nginx on ${server}.${NC}"
exit 0
