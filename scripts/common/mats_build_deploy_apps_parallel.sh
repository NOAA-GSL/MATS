#!/usr/bin/env bash
# This script builds and deploys an app, optionally takes the bundle that was already built and adds a dockerfile
# and then builds the image from an appropriate node image that corresponds to the node version of the app.
# SUBMODULE NOTES:
# This script is dependent on two submodules MATScommon and METexpress.
# This script will modify the MATScommon/public/MATSReleaseNotes.html to set the build date.
# This script will modify the MATScommon/public/deployment/deployment.json file to reflect any version
# changes caused by the build rolling a version.
# Normally a submodule is checked out HEADLESS at the exact same hash reference that the parent of the submodule
# had for the submodule when the submodule reference in the parent was committed.
# In our case it is possible that a submodule may have been updated outside the parent hash reference
# and we want the build to always get the latest available submodule changes, not just the changes that were available
# when the parent (MATS) was last checked in. This is important for nightly builds.
# Therefore it is important for the build to actually checkout AND update both submodules METexpress and MATScommon,
# each time the build is run. Since the submodules will get checked out (and MATScommon will always get updated with build
# dates and versions), both submodule references MUST be added, committed, and pushed each time the build runs.
#
usage="USAGE $0 -e dev|int|prod|exp [-a][-r appReferences (if more than one put them in \"\")] [-i]
[-l (local images only - do not push)]  [-b branch] [-s(static versions - do not roll versions)] \n\
	where -a is force build all apps, -b branch lets you override the assigned branch (feature build)\n\
	appReference is build only requested appReferences (like upperair ceiling), \n\
	default is build changed apps, e is build environment (dev, int, prod, or exp), and i is build images also, \n\
	environment exp is for experimental builds - which will be pushed to the experipental repository."
isGitRepo=$(/usr/bin/git config --get remote.origin.url)
rootOfRepo=$(/usr/bin/git rev-parse --show-toplevel)
BUILD_DIRECTORY=$(pwd)
if [[ ${isGitRepo} != "git@github.com:NOAA-GSL/MATS.git" ]]; then
  echo "you are not in a local repo cloned from vlab"
  echo "I cannot go on.... exiting"
  echo $usage
  exit 1
fi

if [[ ${BUILD_DIRECTORY} != ${rootOfRepo} ]]; then
  echo "you do not appear to be in the top of the repo"
  echo "I cannot go on.... exiting"
  echo $usage
  exit 1
fi
# source the build environment and mongo utilities
. scripts/common/app_production_utilities.source

# source the credentials for the matsapps account
if [ ! -f ~/.matsapps_credentials ]; then
    echo "~/.matsapps_credentials file not found!"
    echo "you must creqate a ~/.matsapps_credentials file with the following entries.."
    echo "export matsapps_user='matsapps dockerhub user'"
    echo "export matsapps_password='matsapps dockerhub user password'"
    echo "export matsapps_custom_repo='custum dockerhub repo for experimental images [OPTIONAL]'"

    exit 1
fi
. ~/.matsapps_credentials
if [ -z ${matsapps_user+x} ]; then
  echo -e "${RED} your docker_user is not exported in your ~/.matsapps_credentials file ${NC}"
  echo "I can't go on..."
  exit 1
fi
if [ -z ${matsapps_password+x} ]; then
  echo -e "${RED} your matsapps_password is not exported in your ~/.matsapps_credentials file ${NC}"
  echo "I can't go on..."
  exit 1
fi
if [ -z ${matsapps_custom_repo+x} ] && [ "${build_env}" == "exp" ]; then
  echo -e "${RED} your matsapps_custom_repo is not exported in your ~/.matsapps_credentials file ${NC}"
  echo "I can't go on..."
  exit 1
fi

# check for pidlist and if it exists kill all those pids and remove the list
if [ -f /tmp/mats_build_pidlist ]; then
  kill -TERM $(cat /tmp/mats_build_pidlist)
  rm -rf /tmp/mats_build_pidlist
fi

# assign all the top level environment values from the build configuration to shell variables
# set up logging
logDir="./logs"
mkdir -p logs
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >( tee -i $logname )
exec 2>&1

requestedApp=""
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
            echo -e "requsted apps" "${requestedApp[@]}"
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
    echo -e "overriding git branch for the main project with ${requestedBranch}"
    BUILD_CODE_BRANCH=${requestedBranch}
