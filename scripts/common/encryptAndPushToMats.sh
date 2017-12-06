#!/usr/bin/env bash

# Used to gpg encrypt a file and send the encrypted copy to the public directory of the production mats server.
# this script must be run as user www-data.

usage="USAGE $0 -i input_file -o output_file \n\
	where -o is the ouput_file and -i is the file that will be encrypted and sent to mats.esrl.noaa.gov/web/static/gsd/mats/output_file."

if [ "$(whoami)" != "www-data" ]; then
        echo "Script must be run as user: www-data"
        exit -1
fi
remoteServer="mats.gsd.esrl.noaa.gov"

inFile=""
outFile=""

while getopts "i:o:" a; do
    case "${a}" in
        i)
            inFile=${OPTARG}
        ;;
        o)
            outFile=(${OPTARG})
        ;;
        *)
            echo -e "bad option? \n$usage"
            exit 1
        ;;
    esac
done
shift $((OPTIND - 1))

if [ -e ${inFfile} ]
then
    cat ${inFile} | gpg --passphrase "matsP@$$Phrase" --batch --quiet --yes -c -o - --cipher-algo AES256 | ssh www-data@${remoteServer} "cat > /web/static/gsd/mats/${outputFile}.gpg"
else
    echo "file does not exist"
    exit -1
fi
