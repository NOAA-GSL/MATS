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
      echo "USAGE: $0 -n namespace -a appReference -v appVersion -u rootUrl [-p persistentVolumeClaim]"
      echo "where namespace is a valid namespace (namespaces are expected to match MATS environments)"
      echo "and appReference defines an app i.e. aircraft, upperair etc."
      echo "if appReference is ommited all the apps will be reloaded."
      exit 1;
}

export CONTEXT=""
export requestedApp="all"
while getopts 'n:a:h' OPTION; do
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
    a)
        requestedApp="$OPTARG"
        echo "deploying $requestedApp"
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
#first delete any evicted pods - still don't understand why they got evicted - did not pay rent???
evictedPods=($(rancher kubectl  get pods --namespace ${ns} --field-selector=status.phase='Failed' | grep -i evicted | awk '{print $1}'))
if [[ ${#evictedPods[@]} -gt 0 ]];then
	rancher kubectl --namespace=${ns} delete pods ${evictedPods[@]}
fi

#restart all the apps that are currently running
rancher ps | grep -v NAME | grep -v mongo | grep -v mats-home | grep -v http | awk '{print $2}' | while read app
do
  if [[ "$requestedApp" == "all" || "$requestedApp" == "$app" ]]; then
	echo "redeploying ${app}"
	# use helm to set version
	rancher kubectl --namespace=${ns} rollout restart deployment ${app}
	sleep 5
  fi
done
echo "forcing reload of any stuck pods"
stuckPods=($(rancher kubectl --namespace=${ns} get pods | grep -v mongo | grep -v mats-home | grep -v http | grep -i ImageInspectError | awk '{print $1}'))
containerCreating=($(rancher kubectl --namespace=${ns} get pods | grep -i ContainerCreating | awk '{print $1}'))
echo ""
if [[ ${#stuckPods[@]} -gt 0 ]]; then
	i="0"
	while [[ $i -lt 10  &&  ( ${#containerCreating[@]} -gt 0 || ${#stuckPods[@]} -gt 0 ) ]]
	do
                echo "stuck pods ${stuckPods[@]}"
                echo "container creating pods ${containerCreating[@]}"
		if [[ ${#stuckPods[@]} -gt 0 ]];then
			rancher kubectl --namespace=${ns} delete pods ${stuckPods[@]}
		fi
		containerCreating=($(rancher kubectl --namespace=${ns} get pods | grep -v mongo | grep -v mats-home | grep -v http | grep -i ContainerCreating | awk '{print $1}'))
		stuckPods=($(rancher kubectl --namespace=${ns} get pods | grep -v mongo | grep -v mats-home | grep -v http | grep -i ImageInspectError | awk '{print $1}'))
		sleep 30
		i=$[$i+1]
	done
fi
