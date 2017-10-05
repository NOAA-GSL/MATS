#!/bin/bash
echo "$0 - starting with args $*"
/bin/bash /builds/buildArea/MATS_for_EMB/scripts/common/build_meteorsrv-dev.sh $1
if [ $? -ne 0 ]; then
    echo $0  - /builds/buildArea/MATS_for_EMB/scripts/common/build_meteorsrv-dev.sh failed - exiting
    exit 1
fi
/bin/bash /builds/buildArea/MATS_for_EMB/scripts/common/deploy_meteorsrv-dev.sh $1
if [ $? -ne 0 ]; then
    echo $0  - /builds/buildArea/MATS_for_EMB/scripts/common/deploy_meteorsrv-dev.sh failed - exiting
    exit 1
fi

