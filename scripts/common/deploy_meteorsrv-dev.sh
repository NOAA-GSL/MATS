#!/bin/bash
# 
if [[ $USER != "www-data" ]]; then 
		echo "This script must be run as www-data!" 
		exit 1
	fi 

requestedApp="$1"

logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

echo "$0 ----------- started"
date
#deploy apps
cd /web
find /builds/*.tar.gz 2>/dev/null | while read x
do
    # test for requested app, if not requested skip
    if  [ $#  -eq 1 ] && [ ! "$x" ==  "/builds/${requestedApp}.tar.gz" ]; then
        continue
    fi
    # processing the app
	echo "processing $x"
	appname=`basename $x | cut -f1 -d"."`
	echo "appname $appname"
    # if existing, rm previous and move existing app to previous, be sure to change its title
	if [ -d "$appname" ]; then
		if [ -d "$appname"-previous ]; then
			rm -rf "$appname"-previous
		fi
		mv $appname "$appname"-previous
		sed 's/$/-previous/' "$appname"-previous/bundle/programs/web.browser/app/title > /tmp/title$$
		mv /tmp/title$$ "$appname"-previous/bundle/programs/web.browser/app/title
	fi
	mkdir $appname
	cd $appname
	tar -xzf $x
	cd bundle
	(cd programs/server && meteor npm install)
	cd ../..
done
date
echo "$0 ----------------- finished" 
