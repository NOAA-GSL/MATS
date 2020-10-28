#!/usr/bin/env bash
#This is a utility for updating all the meteor apps. Be sure to cd to the apps directory (e.g. /builds/buildArea/MATS/apps)
# When an app runs it will be available on port 3000
# You can test the app then kill it with "pkill -TERM node"
# notice that on server running nginx you might kill the server node process.
# It will probably restart but if not do a "service nginx restart"
# After doing the pkill the script will advance to the next app.
for app in $(find . -maxdepth 1 -type d -not -path "."); do
    cd $app
    pwd
    meteor reset
    rm -rf node_modules
    meteor update --all-packages
    meteor npm install --save babel-runtime
    meteor npm install --save fibers
    meteor run
    cd ..
done