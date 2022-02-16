# MATS Test Suite

The MATS tests are Cucumber and Webdriver-based acceptance tests. Access to certain data in the MATS team's database is required.

## Setup

We've found nvm is useful to manage node versions. Instructions on how to install node via NVM can be found here: <https://github.com/nvm-sh/nvm#install--update-script>. Once NVM is installed you can install the desired version of Node (we usually use the latest or match the version required by the version of Meteor we're on) and the dependencies required to run the tests by doing:

```console
nvm install && npm install
```

## Running

The default test configuration is in the `wdio.conf.js` file. Currently, the tests are configured to run '`maxInstances`' Chrome instances. There are options to run with regular Chrome or headless Chrome. We'd recommend headless Chrome so the test suite doesn't take over your laptop's desktop.

You can run tests via `npm` by calling the scripts in `package.json` like so:

- `npm run test`
- `npm run test:headless`
- `npm run test:debug`
- `npm run test:debug:headless`

You can pass flags like so:

- `npm run test -- --baseUrl 'https://esrl.noaa.gov/gsd/int-mats'`

Otherwise, there are also some shell scripts in the `MATS/tests` directory that offer an easy start to running the test suite.


## Directory structure

The `MATS/tests/src` directory structure is from the [webdriver.io cucumber boilerplate project](https://github.com/webdriverio/cucumber-boilerplate) because that is what was used to make the tests run, their directory structure is easy to navigate.  

Their predefined step definitions are left intact so that they can be used in the future, or at least used for reference.

### MATS/tests/src/features

This is where all the feature files are, much like the old features directories except I left out the load and performance subdirectories - which we weren't using anyway.

### MATS/tests/src/steps

Has `given.js`, `then.js`, and `when.js`. These have our cucumber step mappings, and they have the standard boilerplate ones as well - again mostly for reference.

### MATS/tests/src/support  

This has `action/`, `check/`, and `lib/` subdirs and this holds all the step definition files. We have definitions that match our tests as well as the standard boilerplate ones.


## Discussion

### Increasing memory allocated to node

There could be a webdriver memory leak or maybe our tests are just "hoggy", but we had to increase the node memory allocation to keep from occasionally getting weird javascript errors. You do that by executing this command:

- `export NODE_OPTIONS="--max-old-space-size=8192"`

inside your terminal prior to running the tests or by prefixing the below commands with the following

- `env NODE_OPTIONS="--max-old-space-size=8192" <npx command here>`

This is taken care of in the `npm run` commands and in the shell scripts.

### Invocations

#### This is the standard command line invocation from the tests directory

- `npx wdio run wdio.conf.js`

It will run 3 instances and it will test against MATS internal dev server.

#### This will test against mats-int

- `npx wdio run wdio.conf.js --baseUrl 'https://esrl.noaa.gov/gsd/int-mats'`

#### This will use 2 parallel instances and run against mats-int

- `npx wdio run wdio.conf.js --baseUrl 'https://esrl.noaa.gov/gsd/int-mats' --maxInstances 2`

#### This will run a single feature

Note this is a relative path - you need to be in the `MATS/tests` directory

```console
npx wdio run wdio.conf.js \
    --baseUrl 'https://esrl.noaa.gov/gsd/int-mats' \
    --spec ./src/features/met-airquality/basic/addRemoveContour.feature
```

#### Running tests with different reporters

By default the `wdio.conf.js` specifies the spec reporter. We can also specify a reporter like below which would run the default dot reporter. Any of the [supported reporters](https://webdriver.io/docs/dot-reporter) can be specified in this manner.

```console
npx wdio run wdio.conf.js \
    --reporters dot
```

### Running tests as they change

You can have WebdriverIO watch your spec files and run them as they change by doing:

```console
npx wdio run wdio.conf.js --watch 
```
