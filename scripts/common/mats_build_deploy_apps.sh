#!/usr/bin/env bash
# This script builds and deploys an app, optionally takes the bundle that was already built and adds a dockerfile
# and then builds the image from an appropriate node image that corresponds to the node verwsion of the app.
#
# source the build environment and mongo utilities
. /builds/buildArea/MATS_for_EMB/scripts/common/app_production_utilities.source


# source the credentials for the matsapps account
. ~/.matsapps_credentials

# assign all the top level environment values from the build configuration to shell variables
# set up logging
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >( tee -i $logname )
exec 2>&1

usage="USAGE $0 -e dev|int [-a][-r appReference][-t tag] [-i] [-l (local images only - do not push)]  [-b branch] \n\
	where -a is force build all apps, -b branch lets you override the assigned branch (feature build)\n\
	appReference is build only requested appReferences (like upperair ceiling), \n\
	default is build changed apps, e is build environment (dev or int), and i is build images also"
requestedApp=""
requestedTag=""
requestedBranch=""
tag=""
build_env=""
pushImage="yes"
build_images="no"
deploy_build="yes"
WEB_DEPLOY_DIRECTORY="/web"
while getopts "alir:e:t:b:" o; do
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
        i)
        # build images also
            build_images="yes"
            ;;
        l)
            pushImage="no"
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
export buildCodeBranch=$(git rev-parse --abbrev-ref HEAD)
export currentCodeCommit=$(git rev-parse --short HEAD)
if [ $? -ne 0 ]; then
    echo -e "${failed} to git the current HEAD commit - must exit now"
    exit 1
fi
/usr/bin/git pull -Xtheirs
if [ $? -ne 0 ]; then
    echo -e "${failed} to do git pull - must exit now"
    exit 1
fi

if [ $? -ne 0 ]; then
    echo -e "${failed} to /usr/bin/git fetch - must exit now"
    exit 1
fi
newCommit=$(git rev-parse --short HEAD)
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
echo **checking for changes with  *** /usr/bin/git --no-pager diff --name-only ${currentCodeCommit}...${newCodeCommit}***
diffOut=$(/usr/bin/git --no-pager diff --name-only ${currentCodeCommit}...${newCodeCommit})
echo changes are $diffOut
ret=$?
if [ $ret -ne 0 ]; then
    echo -e "${failed} to '/usr/bin/git --no-pager diff --name-only ${currentCodeCommit}...${newCodeCommit}' ... ret $ret - must exit now"
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
    /usr/bin/git pull
    /usr/bin/git push
fi

if [ "${build_images}" == "yes" ] && [ "${requestedApp}" == "all" ]; then
    # clean up and remove existing images images
    docker system prune -af
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
APP_DIRECTORY=${DEPLOYMENT_DIRECTORY}/apps
cd ${APP_DIRECTORY}
echo -e "$0 building these apps ${GRN}${apps[*]}${NC}"
for app in ${apps[*]}; do
    cd ${APP_DIRECTORY}/${app}
    echo -e "$0 - building app ${GRN}${app}${NC}"
    rm -rf ./bundle
    /usr/local/bin/meteor reset
    if [ "${DEPLOYMENT_ENVIRONMENT}" == "development" ]; then
        rollDevelopmentVersionAndDateForAppForServer ${app} ${SERVER}
