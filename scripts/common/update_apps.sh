#!/bin/bash
#
logDir="/builds/buildArea/logs"
logname="$logDir/"`basename $0 | cut -f1 -d"."`.log
touch $logname
exec > >(tee -i $logname)
exec 2>&1

echo "$0 ----------- started"
date

if [ ! -d MATS_for_EMB ]; then
	echo "no MATS_for_EMB directory here - git clone gerrit:MATS_for_EMB"
	exit 1
fi

cd MATS_for_EMB/apps
export METEOR_PACKAGE_DIRS=`ls -rt -d -1 "$PWD"/../meteor_packages/`

# update all the apps
find . -maxdepth 1 -type d -not -path "." | while read app
    do
        cd $app;
        pwd;
        meteor update --all-packages;
        cd ..;
    done

# clean up meteor releases for all the apps
shopt -s nullglob
releases=(`find . -name release | while read r; do cat $r | cut -d'@' -f2 | uniq; done | uniq | sed 's/\.\([^.]\)$/_\1/'`)
ls -1 ~/.meteor/packages/meteor-tool/ | while read mt
do
	contained="false"
	for i in "${releases[@]}"
		do
		if [[ "$i" = "$mt" ]]
		then
			contained="true"
		fi
	done
	if [[ "$contained" = "false" ]]
	then
		echo removing "~/.meteor/packages/meteor-tool/$mt"
		rm -rf ~/.meteor/packages/meteor-tool/$mt
		echo removing "~/.meteor/packages/meteor-tool/.$mt.*/"
		rm -rf ~/.meteor/packages/meteor-tool/.$mt.*/
	else
		echo leaving $mt
	fi
done
nodepath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/node
npmpath=`dirname "$(readlink -e ~www-data/.meteor/meteor)"`/dev_bundle/bin/npm

rm -rf ~/.meteor/node
rm -rf ~/.meteor/npm
ln -sf $nodepath ~/.meteor/node
ln -sf $npmpath ~/.meteor/npm

cd ..

