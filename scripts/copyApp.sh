#!/bin/sh
# 
# Used to copy an existingApp MATS application to another name.
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

echo "$0 ----------- started"
date

usage="$0 [--help || existing_app_name new_app_name meteorId]"

existingApp=$1
new=$2
meteor_user_id=$3


if [ "$1" == "--help" ]; then
        cat <<xxxxxENDxxxx
        This program will duplicate a MATS application and name it with the supplied new name.
        There is a required meteor userid. A MATS application consists of two basic pieces...
                1) the app itself which is contained in the apps MATS/apps directory.... and
                2) the associated application package which is a local meteor package associated with the application.
        By convention meteor packages (even local ones) need to be named meteorid:packagename, this
        is why there is a required meteor userid.
        
        The process consists of copying the existing application to the new name and copying the existing application
        package to the new package name, and making a few substitutions in a few key files.
        The new application should function exactly like the existing one except that the title and a few other 
        miscellaneous things will reflect the new name.
        
        If you want a relatively naive MATS app you can duplicate the exampleApp app.
        Example....
        $0 exampleApp newApp yourmeteorid
        which will create a new app named newApp that  has simple selectors and only produces a simple graph.
        You should always do a manual compare (use compare or diffmerge or some folder level tool) to make sure things are correct
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

if [ "$#" -ne 3 ]; then
    echo "ERROR: Illegal number of parameters: need 3: usage: $usage"
    echo "exiting"
    exit 1
fi

#check id is not empty
if [ "x$meteor_user_id" == "x" ]; then
    echo "ERROR: You did not provide a meteor id"
    echo "see 'www.meteor.com' and create an id (click sign in)"
    echo "usage: $usage"
    echo "exiting"
    exit 1
fi


#Package names can only contain lowercase ASCII alphanumerics, dash, dot, or colon
if [[ ! $new =~ ^[a-z0-9:.-]+$ ]]; then
	echo "Package names can only contain lowercase ASCII alphanumerics, dash, dot, or colon $new does not conform"
	echo "must exit now - choose another name"
	exit 1
fi

#test current dir is MATS_FOR_EMB
remote_origin=`git config --get remote.origin.url`
if [ "$remote_origin" != "gerrit:MATS_for_EMB" ]; then
    echo "ERROR: You do not appear to be in a 'gerrit:MATS_for_EMB' clone"
    echo "try 'git clone gerrit:MATS_for_EMB MATS_for_EMB'"
    echo "usage: $usage"
    echo "exiting"
    exit 1
fi

currentDir=`pwd`
topLevel=`git rev-parse --show-toplevel`

if [ "$currentDir" != "$topLevel" ]; then
    echo "ERROR: Not in the top level of the repository: usage: $usage"
    echo "You must cd to the top level of the repository: $topLevel"
    echo "exiting"
    exit 1
fi

existingId=`grep 'name\s*:' meteor_packages/$existingApp/package.js 2>/dev/null | cut -d':' -f2 | sed -e "s/'//g" | sed -e 's/"//g' | sed -e 's/ //g'`


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

cp -a meteor_packages/$existingApp meteor_packages/$new
if [ "$?" -ne 0 ]; then
    echo "ERROR: app package copy failed: usage: $usage"
    rm -f apps/$new
    rm -f meteor_package/$new
    echo "exiting"
    exit 1
fi

replace_meteorid_appname_reference () {
        {
            findDir=$1
            for filepath in $(grep -rl $existingId:$existingApp $findDir)
                do
                    bname=$(basename $filepath)
                    tname="$tdir/$bname"
                    sed  "s/$existingId:$existingApp/$meteor_user_id:$new/g" $filepath > $tname
                    mv $tname $filepath
                done
        } || {
                echo "Error replacing $existingId:$existingApp with $meteor_user_id:$new in $filepath"
                return 1
        }
        return 0
} 

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
        #replace all mid:appName occurances like xwei:surface
        replace_meteorid_appname_reference "$currentDir/apps/$new"
        replace_meteorid_appname_reference "$currentDir/meteor_packages/$new"

        replace_custom ".idea/modules.xml" ".idea/$existingApp" ".idea/$new"
        replace_appname_reference ".idea/.name"
        newWithCapital="$(tr '[:lower:]' '[:upper:]' <<< ${new:0:1})${new:1}"
        replace_custom "$currentDir/meteor_packages/$new/app-startup.js" "Title:.*," "Title: \"$newWithCapital\","
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


