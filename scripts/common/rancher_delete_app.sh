#!/usr/bin/env bash

# source the matsapps credentials file
if [ ! -f ~/.matsapps_credentials ]; then
    echo "~/.matsapps_credentials file not found!"
    echo "you must creqate a ~/.matsapps_credentials file with the following entries.."
    echo "# rancher cli user access for *your id*"
    echo "export CATTLE_ENDPOINT=endpoint_from_rancher"
    echo "export CATTLE_ACCESS_KEY=key_from_rancher"
    echo "export CATTLE_SECRET_KEY=secret_key_from_rancher"
    echo "export TOKEN=token_from_rancher"
    echo "export userId=the_userId_from_the_YAML_from_your_rancher_user_access_key_token"
    echo "Log into the rancher GUI, hover over your user icon (top right), and choose 'API and KEYS' to create your keys"
    exit 1
fi
. ~/.matsapps_credentials

if [[ $# -ne 0 ]]; then
	echo "deleting single app $1"
	echo "rancher app delete $1"
	rancher app delete $1
else
	echo "deleting all apps"
	rancher  app ls -q | awk -F ':' '{print $2}' | grep -v home | grep -v mongo |  while read a
	do
		echo "rancher app delete $a"
		rancher app delete $a
	done
fi
