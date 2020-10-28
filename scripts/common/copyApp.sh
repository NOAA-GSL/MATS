#!/usr/bin/env bash
# 
# Used to copy an existingApp MATS application to another name.
#logDir="/builds/buildArea/logs"
logDir="~/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
#exec > >(tee -i $logname)
#exec 2>&1

echo "$0 ----------- started"
date

usage="$0 [--help || existing_app_name new_app_name]"

existingApp=$1
new=$2


if [ "$1" == "--help" ]; then
        cat <<xxxxxENDxxxx
        This program will duplicate a MATS application and name it with the supplied new name.
        The process consists of copying the existing application to the new name and making a few substitutions in a few key files.
        The new application should function exactly like the existing one except that the title and a few other 
        miscellaneous things will reflect the new name.
        
\        Example....
        $0 exampleApp newApp
\        You should always do a manual compare (use compare or diffmerge or some folder level tool) to make sure things are correct
        before commiting duplicated apps. Do something like...
        kompare apps/originalApp apps/newApp or diffmerge apps/originalApp apps/newApp
        and
        kompare meteor_packages/originalApp meteor_packages/newApp or diffmerge meteor_packages/originalApp meteor_packages/newApp
xxxxxENDxxxx
        exit 0
fi


{
        tdir=$(mktemp -d 2>/dev/null || mktemp -d -t 'mytmpdir')
        #echo "using temporary dir $tdir"
} || {
        echo "ERROR: unable to create temporary directory - must exit"
        exit 1
}


# always blow away the temp dir
trap '#echo "removing temp dir $tdir";rm -rf $tdir' EXIT

if [ "$#" -ne 2 ]; then
    echo "ERROR: Illegal number of parameters: need 2: usage: $usage"
    echo "exiting"
    exit 1
fi

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

# does existingApp really exist
if [ ! -d "apps/$existingApp" ]; then
    echo "ERROR: $existingApp app does not exist: usage: $usage"
    echo "these apps currently exist..."
    ls -1 apps
    echo "exiting"
    exit 1
fi

# does new app exist?
# does new really exist
if [ -d "apps/$new" ]; then
    echo "ERROR: $new app already exists: usage: $usage"
    echo "these apps currently exist..."
    ls -1 apps
    echo "exiting"
    exit 1
fi

echo "Creating app! $new as a duplicate of $existingApp"

cp -a apps/$existingApp apps/$new
if [ "$?" -ne 0 ]; then
    echo "ERROR: app copy failed: usage: $usage"
    rm -f apps/$new
    echo "exiting"
    exit 1
fi


replace_appname_reference () {
        {
                filepath=$1
                bname=$(basename $1)
                tname="$tdir/$bname"
                sed "s#$existingApp#$new#g" $filepath > $tname
                mv $tname $filepath
        } || {
                echo "Error replacing $existingApp with $new in $filepath"
                return 1
        }
        return 0

}

replace_custom () {
        {
                filepath=$1
                replaceTarget=$2
                replaceWith=$3
                bname=$(basename $1)
                tname="$tdir/$bname"
                sed "s#$replaceTarget#$replaceWith#g" $filepath > $tname
                mv $tname $filepath
        } || {
                echo "Error replacing $replaceTarget with $replaceWith in $filepath"
                return 1
        }
        return 0
}

{
        cd apps/$new
        meteor reset
        if [ "$?" -ne 0 ]; then
            echo "ERROR: 'meteor reset' did not run: Do you meteor installed? Is it in your path?"
            echo "your app $new may have problems. Better check it"
        fi

        #replace_appname_reference "."
        replace_custom ".idea/modules.xml" ".idea/$existingApp" ".idea/$new"
        replace_appname_reference ".idea/.name"
} || {
        echo "ERROR: error making substitutions"
        exit 1
}

echo "Completed duplicating app $existingApp to $new"
echo "You should do a manual compare (use compare or diffmerge or some folder level tool) to make sure things are correct before commiting duplicated apps."
echo "kompare apps/$existingApp apps/$new, and kompare meteor_packages/$existingApp meteor_packages/$new"
echo " or diffmerge apps/$existingApp apps/$new, and diffmerge meteor_packages/$existingApp meteor_packages/$new"
echo "$0 ----------- finished"
date
exit 0


