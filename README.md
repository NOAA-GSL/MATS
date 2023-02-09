# MATS: Model Analysis Tool Suite

[MATS](https://gsl.noaa.gov/mats/) is a quick & versatile way to view model verification metrics. It is built using the [Meteor Framework](https://docs.meteor.com/).

## Development

### Getting Started
To build a MATS application (`MATS/apps/<appname>`) you only need Docker installed. MATS can be built locally with the `build.sh` script in the root of the repo or like so:

```console
$ APPNAME=aircraft
$ docker build \
    --build-arg APPNAME=${APPNAME} \
    --build-arg BUILDVER=dev \
    --build-arg COMMITBRANCH=$(git branch --show-current) \
    --build-arg COMMITSHA=$(git rev-parse HEAD) \
    -t mats/development/${APPNAME}:dev \
    .
```

Note that this repo uses git submodules so to get started you will need to run `git submodule update --recursive` after you clone the repo. You will also need to create a settings file. If you're a GSL developer, you can clone the `mats-settings` repo. Otherwise, contact the MATS team for a sample settings file.

To do further development you will want to install Meteor. Installation instructions can be found in [Meteor's documentation](https://docs.meteor.com/install.html).

Once installed, you can build and run a specific app with the following:

```console
$ cd ./apps/aircraft
$ meteor npm install
$ env METEOR_PACKAGE_DIRS=../../MATScommon/meteor_packages/ \
    meteor run \
      --settings <path/to>/mats-settings/configurations/local/settings/aircraft/settings.json
```

You should be able to access the app from localhost:3000

### Testing

The test suite for MATS consists of cucumber-style acceptance tests powered by webdriver. You will most likely need to run them with the app hooked up to an internal GSL database.

The Webdriver tests rely on the XPath so you will most likely need to run MATS with the `--production` flag otherwise it will inject extra `<div>` tags like MeteorToys and some tests will fail. Running MATS with this flag will look something like the below. Your settings path will probably be different.

```console
$ cd apps/anomalycor && \
    env METEOR_PACKAGE_DIRS=../../MATScommon/meteor_packages/ \
    meteor run \
    --production \
    --settings ~/git/mats-settings/configurations/local/settings/anomalycor/settings.json
```

More on testing can be found in [the testing README](./tests/README.md)

### Other Documentation

You can find a high-level overview of the project's CI process in the [CI README](./.github/README.md).

## Disclaimer

This repository is a scientific product and is not official communication of the National Oceanic and Atmospheric Administration, or the United States Department of Commerce. All NOAA GitHub project code is provided on an “as is” basis and the user assumes responsibility for its use. Any claims against the Department of Commerce or Department of Commerce bureaus stemming from the use of this GitHub project will be governed by all applicable Federal law. Any reference to specific commercial products, processes, or services by service mark, trademark, manufacturer, or otherwise, does not constitute or imply their endorsement, recommendation or favoring by the Department of Commerce. The Department of Commerce seal and logo, or the seal and logo of a DOC bureau, shall not be used in any manner to imply endorsement of any commercial product or activity by DOC or the United States Government.
