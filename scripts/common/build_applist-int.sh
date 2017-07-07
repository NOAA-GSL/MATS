#!/bin/bash
# 
if [[ $USER != "www-data" ]]; then 
		echo "This script must be run as www-data!" 
		exit 1
	fi 

logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

echo "$0 ----------- started"
date
cd /web 
# build the applist.json file
applistFile=`mktemp`
echo  "[" >> $applistFile
appCount=0
find . -maxdepth 1  -type d  -not -path '*/\.*' -not -path "." -not -path "./static" -not -path "./tmp" -not -path "./example*" -not -path "./bundle" -not -path "./node_modules" -exec basename {} \; | while read appName
do
        if [ "$appCount" -gt 0 ]; then
                echo "," >> $applistFile
        fi
        titleFile="./$appName/bundle/programs/web.browser/app/title"
        if [ -f $titleFile ]; then
                displayName=`cat $titleFile`
        else
                displayName="$appName"
        fi
	echo "adding app: $appName  displayName $displayName"
        echo -e "\t{" >> $applistFile 
                echo -e '\t\t"app":"'$appName'",' >> $applistFile
                echo -e '\t\t"displayName":"'$displayName'"' >> $applistFile
        echo -ne "\t}" >> $applistFile
        (( appCount += 1 ))
done
echo >> $applistFile
echo ']' >> $applistFile
mv $applistFile static/applist.json
chmod a+r static/applist.json
date
echo "$0 ----------------- finished" 
