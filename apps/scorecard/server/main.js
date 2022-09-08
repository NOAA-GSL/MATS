/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsCouchbaseUtils} from 'meteor/randyp:mats-common';

// determined in doCurveParanms
var minDate;
var maxDate;
var dstr;

const doPlotParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotParams.remove({});
    }
    if (matsCollections.PlotParams.findOne({name:"dates"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'dates',
                type: matsTypes.InputTypes.dateRange,
                options: [''],
                startDate: minDate,
                stopDate: maxDate,
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                default: dstr,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: "dateHelp.html"
            });
    } else {
        // need to update the dates selector if the metadata has changed
        var currentParam = matsCollections.PlotParams.findOne({name: 'dates'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.default, dstr))) {
            // have to reload model data
            matsCollections.PlotParams.update({name: 'dates'}, {
                $set: {
                    startDate: minDate,
                    stopDate: maxDate,
                    default: dstr
                }
            });
        }
    }
    if (matsCollections.PlotParams.findOne({name:"repeat"}) == undefined) {
        matsCollections.PlotParams.insert(
            {
                name: 'repeat',
                type: matsTypes.InputTypes.dateRange,
                options: [''],
                startDate: minDate,
                stopDate: maxDate,
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                default: dstr,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1,
                help: "dateHelp.html"
            });
    } else {
        // need to update the dates selector if the metadata has changed
        var currentParam = matsCollections.PlotParams.findOne({name: 'repeat'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.default, dstr))) {
            // have to reload model data
            matsCollections.PlotParams.update({name: 'repeat'}, {
                $set: {
                    startDate: minDate,
                    stopDate: maxDate,
                    default: dstr
                }
            });
        }
    }
};

