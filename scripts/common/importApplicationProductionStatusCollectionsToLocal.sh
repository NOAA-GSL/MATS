#!/bin/bash

# Used to export CurveSettings from a remote mats server and import them into the local development machine.
# most commonly used to export the CurveSettings collection on mats.gsd.esrl.noaa.gov
# then scp the export file to local development, and then import the settings into the CurveSettings collection on localhost
# mongoimport -h localhost:3001 --db meteor -c CurveSettings --file /tmp/CurveSettings.json --upsert
# meteor has to be running your app.
# you have to download and extract mongodb to your development workstation from mongodb.org

. ${PWD}/app_production_utilities.source
