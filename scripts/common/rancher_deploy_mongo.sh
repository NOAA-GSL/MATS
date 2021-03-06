#!/usr/bin/env bash
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

function usage() {
      echo "USAGE: $0 -n namespace [-t template_version -p persistentVolumeClaim -d defaultMongoCredentials]"
      echo "where namespace is a valid namespace (namespaces are expected to match MATS environments)"
      echo "For template version use 'rancher app st matsmongo' to list the versions"
      echo "and persistentVolumeClaim is the name of a predefined persistent Volume Claim - defaults to 'matsdata'"
      echo "and defaultMongoCredentials can be set to false to cause this program to ask the user for mongo credentials - default true"
      exit 1;
}

export CONTEXT=""
export pvc=matsdata
export defaultMongoCredentials=true
while getopts 'n:a:v:u:p:d:h' OPTION; do
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
    p)
       persistentVolumeClaim="$OPTARG"
        echo "deploying PersistentVolumeClaim  $pvc"
      ;;
    t)
       templateVersion="$OPTARG"
        echo "deploying template version  $templateVersion"
      ;;
    d)
       defaultMongoCredentials="$OPTARG"
        echo "Asking for mongo credentials"
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
  echo "You must provide a namespace!"
  usage
fi

version=""
if [ $templateVersion ]; then
	version="--version $templateVersion"
fi
echo "rancher login ${CATTLE_ENDPOINT} --token ${TOKEN} --context ${CONTEXT} --skip-verify"
rancher login ${CATTLE_ENDPOINT} --token ${TOKEN} --context ${CONTEXT} --skip-verify
echo "rancher app install -n $ns matsmongo matsmongo  --set defaultImage=true  --set persistentVolumeClaim=${pvc}  --set defaultMongoCredentials=${defaultMongoCredentials} ${version}"
rancher app install -n $ns matsmongo matsmongo  --set defaultImage=true  --set persistentVolumeClaim=${pvc}  --set defaultMongoCredentials=${defaultMongoCredentials} ${version}
