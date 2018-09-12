#!/bin/bash

# Used to export CurveSettings from a remote mats server and import them into the local development machine.
# most commonly used to export the CurveSettings collection on mats.gsd.esrl.noaa.gov
# then scp the export file to local development, and then import the settings into the CurveSettings collection on localhost
# mongoimport -h localhost:3001 --db meteor -c CurveSettings --file /tmp/CurveSettings.json --upsert
# meteor has to be running your app.
# you have to download and extract mongodb to your development workstation from mongodb.org

remoteServer="$1"
app="$2"
remotetmpfile=`ssh www-data@${remoteServer} /usr/bin/mktemp`
localtmpfile=`/usr/bin/mktemp`
ssh www-data@${remoteServer} "/bin/mongoexport -d ${app} -c CurveSettings -o ${remotetmpfile}"
scp www-data@${remoteServer}:"${remotetmpfile}" "${localtmpfile}"
ssh www-data@${remoteServer} "/bin/rm ${remotetmpfile}"
mongoimport -h localhost:3001 --db meteor -c CurveSettings --file ${localtmpfile} --upsert
/bin/rm ${localtmpfile}
