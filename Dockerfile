# This tag here should match the app's Meteor version, per .meteor/release
FROM geoffreybooth/meteor-base:2.11.0 AS meteor-builder

ARG APPNAME

# Make MATScommon discoverable by Meteor
ENV METEOR_PACKAGE_DIRS=/MATScommon/meteor_packages

# Assume we're passed the repo root as build context
COPY apps/${APPNAME}/package*.json ${APP_SOURCE_FOLDER}/

RUN apt-get update && apt-get install --assume-yes --no-install-recommends cmake && \
  bash ${SCRIPTS_FOLDER}/build-app-npm-dependencies.sh

# Copy app & MATScommon library source into container
COPY apps/${APPNAME} ${APP_SOURCE_FOLDER}/
COPY MATScommon /MATScommon

RUN bash ${SCRIPTS_FOLDER}/build-meteor-bundle.sh


# Use the specific version of Node expected by your Meteor release, per https://docs.meteor.com/changelog.html
FROM node:14-bullseye-slim AS production

# Set Build ARGS
ARG APPNAME
ARG BUILDVER=dev
ARG COMMITBRANCH=development
ARG COMMITSHA

ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    mariadb-client \
    python3 \
    python3-numpy \
    python3-pip \
    python3-pymysql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

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
COPY --from=meteor-builder ${SCRIPTS_FOLDER} ${SCRIPTS_FOLDER}/

# Copy in app bundle with the built and installed dependencies from the previous image
# COPY --from=meteor-builder ${APP_BUNDLE_FOLDER} ${APP_BUNDLE_FOLDER}/
COPY --from=meteor-builder /opt/bundle ${APP_BUNDLE_FOLDER}/

# We want to use our own launcher script
COPY container-scripts/run_app.sh ${APP_FOLDER}/

# The app won't work without a writeable settings dir and local Node fileCache
RUN mkdir -p ${SETTINGS_DIR} \
    && chown -R node:node ${APP_FOLDER}/settings \
    && chmod -R 755 ${APP_FOLDER}/settings \
    && touch ${APP_BUNDLE_FOLDER}/bundle/programs/server/fileCache \
    && chown node:node ${APP_BUNDLE_FOLDER}/bundle/programs/server/fileCache \
    && chmod 644 ${APP_BUNDLE_FOLDER}/bundle/programs/server/fileCache

# Install the Meteor app's NPM dependencies and update the OS in the container
RUN bash $SCRIPTS_FOLDER/build-meteor-npm-dependencies.sh
RUN apt-get update && apt-get -y upgrade && apt-get clean && apt-get clean && rm -rf /var/lib/apt/lists/*

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
