#!/usr/bin/env bash
# source the credentials for the matsapps account
. ~/.matsapps_credentials

RED='\033[0;31m'
GRN='\033[0;32m'
ORNG='\033[0;33m'
NC='\033[0m' # No Color
tmpIntegrationFile=$(mktemp /tmp/intapps.XXXXXX)
tmpProductionFile=$(mktemp /tmp/prodapps.XXXXXX)
#serverUrl="https://www.esrl.noaa.gov/gsd/mats/appProductionStatus"
serverUrl="https://mats.gsd.esrl.noaa.gov/appProductionStatus"

function finish {
    echo -e ${NC}
    rm -rf $tmpIntegrationFile
    rm -rf $tmpProductionFile
}
trap finish EXIT

function buildTagList {
    taglist=()
    if [ $# -ne 1 ]; then
        echo -e "${RED} $0 - wrong number of params - usage: $0 production | integration${NC}"
        exit 1
    fi
    if [[ "$1" == "production" ]]; then
        echo -e "${GRN} build app list for production"
        export file=$tmpProductionFile
        repository="matsapps/production"
    elif [[ "$1" == "integration" ]]; then
        echo -e "${GRN} build app list for integration"
            export file=$tmpIntegrationFile
            repository="matsapps/integration"
    else
            echo -e "${RED} can't process $1 - needs to be production or integration"
    fi
    apps=($(cat $file | jq -r '.apps[] | .app'))
    versions=($(cat $file | jq -r '.apps[] | .version'))

    for (( i= 0; i < ${#apps[@]}; i ++)); do
        appref=${apps[$i]}
        appversion=${versions[$i]}
        apptag="${appref}-${appversion}"
        echo -e "${GRN} apptag is ${repository}:${apptag} ${NC}"
        taglist[$i]="${repository}:${apptag}"
    done
    echo -e "${ORNG}in buildTagList taglist is ${taglist[*]} ${NC}"
}

# login
echo ${matsapps_password} | docker login -u ${matsapps_user} --password-stdin

echo -e "${GRN} get production applist ${NC}"
curl -k ${serverUrl}/getStableDeployment/production 2>/dev/null > $tmpProductionFile
echo -e "${GRN} get integration applist ${NC}"
curl -k ${serverUrl}/getStableDeployment/integration 2>/dev/null > $tmpIntegrationFile
#get production versions

echo -e "${GRN} build integration:tag list from production versions ${NC}"
buildTagList integration
intTagList=(${taglist[@]})
echo -e "${ORNG}intTagList is ${intTaglist[*]} ${NC}"

echo -e "${GRN} build production:tag list ${NC}"
buildTagList production
prodTagList=(${taglist[@]})
echo -e "${ORNG}prodTagList is ${prodTaglist[*]} ${NC}"

echo -e "${GRN} pull the integration versions and push to production ${NC}"
for ((i=0; i < ${#intTagList[@]}; i++)); do
    echo -e "${GRN} pulling ${intTagList[$i]} pushing ${prodTagList[$i]} ${NC}"
    docker pull ${intTagList[$i]}
    docker tag ${intTagList[$i]} ${prodTagList[$i]} | docker push ${prodTagList[$i]}
done
echo -e "${GRN} SUCCESS ${NC}"
exit 0
