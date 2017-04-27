import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

var modelOptionsMap = {};
var myModels = [];
var regionModelOptionsMap = {};
var modelTableMap = {};
var forecastLengthOptionsMap = {};
var forecastLengthModels = [];
const dateInitStr = matsCollections.dateInitStr();
const dateInitStrParts = dateInitStr.split(' - ');
const startInit = dateInitStrParts[0];
const stopInit = dateInitStrParts[1];
const dstr = startInit + ' - ' + stopInit;

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

        var plotFormats = {};
        plotFormats[matsTypes.PlotFormats.matching] = 'show matching diffs';
        plotFormats[matsTypes.PlotFormats.pairwise] = 'pairwise diffs';
        plotFormats[matsTypes.PlotFormats.none] = 'no diffs';
        matsCollections.PlotParams.insert(
            {
                name: 'plotFormat',
                type: matsTypes.InputTypes.radioGroup,
                optionsMap: plotFormats,
                options: [matsTypes.PlotFormats.matching,matsTypes.PlotFormats.pairwise,matsTypes.PlotFormats.none],
                default: matsTypes.PlotFormats.none,
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
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
                options: [],   // convenience
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
        matsCollections.CurveParams.insert(
            {
                name: 'model',
                type: matsTypes.InputTypes.select,
                optionsMap:modelOptionsMap,
                options:Object.keys(modelOptionsMap),   // convenience
                dependentNames: ["region", "forecast-length"],
                controlButtonCovered: true,
                default: 'HRRR',
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });
        matsCollections.CurveParams.insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap:regionModelOptionsMap,
                options:regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],   // convenience
                superiorNames: ['model'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });

        var optionsMap = {

            'TSS (True Skill Score)':['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny) +(sum(m0.nn)+0.00)/sum(m0.nn+m0.yn) - 1. as stat,' +
            'count(m0.nn)/1000 as N0, avg(m0.yy+m0.ny+0.000)/1000 as Nlow0, avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000)/1000 as N_times'],


            'Bias (Model - RAOB)': ['(sum(m0.yy+m0.yn)+0.00)/sum(m0.yy+m0.ny) as stat,'+'count(m0.nn)/1000 as N0,avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000)/1000 as N_times'],

            'Nlow(metars<thresh,avg per hr)': ['avg(m0.yy+m0.ny+0.000)/1000 as stat,'+'count(m0.nn)/1000 as N0,avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000)/1000 as N_times'],

            'Ntot(total metars,avg per hr)': ['avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000)/1000 as stat,'+'count(m0.nn)/1000 as N0'],

            'Ratio(Nlow/Ntot)': ['sum(m0.yy+m0.ny+0.000)/sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000) as stat,'+'count(m0.nn)/1000 as N0'],
            'PODy (POD of ceil< thresh)':['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny) as stat,count(m0.nn)/1000 as N0'],
            'PODn (POD of ceil< thresh)':['(sum(m0.yy)+0.00)/sum(m0.yy+m0.yn) as stat,count(m0.nn)/1000 as N0'],
            'FAR(False Alarm Ratio)':['(sum(m0.yn)+0.00)/sum(m0.yn+m0.yy)  as stat,count(m0.nn)/1000 as N0'],
            'N_in_avg(to nearest 100)':['sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000)/100000  as stat,count(m0.nn)/1000 as N0'],
            'ETS (Equitable Treat Score)':[' (sum(m0.yy)-(sum(m0.yy+m0.ny)*sum(m0.yy+m0.yn)/sum(m0.yy+m0.ny+m0.yn+m0.nn))+0.00)/(sum(m0.yy+m0.ny+m0.yn) -(sum(m0.yy+m0.ny)*sum(m0.yy+m0.yn)/sum(m0.yy+m0.ny+m0.yn+m0.nn))) as stat,'+
            'count(m0.nn)/1000 as N0'],
            'CSI(Critical Success Index)':['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny+m0.yn)  as stat,count(m0.nn)/1000 as N0'],
            'HSS(Heidke Skill Score)':['2*(sum(m0.nn+0.00)*sum(m0.yy) - sum(m0.yn)*sum(m0.ny)) /((sum(m0.nn+0.00)+sum(m0.ny))*(sum(m0.ny)+sum(m0.yy)) +(sum(m0.nn+0.00)+sum(m0.yn))*(sum(m0.yn)+sum(m0.yy))) as stat,'+
            'count(m0.nn)/1000 as N0'],

        };

        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula for wind (element 0 differs from element 1)
                // but stays the same (element 0 and element 1 are the same) otherwise.
                // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
                // time series we never append element 2. Element 3 is used to give us error values for error bars.
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });



        optionsMap = {
            '60000 (any clound)': ['6000'],
            '500 (ceiling<500 feet)': ['50'],
            '3000 (ceiling <3000 feet)': ['300'],
            '1000 (ceiling <1000 feet)': ['100']
        };
        matsCollections.CurveParams.insert(
            {
                name: 'threshHold',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options:Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });
        optionsMap = {
            'None': ['ceil(3600*floor(m0.time/3600))'],
            '1D': ['ceil(' + 60 * 60 * 24 + '*floor(((m0.time))/' + 60 * 60 * 24 + ')+' + 60 * 60 * 24 + '/2)'],
            '3D': ['ceil(' + 60 * 60 * 24 * 3 + '*floor(((m0.time))/' + 60 * 60 * 24 * 3 + ')+' + 60 * 60 * 24 * 3 + '/2)'],
            '7D': ['ceil(' + 60 * 60 * 24 * 7 + '*floor(((m0.time))/' + 60 * 60 * 24 * 7 + ')+' + 60 * 60 * 24 * 7 + '/2)'],
            '30D': ['ceil(' + 60 * 60 * 24 * 30 + '*floor(((m0.time))/' + 60 * 60 * 24 * 30 + ')+' + 60 * 60 * 24 * 30 + '/2)'],
            '60D': ['ceil(' + 60 * 60 * 24 * 60 + '*floor(((m0.time))/' + 60 * 60 * 24 * 60 + ')+' + 60 * 60 * 24 * 60 + '/2)'],
            '90D': ['ceil(' + 60 * 60 * 24 * 90 + '*floor(((m0.time))/' + 60 * 60 * 24 * 90 + ')+' + 60 * 60 * 24 * 90 + '/2)'],
            '180D': ['ceil(' + 60 * 60 * 24 * 180 + '*floor(((m0.time))/' + 60 * 60 * 24 * 180 + ')+' + 60 * 60 * 24 * 180 + '/2)']
        };
        matsCollections.CurveParams.insert(
            {
                name: 'average',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options:Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                selected: 'None',
                default: 'None',
                controlButtonVisibility: 'block',
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 3
            });

        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap:forecastLengthOptionsMap,
                options:forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]],   // convenience
                superiorNames: ['model'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });

        matsCollections.CurveParams.insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                options: ['All', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                selected: 'All',
                controlButtonCovered: true,
                unique: false,
                //default: Object.keys(optionsMap)[0],
                default: 'All',
                controlButtonVisibility: 'block',
                displayOrder: 8,
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

 The curveTextPattern is found by its name which must match the corresponding matsCollections.PlotGraphFunctions.PlotType value.
 See curve_item.js and graph.js.
 */
const doCurveTextPatterns = function () {
    if (process.env.NODE_ENV === "development" ||matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveTextPatterns.remove({});
    }
    if (matsCollections.CurveTextPatterns.find().count() == 0) {
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'model', ':'],
                ['', 'regionName', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ' '],
                ['fcst_len:', 'forecast-length', 'h '],
                [' valid-time:', 'valid-time', ' '],
                ['avg:', 'average', ' ']
            ],
            displayParams: [
                "label","model","region","statistic","threshHold","average","forecast-length","valid-time"
            ],
            groupSize: 6

        });
    }
};

