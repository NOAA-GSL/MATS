#!/usr/bin/bash
/bin/bash MATS_for_EMB/scripts/build_meteorsrv-dev.sh $1
/bin/bash MATS_for_EMB/scripts/deploy_meteorsrv-dev.sh $1
if [[ $HOSTNAME != "mats-dev.gsd.esrl.noaa.gov" ]]; then
    echo "not on mats-dev.gsd.esrl.noaa.gov so remote deploying mats-dev.gsd.esrl.noaa.gov as well";
    ssh mats-dev.gsd.esrl.noaa.gov "cd /builds/buildArea;/bin/bash MATS_for_EMB/scripts/deploy_meteorsrv-dev.sh $1"
fi
/bin/bash MATS_for_EMB/scripts/build_applist.sh $1