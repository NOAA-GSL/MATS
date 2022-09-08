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
                superiorNames: ['data-source', 'validation-data-source'],
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
                superiorNames: ['data-source', 'validation-data-source'],
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
const doCurveParams = async function () {
    // force a reset if requested - simply remove all the existing params to force a reload
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        const params = matsCollections.CurveParamsInfo.find({"curve_params": {"$exists": true}}).fetch()[0]["curve_params"];
        for (var cp = 0; cp < params.length; cp++) {
            matsCollections[params[cp]].remove({});
        }
    }
    let metadata = {}
    try {
        const rows = await cbPool.queryCB('select meta().id from mdata where type="MD" and docType="matsGui" and version = "V01"  and subset="COMMON"');
        if (rows.includes("queryCB ERROR: ")) {
            // have this local try catch fail properly if the metadata isn't there
            throw new Error(rows);
        }
        var modelOptionsMap = {};
        var regionOptionsMap = {};
        var forecastLengthOptionsMap = {};
        var applicationOptionMap = {}

        for (let i = 0; i < rows.length; i++) {
            let metadataId=rows[i]['id'];
            result = await cbPool.getCB(metadataId);
            metadata[metadataId]=result.content;
            modelOptionsMap[metadataId] = modelOptionsMap[metadataId] === undefined? {} : modelOptionsMap[metadataId];
            regionOptionsMap[metadataId] = regionOptionsMap[metadataId] === undefined? {} : regionOptionsMap[metadataId];
            forecastLengthOptionsMap[metadataId] = forecastLengthOptionsMap[metadataId] === undefined? {} : forecastLengthOptionsMap[metadataId];
            let mdata = metadata[metadataId]
            let app = mdata['app']
            let model = mdata['model'];
            let displayText = mdata["displayText"];
            let regions = mdata['regions'];
            let fcstLens = mdata['fcstLens'];
            modelOptionsMap[metadataId][model] = displayText;
            regionOptionsMap[metadataId]["regions"] = regions;
            forecastLengthOptionsMap[metadataId]["forecastLeadTimes"] = fcstLens;
            applicationOptionMap[app] = app;
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
        optionsMap = applicationOptionMap;
        matsCollections["application"].insert(
            {
                name: 'application',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                default: optionsMap[0],
                controlButtonCovered: true,
                unique: false,
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });
    }

    if (matsCollections["data-source"].findOne({name: 'data-source'}) == undefined) {
        optionsMap = modelOptionsMap;
        firstOptionMap = Object.keys(modelOptionsMap)[0];
        matsCollections["data-source"].insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                superiorNames: ['application'],
                dependentNames: ['region', 'forecast-length', 'dates'],
                optionsMap: optionsMap,
                options: Object.keys(firstOptionMap),
                default: Object.keys(firstOptionMap)[0],
                controlButtonCovered: true,
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["data-source"].findOne({name: 'data-source'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
            // have to reload model data
            matsCollections["data-source"].update({name: 'data-source'}, {
                $set: {
                    optionsMap: optionsMap,
                    options: Object.keys(firstOptionMap),
                    default: Object.keys(firstOptionMap)[0],
                    }
            });
        }
    }

    if (matsCollections["validation-data-source"].findOne({name: 'validation-data-source'}) == undefined) {
        optionsMap = modelOptionsMap;
        firstOptionMap = Object.keys(modelOptionsMap)[0];
        matsCollections["validation-data-source"].insert(
            {
                name: 'validation-data-source',
                type: matsTypes.InputTypes.select,
                superiorNames: ['application'],
                dependentNames: ['region', 'forecast-length', 'dates'],
                optionsMap: optionsMap,
                options: Object.keys(firstOptionMap),
                default: Object.keys(firstOptionMap)[0],
                controlButtonCovered: true,
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["validation-data-source"].findOne({name: 'validation-data-source'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
            // have to reload model data
            matsCollections["validation-data-source"].update({name: 'validation-data-source'}, {
                $set: {
                    optionsMap: optionsMap,
                    options: Object.keys(firstOptionMap),
                    default: Object.keys(firstOptionMap)[0],
                    }
            });
        }
    }

    if (matsCollections["region"].findOne({name: 'region'}) == undefined) {
        optionsMap = regionOptionsMap;
        firstOptionMap = Object.keys(regionOptionsMap)[0];
        matsCollections["region"].insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(firstOptionMap),
                default: Object.keys(firstOptionMap)[0],
                superiorNames: ['data-source', 'validation-data-source'],
                controlButtonCovered: true,
                unique: false,
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["region"].findOne({name: 'region'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionOptionsMap)) {
            // have to reload region data
            matsCollections["region"].update({name: 'region'}, {
                $set: {
                    optionsMap: optionsMap,
                    options: Object.keys(firstOptionMap),
                    default: Object.keys(firstOptionMap)[0],
                    }
            });
        }
    }

    if (matsCollections["variable"].findOne({name: 'variable'}) == undefined) {
        const optionsMap = {
            "T2m":"t2m",
            "Td2m":"td2m",
            "W10m":"w10m",
            "Ceiling500":"ceiling500",
            "Ceiling1000":"ceiling1000",
            "Reflect25dbz":"reflect25dbz",
            "Reflect35dbz":"reflect35dbz",
            "850mbT":"850mbt",
            "850mbRHobT":"850rhobt",
            "850mbW":"850mbw",
        };
        matsCollections["variable"].insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });
    }

    if (matsCollections["statistic"].findOne({name: 'statistic'}) == undefined) {
        const optionsMap = {
            'CSI (Critical Success Index)': ['ctc', 'x100', 100],

            'TSS (True Skill Score)': ['ctc', 'x100', 100],

            'PODy (POD of value < threshold)': ['ctc', 'x100', 100],

            'PODn (POD of value > threshold)': ['ctc', 'x100', 100],

            'FAR (False Alarm Ratio)': ['ctc', 'x100', 0],

            'Bias (forecast/actual)': ['ctc', 'Ratio', 1],

            'HSS (Heidke Skill Score)': ['ctc', 'x100', 100],

            'ETS (Equitable Threat Score)': ['ctc', 'x100', 100],

            'Nlow (Number of obs < threshold (hits + misses))': ['ctc', 'Number', null],

            'Nhigh (Number of obs > threshold (false alarms + correct nulls))': ['ctc', 'Number', null],

            'Ntot (Total number of obs, (Nlow + Nhigh))': ['ctc', 'Number', null],

            'Ratio Nlow / Ntot ((hit + miss)/(hit + miss + fa + cn))': ['ctc', 'Ratio', null],

            'Ratio Nhigh / Ntot ((fa + cn)/(hit + miss + fa + cn))': ['ctc', 'Ratio', null],

            'N times*levels(*stations if station plot) per graph point': ['ctc', 'Number', null]
        };
        matsCollections["statistic"].insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4
            });
    }

    if (matsCollections["threshold"].findOne({name: 'threshold'}) == undefined) {
        const optionsMap = {
            "500":"Ceiling<500ft",
            "1000":"Ceiling<1000ft",
            "3000":"Ceiling<3000ft",
            "60000":"Ceiling<60000ft"
        };
        matsCollections["threshold"].insert(
            {
                name: 'threshold',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                multiple: true,
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4
            });
    }

    if (matsCollections["forecast-length"].findOne({name: 'forecast-length'}) == undefined) {
        matsCollections["forecast-length"].insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: forecastLengthOptionsMap,
                superiorNames: ['data-source', 'validation-data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: 6,
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time (h)",
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["forecast-length"].findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
            // have to reload forecast length data
            matsCollections["forecast-length"].update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: Object.keys(forecastLengthOptionsMap)
                }
            });
        }
    }

    if (matsCollections["valid-time"].findOne({name: 'valid-time'}) == undefined) {
        matsCollections["valid-time"].insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                controlButtonCovered: true,
                selected: [],
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                controlButtonText: "valid utc hour",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3,
                multiple: true
            });
    }

    if (matsCollections["average"].findOne({name: 'average'}) == undefined) {
        const optionsMap = {
            'None': ['m0.fcstValidEpoch'],
            '3hr': ['ceil(' + 3600 * 3 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 3 + '/2)/' + 3600 * 3 + '))'],
            '6hr': ['ceil(' + 3600 * 6 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 6 + '/2)/' + 3600 * 6 + '))'],
            '12hr': ['ceil(' + 3600 * 12 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 12 + '/2)/' + 3600 * 12 + '))'],
            '1D': ['ceil(' + 3600 * 24 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 24 + '/2)/' + 3600 * 24 + '))'],
            '3D': ['ceil(' + 3600 * 24 * 3 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 24 * 3 + '/2)/' + 3600 * 24 * 3 + '))'],
            '7D': ['ceil(' + 3600 * 24 * 7 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 24 * 7 + '/2)/' + 3600 * 24 * 7 + '))'],
            '30D': ['ceil(' + 3600 * 24 * 30 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 24 * 30 + '/2)/' + 3600 * 24 * 30 + '))'],
            '60D': ['ceil(' + 3600 * 24 * 60 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 24 * 60 + '/2)/' + 3600 * 24 * 60 + '))'],
            '90D': ['ceil(' + 3600 * 24 * 90 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 24 * 90 + '/2)/' + 3600 * 24 * 90 + '))'],
            '180D': ['ceil(' + 3600 * 24 * 180 + '*floor(((m0.fcstValidEpoch)+' + 3600 * 24 * 180 + '/2)/' + 3600 * 24 * 180 + '))'],
        };
        matsCollections["average"].insert(
            {
                name: 'average',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                controlButtonCovered: true,
                unique: false,
                selected: 'None',
                default: 'None',
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3
            });
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
