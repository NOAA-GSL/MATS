#!/bin/bash
# this script is used to copy images from a matsapps docker registry to dtcenter metexpress apps repository
# you have to provide login credentials to dtcenter repository


export GRN='\033[0;32m'
export RED='\033[0;31m'
export NC='\033[0m'

set -e
if [ $# -ne 2 ]; then
  echo -e "${RED} $0 - wrong number of params - usage: $0 repository (one of development|integration|production) version - exiting${NC}"
  exit 1
fi
repo="$1"
version="$2"

repo_list=(development integration production)
if [[ " ${repo_list[@]} " =~ " ${repo} " ]]; then
	echo 'using repo $repo' 
else
	echo "invalid repo - need one of development|integration|production - exiting"
	exit 1
fi
# docker logout
docker logout

#echo  set username and password
read -p "What is the dockerhub username with access to push to dtcenter/met-* repositories? " userName
UNAME=${userName}
read -sp "What is the password for ${userName}? " password

UPASS=${password}
docker login --username $UNAME
ret=$?
if [[ $ret -ne 0 ]]; then
	echo -e "${RED} login failed - exiting ${NC}"
	exit 1
fi

docker system prune -af
#echo  get token to be able to talk to Docker Hub
TOKEN=$(curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'${UNAME}'", "password": "'${UPASS}'"}' https://hub.docker.com/v2/users/login/ | jq -r .token)

#echo  build a list of all tags for mats repo
IMAGE_TAGS=($(curl -s -H "Authorization: JWT ${TOKEN}" https://hub.docker.com/v2/repositories/matsapps/${repo}/tags/?page_size=10000 | jq -r '.results|.[]|.name'))
FILTERED_IMAGE_TAGS=()
for elem in ${IMAGE_TAGS[@]}
do
	if [[ $elem =~ ^met-* ]]; then
	   if [[ ${elem} == *-${version} ]]; then
		FILTERED_IMAGE_TAGS+=" ${elem}"
	   fi
	fi
done
#echo filtered tags are ${FILTERED_IMAGE_TAGS[@]}
IMAGE_TAGS=()
IMAGE_TAGS=$FILTERED_IMAGE_TAGS
echo tags are ${IMAGE_TAGS[@]}

for i in ${IMAGE_TAGS[@]}
do
  echo ${i}
  echo "docker pull matsapps/${repo}:$i"
  docker pull matsapps/${repo}:$i
  echo "docker tag dtcenter/metexpress-${repo}:${i} dtcenter/${repo}:${i}"
  docker tag matsapps/${repo}:${i} dtcenter/metexpress-${repo}:${i}
  echo "docker push dtcenter/metexpress-${repo}:${i}"
  docker push dtcenter/metexpress-${repo}:${i}
done
docker logout
docker system prune -af