#    else
#        if [ "${DEPLOYMENT_ENVIRONMENT}" == "integration" ]; then
#            rollIntegrationVersionAndDateForAppForServer ${app} ${SERVER}
#        fi
    fi
    exportCollections ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    /usr/bin/git commit -m"automated export" ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    cat ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections/deployment.json |
            ${DEPLOYMENT_DIRECTORY}/scripts/common/makeCollectionExportValid.pl > ${DEPLOYMENT_DIRECTORY}/meteor_packages/mats-common/public/deployment/deployment.json
    /usr/bin/git commit -m"automated export" ${DEPLOYMENT_DIRECTORY}/meteor_packages/mats-common/public/deployment/deployment.json
    /usr/bin/git pull
    git push origin ${BUILD_CODE_BRANCH}

    BUNDLE_DIRECTORY=/builds/deployments/${app}
    if [ ! -d "${BUNDLE_DIRECTORY}" ]; then
        mkdir -p ${BUNDLE_DIRECTORY}
    else
        rm -rf ${BUNDLE_DIRECTORY}/*
    fi
    # do not know why I have to do these explicitly, but I do.
    /usr/local/bin/meteor npm install --save @babel/runtime
    /usr/local/bin/meteor npm install --save bootstrap

    /usr/local/bin/meteor build --directory ${BUNDLE_DIRECTORY} --server-only --architecture=os.linux.x86_64
    if [ $? -ne 0 ]; then
        echo -e "${RED} ${failed} to meteor build - must skip app ${app} ${NC}"
        continue
    fi

    cd ${BUNDLE_DIRECTORY}
    (cd bundle/programs/server && /usr/local/bin/meteor npm install)

    if [[ "${deploy_build}" == "yes" ]]; then
        if [ ! -d "${WEB_DEPLOY_DIRECTORY}" ]; then
            echo -e "${RED} Cannot deploy ${app} to missing directory: ${WEB_DEPLOY_DIRECTORY} ${NC}"
        else
            if [ ! -d "${WEB_DEPLOY_DIRECTORY}/${app}" ]; then
                mkdir ${WEB_DEPLOY_DIRECTORY}/${app}
            else
                rm -rf ${WEB_DEPLOY_DIRECTORY}/${app}/*
            fi
            cp -a * /web/${app}
        fi
    fi

    if [[ "${build_images}" == "yes" ]]; then
        echo -e "Building image for ${app}"
        buildVer=$(getVersionForAppForServer ${app} ${SERVER})
        echo git tag -a -m"automated build ${DEPLOYMENT_ENVIRONMENT}" "${app}-${buildVer}"
        echo git push origin +${tag}:${BUILD_CODE_BRANCH}
        echo -e tagged repo with ${GRN}${tag}${NC}

        # build container....
        export METEORD_DIR=/opt/meteord
        export MONGO_URL="mongodb://mongo"
        export MONGO_PORT=27017
        export MONGO_DB=${app}
        export APPNAME=${app}
        export TAG="${app}-${buildVer}"
        export REPO=matsapps/production
        if [[ ${build_env} == "int" ]]; then
            REPO="matsapps/integration"
        else if [[ ${build_env} == "dev" ]]; then
            REPO="matsapps/development"
            TAG="${app}-nightly"
        fi
        fi
        echo "building container in ${BUNDLE_DIRECTORY}"
        # stop the container if it is running
        docker stop ${REPO}:${TAG}
        # Create the Dockerfile
        echo "=> Creating Dockerfile..."
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
LABEL version="${buildVer}" code.branch="${buildCodeBranch}" code.commit="${newCodecommit}"
    # build container
        #docker build --no-cache --rm -t ${REPO}:${APPNAME}-${buildVer} .
        #docker tag ${REPO}:${APPNAME}-${buildVer} ${REPO}:${APPNAME}-${buildVer}
        #docker push ${REPO}:${APPNAME}-${buildVer}
%EOFdockerfile
        # stop any running containers....
        docker rm $(docker ps -a -q)
#        # clean up old images
#        docker system prune -af
        # build container
        docker build --no-cache --rm -t ${REPO}:${TAG} .
        docker tag ${REPO}:${TAG} ${REPO}:${TAG}
        if [ "${pushImage}" == "yes" ]; then
            echo ${matsapps_password} | docker login -u ${matsapps_user} --password-stdin
            echo "pushing image ${REPO}:${TAG}"
            docker push ${REPO}:${TAG}
        else
            echo "NOT pushing image ${REPO}:${TAG}"
        fi
        # example run command
        echo "to run ... docker run --name ${APPNAME} -d -p 3002:80 --net mynet -v ${HOME}/[mats|metexpress]_app_configuration/settings:/usr/app/settings -i -t ${REPO}:${TAG}"
        echo "created container in ${BUNDLE_DIRECTORY}"
    fi
    rm -rf ${BUNDLE_DIRECTORY}/*
done

# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*

# build the applist.json
if [[ "${deploy_build}" == "yes" ]]; then
    if [ ! -d "${WEB_DEPLOY_DIRECTORY}" ]; then
        echo -e "${RED} Cannot deploy applist to missing directory: ${WEB_DEPLOY_DIRECTORY} ${NC}"
    else
        if [ ! -d "${WEB_DEPLOY_DIRECTORY}/static" ]; then
            mkdir ${WEB_DEPLOY_DIRECTORY}/static
        fi
        applistFile=`mktemp`
        echo $(getApplistJSONForServer ${SERVER}) > $applistFile
        mv $applistFile ${WEB_DEPLOY_DIRECTORY}/static/applist.json
        chmod a+r ${WEB_DEPLOY_DIRECTORY}/static/applist.json
        echo -e "$0 trigger nginx restart"
        /bin/touch /builds/restart_nginx
    fi
fi

echo -e "$0 ----------------- finished $(/bin/date +%F_%T)"

exit 0
