#!/usr/bin/bash
# 
if [[ $USER != "www-data" ]]; then 
		echo "This script must be run as www-data!" 
		exit 1
	fi 

logname=`echo $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

echo "$0 ----------- started"
date
 
#git the builds top version
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
	echo "processing $x"
	appname=`basename $x | cut -f1 -d"."`
	echo "appname $appname"
	if [ -d "$appname" ]; then
		mv $appname "$appname"-previous
	fi
	mkdir $appname
	cd $appname
	tar -xzf $x
	cd bundle
	(cd programs/server && npm install)
	cd ../..
done	
echo rm -rf /tmp/tmpbuilds

date
echo "$0 ----------------- finished" 
