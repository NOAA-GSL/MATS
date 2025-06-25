# This tag here should match the app's Meteor version, per .meteor/release
FROM geoffreybooth/meteor-base:3.2 AS meteor-builder

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

# If this fails with the mention that cmake is needed to build a dependency,
# double check the `MATScommon/meteor_packages/mats-common/.npm/package/npm-shrinkwrap.json
# file for any OS-specific dependencies. If we allow Meteor to build the Couchbase SDK, it
# will blow up our image size. 
RUN bash ${SCRIPTS_FOLDER}/build-meteor-bundle.sh


# Use the specific version of Node expected by your Meteor release, per https://docs.meteor.com/changelog.html
FROM node:22-bookworm-slim AS production

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
  python3 \
  python3-pip \
  python3-venv \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create & activate a Python virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv ${VIRTUAL_ENV}
ENV  PATH="${VIRTUAL_ENV}/bin:$PATH"

# Ensure the Python tooling is up-to-date
RUN python3 -m pip install --upgrade pip setuptools wheel

# Install Python dependencies for MATScomon in the virtual environment
RUN python3 -m pip install --no-cache-dir \
  numpy \
  pymysql

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

# Copy in helper scripts from the previous image
COPY --from=meteor-builder ${SCRIPTS_FOLDER} ${SCRIPTS_FOLDER}/

# Copy in app bundle from the previous image
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

# Install the Meteor app's NPM dependencies
# g++ & build-essential would be needed for ARM/Apple Silicon builds in order to recompile fibers
RUN bash $SCRIPTS_FOLDER/build-meteor-npm-dependencies.sh

# Update the OS packages in the container
RUN apt-get update \
    && apt-get -y upgrade \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

EXPOSE ${PORT}
USER node

WORKDIR ${APP_BUNDLE_FOLDER}/bundle

# Start app
# Note - meteor settings need to be mounted in as /usr/app/settings/${APPNAME} or else settings.json won't be picked up by run_app.sh
ENTRYPOINT ["/usr/app/run_app.sh"]

CMD ["node", "main.js"]

LABEL version=${BUILDVER} code.branch=${COMMITBRANCH} code.commit=${COMMITSHA}


# Create a stage with the root user for debugging
# Note - you'll need to override the entrypoint if you want a shell (docker run -it --entrypoint /bin/bash ...)
FROM production AS debug
USER root

# Use the production stage by default
FROM production
