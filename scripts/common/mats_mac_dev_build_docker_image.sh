#!/usr/bin/env bash
   if [ $# -ne 1 ]; then
	echo $0 - wrong number of params - usage: $0 app
	exit 1
    fi
    APP_NAME=$1
	export GRN='\033[0;32m'
    export RED='\033[0;31m'
    export NC='\033[0m'
    export passed='\033[0;32m passed \033[0m'
    export success='\033[0;32m success \033[0m'
    export failed='\033[0;31m failed \033[0m'
    export BUNDLE_DIRECTORY=/builds/deployments/${APP_NAME}

    export BUILD_DIRECTORY=/builds/buildArea
    export DEPLOYMENT_DIRECTORY=$PWD

    export METEORD_DIR=/opt/meteord
    export BUILD_PACKAGES="make gcc g++ python-dev py-pip mariadb-dev bash"
    export MONGO_URL="mongodb://mongo"
    export MONGO_PORT=27017
    export MONGO_DB=${APP_NAME}
    export REPO=randytpierce/mats1
    # save and export the meteor node version for the build_app script
    export METEOR_NODE_VERSION=$(meteor node -v | tr -d 'v')
    export METEOR_NPM_VERSION=$(meteor npm -v)
    export tag=2.0.1
    export TAG=${APP_NAME}-${tag}

	if [ "$(basename ${DEPLOYMENT_DIRECTORY})" != "${APP_NAME}" ]; then
	    echo -e "$(basename ${DEPLOYMENT_DIRECTORY}) does not match ${APP_NAME} - you must be in an app directory that matches the parameter"
		exit 1
	fi
    echo -e "$0 - building app ${GRN}${APP_NAME}${NC}"
    /usr/local/bin/meteor reset
    /usr/local/bin/meteor npm install --production
    rm -rf ${BUNDLE_DIRECTORY}
    /usr/local/bin/meteor build --directory ${BUNDLE_DIRECTORY} --server-only --architecture=os.linux.x86_64
    if [ $? -ne 0 ]; then
        echo -e "${failed} to meteor build - must exit now"
        exit 1
    fi
    # build container....
    echo "building container in ${BUNDLE_DIRECTORY}"
    cd ${BUNDLE_DIRECTORY}
    # stop the container if it is running
    docker stop ${REPO}:${TAG} || true && docker rm ${REPO}:${TAG} || true
    # prune all stopped containers
    docker container prune -f
    # Create the Dockerfile
    echo "=> Creating Dockerfile..."
    cp ${METEOR_PACKAGE_DIRS}/../scripts/common/docker_scripts/run_app.sh  .
    chmod +x run_app.sh
    #NOTE do not change the tabs to spaces in the here doc - it screws up the indentation
    cat <<-%EOFdockerfile > Dockerfile
		# have to mount meteor settings as usr/app/settings/${APP_NAME} - so that settings.json can get picked up by run_app.sh
		# the corresponding usr/app/settings/${APP_NAME}/settings-mysql.cnf file needs to be referenced by
		# "MYSQL_CONF_PATH": "/usr/app/settings/${APP_NAME}/settings-mysql.cnf" in the settings.json file
		# and the MYSQL_CONF_PATH entry in the settings.json
		# e.g.
		# docker run -v /Users/pierce/mats_app_configuration/settings:/usr/app/settings -i -t randytpierce/mats1:${APP_NAME}-2.0.1
		# Pull base image.
		FROM node:8.11.4-alpine
		# Create app directory
		ENV METEOR_NODE_VERSION=8.11.4 APPNAME="${APP_NAME}" METEORD_DIR="/opt/meteord" BUILD_PACKAGES="make gcc g++ python-dev py-pip libmysqlclient-dev bash"
		RUN mkdir -p /usr/app
		WORKDIR /usr/app
		RUN apk --update --no-cache add python make gcc g++ python-dev py-pip mariadb-dev python-mysqldbbash \
				&& npm install -g npm@6.4.1 \
				&& npm cache clean -f \
				&& npm install -g n \
				&& npm install -g node-gyp \
				&& node-gyp install \
				&& pip install --upgrade pip \
				&& pip2 install numpy \
				&& pip2 install mysqlclient

		ADD bundle /usr/app
		COPY run_app.sh /usr/app
		RUN chmod +x /usr/app/run_app.sh
		RUN cd /usr/app/programs/server && npm install --production
		RUN apk del --purge  make gcc g++ python-dev py-pip bash && npm uninstall -g node-gyp
		RUN rm -rf $METEORD_DIR/bin /usr/share/doc /usr/share/man /tmp/* /var/cache/apk/* /usr/share/man /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp
		ENV APPNAME=${APP_NAME}
		ENV MONGO_URL=mongodb://mongo:27017/${APP_NAME}
		ENV ROOT_URL=http://localhost:80/
		EXPOSE 80
		ENTRYPOINT ["/usr/app/run_app.sh"]

		# build container
        #docker build --no-cache --rm -t ${REPO}:${TAG} .
        #docker tag ${REPO}:${TAG} ${REPO}:${TAG}
        #docker push ${REPO}:${TAG}
	%EOFdockerfile
    # build container
    docker build --no-cache --rm -t ${REPO}:${TAG} .
    docker tag ${REPO}:${TAG} ${REPO}:${TAG}
    #docker push ${REPO}:${TAG}
    # example run command
    echo "to run ... docker run --name ${APP_NAME} -d -p 3002:80 --net mynet -v ${HOME}/mats_app_configuration/settings:/usr/app/settings -i -t ${REPO}:${TAG}"
    echo "created container in ${BUNDLE_DIRECTORY}"
    cd ${DEPLOYMENT_DIRECTORY}
