#!/usr/bin/env bash
# This script builds and deploys an app, optionally takes the bundle that was already built and adds a dockerfile
# and then builds the image from an appropriate node image that corresponds to the node verwsion of the app.
#
# source the credentials for the matsapps account
if [ ! -f ~/.matsapps_credentials ]; then
    echo "~/.matsapps_credentials file not found!"
    echo "you must creqate a ~/.matsapps_credentials file with the following entries.."
    echo "export matsapps_user='matsapps user'"
    echo "export matsapps_password='matsapps user password'"
    exit 1
fi
. ~/.matsapps_credentials

# set up logging
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >( tee -i $logname )
exec 2>&1

usage="USAGE $0 -e dev|int|prod  [-b branch]\n\
	where e is build environment (dev, int, or prod) and -b branch lets you override the assigned branch (feature build)"
build_env=""
pushImage="yes"
build_images="yes"
deploy_build="yes"
while getopts "e:b:" o; do
    case "${o}" in
        b)
            requestedBranch=(${OPTARG})
            echo -e "requested branch ${requestedBranch}"
        ;;
         e)
            build_env="${OPTARG}"
            if [ "${build_env}" == "dev" ]; then
                setBuildConfigVarsForDevelopmentServer
            elif [ "${build_env}" == "int" ]; then
                setBuildConfigVarsForIntegrationServer
            elif [ "${build_env}" == "prod" ]; then
                setBuildConfigVarsForProductionServer
            else
                echo -e "${RED}invalid environment '${build_env}' - should be 'int', 'dev', or prod exiting${NC} \n$usage"
                exit 1
            fi
        ;;
       *)
            echo -e "${RED} bad option? ${NC} \n$usage"
            exit 1
        ;;
    esac
done
shift $((OPTIND - 1))
if [ "X${build_env}" == "X" ]; then
	echo -e "${RED}You did not specify a build environment (-e dev|int|prod)${NC}"
	echo -e $usage
	echo "${RED}Must exit now${NC}"
	exit 1
fi
if [ "X${requestedBranch}" != "X" ]; then
    echo -e "overriding git branch with ${requestedBranch}"
    BUILD_CODE_BRANCH=${requestedBranch}
fi
echo "Building mats-home app - environment is ${build_env}: date: $(/bin/date +%F_%T)"
export DEPLOYMENT_DIRECTORY="/builds/buildArea/MATS_for_EMB"
export BUILD_DIRECTORY="/builds/buildArea/"
cd ${BUILD_DIRECTORY}
if [ ! -d "${DEPLOYMENT_DIRECTORY}" ]; then
    echo -e "${DEPLOYMENT_DIRECTORY} does not exist,  clone ${DEPLOYMENT_DIRECTORY}"
    cd ${DEPLOYMENT_DIRECTORY}
    /usr/bin/git clone ${BUILD_GIT_REPO}
    if [ $? -ne 0 ]; then
        echo -e "${RED} ${failed} to /usr/bin/git clone ${BUILD_GIT_REPO} - must exit now ${NC}"
        exit 1
    fi
fi
cd ${DEPLOYMENT_DIRECTORY}
# throw away any local changes - after all, you are building
echo -e "${RED} THROWING AWAY LOCAL CHANGES ${NC}"
git reset --hard
# checkout proper branch
git checkout ${BUILD_CODE_BRANCH}

export buildCodeBranch=$(git rev-parse --abbrev-ref HEAD)
export currentCodeCommit=$(git rev-parse --short HEAD)
if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to git the current HEAD commit - must exit now ${NC}"
    exit 1
fi
/usr/bin/git pull -Xtheirs
if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to do git pull - must exit now ${NC}"
    exit 1
fi

if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to /usr/bin/git fetch - must exit now ${NC}"
    exit 1
fi
newCodeCommit=$(git rev-parse --short HEAD)
if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to git the new HEAD commit - must exit now ${NC}"
    exit 1
fi

#build mats-home

