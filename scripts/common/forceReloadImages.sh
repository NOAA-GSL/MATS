#!/usr/bin/env bash
environment = $1

environments=(matsdev matsint matspreint matsprod)
function isValidEnvironment() {
    [[ $environment =~ (^|[[:space:]])$1($|[[:space:]]) ]] && exit(0) || exit(1)
}

if [[ isValidEnvironment $environment  -ne 0 ]]; then
  echo Usage $0 matsdev|matsint|matspreint|matsprod - you did not specify a valid environment - exiting
  exit $1
fi

#these keys are for randy's account to rancher
export CATTLE_ACCESS_KEY=token-7jsvp
export CATTLE_SECRET_KEY=6nvh77zpmcg6s4z6m7l2hl82swzftzpkvf8f9xw9kbbwwkhpq9gs4v
export TOKEN=token-7jsvp:6nvh77zpmcg6s4z6m7l2hl82swzftzpkvf8f9xw9kbbwwkhpq9gs4v

rancher login https://rancher.gsd.esrl.noaa.gov/ --token ${TOKEN} --context c-qhvlt:p-4jjd6

rancher ps | grep -v NAME | grep -v mongo | grep -v mats-home | grep -v http | awk '{print $2}' | while read app
do
	echo "redeploying ${app}"
	rancher kubectl --namespace=${environment} rollout restart deployment ${app}
	sleep 5
done
sleep 10
#force reload of any stuck pods
stuckPods=($(rancher kubectl --namespace=${environment} get pods | grep ImageInspectError | awk '{print $1}'))
if [[ ${#stuckPods[@]} -gt 0 ]]; then
	for sleepCount in 1 2 3 4 5
	do
		rancher kubectl --namespace=${environment} delete pods $(rancher kubectl --namespace=${environment} get pods | grep ImageInspectError | awk '{print $1}')
		sleep 30
	done
fi
