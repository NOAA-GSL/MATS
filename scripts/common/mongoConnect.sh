#!/usr/bin/env bash
env="matsdev"
db=""

# have to be predetermined from attempted login
#2         dev1           c-qhvlt:p-4jjd6   matsdev
#3         dev1           c-qhvlt:p-6rrbt   matspreint
#4         dev1           c-qhvlt:p-r2dlx   matsint        
#5         dev1           c-qhvlt:p-v4xsj   matsprod  

function usage() {
      echo "$0 -e env [-d db]"
      echo "where env is one of matsdev|matspreint|matsint|matsprod"
      echo "where db is optional but if it is used it must be a valid app reference i.e. upperair or met-surface"
      echo "if db is left off you will be connected to the default database which is 'test' ..."
      exit;
}

export CONTEXT=''
while getopts 'e:d:h' OPTION; do
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

    d)
      db="/${OPTARG}"
      echo "attempting to connect to $OPTARG"
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

#these keys are for randy's account to rancher
export CATTLE_ACCESS_KEY=token-7jsvp
export CATTLE_SECRET_KEY=6nvh77zpmcg6s4z6m7l2hl82swzftzpkvf8f9xw9kbbwwkhpq9gs4v
export TOKEN=token-7jsvp:6nvh77zpmcg6s4z6m7l2hl82swzftzpkvf8f9xw9kbbwwkhpq9gs4v

rancher login https://rancher.gsd.esrl.noaa.gov/v3 --token ${TOKEN} --context ${CONTEXT}

node=$(rancher kubectl -n matsdev get nodes | grep worker | head -1 | awk '{print $1}' | awk '{$1=$1};1')
host=$(rancher kubectl -n matsdev describe nodes ${node} | grep public-ip | awk -F':' '{print $2}' | awk '{$1=$1};1')
port=$(rancher kubectl -n matsdev get services | grep mongo-nodeport | awk -F'[/:]' '{print $2}' | awk '{$1=$1};1')
echo mongo "mongodb://${host}:${port}${db}"
mongo mongodb://${host}:${port}${db}

