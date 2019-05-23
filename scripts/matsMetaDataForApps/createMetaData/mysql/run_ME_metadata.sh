#!/usr/bin/env bash

# This is a shell script that runs a given METexpress metadata script,
# and then refreshes the metadata for its corresponding app on a given server.
#
# Usage:  ./run_ME_metadata.sh  metadata_script.py  path_to_file.cnf  url_of_app_to_refresh

echo "Running script $1 with cnf file path $2"
python $1 $2 2>&1

echo "Refreshing metadata for app at path $3"
curl $3