const doCurveParams = function () {
    // force a reset if requested - simply remove all the existing params to force a reload
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        const params = matsCollections.CurveParamsInfo.find({"curve_params": {"$exists": true}}).fetch()[0]["curve_params"];
        for (var cp = 0; cp < params.length; cp++) {
            matsCollections[params[cp]].remove({});
        }
    }

    // get a map of the apps included in this scorecard, and which URLs we're pulling their metadata from
    const appsToScore = matsCollections.AppsToScore.find({"apps_to_score": {"$exists": true}}).fetch()[0]["apps_to_score"];

    let hideOtherFor = {}
    let applicationOptions = [];
    let modelOptionsMap = {};
    let regionOptionsMap = {};
    let regionValuesMap = {};
    let statisticOptionsMap = {};
    let variableOptionsMap = {};
    let variableValuesMap = {};
    let thresholdOptionsMap = {};
    let thresholdValuesMap = {};
    let scaleOptionsMap = {};
    let scaleValuesMap = {};
    let truthOptionsMap = {};
    let truthValuesMap = {};
    let forecastLengthOptionsMap = {};
    let forecastTypeOptionsMap = {};
    let forecastTypeValuesMap = {};
    let validTimeOptionsMap = {};
    let levelOptionsMap = {};
    let dateOptionsMap = {};
    try {
        debugger;
        for (let aidx = 0; aidx < appsToScore.length; aidx++){

        }
    } catch (err) {
        console.log(err.message);
    }

    if (matsCollections["label"].findOne({name: 'label'}) == undefined) {
        matsCollections["label"].insert(
            {
                name: 'label',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],
                controlButtonCovered: true,
                default: '',
                unique: true,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: 'label.html'
            }
        );
    }

    if (matsCollections["application"].findOne({name: 'application'}) == undefined) {
        matsCollections["application"].insert(
            {
                name: 'application',
                type: matsTypes.InputTypes.select,
                optionsMap: {},
                options: applicationOptions,
                dates: dateOptionsMap,
                dependentNames: ["data-source", "validation-data-source", "statistic", "variable", "valid-time", "level"],
                controlButtonCovered: true,
                default: applicationOptions[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["application"].findOne({name: 'application'});
        if (!matsDataUtils.areObjectsEqual(currentParam.dates, dateOptionsMap)) {
            // have to reload application data
            matsCollections["application"].update({name: 'application'}, {
                $set: {
                    dates: dateOptionsMap
                }
            });
        }
    }

    if (matsCollections["data-source"].findOne({name: 'data-source'}) == undefined) {
        matsCollections["data-source"].insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap[applicationOptions[0]]),
                superiorNames: ['application'],
                dependentNames: ["region", "threshold", "scale", "truth", "forecast-length", "forecast-type", "dates"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap[applicationOptions[0]])[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["data-source"].findOne({name: 'data-source'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
            // have to reload model data
            matsCollections["data-source"].update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap[applicationOptions[0]]),
                    default: Object.keys(modelOptionsMap[applicationOptions[0]])[0]
                }
            });
        }
    }

    if (matsCollections["validation-data-source"].findOne({name: 'validation-data-source'}) == undefined) {
        matsCollections["validation-data-source"].insert(
            {
                name: 'validation-data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap[applicationOptions[0]]),
                superiorNames: ['application'],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap[applicationOptions[0]])[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["validation-data-source"].findOne({name: 'validation-data-source'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
            // have to reload model data
            matsCollections["validation-data-source"].update({name: 'validation-data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap[applicationOptions[0]]),
                    default: Object.keys(modelOptionsMap[applicationOptions[0]])[0]
                }
            });
        }
    }

    if (matsCollections["region"].findOne({name: 'region'}) == undefined) {
        matsCollections["region"].insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionOptionsMap,
                options: regionOptionsMap[applicationOptions[0]][Object.keys(regionOptionsMap[applicationOptions[0]])[0]],
                valuesMap: regionValuesMap,
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionOptionsMap[applicationOptions[0]][Object.keys(regionOptionsMap[applicationOptions[0]])[0]][0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["region"].findOne({name: 'region'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, regionValuesMap))) {
            // have to reload region data
            matsCollections["region"].update({name: 'region'}, {
                $set: {
                    optionsMap: regionOptionsMap,
                    valuesMap: regionValuesMap,
                    options: regionOptionsMap[applicationOptions[0]][Object.keys(regionOptionsMap[applicationOptions[0]])[0]],
                    default: regionOptionsMap[applicationOptions[0]][Object.keys(regionOptionsMap[applicationOptions[0]])[0]][0]
                    }
            });
        }
    }

    if (matsCollections["statistic"].findOne({name: 'statistic'}) == undefined) {
        matsCollections["statistic"].insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: statisticOptionsMap,
                options: statisticOptionsMap[Object.keys(statisticOptionsMap)[0]],
                superiorNames: ['application'],
                controlButtonCovered: true,
                unique: false,
                default: statisticOptionsMap[Object.keys(statisticOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["statistic"].findOne({name: 'statistic'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, statisticOptionsMap)) {
            // have to reload statistic data
            matsCollections["statistic"].update({name: 'statistic'}, {
                $set: {
                    optionsMap: statisticOptionsMap,
                    options: statisticOptionsMap[Object.keys(statisticOptionsMap)[0]],
                    default: statisticOptionsMap[Object.keys(statisticOptionsMap)[0]][0]
                    }
            });
        }
    }

    if (matsCollections["variable"].findOne({name: 'variable'}) == undefined) {
        matsCollections["variable"].insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: variableOptionsMap,
                options: variableOptionsMap[Object.keys(variableOptionsMap)[0]],
                valuesMap: variableValuesMap,
                superiorNames: ['application'],
                controlButtonCovered: true,
                unique: false,
                default: variableOptionsMap[Object.keys(variableOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["variable"].findOne({name: 'variable'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, variableOptionsMap)) {
            // have to reload variable data
            matsCollections["variable"].update({name: 'variable'}, {
                $set: {
                    optionsMap: variableOptionsMap,
                    valuesMap: variableValuesMap,
                    options: variableOptionsMap[Object.keys(variableOptionsMap)[0]],
                    default: variableOptionsMap[Object.keys(variableOptionsMap)[0]][0]
                    }
            });
        }
    }

    if (matsCollections["threshold"].findOne({name: 'threshold'}) == undefined) {
        matsCollections["threshold"].insert(
            {
                name: 'threshold',
                type: matsTypes.InputTypes.select,
                optionsMap: thresholdOptionsMap,
                options: thresholdOptionsMap[applicationOptions[0]][Object.keys(thresholdOptionsMap[applicationOptions[0]])[0]],
                valuesMap: thresholdValuesMap,
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: thresholdOptionsMap[applicationOptions[0]][Object.keys(thresholdOptionsMap[applicationOptions[0]])[0]][0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["threshold"].findOne({name: 'threshold'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, thresholdOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, thresholdValuesMap))) {
            // have to reload threshold data
            matsCollections["threshold"].update({name: 'threshold'}, {
                $set: {
                    optionsMap: thresholdOptionsMap,
                    valuesMap: thresholdValuesMap,
                    options: thresholdOptionsMap[applicationOptions[0]][Object.keys(thresholdOptionsMap[applicationOptions[0]])[0]],
                    default: thresholdOptionsMap[applicationOptions[0]][Object.keys(thresholdOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["scale"].findOne({name: 'scale'}) == undefined) {
        matsCollections["scale"].insert(
            {
                name: 'scale',
                type: matsTypes.InputTypes.select,
                optionsMap: scaleOptionsMap,
                options: scaleOptionsMap[applicationOptions[0]][Object.keys(scaleOptionsMap[applicationOptions[0]])[0]],
                valuesMap: scaleValuesMap,
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: scaleOptionsMap[applicationOptions[0]][Object.keys(scaleOptionsMap[applicationOptions[0]])[0]][0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["scale"].findOne({name: 'scale'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, scaleOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, scaleValuesMap))) {
            // have to reload scale data
            matsCollections["scale"].update({name: 'scale'}, {
                $set: {
                    optionsMap: scaleOptionsMap,
                    valuesMap: scaleValuesMap,
                    options: scaleOptionsMap[applicationOptions[0]][Object.keys(scaleOptionsMap[applicationOptions[0]])[0]],
                    default: scaleOptionsMap[applicationOptions[0]][Object.keys(scaleOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["truth"].findOne({name: 'truth'}) == undefined) {
        matsCollections["truth"].insert(
            {
                name: 'truth',
                type: matsTypes.InputTypes.select,
                optionsMap: truthOptionsMap,
                options: truthOptionsMap[applicationOptions[0]][Object.keys(truthOptionsMap[applicationOptions[0]])[0]],
                valuesMap: truthValuesMap,
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: truthOptionsMap[applicationOptions[0]][Object.keys(truthOptionsMap[applicationOptions[0]])[0]][0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["truth"].findOne({name: 'truth'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, truthOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, truthValuesMap))) {
            // have to reload truth data
            matsCollections["truth"].update({name: 'truth'}, {
                $set: {
                    optionsMap: truthOptionsMap,
                    valuesMap: truthValuesMap,
                    options: truthOptionsMap[applicationOptions[0]][Object.keys(truthOptionsMap[applicationOptions[0]])[0]],
                    default: truthOptionsMap[applicationOptions[0]][Object.keys(truthOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["forecast-length"].findOne({name: 'forecast-length'}) == undefined) {
        matsCollections["forecast-length"].insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: forecastLengthOptionsMap[applicationOptions[0]][Object.keys(forecastLengthOptionsMap[applicationOptions[0]])[0]],
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: forecastLengthOptionsMap[applicationOptions[0]][Object.keys(forecastLengthOptionsMap[applicationOptions[0]])[0]][0],
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time (h)",
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["forecast-length"].findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
            // have to reload forecast length data
            matsCollections["forecast-length"].update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: forecastLengthOptionsMap[applicationOptions[0]][Object.keys(forecastLengthOptionsMap[applicationOptions[0]])[0]],
                    default: forecastLengthOptionsMap[applicationOptions[0]][Object.keys(forecastLengthOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["forecast-type"].findOne({name: 'forecast-type'}) == undefined) {
        matsCollections["forecast-type"].insert(
            {
                name: 'forecast-type',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastTypeOptionsMap,
                options: forecastTypeOptionsMap[applicationOptions[0]][Object.keys(forecastTypeOptionsMap[applicationOptions[0]])[0]],
                valuesMap: forecastTypeValuesMap,
                superiorNames: ['application', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: forecastTypeOptionsMap[applicationOptions[0]][Object.keys(forecastTypeOptionsMap[applicationOptions[0]])[0]][0],
                controlButtonVisibility: 'block',
                controlButtonText: "forecast type",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["forecast-type"].findOne({name: 'forecast-type'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastTypeOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, forecastTypeValuesMap))) {
            // have to reload forecast type data
            matsCollections["forecast-type"].update({name: 'forecast-type'}, {
                $set: {
                    optionsMap: forecastTypeOptionsMap,
                    valuesMap: forecastTypeValuesMap,
                    options: forecastTypeOptionsMap[applicationOptions[0]][Object.keys(forecastTypeOptionsMap[applicationOptions[0]])[0]],
                    default: forecastTypeOptionsMap[applicationOptions[0]][Object.keys(forecastTypeOptionsMap[applicationOptions[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["valid-time"].findOne({name: 'valid-time'}) == undefined) {
        matsCollections["valid-time"].insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                optionsMap: validTimeOptionsMap,
                options: validTimeOptionsMap[Object.keys(validTimeOptionsMap)[0]],
                superiorNames: ['application'],
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                controlButtonText: "valid utc hour",
                multiple: true,
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["valid-time"].findOne({name: 'valid-time'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, validTimeOptionsMap)) {
            // have to reload valid time data
            matsCollections["valid-time"].update({name: 'valid-time'}, {
                $set: {
                    optionsMap: validTimeOptionsMap,
                    options: validTimeOptionsMap[Object.keys(validTimeOptionsMap)[0]],
                    default: validTimeOptionsMap[Object.keys(validTimeOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections["level"].findOne({name: 'level'}) == undefined) {
        matsCollections["level"].insert(
            {
                name: 'level',
                type: matsTypes.InputTypes.select,
                optionsMap: levelOptionsMap,
                options: levelOptionsMap[Object.keys(levelOptionsMap)[0]],
                superiorNames: ['application'],
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                controlButtonText: "pressure level (hPa)",
                multiple: true,
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["level"].findOne({name: 'level'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, levelOptionsMap)) {
            // have to reload level data
            matsCollections["level"].update({name: 'level'}, {
                $set: {
                    optionsMap: levelOptionsMap,
                    options: levelOptionsMap[Object.keys(levelOptionsMap)[0]],
                    default: levelOptionsMap[Object.keys(levelOptionsMap)[0]][0]
                }
            });
        }
    }
};

Meteor.startup(function () {
    matsCollections.Databases.remove({});
    if (matsCollections.Databases.find({}).count() < 0) {
        console.log('main startup: corrupted Databases collection: dropping Databases collection');
        matsCollections.Databases.drop();
    }
    if (matsCollections.Databases.find({}).count() === 0) {
        var databases = undefined;
        if (Meteor.settings == undefined || Meteor.settings.private == undefined || Meteor.settings.private.databases == undefined) {
            databases = undefined;
        } else {
            databases = Meteor.settings.private.databases;
        }
        if (databases !== null && databases !== undefined && Array.isArray(databases)) {
            for (var di = 0; di < databases.length; di++) {
                matsCollections.Databases.insert(databases[di]);
            }
        }
    }

    // create list of all pools
    var allPools = [];
    // connect to the couchbase cluster
    const cbConnection = matsCollections.Databases.findOne({
        role: matsTypes.DatabaseRoles.COUCHBASE,
        status: "active"
    }, {
        host: 1,
        port: 1,
        bucket: 1,
        user: 1,
        password: 1
    });

    // the cluster and bucket are intended to be global
    if (cbConnection) {
        cbPool = new matsCouchbaseUtils.CBUtilities(cbConnection.host, cbConnection.bucket, cbConnection.user, cbConnection.password);
    }
    allPools.push({pool: "cbPool", role: matsTypes.DatabaseRoles.COUCHBASE});
    // create list of tables we need to monitor for update
    const mdr = new matsTypes.MetaDataDBRecord("cbPool", "mdata", [
        "MD:matsGui:cb-ceiling:HRRR_OPS:COMMON:V01",
    ]);
    try {
        matsMethods.resetApp({
            appPools: allPools,
            appMdr: mdr,
            appType: matsTypes.AppTypes.mats,
            dbType: matsTypes.DbTypes.couchbase
        });
    } catch (error) {
        console.log(error.message);
    }
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
// The appSpecificResetRoutines object is a special name,
// as is doCurveParams. The refreshMetaData mechanism depends on them being named that way.
appSpecificResetRoutines = [
    doCurveParams,
    doPlotParams
];
