#!/usr/bin/env bash
# This script builds and deploys an app, optionally takes the bundle that was already built and adds a dockerfile
# and then builds the image from an appropriate node image that corresponds to the node verwsion of the app.
# This script is dependent on two submodules MATScommon and METexpress
#
usage="USAGE $0 -e dev|int|prod|exp [-a][-r appReferences (if more than one put them in \"\")] [-i] [-l (local images only - do not push)]  [-b branch] [-s(static versions - do not roll versions)] \n\
	where -a is force build all apps, -b branch lets you override the assigned branch (feature build)\n\
	appReference is build only requested appReferences (like upperair ceiling), \n\
	default is build changed apps, e is build environment (dev, int, prod, or exp), and i is build images also, \n\
	environment exp is for experimental builds - which will be pushed to the experipental repository."

# source the build environment and mongo utilities
. /builds/buildArea/MATS_for_EMB/scripts/common/app_production_utilities.source

# source the credentials for the matsapps account
if [ ! -f ~/.matsapps_credentials ]; then
    echo "~/.matsapps_credentials file not found!"
    echo "you must creqate a ~/.matsapps_credentials file with the following entries.."
    echo "export matsapps_user='matsapps user'"
    echo "export matsapps_password='matsapps user password'"
    exit 1
fi
. ~/.matsapps_credentials

# assign all the top level environment values from the build configuration to shell variables
# set up logging
logDir="./logs"
mkdir -p logs
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >( tee -i $logname )
exec 2>&1

requestedApp=""
requestedTag=""
requestedBranch=""
build_env=""
pushImage="yes"
build_images="no"
roll_versions="yes"
experimental="no"
while getopts "alisr:e:b:" o; do
    case "${o}" in
        a)
        #all apps
            requestedApp="all"
        ;;
        i)
        # build images also
            build_images="yes"
            ;;
        l)
            pushImage="no"
        ;;
        s)
            roll_versions="no"
        ;;
        b)
            requestedBranch=(${OPTARG})
            echo -e "requested branch ${requestedBranch}"
        ;;
        r)
            requestedApp=(${OPTARG})
            echo -e "requsted apps ${requestedApp[@]}"
        ;;
        e)
            build_env="${OPTARG}"
            if [ "${build_env}" == "exp" ]; then
                setBuildConfigVarsForDevelopmentServer
                experimental="yes"
            elif [ "${build_env}" == "dev" ]; then
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
echo "Building Mats apps - environment is ${build_env} requestedApps ${requestedApp[@]} requestedTag is ${requestedTag}: date: $(/bin/date +%F_%T)"
# Environment vars are set from the appProduction database. Example for int....
#    "server" : "mats-int.gsd.esrl.noaa.gov",
#    "deployment_environment" : "integration",
#    "deployment_status" : "active",
#    "deployment_directory" : "/builds/buildArea/MATS_for_EMB",
#    "build_git_repo" : "gerrit:MATS_for_EMB",
#    "build_code_branch" : "master",
#    "build_directory" : "/builds/buildArea/",
#    "build_cmd" : "sh /builds/buildArea/MATS_for_EMB/scripts/common/mats_build_deploy_apps.sh -e int",
#    "cmd_execute_server" : "mats-int.gsd.esrl.noaa.gov",
#    "test_git_repo" : "https://user@vlab.ncep.noaa.gov/git/mats-testing",
#    "test_code_branch" : "master",
#    "test_directory" : "/builds/buildArea/mats-testing",
#    "test_command" : "sh ./matsTest -b phantomjs -s mats-int.gsd.esrl.noaa.gov -f progress:/builds/buildArea/test_results/mats-int-`/bin/date +%Y.%m.%d.%H.%M.%S`",
#    "test_result_directory" : "/builds/buildArea/test_results",