fi
echo "Building Mats apps - environment is ${build_env} requestedApps " "${requestedApp[@]}" ": date: $(/bin/date +%F_%T)"
# Environment vars are set from the appProduction database. Example for int....
#    "server" : "mats-int.gsd.esrl.noaa.gov",
#    "deployment_environment" : "integration",
#    "deployment_status" : "active",
#    "deployment_directory" : "/builds/buildArea/MATS",
#    "build_git_repo" : "git@github.com:NOAA-GSL/MATS.git",
#    "build_code_branch" : "main",

# throw away any local changes - after all, you are building
echo -e "${RED} THROWING AWAY LOCAL CHANGES ${NC}"
/usr/bin/git reset --hard
# checkout proper branch

if [ ${BUILD_CODE_BRANCH} = "development" ] || [ ${BUILD_CODE_BRANCH} = "main" ]; then
  # checkout submodules at either development or main branch depending on build_code_branch
#  /usr/bin/git submodule update --force
#  if [ $? -ne 0 ]; then
#      echo -e "${RED} ${failed} to do update submodules - must exit now ${NC}"
#      exit 1
#  fi
  /usr/bin/git submodule foreach git checkout ${BUILD_CODE_BRANCH}
  if [ $? -ne 0 ]; then
      echo -e "${RED} ${failed} to git checkout submodules - must exit now ${NC}"
      exit 1
  fi
#else
  # feature branch
  # checkout submodules at whatever hash the prent had checked in. Submodules will be DETACHED HEAD
  #/usr/bin/git submodule update --force
  #if [ $? -ne 0 ]; then
  #    echo -e "${RED} ${failed} to do update submodules - must exit now ${NC}"
  #   exit 1
  #fi
fi

export buildCodeBranch=$(git rev-parse --abbrev-ref HEAD)
export currentCodeCommit=$(git rev-parse --short HEAD)
if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to git the current HEAD commit - must exit now ${NC}"
    exit 1
fi
/usr/bin/git pull -Xtheirs  --commit
if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to do git pull - must exit now ${NC}"
    exit 1
fi

newCodeCommit=$(git rev-parse --short HEAD)
if [ $? -ne 0 ]; then
    echo -e "${RED} ${failed} to git the new HEAD commit - must exit now ${NC}"
    exit 1
fi
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
    echo -e "${GRN}setting build date to $cv for /builds/buildArea/MATS/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html${NC}"
    /usr/bin/sed -i -e "s/<x-bd>.*<\/x-bd>/$cv/g" /builds/buildArea/MATS/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    curdir=$(pwd)
    cd /builds/buildArea/MATS/MATScommon
    /usr/bin/git add /builds/buildArea/MATS/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    /usr/bin/git commit -m "Build automatically updated release notes" /builds/buildArea/MATS/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    /usr/bin/git pull
    /usr/bin/git push
    cd $curdir
elif [ "${build_env}" == "prod" ]; then
    cv=$(date +%Y.%m.%d)
    echo -e "${GRN}setting pub date to $cv for /builds/buildArea/MATS/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html${NC}"
    /usr/bin/sed -i -e "s/<x-cr>.*<\/x-cr>/$cv/g" /builds/buildArea/MATS/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    curdir=$(pwd)
    cd /builds/buildArea/MATS/MATScommon
    /builds/buildArea/MATS/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    /usr/bin/git commit -m "Build automatically updated release notes" /builds/buildArea/MATS/MATScommon/meteor_packages/mats-common/public/MATSReleaseNotes.html
    /usr/bin/git pull
    /usr/bin/git push
    cd $curdir
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
            if [[ $l2 =~ $a ]]; then
                apps+=( $a )
            fi
        done
    fi
else
    # nothing was requested - build the changed apps unless force was used
    # no common code changes or force so just build changed apps
    l2=" ${changedApps[*]} "
    for a in ${buildableApps[*]}; do
        if [[ $l2 =~ $a ]]; then
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
ME=`basename $0`;

