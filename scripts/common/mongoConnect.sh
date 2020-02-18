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
    echo "Log into the rancher GUI, hover over your user icon (top right), and choose 'API and KEYS' to create your keys"
    exit 1
fi
. ~/.matsapps_credentials

env="matsdev"
db=""

function usage() {
      echo "USAGE: $0 -n env [-d db]"
      echo "where env is a valid namespace"
      echo "where db is optional but if it is used it must be a valid app reference i.e. upperair or met-surface"
      echo "if db is left off you will be connected to the default database which is 'test' ..."
      exit 1;
}

export CONTEXT=''
while getopts 'n:d:h' OPTION; do
  case "$OPTION" in
    n)
        env="$OPTARG"
        CONTEXT=$(echo 0 | rancher login $CATTLE_ENDPOINT --token ${TOKEN} --skip-verify 2> /dev/null | grep "^[1-9]" | grep $env | awk '{print $3}')
        if [ -z "$CONTEXT" ]; then
          echo "invalid environment - there is no rancher context matching $env"
          echo "valid contexts are ..."
          echo 0 | rancher login $CATTLE_ENDPOINT --token ${TOKEN} --skip-verify 2> /dev/null | grep "^[1-9]" | awk '{print $4}'
          echo "exiting"
          exit 1
        else
          echo "setting environment to $env"
          echo "CONTEXT: $CONTEXT"
        fi
      ;;

    d)
      db="/${OPTARG}"
      echo "attempting to connect to $OPTARG"
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
  echo "You must provide an environment!"
  usage
fi

echo "rancher login ${CATTLE_ENDPOINT} --token ${TOKEN} --context ${CONTEXT} --skip-verify"
rancher login ${CATTLE_ENDPOINT} --token ${TOKEN} --context ${CONTEXT} --skip-verify
if [[ $? -ne 0 ]]; then
  echo "FAILED to login to rancher! exiting"
  exit 1
fi

node=$(rancher kubectl -n ${env} get nodes --no-headers=true | head -1 | awk '{print $1}' | awk '{$1=$1};1')
echo "node: ${node}"
if [[ "$node" == "docker-desktop" ]]; then
  host=localhost
else
  host=$(rancher kubectl -n  ${env} describe nodes ${node} | grep public-ip | awk -F':' '{print $2}' | awk '{$1=$1};1')
fi
echo "host: ${host}"
if [ -z $host ]; then
  echo "cannot determine host! - exiting"
  exit 1
fi

port=$(rancher kubectl -n ${env} get services | grep mongo-nodeport | awk -F'[/:]' '{print $2}' | awk '{$1=$1};1')
echo "port: ${port}"
if [ -z $port ]; then
  echo "cannot determine port! No mongo running there perhaps??? - exiting"
  exit 1
fi

echo mongo -u mats -p matsUser0 "mongodb://${host}:${port}${db}"
mongo -u mats -p matsUser0 mongodb://${host}:${port}${db}