if [ ! -d "${DEPLOYMENT_DIRECTORY}" ]; then
    echo -e "${DEPLOYMENT_DIRECTORY} does not exist,  must clone ${DEPLOYMENT_DIRECTORY}"
    cd ${DEPLOYMENT_DIRECTORY}/..
    /usr/bin/git clone --recurse-submodules --remote-submodules ${BUILD_GIT_REPO}
    /usr/bin/git submodule init
    /usr/bin/git submodule update

    if [ $? -ne 0 ]; then
        echo -e "${RED} ${failed} to /usr/bin/git clone ${BUILD_GIT_REPO} - must exit now ${NC}"
        exit 1
    fi
fi
cd ${DEPLOYMENT_DIRECTORY}
# throw away any local changes - after all, you are building
echo -e "${RED} THROWING AWAY LOCAL CHANGES ${NC}"
git reset --hard
# set the submodules branch
git submodule init
git submodule update
# checkout proper branch
echo "git checkout ${BUILD_CODE_BRANCH}"
git checkout ${BUILD_CODE_BRANCH}
#update submodules
git submodule update --remote
git submodule foreach "git checkout ${BUILD_CODE_BRANCH}"
export buildCodeBranch=$(git rev-parse --abbrev-ref HEAD)
export currentCodeCommit=$(git rev-parse --short HEAD)
if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to git the current HEAD commit - must exit now ${NC}"
    exit 1
fi
/usr/bin/git pull -Xtheirs --recurse-submodules=yes --commit
if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to do git pull - must exit now ${NC}"
    exit 1
fi

newCodeCommit=$(git rev-parse --short HEAD)
if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to git the new HEAD commit - must exit now ${NC}"
    exit 1
