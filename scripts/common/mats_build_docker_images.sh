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

usage="USAGE $0 -e dev|int [-a][-r appReference][-t tag] [-b branch] \n\
	where -a is force build all apps, -b branch lets you override the assigned branch\n\
	appReference is build only requested appReferences (like upperair ceiling), \n\
	default is build changed apps, and e is build environment"
requestedApp=""
requestedTag=""
requestedBranch=""
tag=""
build_env=""
while getopts "ar:e:t:b:" o; do
    case "${o}" in
        t)
            tag=${OPTARG}
            requestedTag="tags/${tag} -b ${tag} "
            requestedApp=($(echo ${requestedTag} | cut -f1 -d'-'))
        ;;
        a)
        #all apps
            requestedApp="all"
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
if [ "X${requestedBranch}" != "X" ]; then
    echo -e "overriding git branch with ${requestedBranch}"
    BUILD_CODE_BRANCH=${requestedBranch}
fi
echo "Building Mats apps - environment is ${build_env} requestedApps ${requestedApp[@]} requestedTag is ${requestedTag}: $(/bin/date +%F_%T)"
# Environment vars are set from the appProduction databse. Example for int....
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
if [ "X${requestedTag}" == "X" ]; then
    /usr/bin/git  rev-parse ${tag}
    if [ $? -ne 0  ]; then
        echo -e ${failed} You requested a tag that does not exist ${tag} - can not continue
        echo These tags exist...
        /usr/bin/git show-ref --tags
        exit 1
    fi
fi

if [ "X${requestedTag}" == "X" ]; then
     echo "building to current head ${currentCommit}"
else
     echo "building to ${requestedTag}"
    /usr/bin/git checkout ${requestedTag} ${BUILD_CODE_BRANCH}
    if [ $? -ne 0 ]; then
        echo -e "${failed} to /usr/bin/git checkout ${BUILD_CODE_BRANCH} - must exit now"
        exit 1
    fi
fi



#build all of the apps that have changes (or if a meteor_package change just all the apps)
buildableApps=( $(getBuildableAppsForServer "${SERVER}") )
echo -e buildable apps are.... ${GRN}${buildableApps[*]} ${NC}
diffOut=$(/usr/bin/git --no-pager diff --name-only ${currentCommit}...${newCommit})
ret=$?
if [ $ret -ne 0 ]; then
    echo -e "${failed} to '/usr/bin/git --no-pager diff --name-only ${currentCommit}...${newCommit}' ... ret $ret - must exit now"
    exit 1
fi

diffs=$(echo $diffOut | grep -v 'appProductionStatus')
ret=$?
if [ "X${requestedApp}" == "X" -a ${ret} -ne 0 ]; then
    echo -e "${failed} no modified apps to build - ret $ret - must exit now"
    exit 1
fi
changedApps=( $(echo -e ${diffs} | grep apps | cut -f2 -d'/') )
echo -e changedApps are ${GRN}${changedApps}${NC}
meteor_package_changed=$(echo -e ${diffs} | grep meteor_packages | cut -f2 -d'/')

if [ "${build_env}" == "int" ]; then
    cv=$(date +%Y.%m.%d)
    echo -e "${GRN}setting build date to $cv for /builds/buildArea/MATS_for_EMB/meteor_packages/mats-common/public/MATSReleaseNotes.html${NC}"
    /usr/bin/sed -i -e "s/\(<x-bd>\).*\(<\/x-bd>\)/$cv/g" /builds/buildArea/MATS_for_EMB/meteor_packages/mats-common/public/MATSReleaseNotes.html
    git commit -m "Build automatically updated release notes" /builds/buildArea/MATS_for_EMB/meteor_packages/mats-common/public/MATSReleaseNotes.html
    git push
fi

unset apps
if [ "X${requestedApp}" != "X" ]; then
    if [ "${requestedApp}" == "all" ]; then
        apps=( ${buildableApps[@]} )
    else
        apps=( ${requestedApp[@]} )
    fi
else
    if [ "X${meteor_package_changed}" != "X" ]; then
        # common code changed so we have to build all the apps
        echo -e common code changed - must build all buildable apps
        apps=${buildableApps}
    else
        # no common code changes do just build apps
        l2=" ${changedApps[*]} "
        for a in ${buildableApps[*]}; do
            if [[ $l2 =~ " $a " ]]; then
                apps+=( $a )
            fi
        done
        echo -e modified and buildable apps are ${GRN}${apps[*]}${NC}
    fi
fi
if [ "X${apps}" == "X" ]; then
    echo -e ${RED}no apps to build - exiting${NC}
    exit 1
fi

# go ahead and merge changes
/usr/bin/git pull
if [ $? -ne 0 ]; then
    echo -e "${failed} to do git pull - must exit now"
    exit 1
fi
export METEOR_PACKAGE_DIRS=`find $PWD -name meteor_packages`
cd ${DEPLOYMENT_DIRECTORY}/apps
echo -e "$0 building these apps ${GRN}${apps[*]}${NC}"
for app in ${apps[*]}; do
    cd $app
    echo -e "$0 - building app ${GRN}${app}${NC}"
    /usr/local/bin/meteor reset
    /usr/local/bin/meteor npm install --production
