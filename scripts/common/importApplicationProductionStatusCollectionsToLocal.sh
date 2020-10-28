#!/bin/bash
# Used to export the appProductionStatus mongo database from mats.gsd.esrl.noaa.gov
# and then import it into your local appProductionStatus mongo collection for
# development.
# assumes that you have installed mongodb on your local system (to get mongo import) and
# that you have cloned MATS into a ${HOME}/WebstormProjects/MATS directory
. ${HOME}/WebstormProjects/MATS/scripts/common/app_production_utilities.source
localtmpfile=/tmp/appProductionStatusCollections
mkdir -p ${localtmpfile}
exportCollections ${localtmpfile}
mongoimport -h localhost:3001 --db meteor -c deployment --file ${localtmpfile}/deployment.json --upsert
mongoimport -h localhost:3001 --db meteor -c buildConfiguration --file ${localtmpfile}/buildConfiguration.json --upsert
mongoimport -h localhost:3001 --db meteor -c allowedUsers --file ${localtmpfile}/allowedUsers.json --upsert