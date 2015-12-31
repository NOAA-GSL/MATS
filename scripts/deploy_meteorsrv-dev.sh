#!/usr/bin/bash
# 
if [[ $USER != "www-data" ]]; then 
		echo "This script must be run as www-data!" 
		exit 1
	fi 

logname="/builds/deploy_meteorsrv-dev.log"
touch $logname
exec > >(tee -i $logname)
exec 2>&1

echo "$0 ----------- started"
date
 
#deploy apps
cd /web
find /builds -maxdepth 1 -type f -not -path "/builds" -name "*.gz" 2>/dev/null | while read x
do
	appName=`basename $x | cut -f1 -d'.'`
	if [[ -d $appName ]]; then
		echo "$appName exists - moving it to $appName"-previous
		rm -rf "$appName"-previous 2>/dev/null
		mv $appName "$appName"-previous
	fi
	mkdir $appName
	cd $appName
	tar -xzf $x
	cd bundle
	(cd programs/server && npm install)
	cd ../..
done	
date
echo "$0 ----------------- finished" 
