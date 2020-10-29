#!/usr/bin/env bash
# source the build environment and mongo utilities
. /builds/buildArea/MATS/scripts/common/app_production_utilities.source
setBuildConfigVarsForIntegrationServer
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
# get the publication app list
publishApps=($(getPublishableApps))
if [ "X${publishApps}" == "X" ]; then
	echo -e "${RED}nothing is currently publishable, check the appProductionStatus.buildConfiguration database - exiting${NC}"
	exit 1
fi
# rsync the meteor stuff
echo -e "${GRN}rsyncing meteor${NC}"
/usr/bin/rsync -ralW -P --no-motd --rsh=ssh --delete  --include '.meteor/packages/meteor-tool/***' --exclude '.meteor/packages/*'  /web/.meteor  ${server}:/web 2>&1 | grep -v "^\*.*\*$"

# make a tempory export place
tmpDeploymentDir="/tmp/deployment"
/usr/bin/mkdir -p ${tmpDeploymentDir}
if [ "X" == "X${requestedApp}" ]; then
    # publish them all
    for pa in "${publishApps[@]}"; do
	    cv=$(date +%Y.%m.%d)
        echo -e "${GRN}setting pub date to $cv for /web/${pa}/bundle/programs/server/assets/packages/randyp_mats-common/public/MATSReleaseNotes.html${NC}"
	    /usr/bin/sed -i -e "s/\(<x-cr>\).*\(<\/x-cr>\)/$cv/g" /web/${pa}/bundle/programs/server/assets/packages/randyp_mats-common/public/MATSReleaseNotes.html
        echo -e "${GRN}rsyncing ${pa}${NC}"
        /usr/bin/rsync -ralW -P --rsh=ssh --delete  --include "+ ${pa}/***" --exclude='*' /web/*  ${server}:/web/gsd/mats 2>&1 | grep -v "^\*.*\*$"
        # promote the app (make versions and dates match integration)
        deploymentFile="/web/gsd/mats/${pa}/bundle/programs/server/assets/packages/randyp_mats-common/public/deployment/deployment.json"
        promoteApp ${pa}
        # export, make valid json,  and scp the new deployment.json to the production server
        exportCollections ${tmpDeploymentDir}
        /usr/bin/ssh -q ${server} "/usr/bin/chmod +w ${deploymentFile}"
        cat "${tmpDeploymentDir}/deployment.json" | "${DEPLOYMENT_DIRECTORY}/scripts/common/makeCollectionExportValid.pl" > "${tmpDeploymentDir}/deployment.json.tmp"
        /usr/bin/scp -q "${tmpDeploymentDir}/deployment.json.tmp" "${server}:${deploymentFile}"
        /usr/bin/ssh -q ${server} "/usr/bin/chmod -w ${deploymentFile}"
        /usr/bin/rm -rf "${tmpDeploymentDir}/*"
        # reset deploymentStatus to disabled for production for this app
        disablePublicationStatusForApp ${pa}
    done
else
    # publish just the requested one
    cv=$(date +%Y.%m.%d)
    echo -e "${GRN}setting pub date to $cv for /web/${requestedApp}/bundle/programs/server/assets/packages/randyp_mats-common/public/MATSReleaseNotes.html${NC}"
    /usr/bin/sed -i -e "s/\(<x-cr>\).*\(<\/x-cr>\)/$cv/g" /web/${requestedApp}/bundle/programs/server/assets/packages/randyp_mats-common/public/MATSReleaseNotes.html
    echo -e "${GRN}rsyncing ${requestedApp}${NC}"
    /usr/bin/rsync -ralW -P --rsh=ssh --delete  --include "+ ${requestedApp}/***"  --exclude='*' /web/*  ${server}:/web/gsd/mats 2>&1 | grep -v "^\*.*\*$"
    # promote the app (make versions and dates match integration)
    deploymentFile="/web/gsd/mats/${requestedApp}/bundle/programs/server/assets/packages/randyp_mats-common/public/deployment/deployment.json"
    promoteApp ${requestedApp}
    # export, make valid json,  and scp the new deployment.json to the production server
    exportCollections ${tmpDeploymentDir}
    /usr/bin/ssh -q ${server} "/usr/bin/chmod +w ${deploymentFile}"
    cat "${tmpDeploymentDir}/deployment.json" | "${DEPLOYMENT_DIRECTORY}/scripts/common/makeCollectionExportValid.pl" > "${tmpDeploymentDir}/deployment.json.tmp"
    /usr/bin/scp -q "${tmpDeploymentDir}/deployment.json.tmp" "${server}:${deploymentFile}"
    /usr/bin/ssh -q ${server} "/usr/bin/chmod -w ${deploymentFile}"
    /usr/bin/rm -rf "${tmpDeploymentDir}/*"
    # reset deploymentStatus to disabled for production for this app
    disablePublicationStatusForApp ${requestedApp}
fi

# fix up some links for the public service endpoint
echo -e "${GRN}linking /gsd/mats${NC}"
/usr/bin/ssh -q ${server} "cd /web; ln -sf gsd/mats/* ."

echo -e "${RED}triggering restart nginx on ${server}.${NC}"
/usr/bin/ssh -q ${server} "/bin/touch /builds/restart_nginx"
exit 0
