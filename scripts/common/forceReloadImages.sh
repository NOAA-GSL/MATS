#!/usr/bin/env bash
export CATTLE_ACCESS_KEY=token-7jsvp
export CATTLE_SECRET_KEY=6nvh77zpmcg6s4z6m7l2hl82swzftzpkvf8f9xw9kbbwwkhpq9gs4v

rancher login https://rancher.gsd.esrl.noaa.gov/ --token token-7jsvp:6nvh77zpmcg6s4z6m7l2hl82swzftzpkvf8f9xw9kbbwwkhpq9gs4v --context c-qhvlt:p-4jjd6
rancher ps | grep -v NAME | grep -v mongo | grep -v mats-home | grep -v http | awk '{print $2}' | while read app
do
	echo "redeploying ${app}"
	rancher kubectl --namespace=matsdev rollout restart deployment ${app}
	sleep 5
done
sleep 10

stuckPods=($(rancher kubectl --namespace=matsdev get pods | grep ImageInspectError | awk '{print $1}'))
if [[ ${#stuckPods[@]} -gt 0 ]]; then
	for sleepCount in 1 2 3 4 5
	do
		rancher kubectl --namespace=matsdev delete pods $(rancher kubectl --namespace=matsdev get pods | grep ImageInspectError | awk '{print $1}')
		sleep 30
	done
fi
