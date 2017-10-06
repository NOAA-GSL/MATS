#!/usr/bin/env bash

# source the build environment and mongo utilities
. /builds/buildArea/MATS_for_EMB/scripts/common/mongo_utilities.source
# assign all the top level environment valuse from the build configuration to shell variables
# set up logging
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >( tee -i $logname )
exec 2>&1

usage="$0 -e dev|int [-a][-r appReference][-t tag]  #where -a is force build all apps, r is build only requested appReferences (like upperair ceiling) default is build changed apps, and e is build environment"
requestedApp=""
requestedTag=""
tag=""
while getopts "ar:e:t:" o; do
    case "${o}" in
        t)
            tag=(${OPTARG})
            requestedTag="tags/${tag} -b"
            requestedApp=($(echo ${requestedTag} | cut -f1 -d'-'))
        ;;
        a)
        #all apps
            requestedApp="all"
        ;;
        r)
            requestedApp=(${OPTARG})
            echo -e "requsted apps ${requestedApp[@]}"
        ;;
        e)
            if [ "${OPTARG}" == "dev" ]; then
                setBuildConfigVarsForDevelopmentServer
            else
                if [ "${OPTARG}" == "int" ]; then
                    setBuildConfigVarsForIntegrationServer
                else
                    echo -e ${RED}invalid server ${OPTARG} - should be int or dev exiting${NC}
                    exit 1
                fi
            fi
        ;;
        *)
            usage
        ;;
    esac
done
shift $((OPTIND - 1))

date
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
if [ "X${requestedTag}" == "X" ]; then
    /usr/bin/git  rev-parse ${tag}
    if [ $? -ne 0  ]; then
        echo ${failed} You requested a tag that does not exist ${tag} - can not continue
        echo These tags exist...
        /usr/bin/git show-ref --tags
        exit 1
    fi
fi

/usr/bin/git fetch
if [ $? -ne 0 ]; then
    echo -e "${failed} to /usr/bin/git fetch - must exit now"
    exit 1
fi

/usr/bin/git checkout ${requestedTag} ${BUILD_CODE_BRANCH}
if [ $? -ne 0 ]; then
    echo -e "${failed} to /usr/bin/git checkout ${BUILD_CODE_BRANCH} - must exit now"
    exit 1
fi


#build all of the apps that have changes (or if a meteor_package change just all the apps)
buildableApps=( $(getBuildableAppsForServer "${SERVER}") )
echo -e buildable apps are.... ${GRN}${buildableApps[*]} ${NC}
diffOut=$(/usr/bin/git --no-pager diff --name-only origin/${BUILD_CODE_BRANCH})
ret=$?
if [ $ret -ne 0 ]; then
    echo -e "${failed} to /usr/bin/git diff - ret $ret - must exit now"
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

unset apps
if [ "X${requestedApp}" != "X" ]; then
    if [ "${requestedApp}" == "all" ]; then
        apps=${buildableApps}
    else
        apps=( "${requestedApp[@]}" )
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
    meteor reset
    meteor npm cache clean
    meteor npm install
    rollDevelopmentVersionAndDateForAppForServer ${app} ${SERVER}
    exportCollections ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    /usr/bin/git commit -m"automated export" ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections
    cat ${DEPLOYMENT_DIRECTORY}/appProductionStatusCollections/deployment.json |
            ${DEPLOYMENT_DIRECTORY}/scripts/common/makeCollectionExportValid.pl > ${DEPLOYMENT_DIRECTORY}/meteor_packages/mats-common/public/deployment/deployment.json
    meteor build /builds
    if [ $? -ne 0 ]; then
        echo -e "${failed} to meteor build - must exit now"
        exit 1
    fi
    buildVer=$(getVersionForAppForServer ${app} ${SERVER})
    git tag -a -m"automated build ${DEPLOYMENT_ENVIRONMENT}" "${app}-${buildVer}"
    git push origin ${tag}:
    echo -e tagged repo with ${GRN}${tag}${NC}
    cd ..
done

# clean up /tmp files
echo -e "cleaning up /tmp/npm-* files"
rm -rf /tmp/npm-*

# now deploy any newly built apps
echo deploying modified apps ${apps[*]}
cd /web
for app in ${apps[*]}; do
    echo "deploying ${GRN}$app${NC}"
    # if existing, rm previous and move existing app to previous, be sure to change its title
    if [ -d "$app" ]; then
        if [ -d "$app"-previous ]; then
            rm -rf "$app"-previous
        fi
        mv $app "$app"-previous
    fi
    mkdir $app
    cd $app
    tar -xzf "/builds/${app}.tar.gz"
    if [ $? -ne 0 ]; then
        echo -e "${failed} untar app /builds/${app}.tar.gz - must exit now"
        exit 1
    fi
    rm -rf "/builds/${app}.tar.gz"
    cd bundle
    (cd programs/server && meteor npm install)
    cd ../..
done

# build the applist.json
applistFile=`mktemp`
echo $(getApplistJSONForServer ${SERVER}) > $applistFile
mv $applistFile static/applist.json
chmod a+r static/applist.json


date
echo -e "$0 ----------------- finished"
exit 0
