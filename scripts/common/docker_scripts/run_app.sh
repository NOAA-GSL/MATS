#!/bin/sh
set -e
if [ -z ${ROOTPWD+x} ]; then
  echo "ROOT PWD is unset"
else
  echo "reseting ROOT PWD"
cat > /root/.cshrc << EOF
unsetenv DISPLAY || true
HISTCONTROL=ignoreboth
EOF
cp /root/.cshrc /root/.profile
echo "${ROOTPWD}" | chpasswd
fi
echo "creating www-data user"
mkdir -p /etc/skel/
cat > /etc/skel/.logout << EOF
history -c
/bin/rm -f /opt/remote/.mysql_history
/bin/rm -f /opt/remote/.history
/bin/rm -f /opt/remote/.bash_history
EOF
cat > /etc/skel/.cshrc << EOF
set autologout = 30
set prompt = "$ "
set history = 0
set ignoreeof
EOF
cp /etc/skel/.cshrc /etc/skel/.profile
adduser -D --shell /bin/bash www-data
if [ -z ${WWW-DATA-PWD+x} ]; then
  # password is unset
  echo "WWW-DATA-PWD" | chpasswd
else
  # password is set
  echo "${WWW-DATA-PWD}" | chpasswd
fi

echo "Running app ${APPNAME} date: $(date)"

# Set a delay to wait to start meteor container

if [[ $DELAY ]]; then
    echo "run_app => Delaying startup for $DELAY seconds"
    sleep $DELAY
fi

# Honour already existing PORT setup
export PORT=${PORT:-80}
export NODE_ENV=production
# check for persisted meteor settings and if not present create a template
# secret settings are added to the persistent settings.json by the app itself durring configuration
echo "run-app: make sure we have a /usr/app/settings/${APPNAME} directory.."
if [[ ! -d /usr/app/settings/${APPNAME} ]]; then
    echo "run-app: creating /usr/app/settings/${APPNAME}"
    mkdir -p /usr/app/settings/${APPNAME}
fi
echo "$(ls /usr/app/settings/${APPNAME})"

if [[ ! -f /usr/app/settings/${APPNAME}/settings.json ]]; then
  # create a template - lets the app start up in configure mode
  echo "run-app: creating empty settings file"
cat << EOF > /usr/app/settings/${APPNAME}/settings.json
{
  "private": {},
  "public": {}
}
EOF
  # make sure the settings directory and file are still modifiable.
  chmod -R 777 /usr/app/settings/${APPNAME}
fi

echo "MONGO URL is: " $MONGO_URL
export METEOR_SETTINGS_DIR="/usr/app/settings"
export METEOR_SETTINGS="$(cat /usr/app/settings/${APPNAME}/settings.json)"
cd /usr/app
if [[ $DEBUG ]]; then
    echo "run_app => Starting meteor app for DEBUG"
    node --inspect=0.0.0.0:9229 main.js
else
    echo "run_app => Starting meteor app"
    node main.js
fi