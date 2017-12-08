#!/usr/bin/env bash

# Used to retrieve and gpg decrypt the most recent ssl.conf from the public directory of the production mats server.
# this script must be run as user www-data.
# The ssl.conf file is placed in /tmp

usage="USAGE $0 - will retrieve and decrypt the current ssl.conf file for the server on which the script is run."

if [[ $# -ne 0 ]]; then
    echo $0 - wrong number of params - usage: $0
    return 1
fi

host=$(/bin/hostname | /bin/cut -f1 -d'.')
if [[ "${host}" != "mats-dev" && "${host}" != "mats-int" ]]; then
    echo "This script must be run on either mats.gsd.esrl.noaa.gov or mats-int.gsd.esrl.noaa.gov"
    echo "exiting"
    exit 1
fi
outputFile="${host}_ssl.conf.gpg"
tmpGpgFile=$(mktemp)
rm -rf /tmp/ssl.conf
/bin/wget -q -O ${tmpGpgFile} --no-check-certificate https://mats.gsd.esrl.noaa.gov${outputFile}
cat /builds/passphrase | gpg2 --batch -q -d ${tmpGpgFile} > /tmp/ssl.conf
rm -rf ${tmpGpgFile}