fi
# link in METexpress apps from METexpress submodule
rm -rf ${DEPLOYMENT_DIRECTORY}/apps/met-*
ln -sf ${DEPLOYMENT_DIRECTORY}/METexpress/apps/* ${DEPLOYMENT_DIRECTORY}/apps
ln -sf ${DEPLOYMENT_DIRECTORY}/METexpress/tests/src/features/* ${DEPLOYMENT_DIRECTORY}/tests/src/features
#build all of the apps that have changes (or if a meteor_package change just all the apps)
buildableApps=( $(getBuildableAppsForServer "${SERVER}") )
echo -e buildable apps are.... ${GRN}${buildableApps[*]} ${NC}
echo **checking for changes with  *** /usr/bin/git --no-pager diff --name-only ${currentCodeCommit}...${newCodeCommit}***
diffOut=$(/usr/bin/git --no-pager diff --name-only ${currentCodeCommit}...${newCodeCommit})
echo changes are $diffOut
ret=$?
if [ $ret -ne 0 ]; then
    echo -e "${RED} ${failed} to '/usr/bin/git --no-pager diff --name-only ${currentCodeCommit}...${newCodeCommit}' ... ret $ret - must exit now ${NC}"
    exit 1
fi

diffs=$(echo $diffOut | grep -v 'appProductionStatus')
ret=$?
if [ "X${requestedApp}" == "X" -a ${ret} -ne 0 ]; then
    echo -e "${RED} ${failed} no modified apps to build - ret $ret - must exit now ${NC}"
    exit 1
fi
changedApps=( $(echo -e ${diffs} | grep apps | cut -f2 -d'/') )
echo -e changedApps are ${GRN}${changedApps}${NC}

if [ "${build_env}" == "int" ]; then
    cv=$(date +%Y.%m.%d)
    echo -e "${GRN}setting build date to $cv for /builds/buildArea/MATS_for_EMB/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html${NC}"
    /usr/bin/sed -i -e "s/<x-bd>.*<\/x-bd>/<x-bd>$cv<\/x-bd>/g" /builds/buildArea/MATS_for_EMB/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    git commit -m "Build automatically updated release notes" /builds/buildArea/MATS_for_EMB/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    /usr/bin/git pull
    /usr/bin/git push
elif [ "${build_env}" == "prod" ]; then
    cv=$(date +%Y.%m.%d)
    echo -e "${GRN}setting pub date to $cv for /builds/buildArea/MATS_for_EMB/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html${NC}"
    /usr/bin/sed -i -e "s/<x-cr>.*<\/x-cr>/<x-cr>$cv<\/x-cr>/g" /builds/buildArea/MATS_for_EMB/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    git commit -m "Build automatically updated release notes" /builds/buildArea/MATS_for_EMB/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    /usr/bin/git pull
    /usr/bin/git push
fi

unset apps
if [ "X${requestedApp}" != "X" ]; then
   # something was requested. Either a few apps or all
    if [ "${requestedApp}" == "all" ]; then
        apps=( ${buildableApps[@]} )
        echo -e all apps requested - must build all buildable apps
    else
        # not all so find requested apps that are also buildable
        echo -e specific apps requested - must build requested buildable apps
        l2=" ${requestedApp[*]} "
        for a in ${buildableApps[*]}; do
            if [[ $l2 =~ " $a " ]]; then
                apps+=( $a )
            fi
        done
    fi
else
    # nothing was requested - build the changed apps unless force was used
    # no common code changes or force so just build changed apps
    l2=" ${changedApps[*]} "
    for a in ${buildableApps[*]}; do
        if [[ $l2 =~ " $a " ]]; then
            apps+=( $a )
        fi
    done
    echo -e modified and buildable apps are ${GRN}${apps[*]}${NC}
fi
if [ "X${apps}" == "X" ]; then
    echo -e "${RED}no apps to build - exiting${NC}"
    exit 1
else
    echo -e "${GRN}Resolved apps to build - building these apps[*]${NC}"
fi

echo -e "$0 ${GRN} clean and remove existing images ${NC}"
if [ "${build_images}" == "yes" ]; then
    # clean up and remove existing images images
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

# should be here from git submodule MATScommon
export METEOR_PACKAGE_DIRS=${DEPLOYMENT_DIRECTORY}/MATScommon/meteor_packages
if [ ! -d "${METEOR_PACKAGE_DIRS}" ]; then
    echo -e "${RED}your ${METEOR_PACKAGE_DIRS} does not exist - exiting${NC}"
    exit 1
fi
APP_DIRECTORY=${DEPLOYMENT_DIRECTORY}/apps
cd ${APP_DIRECTORY}
echo -e "$0 building these apps ${GRN}${apps[*]}${NC}"

buildApp() {
    local myApp=$1
    cd ${APP_DIRECTORY}/${myApp}
    echo -e "$0:${myApp}: - building app ${GRN}${myApp}${NC}"
    rm -rf ./bundle
    /usr/local/bin/meteor reset
    BUNDLE_DIRECTORY=${BUILD_DIRECTORY}/${myApp}
    if [ ! -d "${BUNDLE_DIRECTORY}" ]; then
        mkdir -p ${BUNDLE_DIRECTORY}
    else
        rm -rf ${BUNDLE_DIRECTORY}/*
    fi
    # do not know why I have to do these explicitly, but I do.
    /usr/local/bin/meteor npm install --save @babel/runtime
    /usr/local/bin/meteor build --directory ${BUNDLE_DIRECTORY} --server-only --architecture=os.linux.x86_64
    if [ $? -ne 0 ]; then
        echo -e "$0:${myApp}: ${RED} ${failed} to meteor build - must skip app ${myApp} ${NC}"
        continue
    fi

    cd ${BUNDLE_DIRECTORY}
    (cd bundle/programs/server && /usr/local/bin/meteor npm install && /usr/local/bin/meteor npm audit fix)

    if [[ "${build_images}" == "yes" ]]; then
        echo -e "$0:${myApp}: Building image for ${myApp}"
        buildVer=$(getVersionForAppForServer ${myApp} ${SERVER})
        # build container....
        export METEORD_DIR=/opt/meteord
        export MONGO_URL="mongodb://mongo"
        export MONGO_PORT=27017
        export MONGO_DB=${myApp}
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
        if [[ ${experimental} == "yes" ]]; then
          REPO="matsapps/experimental"
        fi
        echo "$0:${myApp}: building container in ${BUNDLE_DIRECTORY}"
        # remove the container if it exists - force in case it is running
        docker rm -f ${REPO}:${TAG}
        # Create the Dockerfile
        echo "$0:${myApp}: => Creating Dockerfile..."
        # save and export the meteor node version for the build_app script
        export METEOR_NODE_VERSION=$(meteor node -v | tr -d 'v')
        export METEOR_NPM_VERSION=$(meteor npm -v)
        cp ../../scripts/common/docker_scripts/run_app.sh  .
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
FROM node:14.8-alpine3.12
# Create app directory
ENV METEOR_NODE_VERSION=8.11.4 APPNAME="${APPNAME}" METEORD_DIR="/opt/meteord"
WORKDIR /usr/app
ADD bundle /usr/app
COPY run_app.sh /usr/app
RUN apk --update --no-cache add mongodb-tools make gcc g++ python3 python3-dev mariadb-dev bash && \\
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
        #docker build --no-cache --rm -t ${REPO}:${TAG} .
        #docker tag ${REPO}:${TAG} ${REPO}:${TAG}
        #docker push ${REPO}:${TAG}
%EOFdockerfile
        echo "$0:${myApp}: docker build --no-cache --rm -t ${REPO}:${TAG} ."
        docker build --no-cache --rm -t ${REPO}:${TAG} .
        echo "$0:${myApp}: docker tag ${REPO}:${TAG} ${REPO}:${TAG}"
        docker tag ${REPO}:${TAG} ${REPO}:${TAG}
        if [ "${pushImage}" == "yes" ]; then
            echo ${matsapps_password} | docker login -u ${matsapps_user} --password-stdin
            echo "$0:${myApp}: pushing image ${REPO}:${TAG}"
            docker push ${REPO}:${TAG}
            ret=$?
            if [ $ret -ne 0 ]; then
                # retry
                echo -e "${RED} Error pushing image - need to retry${NC}"
                docker push ${REPO}:${TAG}
                ret=$?
            fi
            if [ $ret -eq 0 ]; then
              # remove the docker image - conserve space for build
              echo "${GRN} pushed the image! ${NC}"
              docker rmi ${REPO}:${TAG}
            else
              echo "${RED} Failed to push the image! ${NC}"
            fi
        else
            echo "$0:${myApp}: NOT pushing image ${REPO}:${TAG}"
        fi
    fi
    rm -rf ${BUNDLE_DIRECTORY}/*
}

# roll or promote versions
i=0
for app in ${apps[*]}; do
    theApp=${app}
    echo -e "$0:${theApp}: - rolling/promoting app ${GRN}${theApp}${NC}"
    if [[ "${roll_versions}" == "yes" ]]; then
        if [ "${DEPLOYMENT_ENVIRONMENT}" == "development" ]; then
            echo -e "rolling versions for development"
            rollDevelopmentVersionAndDateForAppForServer ${theApp} ${SERVER}
        elif [ "${DEPLOYMENT_ENVIRONMENT}" == "integration" ]; then
            echo -e "rolling versions for integration"
            rollIntegrationVersionAndDateForAppForServer ${theApp} ${SERVER}
        elif [ "${DEPLOYMENT_ENVIRONMENT}" == "production" ]; then
            echo -e "promoting versions for production"
            promoteApp ${theApp}
        fi
    fi
    i=$((i+1))
done
# persist and checkin new versions
exportCollections ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
/usr/bin/git commit -m"automated export" -- ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
cat ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections/deployment.json |
${DEPLOYMENT_DIRECTORY}/scripts/common/makeCollectionExportValid.pl > ${DEPLOYMENT_DIRECTORY}/MATScommon/meteor_packages/mats-common/public/deployment/deployment.json
/usr/bin/git commit -am"automated export"
/usr/bin/git pull
git push origin ${BUILD_CODE_BRANCH}

# build all the apps
i=0
for app in ${apps[*]}; do
    (buildApp ${app})&
    pids[${i}]=$!
    i=$((i+1))
    sleep 10
done

# wait for all pids
for pid in ${pids[*]}; do
    wait $pid
done

# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*

echo -e "$0 ----------------- finished $(/bin/date +%F_%T)"
exit 0