const doSavedCurveParams = function () {
    if (process.env.NODE_ENV === "development" ||matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.SavedCurveParams.remove({});
    }
    if (matsCollections.SavedCurveParams.find().count() == 0) {
        matsCollections.SavedCurveParams.insert({clName: 'changeList', changeList:[]});
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
            checked:true
        });
    }
};


Meteor.startup(function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Databases.remove({});
    }
    if (matsCollections.Databases.find().count() == 0) {
        matsCollections.Databases.insert({
            name:"sumSetting",
            role: "sum_data",
            status: "active",
            host        : 'wolphin.fsl.noaa.gov',
            //user        : 'writer',
            user        : 'readonly',
            //password    : 'amt1234',
            password    : 'ReadOnly@2016!',
            database    : 'ceiling_sums',
            connectionLimit : 10
        });
        matsCollections.Databases.insert({
            name:"modelSetting",
            role: "model_data",
            status: "active",
            host        : 'wolphin.fsl.noaa.gov',
            user        : 'readonly',
            password    : 'ReadOnly@2016!',
            database    : 'ceiling',
            connectionLimit : 10
        });
    }
    var modelSettings = matsCollections.Databases.findOne({role:"model_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});
    // the pool is intended to be global
    modelPool = mysql.createPool(modelSettings);
    modelPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });
    var sumSettings = matsCollections.Databases.findOne({role:"sum_data", status:"active"}, {host:1, user:1, password:1, database:1, connectionLimit:1});
    // the pool is intended to be global
    sumPool = mysql.createPool(sumSettings);
    sumPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    var rows;
    try {
        //var statement = "select table_name from information_schema.tables where table_schema='" + modelSettings.database + "'";
        var statement = "select model,model_value,regions_name from regions_per_model";
        // var qFuture = new Future();
        // modelPool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
        //     if (err != undefined) {
        //         console.log(err.message);
        //     }
        //     if (rows === undefined || rows.length === 0) {
        //         console.log('No data in database ' + modelSettings + "! query:" + statement);
        //     } else {
        //
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool,"select model,model_value,regions_name from regions_per_model;");
        for (var i = 0; i < rows.length; i++) {
            var model = rows[i].model.trim();
            var regions_name = rows[i].regions_name;
            var model_value = rows[i].model_value.trim();
            var valueList = [];
            valueList.push(model_value);
            modelOptionsMap[model] = valueList;
            var regionsArr = regions_name.split(',');
            regionModelOptionsMap[model] = regionsArr;
        }
        //     }
        //     qFuture['return']();
        // }));
        // qFuture.wait();
    } catch (err) {
        console.log(err.message);
    }

    try {
        // statement = "SELECT model, fcst_lens FROM fcst_lens_per_model;";
        // qFuture = new Future();
        // modelPool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
        //     if (err != undefined) {
        //         console.log(err.message);
        //     }
        //     if (rows === undefined || rows.length === 0) {
        //         //console.log('No data in database ' + uamatsCollections.Settings.database + "! query:" + statement);
        //         console.log('No data in database ' + modelSettings + "! query:" + statement);
        //     } else {
        //
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool,"SELECT model, fcst_lens FROM fcst_lens_per_model;");
        for (var i = 0; i < rows.length; i++) {
            var model = rows[i].model;
            var forecastLengths = rows[i].fcst_lens;
            var forecastLengthArr = forecastLengths.split(',');
            forecastLengthOptionsMap[model] = forecastLengthArr;
        }
        //     }
        //     qFuture['return']();
        // }));
        // qFuture.wait();
    } catch (err) {
        console.log(err.message);
    }

    try {
        // statement = "select id,description,short_name from region_descriptions;";
        // qFuture = new Future();
        // modelPool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
        //     if (err != undefined) {
        //         console.log(err.message);
        //     }
        //     if (rows === undefined || rows.length === 0) {
        //         console.log('No data in database ' + modelSettings.database + "! query:" + statement);
        //     } else {
        matsCollections.RegionDescriptions.remove({});
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool,"select id,description,short_name from region_descriptions;");
        for  (var i = 0; i < rows.length; i++) {
            var regionNumber = rows[i].id;
            var description = rows[i].description;
            var shortName = rows[i].short_name;
            var valueList = [];
            valueList.push(shortName);
            regionOptionsMap[description] = valueList;
            matsCollections.RegionDescriptions.insert({ regionNumber: regionNumber,shortName: shortName, description: description});
        }
        //     }
        //     qFuture['return']();
        // }));
        // qFuture.wait();
    } catch (err) {
        console.log(err.message);
    }
    // appVersion has to be done in the server context in the build context of a specific app. It is written by the build script
    const appVersion = Assets.getText('version').trim();
    matsMethods.resetApp({appName:'Ceiling', appVersion:appVersion});
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


