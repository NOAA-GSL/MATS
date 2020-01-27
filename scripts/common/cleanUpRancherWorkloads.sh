#!/usr/bin/env bash

# source the matsapps credentials file
if [ ! -f ~/.matsapps_credentials ]; then
    echo "~/.matsapps_credentials file not found!"
    echo "you must creqate a ~/.matsapps_credentials file with the following entries.."
    echo "# rancher cli user access for *your id*"
    echo "export CATTLE_ACCESS_KEY=key_from_rancher"
    echo "export CATTLE_SECRET_KEY=secret_key_from_rancher"
    echo "export TOKEN=token_from_rancher"
    echo "Log into the rancher GUI, hover over your user icon (top right), and choose 'API and KEYS' to create your keys"
    exit 1
fi
. ~/.matsapps_credentials

env="matsdev"
requestedApp="all"
version="latest"

# have to be predetermined from attempted login
#2         dev1           c-qhvlt:p-4jjd6   matsdev
#3         dev1           c-qhvlt:p-6rrbt   matspreint
#4         dev1           c-qhvlt:p-r2dlx   matsint        
#5         dev1           c-qhvlt:p-v4xsj   matsprod  

function usage() {
      echo "$0 -e env [-a app] [-v version]"
      echo "where env is one of matsdev|matspreint|matsint|matsprod"
      echo "where app is optional but if it is used it must be a valid app reference i.e. upperair or met-surface"
      echo "where version is an app version"
      echo "if app is left off all current apps will be restarted with rolling restart."
      exit;
}

export CONTEXT=''
while getopts 'e:a:v:h' OPTION; do
  case "$OPTION" in
    e)
        env="$OPTARG"
        CONTEXT=$(echo 0 | rancher context switch | grep "^[1-9]" | grep $env | awk '{print $3}')
        if [ -z "$CONTEXT" ]; then
          echo "invalid environment - there is no rancher context matching $env"
          echo "valid contexts are ..."
          echo 0 | rancher context switch | grep "^[1-9]" | awk '{print $4}'
          echo "exiting"
          exit 1
        else
          echo "setting environment to $env"
        fi
      ;;

    a)
      requestedApp="$OPTARG"
      echo "attempting to restart $requestedApp"
      ;;

    v)
      version="$OPTARG"
      echo "using specific version $version"
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


if [[ "X${CONTEXT}" == "X" ]]; then
	usage
fi 


rancher login https://rancher.gsd.esrl.noaa.gov/v3 --token ${TOKEN} --context ${CONTEXT}
#delete any evicted pods - still don't understand why they got evicted - did not pay rent???
evictedPods=($(rancher kubectl  get pods --namespace ${env} --field-selector=status.phase='Failed' | grep -i evicted | awk '{print $1}'))
if [[ ${#evictedPods[@]} -gt 0 ]];then
	rancher kubectl --namespace=${env} delete pods ${evictedPods[@]}
fi
