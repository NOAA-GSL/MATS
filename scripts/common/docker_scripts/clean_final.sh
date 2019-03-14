#!/bin/sh
set -e

if [ $BUILD_PACKAGES ]; then
    echo "clean_final => removing ${BUILD_PACKAGES}"
    apk del --purge ${BUILD_PACKAGES}
fi

if [ -f ${METEORD_DIR}/bin/${PHANTOMJS_TAR_FILE} ]; then
    echo "clean_final => Removing ${METEORD_DIR}/bin/${PHANTOMJS_TAR_FILE}"
    rm ${METEORD_DIR}/bin/${PHANTOMJS_TAR_FILE}
fi
echo "clean_final => uninstalling node-gyp"
npm uninstall -g node-gyp
echo "clean_final => clearing npm cache"
npm cache clear
echo "clean_final => removing temporary build stuff"
rm -rf $METEORD_DIR/bin /usr/share/doc /usr/share/man /tmp/* /var/cache/apk/* \
		/usr/share/man /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp #/usr/lib/node_modules/npm
