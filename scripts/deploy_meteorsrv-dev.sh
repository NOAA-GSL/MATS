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
git clone --depth 1 /builds /tmp/tmpbuilds
if [[ ! -d "/tmp/tmpbuilds" ]]; then
	echo "failed to git clone --depth 1 /builds /tmp/tmpbuilds"
	echo exiting
	exit 1
fi
	
#deploy apps
cd /web
find /tmp/tmpbuilds -maxdepth 1 -type f -not -path "/tmp/tmpbuilds" -name "*.gz" 2>/dev/null | while read x
do
	appname=`basename $x | cut -f1 -d"."`
	if [ -d "$x" ]; then
		mv $appname $appname"-previous"
	fi
	mkdir $appname
	cd $apname
	tar -xzf $x
	cd bundle
	(cd programs/server && npm install)
	cd ../..
done	
echo rm -rf /tmp/tmpbuilds

date
echo "$0 ----------------- finished" 