echo -e "$0 ${GRN} clean and remove existing image ${NC}"
if [ "${build_images}" == "yes" ]; then
    # clean up and remove existing images
    #wait for stacks to drain
    if [[ isSwarmNode == "true" ]];then
        docker stack ls | grep -v NAME | awk '{print $1}' | while read stack
        do
                echo $stack
                docker stack rm ${stack}
                docker network rm web
                limit=20
                until [ -z "$(docker service ls --filter label=com.docker.stack.namespace=${stack} -q)" ] || [ "$limit" -lt 0 ]; do
                    sleep 1;
                    limit="$((limit-1))"
                    printf "."
                done
                limit=20
                until [ -z "$(docker network ls --filter label=com.docker.stack.namespace=web -q)" ] || [ "$limit" -lt 0 ]; do
                    sleep 1;
                    limit="$((limit-1))"
                    printf "."
                done
                limit=20
                until [ -z "$(docker stack ps ${stack} -q)" ] || [ "$limit" -lt 0 ]; do
                    sleep 1;
                    limit="$((limit-1))"
                    printf "."
                done
        done
    fi
    docker stop $(docker ps -a -q)
    docker rm $(docker ps -a -q)
    docker system prune -af
fi

APP_DIRECTORY=${DEPLOYMENT_DIRECTORY}/mats-home
cd ${APP_DIRECTORY}
echo -e "$0 building these apps ${GRN}mats-home${NC}"

