#!/usr/bin/env bash

# Used to stop the monitor_restart.sh daemon process.
# this script must be run as user root.
# The daemon uses /tmp/monitor_restart.pid as a pid file for the running process and as a lock file to prevent inadvertant superfluous processes.
# Those two files are removed after killing the daemon

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi
/bin/pkill  monitor_restart; /bin/rm -rf /tmp/monitor_restart.pid