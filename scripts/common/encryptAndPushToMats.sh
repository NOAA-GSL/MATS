#!/usr/bin/env bash

# Used to gpg encrypt a file and send the encrypted copy to the public directory of the production mats server.
# this script must be run as user www-data.

usage="USAGE $0 input_file \n\
    where <input_file> is the file that will be encrypted and sent to mats.esrl.noaa.gov/web/static/<host>_<outputfile> \n\
    The input file needs to be a modified copy of the /etc/nginx/conf.d/ssl.conf file. The output file will be derived \n\
    by taking the first segment of the machines hostname and prepending 'hostname_' to and then adding the suffix 'ssl.conf.gpg'. \n\
    For example if this script is executed on mats.gsd.esrl.noaa.gov the output file will be mats_ssl.conf.gpg, \n\
    and if it is executed on mats-dev.gsd.esrl.noaa.gov the output file will be mats-dev_ssl.conf.gpg, \n\
    and if it is executed on mats-int.gsd.esrl.noaa.gov the output file will be mats-int_ssl.conf.gpg. \n\
    A backup copy is made on the destination with the suffix '.bak.nnnnnnnnn where nnnnnnnnnn is the epoch."

if [[ "$(/bin/whoami)" != "www-data" ]]; then
    echo "Script must be run as user: www-data"
    echo "exiting"
    exit -1
fi

if [[ $# -ne 1 ]]; then
    echo $0 - wrong number of params - usage: $0 input_file
    return 1
fi
inFile=$1

host=$(/bin/hostname | /bin/cut -f1 -d'.')
if [[ "${host}" != "mats-dev" ]] && [[ "${host}" != "mats-int" ]] && [[ "${host}" != "mats" ]]; then
    echo "This script must be run on either mats.gsd.esrl.noaa.gov or or mats-dev.gsd.esrl.noaa.gov or mats-int.gsd.esrl.noaa.gov"
    echo "exiting"
    exit  1
fi
outputFile="${host}_ssl.conf.gpg"
remoteServer="mats.gsd.esrl.noaa.gov"

if [[ ! -f "${inFile}" ]]
then
    echo "input file ${inFile} does not exist - exiting"
    exit -1
fi
/bin/ssh www-data@${remoteServer} "/bin/cp  /web/static/.conf_files/${outputFile} /web/static/.conf_files/${outputFile}.bak.$(/bin/date +%F_%T)" >/dev/null 2>&1
/bin/gpg2 -e -u "www-data" -r "www-data" < ${inFile} | /bin/ssh www-data@${remoteServer} "/bin/cat > /web/static/.conf_files/${outputFile}" >/dev/null 2>&1
# trigger the restart
/bin/touch /builds/restart_nginx