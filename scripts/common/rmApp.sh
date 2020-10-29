#!/usr/bin/env bash
# 
# Used to remove an existing MATS application.

logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1
echo "$0 ----------- started"
date

usage="$0 [--help || existing_app_name]"

if [ "$1" == "--help" ]; then
        cat <<xxxxxENDxxxx
        This program will remove an existing MATS application.
        
        The process consists of removing the existing application app and associated package.
xxxxxENDxxxx
        exit 0
fi


if [ "$#" -ne 1 ]; then
    echo "ERROR: Illegal number of parameters: need 1: usage: $usage"
    echo "exiting"
    exit 1
fi

existing=$1

#test current dir is MATS
remote_origin=`/usr/bin/git config --get remote.origin.url`
if [ "$remote_origin" != "git@github.com:NOAA-GSL/MATS.git" ]; then
    echo "ERROR: You do not appear to be in a 'git@github.com:NOAA-GSL/MATS.git' clone"
    echo "try 'git clone git@github.com:NOAA-GSL/MATS.git'"
    echo "usage: $usage"
    echo "exiting"
    exit 1
fi

currentDir=`pwd`
topLevel=`/usr/bin/git rev-parse --show-toplevel`

if [ "$currentDir" != "$topLevel" ]; then
    echo "ERROR: Not in the top level of the repository: usage: $usage"
    echo "You must cd to the top level of the repository: $topLevel"
    echo "exiting"
    exit 1
fi


# does existing really exist
if [ ! -d "apps/$existing" ]; then
    echo "ERROR: $existing app does not exist: usage: $usage"
    echo "these apps currently exist..."
    ls -1 apps
    echo "exiting"
    exit 1
fi

echo "Deleting app $existing"

rm -rf apps/$existing
if [ "$?" -ne 0 ]; then
    echo "ERROR: delete app failed: usage: $usage"
    echo "exiting"
    exit 1
fi

rm -rf meteor_packages/$existing
if [ "$?" -ne 0 ]; then
    echo "ERROR: delete package failed: usage: $usage"
    echo "exiting"
    exit 1
fi
echo "Completed deleting app $existing"
date
echo "$0 ----------- finished"
exit 0


