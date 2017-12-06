#!/usr/bin/env bash

# Used to gpg encrypt a file and send the encrypted copy to the public directory of the production mats server.
# this script must be run as user www-data.

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
/bin/wget -q -O - https://www.esrl.noaa.gov/gsd/mats/${outputFile} |  /bin/gpg --passphrase "matsP@$$Phrase" --batch --quiet --yes
