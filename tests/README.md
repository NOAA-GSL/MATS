MATS automated test changes to support cucumber-boilerplate
====================

## changes from old chimp test structure
The directory `mats-testing/features` has all the old features and commonStepDefinitions which were what the tests previously used under chimp.js. 
They are for reference only because they won't run due to the node environment being different. The old directory is there so that we can use it for reference. 
Once we don't need it we can ax it I suppose.
The top-level `mats-testing` has a new `src` directory, some config files (the main one of interest is `wdio.config.js`), 
the npm `package.json` and `package-lock.json`, and a few other things. 
The `mats-testing/src` directory structure is from the [webdriver.io cucumber boilerplate project](https://github.com/webdriverio/cucumber-boilerplate) because that is what was used to 
make the tests run, their directory structure is easy to navigate.  
Their predefined step definitions are left intact so that they can be used in the future, or at least used for reference. 
Any mats specific changes should be prepended with "mats". 
The src directory is like this...
###mats-testing/src/features
This is where all the feature files are, much like the old features directories except I left out the load and performance subdirectories - which we weren't using anyway.
###mats-testing/src/steps
Has `given.js`, `then.js`, and `when.js`. These have our cucumber step mappings, and they have the standard boilerplate ones as well - again mostly for reference. 
###mats-testing/src/support  
This has `action/`, `check/`, and `lib/` subdirs and this holds all the step definition files. We have definitions that match our tests as well as the standard boilerplate ones. 

##Status
The old common test features are now distributed among all the non met apps. 
## rerunning failed tests
The tricky technique is to copy the feature path from the failing message in the spec report output 
and paste `"--spec the-full-path-to-the-feature-that-you-copied"` onto the end of the npx command 
and rerun it. 

There are 198 of the common, but now distributed features. They seem to mostly pass on a laptop. 
The `wdio.mats.config.js` specifies maxInstances 3 which will run three parallel instances - see below - 
and they take about 19 minutes to complete on my laptop.

## Installation
You need the latest node version, I've been using nvm to manage node instances. Instructions on how to install node via NVM can be found here: https://github.com/nvm-sh/nvm#install--update-script. Once NVM is installed you can install the correct version of Node and the dependencies required to run the tests by doing:
 ```
nvm install && npm install
 ```
###increase memory allocated to node
There could be a webdriver memory leak or maybe our tests are just "hoggy", 
but I had to increase the node memory allocation to keep from occasionally 
getting weird javascript errors. You do that by executing this command 
- `export NODE_OPTIONS="--max-old-space-size=8192"`

inside your terminal prior to running the tests or by prefixing the below commands with the following
- `env NODE_OPTIONS="--max-old-space-size=8192" <npx command here>`
### invocations
####This is the standard command line invocation from in the mats-testing directory....
- `npx wdio run wdio.mats.conf.js`

It will run 3 instances and it will test against the production server.
####This will test against mats-int.
- `npx wdio run wdio.mats.conf.js --baseUrl 'https://esrl.noaa.gov/gsd/int-mats'`
####This will use 2 parallel instances and run against mats-int.
- `npx wdio run wdio.mats.conf.js --baseUrl 'https://esrl.noaa.gov/gsd/int-mats' --maxInstances 2`
####This will run a single feature
- Note this is a relative path - you need to be in the `mats-testing` directory
- ```
  npx wdio run wdio.mats.conf.js \
      --baseUrl 'https://esrl.noaa.gov/gsd/int-mats' \
      --spec ./src/features/landuse/basic/addThreeCurvesRemoveOneCurveAddAnotherCurve.feature
  ```
#### Running tests with different reporters
By default the `wdio.conf.js` does not specify a reporter which results in a 
summary style report. We can also specify a reporter with
 - ```
    --reporters spec
    ```
which would run the spec reporter. Any of the supported reporters can be specified in this manner.
- ```
  npx wdio run wdio.mats.conf.js \
      --baseUrl 'https://esrl.noaa.gov/gsd/int-mats' \
      --spec ./src/features/landuse/basic/addThreeCurvesRemoveOneCurveAddAnotherCurve.feature
  ```
would give the summary report.
- ```
  npx wdio run wdio.mats.conf.js \
      --baseUrl 'https://esrl.noaa.gov/gsd/int-mats' \
      --spec ./src/features/landuse/basic/addThreeCurvesRemoveOneCurveAddAnotherCurve.feature \
      --reporter spec
  ```
would give a fuller report.

#### Running tests as they change
You can have WebdriverIO watch your spec files and run them as they change by doing:
```
npx wdio run wdio.mats.conf.js --watch 
```

### Test Configuration
The default test configuration is in the `wdio.conf.js` file. Currently, the tests are configured to run '`maxInstances`' Chrome instances. If you would like to run a headless Chrome for tests; you can do so by using the wrapper scripts in the root of the repo. 

You can also run tests via `npm` by calling the scripts in `package.json` like so:
* `npm run test`
* `npm run test:headless`
* `npm run test:debug`
* `npm run test:debug:headless`

You can pass flags by like so:
* `npm run test -- --baseUrl 'https://esrl.noaa.gov/gsd/int-mats'`
