#!/usr/bin/env bash
# Taken from https://blog.mvp-space.com/how-to-dockerize-a-meteor-app-with-just-one-script-4bccb26f6ff0
# builds a dockerfile for a MATS app that has been built already by mats_build_deploy_apps.sh.
# This script takes the bundle that was already built and adds a dockerfile, a settings file and a strtup package.json
# and then builds the image from an appropriate node image that corresponds to the node verwsion of the app.
. /builds/buildArea/MATS_for_EMB/scripts/common/app_production_utilities.source
# assign all the top level environment values from the build configuration to shell variables
# set up logging
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >( tee -i $logname )
exec 2>&1


# process command line args
usage="USAGE $0 -e dev|int [-a][-r appReference] -s settingsFile -d domain\n\
	where '-a is force build all apps -r appReference' (like met-upperair ceiling etc..), \n\
	and '-s settingsFile' (fully qualified path to settings file) -m "

while getopts "e:r:s:d:" o; do
    case "${o}" in
        a)
        #all apps
            APP_NAME="all"
        ;;
        e)
            build_env="${OPTARG}"
            if [ "${build_env}" == "dev" ]; then
                setBuildConfigVarsForDevelopmentServer
            else
                if [ "${build_env}" == "int" ]; then
                    setBuildConfigVarsForIntegrationServer
                else
                    echo -e "${RED}invalid environment '${build_env}' - should be 'int' or 'dev' exiting${NC} \n$usage"
                    exit 1
                fi
            fi
        ;;
        r)
            APP_NAME=(${OPTARG})
            echo -e "requsted app ${APP_NAME}"
        ;;
        s)
            SETTINGS_PATH="${OPTARG}"
            if [ ! -f ${SETTINGS_PATH} ]; then
                echo -s "${RED}invalid environment '${SETTINGS_PATH}' - does not exist' exiting${NC} \n$usage"
                exit 1
            fi
        ;;
        d)
            APP_DOMAIN=(${OPTARG})
            echo -e "requsted app domain ${APP_DOMAIN}"
        ;;
        *)
            echo -e "${RED} bad option? ${NC} \n$usage"
            exit 1
        ;;
    esac
done
shift $((OPTIND - 1))
if [ "X${build_env}" == "X" ]; then
    echo -e "${RED}You did not specify a build environment (-e dev|int)${NC}"
    echo -e $usage
    echo "${RED}Must exit now${NC}"
    exit 1
fi


# get the src code
echo "Building Mats apps - environment is ${build_env} requestedApps ${requestedApp[@]} requestedTag is ${requestedTag}: $(/bin/date +%F_%T)"
cd ${BUILD_DIRECTORY}
if [ ! -d "${DEPLOYMENT_DIRECTORY}" ]; then
    echo -e "${DEPLOYMENT_DIRECTORY} does not exist,  clone ${DEPLOYMENT_DIRECTORY}"
    cd ${DEPLOYMENT_DIRECTORY}
    /usr/bin/git clone ${BUILD_GIT_REPO}
    if [ $? -ne 0 ]; then
        echo -e "${failed} to /usr/bin/git clone ${BUILD_GIT_REPO} - must exit now"
        exit 1
    fi
fi

cd ${DEPLOYMENT_DIRECTORY}
currentCommit=$(git rev-parse HEAD)
if [ $? -ne 0 ]; then
    echo -e "${failed} to git the current HEAD commit - must exit now"
    exit 1
fi
/usr/bin/git pull
if [ $? -ne 0 ]; then
    echo -e "${failed} to /usr/bin/git fetch - must exit now"
    exit 1
fi
newCommit=$(git rev-parse HEAD)
if [ $? -ne 0 ]; then
    echo -e "${failed} to git the new HEAD commit - must exit now"
    exit 1
fi














APP_PORT=3000
MONGO_URL=localhost
MONGO_PORT=27017
MONGO_DB=${APP_NAME}

echo "=> Removing /tmp/${APP_NAME}"
rm -R /tmp/${APP_NAME}

echo "=> Executing Meteor Build..."
meteor build \
--allow-superuser \
--directory /tmp/${APP_NAME} \
--server=http://${APP_DOMAIN}:${APP_PORT}/

echo "=> Copying settings file..."
cp ${SETTINGS_PATH} /tmp/${APP_NAME}/bundle/settings.json

echo "=> Moving to /tmp/${APP_NAME}/bundle"
cd /tmp/${APP_NAME}/bundle

# Create package.json
echo "=> Creating package.json..."
cat > package.json <<- "EOF"
{
  "name": "app",
  "version": "1.0.0",
  "scripts": {
    "start": "METEOR_SETTINGS=$(cat settings.json) node main.js"
  }
}
EOF

# Create the Dockerfile
echo "=> Creating Dockerfile..."
cat > Dockerfile <<EOF
# Pull base image.
FROM mhart/alpine-node:4
# Install build tools to compile native npm modules
RUN apk add — update build-base python
# Create app directory
RUN mkdir -p /usr/app
COPY . /usr/app
RUN cd /usr/app/programs/server && npm install — production
WORKDIR /usr/app
ENV PORT=3000
ENV MONGO_URL=mongodb://$MONGO_URL:$MONGO_PORT/$MONGO_DB
ENV ROOT_URL=http://$APP_DOMAIN:$APP_PORT/
CMD [ "npm", "start" ]
EXPOSE 3000
EOF

# Build the docker image
echo "=> Building docker image..."
docker stop ${APP_NAME}
docker rm -f ${APP_NAME}
docker rmi -f ${APP_NAME}
Once everything is out of the way we can build the image
docker build -t ${APP_NAME} .

# Start the container
echo "=> Starting ${APP_NAME} container..."
docker run -d — name ${APP_NAME} -p ${APP_PORT}:3000 ${APP_NAME}
