#!/bin/bash
# this script is used to copy images from a docker registry to harbor-prod.gsd.esrl.noaa.gov
# you have to provide login credentials to harbor-prod.gsd.esrl.noaa.gov


echo "login for harbor-prod.gsd.esrl.noaa.gov"
docker login harbor-prod.gsd.esrl.noaa.gov

export GRN='\033[0;32m'
export RED='\033[0;31m'
export NC='\033[0m'

set -e
if [ $# -ne 2 ]; then
  echo -e "${RED} $0 - wrong number of params - usage: $0 repository (one of development|integration|production) version  - exiting${NC}"
  exit 1
fi
repo="$1"
version="$2"

# source the credentials for the matsapps account
if [ ! -f ~/.matsapps_credentials ]; then
    echo "~/.matsapps_credentials file not found!"
    echo "you must creqate a ~/.matsapps_credentials file with the following entries.."
    echo "export matsapps_user='matsapps user'"
    echo "export matsapps_password='matsapps user password'"
    exit 1
fi
. ~/.matsapps_credentials
#echo  set username and password
UNAME=${matsapps_user}
UPASS=${matsapps_password}

docker system prune -af
#echo  get token to be able to talk to Docker Hub
TOKEN=$(curl -s -H "Content-Type: application/json" -X POST -d '{"username": "'${UNAME}'", "password": "'${UPASS}'"}' https://hub.docker.com/v2/users/login/ | jq -r .token)

# get list of namespaces accessible by user (not in use right now)
#NAMESPACES=$(curl -s -H "Authorization: JWT ${TOKEN}" https://hub.docker.com/v2/repositories/namespaces/ | jq -r '.namespaces|.[]')

#echo  get list of repos for that user account
REPO_LIST=($(curl -s -H "Authorization: JWT ${TOKEN}" https://hub.docker.com/v2/repositories/${UNAME}/?page_size=10000 | jq -r '.results|.[]|.name'))
#echo repo list is ${REPO_LIST[@]}

found=0
for r in "${REPO_LIST[@]}"
do
  if [[ "X${r}" == "X${repo}" ]]; then
    found=1
  fi
done
echo
if [[ $found -eq 0  ]]; then
  echo -e "${RED} $0 - not a valid repository! one of ${REPO_LIST[*]} - exiting ${NC}"
  exit 1
fi

#echo  build a list of all tags for repo
IMAGE_TAGS=($(curl -s -H "Authorization: JWT ${TOKEN}" https://hub.docker.com/v2/repositories/${UNAME}/${repo}/tags/?page_size=10000 | jq -r '.results|.[]|.name'))
FILTERED_IMAGE_TAGS=()
for elem in "${IMAGE_TAGS[@]}"
do
   echo $elem
   if [[ ${elem} == *-${version} ]]; then
        FILTERED_IMAGE_TAGS+=("${elem}")
   fi
done
echo filtered tags are "${FILTERED_IMAGE_TAGS[@]}"
echo
IMAGE_TAGS=("${FILTERED_IMAGE_TAGS[@]}")
echo "image tags are " "${IMAGE_TAGS[@]}"
echo

for i in "${IMAGE_TAGS[@]}"
do
  echo
  echo "image $i"
  echo
  echo "pulling tag ${UNAME}/${repo}:${i}"
  echo "docker pull ${UNAME}/${repo}:$i"
  docker pull ${UNAME}/${repo}:$i
  echo "docker tag ${UNAME}/${repo}:${i} harbor-prod.gsd.esrl.noaa.gov/matsapps/${repo}:${i}"
  docker tag ${UNAME}/${repo}:${i} harbor-prod.gsd.esrl.noaa.gov/matsapps/${repo}:${i}
  echo "docker push harbor-prod.gsd.esrl.noaa.gov/${UNAME}/${repo}:${i}"
  docker push harbor-prod.gsd.esrl.noaa.gov/${UNAME}/${repo}:${i}
done
docker logout
docker system prune -af

docker logout
