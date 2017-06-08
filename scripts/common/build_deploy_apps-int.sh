#!/bin/bash
/bin/bash MATS_for_EMB/scripts/common/build_meteorsrv-int.sh $1
/bin/bash MATS_for_EMB/scripts/common/deploy_meteorsrv-int.sh $1
/bin/bash MATS_for_EMB/scripts/common/build_applist-int.sh
