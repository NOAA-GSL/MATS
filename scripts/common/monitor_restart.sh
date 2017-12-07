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

prefix=$(/bin/hostname | /bin/cut -f1 -d'.')
/bin/inotifywait  -m  -e attrib /builds/restart_nginx | while read; do
	d=$(/bin/date +%F_%T)
	echo "/builds/restart_nginx touched at  $(/bin/date +%F_%T)  - must restart nginx" >> /builds/restart_nginx.log
	echo "saving /etc/nginx/conf.d/ssl.conf to /etc/nginx/conf.d/ssl.conf.bak_${d}" >> /builds/restart_nginx.log
	/bin/cp /etc/nginx/conf.d/ssl.conf /etc/nginx/conf.d/ssl.conf.bak_${d}
	/bin/wget -q -O - https://www.esrl.noaa.gov/gsd/mats/${prefix}_ssl.conf.gpg |  /bin/gpg --passphrase "matsP@$$Phrase" --batch --quiet --yes -o /etc/nginx/conf.d/ssl.conf
	/usr/sbin/nginx -t
	if [[ $? -ne 0 ]]; then
		echo "ERROR: Retrieved and decrypted ${prefix}_ssl.conf.gpg from mats and installed it in /etc/nginx/conf.d/ssl.conf - but 'nginx - t' failed."
		echo "Restoring the previous /etc/nginx/conf.d/ssl.conf - NO RESTART"
	else
		echo "Restarting nginx with new configuration"
		echo "/bin/systemctl restart nginx.service > /builds/restart_nginx.log 2>&1"
	fi
done
