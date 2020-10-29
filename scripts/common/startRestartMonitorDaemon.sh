#!/usr/bin/env bash

# Used to start the monitor_restart.sh script as a daemon process.
# this script depends on daemonize which can be installed with
# yum install daemonize
# this script must be run as user root.
# This daemon uses /tmp/monitor_restart.pid as a pid file for the running process and as a lock file to prevent inadvertant superfluous processes.
# this script depends on daemonize which is available with
# yum install daemonize
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi
/sbin/daemonize -p /tmp/monitor_restart.pid -l /tmp/monitor_restart.pid /builds/buildArea/MATS/scripts/common/monitor_restart.sh