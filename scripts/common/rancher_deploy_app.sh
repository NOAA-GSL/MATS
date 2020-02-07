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
      echo "and appVersion is the version of the app i.e. nightly, 2.3.13, 2.3.14 etc"
      echo "and rootUrl is the root Url of the ingres to the corresponding matshome i.e. for https://rancher.localhost/matsdev/home it is https://rancher.localhost"
      echo "and persistentVolumeClaim is the name of a predefined persistent Volume Claim - defaults to 'matsdata'"
      exit 1;
}

export CONTEXT=""
export appReference=""
export appVersion=""
export rootUrl=""
export pvc=matsdata
while getopts 'n:a:v:u:p:h' OPTION; do
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
        appReference="$OPTARG"
        echo "deploying $appReference"
      ;;
    v)
        appVersion="$OPTARG"
        echo "deploying app version $appVersion"
      ;;
    u)
       rootUrl="$OPTARG"
        echo "deploying rootUrl $rootUrl"
        ;;
    p)
       persistentVolumeClaim="$OPTARG"
        echo "deploying PersistentVolumeClaim  $pvc"
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

if [ -z $appReference ]; then
  read -p "You did not provide an appReference! Do you really want to install all of the available apps???? [Y|N]" -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "ok, here we go installing all the apps..."
  else
    usage
  fi
fi

if [ -z $appVersion ]; then
  echo "You must provide an appVersion!"
  usage
fi

if [ -z $rootUrl ]; then
  echo "You must provide a rootUrl!"
  usage
fi

echo "rancher login ${CATTLE_ENDPOINT} --token ${TOKEN} --context ${CONTEXT} --skip-verify"
rancher login ${CATTLE_ENDPOINT} --token ${TOKEN} --context ${CONTEXT} --skip-verify


if [[ -z $appReference ]]; then
  rancher app lt | grep gslhelm | awk '{print $2}' | grep -v matsmongo | grep -v matshome	| while read a
  do
    echo "rancher app install -n $ns $a $a --set userId=${userId} --set defaultImage=false --set image.appVersion=${appVersion} --set persistentVolumeClaim=${pvc} --set rootUrl=${rootUrl}"
    rancher app install -n $ns $a $a --set userId=${userId} --set defaultImage=false --set image.appVersion=${appVersion} --set persistentVolumeClaim=${pvc} --set rootUrl=${rootUrl}
	  sleep 5
	done
else
  echo "rancher app install -n $ns $appReference $appReference --set userId=${userId} --set defaultImage=false --set image.appVersion=${appVersion} --set persistentVolumeClaim=${pvc} --set rootUrl=${rootUrl}"
  rancher app install -n $ns $appReference $appReference --set userId=${userId} --set defaultImage=false --set image.appVersion=${appVersion} --set persistentVolumeClaim=${pvc} --set rootUrl=${rootUrl}
fi

