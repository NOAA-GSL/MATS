import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

const dateInitStr = matsCollections.dateInitStr();
const dateInitStrParts = dateInitStr.split(' - ');
const startInit = dateInitStrParts[0];
const stopInit = dateInitStrParts[1];
const dstr = startInit + ' - ' + stopInit;

const kirktest = 2;

const doPlotParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotParams.remove({});
    }
    if (matsCollections.PlotParams.find().count() == 0) {
        matsCollections.PlotParams.insert(
            {
                name: 'dates',
                type: matsTypes.InputTypes.dateRange,
                options: [''],
                startDate: startInit,
                stopDate: stopInit,
                controlButtonCovered: true,
                default: dstr,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: "dateHelp.html"
            });
    }
};

const doCurveParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }
    if (matsCollections.CurveParams.find().count() == 0) {
        matsCollections.CurveParams.insert(
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
        var modelOptionsMap = {
            rapstoch0_7_spptens:'rapstoch0_7_spptens'
        };
        matsCollections.CurveParams.insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap),   // convenience
                controlButtonCovered: true,
                default: 'rapstoch0_7_spptens',
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });

        var statisticsOptionsMap = {
            "anomaly correlation":'ACC',
            "mean absolute error":'MAE',
            "mean squared error":'MSE',
            "root mean squared error":'RMSE'
        };
        var statisticOptions = Object.keys(statisticsOptionsMap);
        matsParamUtils.typeSort(statisticOptions);
        matsCollections.CurveParams.insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: statisticsOptionsMap,
                options: statisticOptions,   // convenience
                controlButtonCovered: true,
                unique: false,
                default: statisticOptions[0],
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });

        var variableOptionsMap = {
            'APCP_03':'APCP_03',
            'APCP_06':'APCP_06',
            'HGT':'HGT',
            'relative humidity':'RH',
            'temperature': 'TMP',
            'UGRD':'UGRD',
            'VGRD':'VGRD',
            'wind':'WIND',
        };
        matsCollections.CurveParams.insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: variableOptionsMap,
                options: Object.keys(variableOptionsMap).sort(),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(variableOptionsMap).sort()[0],
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });

        var forecastLeadOptionsMap = {
            3:30000,
            6:60000,
            9:90000,
            12:120000,
            15:150000,
            18:180000,
            21:210000,
            24:240000
        };
        var forecastLeadOptions = Object.keys(forecastLeadOptionsMap);
        matsParamUtils.typeSort(forecastLeadOptions);
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-lead',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLeadOptionsMap,
                options: forecastLeadOptions,   // convenience
                controlButtonCovered: true,
                unique: false,
                default: forecastLeadOptions[0],
                controlButtonVisibility: 'block',
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3,
                multiple: true
            });
    }
};

/* The format of a curveTextPattern is an array of arrays, each sub array has
 [labelString, localVariableName, delimiterString]  any of which can be null.
 Each sub array will be joined (the localVariableName is always dereferenced first)
 and then the sub arrays will be joined maintaining order.

 The curveTextPattern is found by its name which must match the corresponding PlotGraphFunctions.PlotType value.
 See curve_item.js and graph.js.
 */
const doCurveTextPatterns = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveTextPatterns.remove({});
    }
    if (matsCollections.CurveTextPatterns.find().count() == 0) {
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ':'],
                ['', 'statistic', ':'],
                ['fcst_lead:', 'forecast-lead',''],
            ],
            displayParams: [
                "label","data-source","statistic","variable","forecast-lead"
            ],
            groupSize: 6

        });
    }
};

const doSavedCurveParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.SavedCurveParams.remove({});
    }
    if (matsCollections.SavedCurveParams.find().count() == 0) {
        matsCollections.SavedCurveParams.insert({clName: 'changeList', changeList: []});
    }
};

const doPlotGraph = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotGraphFunctions.remove({});
    }
    if (matsCollections.PlotGraphFunctions.find().count() == 0) {
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            graphFunction: "graphSeries",
            dataFunction: "dataSeries",
            checked: true
        });
    }
};


Meteor.startup(function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Databases.remove({});
    }
    if (matsCollections.Databases.find().count() == 0) {
        matsCollections.Databases.insert({
            name: "mv_bonny",
            role: "model_data",
            status: "active",
            host: 'hwp-vdbdev.pwx.noaa.gov',
            user: 'metviewer',
            password: 'M3tV1eW3r2015!',
            database: 'mv_bonny',
            connectionLimit: 100
        });
    }

    var mvConnection = matsCollections.Databases.findOne({role: "model_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    connectionPool = mysql.createPool(mvConnection);
    // appVersion has to be done in the server context in the build context of a specific app. It is written by the build script
    const appVersion = Assets.getText('version').trim();
    matsMethods.resetApp({appName:'Test MET UA-TS', appVersion:appVersion});
    console.log("Running in " + process.env.NODE_ENV + " mode... App version is " + matsCollections.Settings.findOne().version);
    console.log("process.env", JSON.stringify(process.env, null, 2));
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
appSpecificResetRoutines = {
    doPlotGraph:doPlotGraph,
    doCurveParams:doCurveParams,
    doSavedCurveParams:doSavedCurveParams,
    doPlotParams:doPlotParams,
    doCurveTextPatterns:doCurveTextPatterns
};

