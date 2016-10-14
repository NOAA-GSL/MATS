#!/usr/bin/bash
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
 
#git the builds top version
if [[ ! -d "/tmp/tmpbuilds" ]]; then
	mkdir -p /tmp/tmpbuilds
	chmod 777 /tmp/tmpbuilds
fi

rm -rf /tmp/tmpbuilds/*
cp /builds/*.tar.gz /tmp/tmpbuilds
if [[ ! -d "/tmp/tmpbuilds" ]]; then
	echo "failed to  copy /builds to /tmp/tmpbuilds"
	echo exiting
	exit 1
fi
	
#deploy apps
cd /web
find /tmp/tmpbuilds -maxdepth 1 -type f -not -path "/tmp/tmpbuilds" -name "*.gz" 2>/dev/null | while read x
do
    if  [ $#  -eq 1 ] && [ ! "$x" ==  "/tmp/tmpbuilds/${requestedApp}.tar.gz" ]; then
        continue
    fi
	echo "processing $x"
	appname=`basename $x | cut -f1 -d"."`
	echo "appname $appname"
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
	(cd programs/server && npm install)
	tar czf /builds/deployments/"$appname"-dply.tar.gz .
	cd ../..
done	
echo rm -rf /tmp/tmpbuilds
cd /builds/deployments
buildDate=`date | tr ':' '-' | tr ' ' '_'`
git commit -a -m "deployed on $buildDate"
date
echo "$0 ----------------- finished" 
