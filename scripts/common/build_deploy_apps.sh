#!/bin/bash
/bin/bash MATS_for_EMB/scripts/common/build_meteorsrv-dev.sh $1
/bin/bash MATS_for_EMB/scripts/common/deploy_meteorsrv-dev.sh $1
/bin/bash MATS_for_EMB/scripts/common/build_applist.sh
