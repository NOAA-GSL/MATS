#!/usr/bin/env bash

# source the matsapps credentials file
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
      if [[ "$OPTARG" =~ ^(matsdev|matspreint|matsint|matsprod)$ ]]; then
        env="$OPTARG"
        echo "setting environment to $env"
	case ${env} in
	     "matsdev")
		  CONTEXT='c-qhvlt:p-4jjd6'
		  ;;
	     "matspreint")
		  CONTEXT='c-qhvlt:p-6rrbt'
		  ;;
	     "matsint")
		  CONTEXT='c-qhvlt:p-r2dlx'
		  ;; 
	     "matsprod")
		  CONTEXT='c-qhvlt:p-v4xsj'
		  ;; 
	esac
      else
        echo "invalid environment $OPTARG"
        usage
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
#first delete any evicted pods - still don't understand why they got evicted - did not pay rent???
rancher kubectl --namespace=${env} delete pods $(rancher kubectl  get pods --namespace ${env} --field-selector=status.phase='Failed' | grep -i evicted | awk '{print $1}')

#restart all the apps that are currently running
rancher ps | grep -v NAME | grep -v mongo | grep -v mats-home | grep -v http | awk '{print $2}' | while read app
do
  if [[ "$requestedApp" == "all" || "$requestedApp" == "$app" ]]; then
	echo "redeploying ${app}"
	# use helm to set version
	rancher kubectl --namespace=${env} rollout restart deployment ${app}
	sleep 5
  fi
done
echo "forcing reload of any stuck pods"
stuckPods=($(rancher kubectl --namespace=${env} get pods | grep -v mongo | grep -v mats-home | grep -v http | grep ImageInspectError | awk '{print $1}'))
containerCreating=($(rancher kubectl --namespace=${env} get pods | grep -i ContainerCreating | awk '{print $1}'))
echo ""
if [[ ${#stuckPods[@]} -gt 0 ]]; then
	i="0"
	while [[ $i -lt 10  &&  ( ${#containerCreating[@]} -gt 0 || ${#stuckPods[@]} -gt 0 ) ]]
	do
                echo "stuck pods ${stuckPods[@]}"
                echo "container creating pods ${containerCreating[@]}"
		rancher kubectl --namespace=${env} delete pods $(rancher kubectl --namespace=${env} get pods | grep ImageInspectError | awk '{print $1}')
		containerCreating=($(rancher kubectl --namespace=${env} get pods | grep -v mongo | grep -v mats-home | grep -v http | grep -i ContainerCreating | awk '{print $1}'))
		stuckPods=($(rancher kubectl --namespace=${env} get pods | grep -v mongo | grep -v mats-home | grep -v http | grep ImageInspectError | awk '{print $1}'))
		sleep 30
		i=$[$i+1]
	done
fi