# UNCOMMENT THIS WHEN WE ARE ONLY DOING NIGHTLY DOCKER container BUILDS i.e. we abandon the server builds
#    if [ "${DEPLOYMENT_ENVIRONMENT}" == "development" ]; then
#        rollDevelopmentVersionAndDateForAppForServer ${app} ${SERVER}
#    else
#        if [ "${DEPLOYMENT_ENVIRONMENT}" == "integration" ]; then
#            rollIntegrationVersionAndDateForAppForServer ${app} ${SERVER}
#        fi
#    fi
    exportCollections ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    /usr/bin/git commit -m"automated export" ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    cat ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections/deployment.json |
            ${DEPLOYMENT_DIRECTORY}/scripts/common/makeCollectionExportValid.pl > ${DEPLOYMENT_DIRECTORY}/meteor_packages/mats-common/public/deployment/deployment.json
    /usr/bin/git commit -m"automated export" ${DEPLOYMENT_DIRECTORY}/meteor_packages/mats-common/public/deployment/deployment.json
    git push origin ${BUILD_CODE_BRANCH}

    BUNDLE_DIRECTORY=/builds/deployments/${app}
    rm -rf ${BUNDLE_DIRECTORY}
    /usr/local/bin/meteor build --directory ${BUNDLE_DIRECTORY} --server-only --architecture=os.linux.x86_64
    if [ $? -ne 0 ]; then
        echo -e "${failed} to meteor build - must exit now"
        exit 1
    fi
    buildVer=$(getVersionForAppForServer ${app} ${SERVER})
    git tag -a -m"automated build ${DEPLOYMENT_ENVIRONMENT}" "${app}-${buildVer}"
    git push origin +${tag}:${BUILD_CODE_BRANCH}
    echo -e tagged repo with ${GRN}${tag}${NC}

    # build container....
    echo "building container in ${BUNDLE_DIRECTORY}"
    APP_DIRECTORY=`pwd`
    cd ${BUNDLE_DIRECTORY}
    # stop the container if it is running
    docker stop ${REPO}:${TAG} || true && docker rm ${REPO}:${TAG} || true
    # prune all stopped containers
    docker container prune -f
    # Create the Dockerfile
    echo "=> Creating Dockerfile..."
    export METEORD_DIR=/opt/meteord
    export MONGO_URL="mongodb://mongo"
    export MONGO_PORT=27017
    export MONGO_DB=${app}
    export APPNAME=${app}
    export REPO=randytpierce/mats1
    # save and export the meteor node version for the build_app script
    export METEOR_NODE_VERSION=$(meteor node -v | tr -d 'v')
    export METEOR_NPM_VERSION=$(meteor npm -v)
    export TAG="${app}-${build_env}-${buildVer}"
    cp ${METEOR_PACKAGE_DIRS}/../scripts/common/docker_scripts/run_app.sh  .
    chmod +x run_app.sh
    #NOTE do not change the tabs to spaces in the here doc - it screws up the indentation
cat <<-%EOFdockerfile > Dockerfile
# have to mount meteor settings as usr/app/settings/${APPNAME} - so that settings.json can get picked up by run_app.sh
# the corresponding usr/app/settings/${APPNAME}/settings-mysql.cnf file needs to be referenced by
# "MYSQL_CONF_PATH": "/usr/app/settings/${APPNAME}/settings-mysql.cnf" in the settings.json file
# and the MYSQL_CONF_PATH entry in the settings.json
# e.g.
# docker run -v /Users/pierce/mats_app_configuration/settings:/usr/app/settings -i -t randytpierce/mats1:${APPNAME}-2.0.1
# Pull base image.
FROM node:8.11.4-alpine
# Create app directory
ENV METEOR_NODE_VERSION=8.11.4 APPNAME="${APPNAME}" METEORD_DIR="/opt/meteord"
RUN mkdir -p /usr/app
WORKDIR /usr/app
RUN apk --update --no-cache add make gcc g++ python python3 python3-dev mariadb-dev bash && \\
    npm install -g npm@6.4.1 && \\
    npm cache clean -f && \\
    npm install -g n && \\
    npm install -g node-gyp && \\
    node-gyp install && \\
    python3 -m ensurepip && \\
    pip3 install --upgrade pip setuptools && \\
    pip3 install numpy && \\
    pip3 install mysqlclient
ADD bundle /usr/app
COPY run_app.sh /usr/app
RUN chmod +x /usr/app/run_app.sh
RUN cd /usr/app/programs/server && npm install --production
RUN apk del --purge  make gcc g++ bash && npm uninstall -g node-gyp
RUN rm -rf /opt/meteord/bin /usr/share/doc /usr/share/man /tmp/* /var/cache/apk/* /usr/share/man /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp rm -r /root/.cache
ENV APPNAME=${APPNAME}
ENV MONGO_URL=mongodb://mongo:27017/${APPNAME}
ENV ROOT_URL=http://localhost:80/
EXPOSE 80
ENTRYPOINT ["/usr/app/run_app.sh"]

    # build container
        #docker build --no-cache --rm -t randytpierce/mats1:${APPNAME}-2.0.1 .
        #docker tag randytpierce/mats1:${APPNAME}-2.0.1 randytpierce/mats1:${APPNAME}-2.0.1
        #docker push randytpierce/mats1:${APPNAME}-2.0.1
%EOFdockerfile
    # build container
    docker build --no-cache --rm -t ${REPO}:${TAG} .
    docker tag ${REPO}:${TAG} ${REPO}:${TAG}
    #docker push ${REPO}:${TAG}
    # example run command
    echo "to run ... docker run --name ${APP_NAME} -d -p 3002:80 --net mynet -v ${HOME}/mats_app_configuration/settings:/usr/app/settings -i -t ${REPO}:${TAG}"
    echo "created container in ${BUNDLE_DIRECTORY}"
    rm -rf bundle
    cd ${APP_DIRECTORY}
    cd ..
done

# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*
echo -e "$0 ----------------- finished $(/bin/date +%F_%T)"
exit 0
