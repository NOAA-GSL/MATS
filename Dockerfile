# This tag here should match the app's Meteor version, per .meteor/release
FROM geoffreybooth/meteor-base:2.8.1 AS meteor-builder

ARG APPNAME

# Make MATScommon discoverable by Meteor
ENV METEOR_PACKAGE_DIRS=/MATScommon/meteor_packages

# Assume we're passed the repo root as build context
COPY apps/${APPNAME}/package*.json ${APP_SOURCE_FOLDER}/

RUN bash ${SCRIPTS_FOLDER}/build-app-npm-dependencies.sh

# Copy app & MATScommon library source into container
COPY apps/${APPNAME} ${APP_SOURCE_FOLDER}/
COPY MATScommon /MATScommon

RUN bash ${SCRIPTS_FOLDER}/build-meteor-bundle.sh


# Install OS build dependencies
FROM node:14-alpine AS native-builder

ENV APP_FOLDER=/usr/app
ENV APP_BUNDLE_FOLDER=${APP_FOLDER}/bundle
ENV SCRIPTS_FOLDER /docker

# Install OS build dependencies, which stay with this intermediate image but don’t become part of the final published image
RUN apk --no-cache add \
    bash \
    g++ \
    make \
    cmake \
    linux-headers \
    python3

# Copy in build scripts & entrypoint
COPY --from=meteor-builder $SCRIPTS_FOLDER $SCRIPTS_FOLDER/

# Copy in app bundle
COPY --from=meteor-builder /opt/bundle $APP_BUNDLE_FOLDER/

# Build the native dependencies
# NOTE - the randyp_mats-common atmosphere package pulls in a native npm couchbase dependency
# so we need to force an npm rebuild in the node_modules directory there as well
RUN bash $SCRIPTS_FOLDER/build-meteor-npm-dependencies.sh --build-from-source \
&& cd $APP_BUNDLE_FOLDER/bundle/programs/server/npm/node_modules/meteor/randyp_mats-common \
&& npm rebuild --build-from-source



# Use the specific version of Node expected by your Meteor release, per https://docs.meteor.com/changelog.html
FROM node:14-alpine AS production

# Set Build ARGS
ARG APPNAME
ARG BUILDVER=dev
ARG COMMITBRANCH=development
ARG COMMITSHA

# Install runtime dependencies
RUN apk --no-cache add \
    bash \
    ca-certificates \
    mariadb \
    python3 \
    py3-numpy \
    py3-pip \
    && pip3 --no-cache-dir install pymysql

# Set Environment
ENV APP_FOLDER=/usr/app
ENV APP_BUNDLE_FOLDER=${APP_FOLDER}/bundle
ENV SCRIPTS_FOLDER=/docker
ENV APPNAME=${APPNAME}
ENV SETTINGS_DIR=${APP_FOLDER}/settings/${APPNAME}
ENV MONGO_URL=mongodb://mongo:27017/${APPNAME}
ENV PORT=9000
ENV ROOT_URL=http://localhost:${PORT}/
ENV VERSION=${BUILDVER}
ENV BRANCH=${COMMITBRANCH}
ENV COMMIT=${COMMITSHA}

# Copy in helper scripts with the built and installed dependencies from the previous image
COPY --from=native-builder ${SCRIPTS_FOLDER} ${SCRIPTS_FOLDER}/

# Copy in app bundle with the built and installed dependencies from the previous image
COPY --from=native-builder ${APP_BUNDLE_FOLDER} ${APP_BUNDLE_FOLDER}/

# We want to use our own launcher script
COPY container-scripts/run_app.sh ${APP_FOLDER}/

# The app won't work without a writeable settings dir and local Node fileCache
RUN mkdir -p ${SETTINGS_DIR} \
    && chown -R node:node ${APP_FOLDER}/settings \
    && chmod -R 755 ${APP_FOLDER}/settings \
    && touch ${APP_BUNDLE_FOLDER}/bundle/programs/server/fileCache \
    && chown node:node ${APP_BUNDLE_FOLDER}/bundle/programs/server/fileCache \
    && chmod 644 ${APP_BUNDLE_FOLDER}/bundle/programs/server/fileCache

EXPOSE ${PORT}
USER node

WORKDIR ${APP_BUNDLE_FOLDER}/bundle

# Start app
# Note - meteor settings need to be mounted in as /usr/app/settings/${APPNAME} or else settings.json won't be picked up by run_app.sh
ENTRYPOINT ["/usr/app/run_app.sh"]

CMD ["node", "main.js"]

LABEL version=${BUILDVER} code.branch=${COMMITBRANCH} code.commit=${COMMITSHA}


# Create a stage with the root user for debugging
# Note - you'll need to override the entrypoint if you want a shell (docker run --entrypoint /bin/bash ...)
FROM production AS debug
USER root

# Use the production stage by default
FROM production
