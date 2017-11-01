#!/bin/bash
# Used to export the appProductionStatus mongo database from mats.gsd.esrl.noaa.gov
# and then import it into your local appProductionStatus mongo collection for
# development.
# assumes that you have installed mongodb on your local system (to get mongo import) and
# that you have cloned MATS_for_EMB into a ${HOME}/WebstormProjects/MATS_for_EMB directory
. ${HOME}/WebstormProjects/MATS_for_EMB/scripts/common/app_production_utilities.source
localtmpfile=/tmp/appProductionStatusCollections
mkdir -p ${localtmpfile}
exportCollections ${localtmpfile}
mongoimport -h localhost:3001 --db meteor -c deployment --file ${localtmpfile}/deployment.json --upsert
mongoimport -h localhost:3001 --db meteor -c buildConfiguration --file ${localtmpfile}/buildConfiguration.json --upsert