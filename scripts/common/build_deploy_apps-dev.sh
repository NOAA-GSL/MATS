#!/bin/bash
echo "$0 - starting with args $*"
/bin/bash /builds/buildArea/MATS_for_EMB/scripts/common/build_meteorsrv-int.sh $1
/bin/bash /builds/buildArea/MATS_for_EMB/scripts/common/deploy_meteorsrv-int.sh $1

