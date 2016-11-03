#!/bin/sh
#
# Used to copy an existingApp MATS application to another name.
#logDir="/builds/buildArea/logs"
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
#exec > >(tee -i $logname)
#exec 2>&1
echo "$0 ----------- started"
date

usage="$0 [--help || deployment_file]"

deployment_file=$1

if [ "$1" == "--help" ]; then
        cat <<xxxxxENDxxxx
This program will copy an existing MATS application deployment file to the public server (mats) into the /deployments directory overwriting any deployment file of the same name that might be there.
The most recent deployment files are always located on mats-dev in /builds/deployments/. These
deployment files are gzipped tarballs with names that reflect the application name. i.e.
upperair-dply.tar.gz is the deployment file for the upperair application.
Once the deployment file is copied the current matching deployment in /web will be archived (tared up and gz'd) and moved to /deployments/save overwriting any saved deployment of the same name.

Then the new deployment will be un zipped and untarred into the /web location.

Once the deployment is finished you will need to log onto mats and sudo restart nginx.
xxxxxENDxxxx
exit 0
fi

if [ ! -f "/builds/deployments/$deployment_file" ]; then
    echo "ERROR: $deployment_file app archive does not exist: usage: $usage"
    echo "these app archives currently exist..."
    ls -1 /builds/deployments
    echo "exiting"
    exit 1
fi

appname=`echo $deployment_file | cut -d'-' -f1`

scp /builds/deployments/${deployment_file} mats.gsd.esrl.noaa.gov:/deployments/${deployment_file}

ssh mats.gsd.esrl.noaa.gov "cd /web/${appname}/bundle; tar -czf /deployments/save/${appname}.tar.gz ."

ssh mats.gsd.esrl.noaa.gov "cd /web/${appname}/bundle; rm -rf *"

ssh mats.gsd.esrl.noaa.gov "cd /web/${appname}/bundle; tar -xzf /deployments/$deployment_file"

echo "do not forget to restart nginx"

exit 0
