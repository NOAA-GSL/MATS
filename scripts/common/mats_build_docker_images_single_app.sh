#!/usr/bin/env bash

export GRN='\033[0;32m'
export RED='\033[0;31m'
export NC='\033[0m'
export passed='\033[0;32m passed \033[0m'
export success='\033[0;32m success \033[0m'
export failed='\033[0;31m failed \033[0m'
usage="USAGE $0 -r registry -u user"
registry=""
user=""
while getopts "r:u:" o; do
    case "${o}" in
        r)
            registry=(${OPTARG})
            echo -e "registry is ${registry}"
        ;;
        u)
            user=(${OPTARG})
            echo -e "registry user is ${user}"
        ;;
        *)
            echo -e "${RED} bad option? ${NC} \n$usage"
            exit 1
        ;;
    esac
done
shift $((OPTIND - 1))
read -sp "What is the password for registry ${registry} user ${user}?" password
echo ${password} | docker login -u ${user} --password-stdin
if [[ $? -ne 0 ]]; then
    echo -e "${RED} login to registry ${registry} for user ${user} with supplied password failed! - exiting ${NC}"
    exit 1
fi

export METEOR_PACKAGE_DIRS=`find $PWD/../.. -name meteor_packages`
echo -e "$0 - building app ${GRN}${app}${NC}"
app=$(basename ${PWD})
BUNDLE_DIRECTORY=/tmp/${app}
rm -rf ${BUNDLE_DIRECTORY}/*
/usr/local/bin/meteor reset
# do not know why I have to do these explicitly, but I do.
meteor npm install --save @babel/runtime
meteor npm install --save bootstrap
/usr/local/bin/meteor build --directory ${BUNDLE_DIRECTORY} --server-only --architecture=os.linux.x86_64
if [ $? -ne 0 ]; then
    echo -e "$0:${app}: ${RED} ${failed} to meteor build - must skip app ${app} ${NC}"
    continue
fi

cd ${BUNDLE_DIRECTORY}
(cd bundle/programs/server && /usr/local/bin/meteor npm install)
if [ $? -ne 0 ]; then
    echo -e "${failed} to meteor build - must exit now"
    exit 1
fi
# build container....
echo "building image for ${app} in ${BUNDLE_DIRECTORY}"
APP_DIRECTORY=$(pwd)
buildVer=$(date +%Y%m%d%H%M%S)
cd ${BUNDLE_DIRECTORY}
(cd bundle/programs/server && /usr/local/bin/meteor npm install)
# stop any running containers....
docker rm $(docker ps -a -q)
# prune all stopped containers
docker system prune -af
# Create the Dockerfile
echo "=> Creating Dockerfile..."
export METEORD_DIR=/opt/meteord
export MONGO_URL="mongodb://mongo"
export MONGO_PORT=27017
export MONGO_DB=${app}
export APPNAME=${app}
export REPO=${registry}
export TAG="${app}-${buildVer}"
docker rm -f ${REPO}:${TAG}
# save and export the meteor node version for the build_app script
export METEOR_NODE_VERSION=$(meteor node -v | tr -d 'v')
export METEOR_NPM_VERSION=$(meteor npm -v)
cp ${METEOR_PACKAGE_DIRS}/../scripts/common/docker_scripts/run_app.sh  .
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
    cd /usr/app/programs/server && npm install && \\
    apk del --purge  make gcc g++ bash python3-dev && npm uninstall -g node-gyp && \\
    rm -rf /usr/mysql-test /usr/lib/libmysqld.a /opt/meteord/bin /usr/share/doc /usr/share/man /tmp/* /var/cache/apk/* /usr/share/man /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp rm -r /root/.cache
ENV APPNAME=${APPNAME}
ENV MONGO_URL=mongodb://mongo:27017/${APPNAME}
ENV ROOT_URL=http://localhost:80/
EXPOSE 80
ENTRYPOINT ["/usr/app/run_app.sh"]
LABEL version="${buildVer}"
    # build container
        #docker build --no-cache --rm -t ${REPO}:${APPNAME}-${buildVer} .
        #docker tag ${REPO}:${APPNAME}-${buildVer} ${REPO}:${APPNAME}-${buildVer}
        #docker push ${REPO}:${APPNAME}-${buildVer}
%EOFdockerfile
# build container
docker build --no-cache --rm -t ${REPO}:${TAG} .
docker tag ${REPO}:${TAG} ${REPO}:${TAG}
echo "pushing image ${REPO}:${TAG}"
docker push ${REPO}:${TAG}
# example run command
echo "to run ... docker run --name ${APPNAME} -d -p 3002:80 --net mynet -v ${HOME}/[mats|metexpress]_app_configuration/settings:/usr/app/settings -i -t ${REPO}:${TAG}"
echo "created container in ${BUNDLE_DIRECTORY}"
rm -rf ${BUNDLE_DIRECTORY}/*
docker rmi ${REPO}:${TAG}
# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*
echo -e "$0 ----------------- finished building image. $(/bin/date +%F_%T)"

exit 0
