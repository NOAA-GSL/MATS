#!/bin/sh
#This script is intended to be started by startRestartMonitorDaemon.sh
#This script will monitor the file /builds/restart_nginx and any time the file is touched
#an inotify event will be captured that will result in the restarting of the nginx service.
#If the file /builds/restart_nginx does not exist it will created and restricted to only the www-data user.
# restart events will be logged to /builds/restart_nginx.log
#This script depends on inotify-tools which can be installed with
#yum install inotify-tools

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

if [[ ! -e /builds/restart_nginx ]]; then
	/bin/touch /builds/restart_nginx
fi
if [[ ! -e /builds/restart_nginx.log ]]; then
	/bin/touch /builds/restart_nginx.log
fi
/bin/chown www-data:www-data /builds/restart_nginx
/bin/chmod a-rw  /builds/restart_nginx
/bin/chown www-data:www-data /builds/restart_nginx.log
/bin/chmod a-rw  /builds/restart_nginx.log
host=$(/bin/hostname | /bin/cut -f1 -d'.')
if [[ "${host}" != "mats-dev" && "${host}" != "mats-int" && "${host}" != "mats" ]]; then
    echo "This script must be run on either mats.gsd.esrl.noaa.gov or mats-dev.gsd.esrl.noaa.gov or mats-int.gsd.esrl.noaa.gov"
    echo "exiting"
    exit 1
fi
/bin/inotifywait  -m  -e attrib /builds/restart_nginx | while read; do
	d=$(/bin/date +%F_%T)
	echo "/builds/restart_nginx touched at  $(/bin/date +%F_%T)  - must restart nginx" >> /builds/restart_nginx.log
	echo "saving /etc/nginx/conf.d/ssl.conf to /etc/nginx/conf.d/backups/ssl.conf.bak_${d}" >> /builds/restart_nginx.log
    if [ ! -d "/etc/nginx/conf.d/backups" ]; then
        mkdir -p /etc/nginx/conf.d/backups
    fi
    /bin/cp /etc/nginx/conf.d/ssl.conf /etc/nginx/conf.d/backups/ssl.conf.bak_${d}
    outputFile="${host}_ssl.conf.gpg"
    tmpGpgFile=$(mktemp)
    rm -rf /tmp/ssl.conf
    /bin/wget -q -O ${tmpGpgFile} --no-check-certificate https://mats.gsd.esrl.noaa.gov${outputFile}
    cat /builds/passphrase | gpg2 --batch -q -d ${tmpGpgFile} > /etc/nginx/conf.d/ssl.conf
    rm -rf ${tmpGpgFile}
    fileCheck=$(/bin/file -b /etc/nginx/conf.d/ssl.conf)
    /usr/sbin/nginx -t
    syntaxCheck=$?
    if [[ ${syntaxCheck} -ne 0 ]]  || [[ "${check}" != "ASCII text" ]]; then
		echo "ERROR: Retrieved and decrypted ${prefix}_ssl.conf.gpg from mats and installed it in /etc/nginx/conf.d/ssl.conf - but 'nginx - t' failed."
		echo "Restoring the previous /etc/nginx/conf.d/ssl.conf - NO RESTART"
        /bin/cp /etc/nginx/conf.d/backups/ssl.conf.bak_${d} /etc/nginx/conf.d/ssl.conf
	else
		echo "Restarting nginx with new configuration"
		/bin/systemctl restart nginx.service > /builds/restart_nginx.log 2>&1
	fi
done
