#!/usr/bin/env bash

# Used to export CurveSettings from a remote mats server and import them into the local one
# most commonly used to export the CurveSettings collection on mats.gsd.esrl.noaa.gov
# then scp the export file to mats-dev, and then import the settings into the CurveSettings collection on mats-dev
#NOTE: this doesn't work for a development machine running meteor directly.
# for that the import command is something like...
# mongoimport -h localhost:3001 --db meteor -c CurveSettings --file /tmp/CurveSettings.json --upsert
# meteor has to be running your app.
# you have to download and extract mongodb to your development workstation from mongodb.org

remoteServer=$1
app=$2
remotetmpfile=`ssh ${remoteServer} /usr/bin/mktemp`
localtmpfile=`/usr/bin/mktemp`
ssh ${remoteServer} "/bin/mongoexport -d ${app} -c CurveSettings -o ${remotetmpfile}"
scp ${remoteServer}:"${remotetmpfile}" "${localtmpfile}"
ssh ${remoteServer} "/bin/rm ${remotetmpfile}"
/bin/mongoimport -d ${app} -c CurveSettings --file ${localtmpfile} --upsert
/bin/rm ${localtmpfile}