buildApp () {
    local myApp=$1
    cd ${APP_DIRECTORY}/${myApp}
    echo -e "$0:${myApp}: - building app ${GRN}${myApp}${NC}"
    rm -rf ./bundle
    /usr/local/bin/meteor reset
    BUNDLE_DIRECTORY=${BUILD_DIRECTORY}/bundles/${myApp}
    if [ ! -d "${BUNDLE_DIRECTORY}" ]; then
        mkdir -p ${BUNDLE_DIRECTORY}
    else
        rm -rf ${BUNDLE_DIRECTORY}/*
    fi
    # do not know why I have to do these explicitly, but I do.
    /usr/local/bin/meteor npm install --save @babel/runtime
    # use a file lock to synchronize the meteor build.
    # The build does not seem to be re-entrant
    exec 8>/tmp/$ME.LCK;
    flock -x 8
    echo -e "$0:${myApp}: ${GRN} starting meteor build: ${myApp} ${NC}"
    /usr/local/bin/meteor build --directory ${BUNDLE_DIRECTORY} --server-only --architecture=os.linux.x86_64
    if [ $? -ne 0 ]; then
        echo -e "$0:${myApp}: ${RED} ${failed} to meteor build - must skip app ${myApp} ${NC}"
        flock -u 8
        return
    fi
    flock -u 8
    echo -e "$0:${myApp}: ${GRN} finished meteor build: ${myApp} ${NC}"

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
        elif [[ ${build_env} == "dev" ]]; then
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
        cp ${DEPLOYMENT_DIRECTORY}/scripts/common/docker_scripts/run_app.sh  .
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
FROM node:14.17-alpine3.14
# Create app directory
ENV APPNAME="${APPNAME}"
WORKDIR /usr/app
ADD bundle /usr/app
COPY run_app.sh /usr/app
RUN apk --update --no-cache add mongodb-tools make g++ python3 py3-pip py3-numpy \\
    # && apk --no-cache --update --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing add py3-pymysql \\
    && npm cache clean -f \\
    && npm install -g n \\
    && npm install -g node-gyp \\
    && node-gyp install \\
    # TODO: use the apk package in place of pip for py3-pymysql when it is stable
    && pip3 install pymysql \\
    && chmod +x /usr/app/run_app.sh \\
    && cd /usr/app/programs/server \\
    && npm install \\
    && npm audit fix \\
    && apk del --purge make gcc g++ \\
    && npm uninstall -g node-gyp \\
    && rm -rf /usr/mysql-test \\
              /usr/lib/libmysqld.a \\
              /opt/meteord/bin \\
              /usr/share/doc \\
              /usr/share/man \\
              /tmp/* \\
              /var/cache/apk/* \\
              /usr/share/man \\
              /var/cache/apk/* \\
              /root/.npm \\
              /root/.node-gyp \\
              /root/.cache
ENV MONGO_URL=mongodb://mongo:27017/${APPNAME}
ENV ROOT_URL=http://localhost:80/
EXPOSE 80
ENTRYPOINT ["/usr/app/run_app.sh"]
LABEL version="${buildVer}" code.branch="${buildCodeBranch}" code.commit="${newCodeCommit}"
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
/usr/bin/git add ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
/usr/bin/git commit -m"automated export" -- ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
cat ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections/deployment.json |
${DEPLOYMENT_DIRECTORY}/scripts/common/makeCollectionExportValid.pl > ${DEPLOYMENT_DIRECTORY}/MATScommon/meteor_packages/mats-common/public/deployment/deployment.json
currdir=$(pwd)
cd ${DEPLOYMENT_DIRECTORY}/MATScommon
/usr/bin/git add ${DEPLOYMENT_DIRECTORY}/MATScommon/meteor_packages/mats-common/public/deployment/deployment.json
/usr/bin/git commit -am"automated export"
/usr/bin/git pull
/usr/bin/git push origin ${BUILD_CODE_BRANCH}

# fetch and pull submodules
cd ${DEPLOYMENT_DIRECTORY}/MATScommon
/usr/bin/git fetch
/usr/bin/git checkout ${BUILD_CODE_BRANCH}
/usr/bin/git pull

cd ${DEPLOYMENT_DIRECTORY}/METexpress
/usr/bin/git fetch
/usr/bin/git checkout ${BUILD_CODE_BRANCH}
/usr/bin/git pull

cd ${currdir}

git add ${DEPLOYMENT_DIRECTORY}/MATScommon
git commit -m"automated export for submodule reference"
/usr/bin/git pull
/usr/bin/git push origin ${BUILD_CODE_BRANCH}

# build all the apps
i=0
for app in ${apps[*]}; do
    (buildApp ${app})&
    pids[${i}]=$!
    i=$((i+1))
    if [ ${#apps[@]} -gt 1 ]; then
      sleep 60
    fi
done

# write out pidlist
echo ${pids[*]} > /tmp/mats_build_pidlist
# wait for all pids
for pid in ${pids[*]}; do
    wait $pid
done

# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*
rm -rf /tmp/mats_build_pidlist
echo -e "$0 ----------------- finished $(/bin/date +%F_%T)"
exit 0