buildApp() {
    local myApp=$1
    echo -e "$0:${myApp}: - building app ${GRN}${myApp}${NC}"
    rm -rf ./bundle
    /usr/local/bin/meteor reset
    BUNDLE_DIRECTORY=/builds/deployments/${myApp}
    if [ ! -d "${BUNDLE_DIRECTORY}" ]; then
        mkdir -p ${BUNDLE_DIRECTORY}
    else
        rm -rf ${BUNDLE_DIRECTORY}/*
    fi
    # do not know why I have to do these explicitly, but I do.
    /usr/local/bin/meteor npm install --save @babel/runtime
    /usr/local/bin/meteor npm install --save bootstrap
    /usr/local/bin/meteor npm audit fix

    /usr/local/bin/meteor build --directory ${BUNDLE_DIRECTORY} --server-only --architecture=os.linux.x86_64
    if [ $? -ne 0 ]; then
        echo -e "$0:${myApp}: ${RED} ${failed} to meteor build - must skip app ${myApp} ${NC}"
        continue
    fi

    cd ${BUNDLE_DIRECTORY}
    (cd bundle/programs/server && /usr/local/bin/meteor npm install && /usr/local/bin/meteor npm audit fix)

    if [[ "${build_images}" == "yes" ]]; then
        echo -e "$0:${myApp}: Building image for ${myApp}"
        #buildVer=$(getVersionForAppForServer ${myApp} ${SERVER})
        buildVer=1.0.0
        # build container....
        export METEORD_DIR=/opt/meteord
        export APPNAME=${myApp}
        export TAG="${myApp}-${buildVer}"
        export REPO=matsapps/production
        if [[ ${build_env} == "int" ]]; then
            REPO="matsapps/integration"
        else if [[ ${build_env} == "dev" ]]; then
            REPO="matsapps/development"
            TAG="${myApp}-nightly"
        fi
        fi
        echo "$0:${myApp}: building container in ${BUNDLE_DIRECTORY}"
        # remove the container if it exists - force in case it is running
        docker rm -f ${REPO}:${TAG}
        # Create the Dockerfile
        echo "$0:${myApp}: => Creating Dockerfile..."
        # save and export the meteor node version for the build_app script
        export METEOR_NODE_VERSION=$(meteor node -v | tr -d 'v')
        export METEOR_NPM_VERSION=$(meteor npm -v)
        cp ${DEPLOYMENT_DIRECTORY}/scripts/common/docker_scripts/run_app-matshome.sh  ./run_app.sh
        chmod +x run_app.sh
        # remove the node_modules to force rebuild in container
        rm -rf bundle/programs/server/node_modules
        #NOTE do not change the tabs to spaces in the here doc - it screws up the indentation

        cat <<-%EOFdockerfile > Dockerfile
# have to mount meteor settings as usr/app/settings/${APPNAME} - so that settings.json can get picked up by run_app.sh
# the corresponding usr/app/settings/${APPNAME}/settings-mysql.cnf file needs to be referenced by
# "MYSQL_CONF_PATH": "/usr/app/settings/${APPNAME}/settings-mysql.cnf" in the settings.json file
# and the MYSQL_CONF_PATH entry in the settings.json
# Pull base image.
FROM node:8.11.4-alpine
# Create app directory
ENV METEOR_NODE_VERSION=8.11.4 APPNAME="${APPNAME}" METEORD_DIR="/opt/meteord"
WORKDIR /usr/app
ADD bundle /usr/app
COPY run_app.sh /usr/app
RUN apk --update --no-cache add make gcc g++ python python3 python3-dev mariadb-dev bash && \\
    npm install -g npm@6.4.1 && \\
    npm cache clean -f && \\
    npm install -g n && \\
    npm install -g node-gyp && \\
    node-gyp install && \\
    python3 -m ensurepip && \\
    pip3 install --upgrade pip setuptools && \\
    pip3 install numpy && \\
    pip3 install pymysql && \\
    chmod +x /usr/app/run_app.sh && \\
    cd /usr/app/programs/server && npm install && npm audit fix && \\
    apk del --purge  make gcc g++ bash python3-dev && npm uninstall -g node-gyp && \\
    rm -rf /usr/mysql-test /usr/lib/libmysqld.a /opt/meteord/bin /usr/share/doc /usr/share/man /tmp/* /var/cache/apk/* /usr/share/man /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp rm -r /root/.cache
ENV APPNAME=${APPNAME}
ENV MONGO_URL=mongodb://mongo:27017/${APPNAME}
ENV ROOT_URL=http://localhost:80/
EXPOSE 80
ENTRYPOINT ["/usr/app/run_app.sh"]
LABEL version="${buildVer}" code.branch="${buildCodeBranch}" code.commit="${newCodecommit}"
    # build container
        #docker build --no-cache --rm -t ${REPO}:${APPNAME}-${buildVer} .
        #docker tag ${REPO}:${APPNAME}-${buildVer} ${REPO}:${APPNAME}-${buildVer}
        #docker push ${REPO}:${APPNAME}-${buildVer}
%EOFdockerfile
        echo "$0:${myApp}: docker build --no-cache --rm -t ${REPO}:${TAG} ."
        docker build --no-cache --rm -t ${REPO}:${TAG} .
        echo "$0:${myApp}: docker tag ${REPO}:${TAG} ${REPO}:${TAG}"
        docker tag ${REPO}:${TAG} ${REPO}:${TAG}
        if [ "${pushImage}" == "yes" ]; then
            echo ${matsapps_password} | docker login -u ${matsapps_user} --password-stdin
            echo "$0:${myApp}: pushing image ${REPO}:${TAG}"
            docker push ${REPO}:${TAG}
            if [ $? -ne 0 ]; then
                # retry
                echo -e "${RED} Error pushing image - need to retry${NC}"
                docker push ${REPO}:${TAG}
            fi
        else
            echo "$0:${myApp}: NOT pushing image ${REPO}:${TAG}"
        fi
        # example run command
        echo "$0:${myApp}: to run ... docker run --name ${APPNAME} -d -p 3002:80 --net mynet -v ${HOME}/[mats|metexpress]_app_configuration/settings:/usr/app/settings -i -t ${REPO}:${TAG}"
        echo "$0:${myApp}: created container in ${BUNDLE_DIRECTORY}"
    fi
    rm -rf ${BUNDLE_DIRECTORY}/*
    # remove the docker image - conserve space for build
    docker rmi ${REPO}:${TAG}
}

# build the app
buildApp mats-home
# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*

echo -e "$0 ----------------- finished $(/bin/date +%F_%T)"
exit 0
