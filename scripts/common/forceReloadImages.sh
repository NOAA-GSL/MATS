#!/usr/bin/env bash
env=$1

if [[ "$env" =~ ^(matsdev|matsint|matspreint|matsprod)$ ]]; then
  echo reloading environment $env
else
  echo "Usage $0 matsdev|matsint|matspreint|matsprod  - you dod not specify a valid environment - exiting"
  exit 1
fi
#these keys are for randy's account to rancher
export CATTLE_ACCESS_KEY=token-7jsvp
export CATTLE_SECRET_KEY=6nvh77zpmcg6s4z6m7l2hl82swzftzpkvf8f9xw9kbbwwkhpq9gs4v
export TOKEN=token-7jsvp:6nvh77zpmcg6s4z6m7l2hl82swzftzpkvf8f9xw9kbbwwkhpq9gs4v

rancher login https://rancher.gsd.esrl.noaa.gov/ --token ${TOKEN} --context c-qhvlt:p-4jjd6

rancher ps | grep -v NAME | grep -v mongo | grep -v mats-home | grep -v http | awk '{print $2}' | while read app
do
	echo "redeploying ${app}"
	rancher kubectl --namespace=${env} rollout restart deployment ${app}
	sleep 5
done
sleep 10
#force reload of any stuck pods
stuckPods=($(rancher kubectl --namespace=${env} get pods | grep -v "mongo" | grep -v "mats-home" | grep http | grep ImageInspectError | awk '{print $1}'))
containerCreating=($(rancher kubectl --namespace=${env} get pods | grep -i ContainerCreating | awk '{print $1}'))
if [[ ${#stuckPods[@]} -gt 0 ]]; then
	i="0"
	while [ $i -lt 5 -o ${#containerCreating[@]} -gt 0 -o ${#stuckPods[@]} -gt 0 ]
	do
		rancher kubectl --namespace=${env} delete pods $(rancher kubectl --namespace=${env} get pods | grep ImageInspectError | awk '{print $1}')
		containerCreating=($(rancher kubectl --namespace=${env} get pods | grep -v "mongo" | grep -v "mats-home" grep -v http | grep -i ContainerCreating | awk '{print $1}'))
		stuckPods=($(rancher kubectl --namespace=${env} get pods | grep -v "mongo" | grep -v "mats-home" | grep http | grep ImageInspectError | awk '{print $1}'))
		sleep 30
		i=$[$i+1]
	done
fi
