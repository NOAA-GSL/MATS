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

function usage() {
      echo "USAGE: $0 -n namespace "
      echo "where namespace is a valid namespace (namespaces are expected to match MATS environments)"
      exit 1;
}

export CONTEXT=""
while getopts 'n:h' OPTION; do
  case "$OPTION" in
    n)
        ns="$OPTARG"
        CONTEXT=$(echo 0 | rancher login $CATTLE_ENDPOINT --token ${TOKEN} --skip-verify 2> /dev/null | grep "^[1-9]" | grep $ns | awk '{print $3}')
        if [ -z "$CONTEXT" ]; then
          echo "invalid environment - there is no rancher context matching $ns"
          echo "valid contexts are ..."
          echo 0 | rancher login $CATTLE_ENDPOINT --token ${TOKEN} --skip-verify 2> /dev/null | grep "^[1-9]" | awk '{print $4}'
          echo "exiting"
          exit 1
        else
          echo "setting environment to $ns"
          echo "CONTEXT: $CONTEXT"
        fi
      ;;
    h)
      usage
      ;;
    ?)
      usage
      ;;
  esac
done
shift "$(($OPTIND -1))"

if [ -z $CONTEXT ]; then
  echo "You must provide a namespace!"
  usage
fi

echo "rancher login ${CATTLE_ENDPOINT} --token ${TOKEN} --context ${CONTEXT} --skip-verify"
rancher login ${CATTLE_ENDPOINT} --token ${TOKEN} --context ${CONTEXT} --skip-verify

  echo "deleting all the apps"
	echo "rancher app ls -q | awk -F ':' '{print $2}' | grep -v home | grep -v mongo |  while read a"
	rancher app ls -q | awk -F ':' '{print $2}' | grep -v home | grep -v mongo |  while read a
	do
		echo "rancher app delete $a"
		rancher app delete $a
	done

  echo "deleting the home app"
	echo "rancher app delete home"
  rancher app delete home

  echo "deleting the mongo app"
	echo "rancher app delete mongo"
  rancher app delete mongo
