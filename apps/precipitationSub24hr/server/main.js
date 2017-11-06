import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

var modelOptionsMap = {};
var regionModelOptionsMap = {};
var forecastLengthOptionsMap = {};
// this should be in the metdata someday
var thresholdsModelOptionsMap = {};
var forecastLengthModels = [];
var masterRegionValuesMap = {};
var masterThresholdValuesMap = {};
const dateInitStr = matsCollections.dateInitStr();
const dateInitStrParts = dateInitStr.split(' - ');
const startInit = dateInitStrParts[0];
const stopInit = dateInitStrParts[1];
const dstr = startInit + ' - ' + stopInit;

const doPlotParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
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
                options: [matsTypes.PlotFormats.matching, matsTypes.PlotFormats.pairwise, matsTypes.PlotFormats.none],
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
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }

    //************************************************************************************************
    // var rows;
    // try {
    //     rows = matsDataUtils.simplePoolQueryWrapSynchronous(metadataPool, "SELECT short_name,description FROM region_descriptions;");
    //     var masterRegDescription;
    //     var masterShortName;
    //     for (var j = 0; j < rows.length; j++) {
    //         masterRegDescription = rows[j].description.trim();
    //         masterShortName = rows[j].short_name.trim();
    //         masterRegionValuesMap[masterShortName] = masterRegDescription;
    //     }
    // } catch (err) {
    //     console.log(err.message);
    // }
    //************************************************************************************************
    //The commented block above will be used once proper metadata is implemented. For now, this is the
    //hardcoded workaround.
    //************************************************************************************************

    masterRegionValuesMap = {
        'CONUS': 'CONUS',
        'EUS': 'Eastern US',
        'WUS': 'Western US',
        'NE': 'Northeastern US',
        'SE': 'Southeastern US'
    };

    //************************************************************************************************
    // try {
    //     rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool, "SELECT trsh,description FROM threshold_descriptions;");
    //     var masterDescription;
    //     var masterTrsh;
    //     for (var j = 0; j < rows.length; j++) {
    //         masterDescription = rows[j].description.trim();
    //         masterTrsh = rows[j].trsh.trim();
    //         masterThresholdValuesMap[masterTrsh] = masterDescription;
    //     }
    // } catch (err) {
    //     console.log(err.message);
    // }
    //************************************************************************************************
    //The commented block above will be used once proper metadata is implemented. For now, this is the
    //hardcoded workaround.
    //************************************************************************************************

    masterThresholdValuesMap = {
        '1': '0.01 (precip >= 0.01 in)',
        '10': '0.10 (precip >= 0.10 in)',
        '25': '0.25 (precip >= 0.25 in)',
        '50': '0.50 (precip >= 0.50 in)',
        '100': '1.00 (precip >= 1.00 in)',
        '150': '1.50 (precip >= 1.50 in)',
        '200': '2.00 (precip >= 2.00 in)',
        '300': '3.00 (precip >= 3.00 in)'
    };

    //************************************************************************************************
    // try {
    //     rows = matsDataUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,regions,display_text,fcst_lens,trsh from regions_per_model_mats_all_categories;");
    //     for (var i = 0; i < rows.length; i++) {
    //
    //         var model_value = rows[i].model.trim();
    //         var model = rows[i].display_text.trim();
    //         modelOptionsMap[model] = [model_value];
    //
    //         var forecastLengths = rows[i].fcst_lens;
    //         var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
    //         for (var j = 0; j < forecastLengthArr.length; j++) {
    //             forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]/g, "");
    //         }
    //         forecastLengthOptionsMap[model] = forecastLengthArr;
    //
    //         var thresholds = rows[i].trsh;
    //         var thresholdsArrRaw = thresholds.split(',').map(Function.prototype.call, String.prototype.trim);
    //         var thresholdsArr = [];
    //         var dummyThresh;
    //         for (var j = 0; j < thresholdsArrRaw.length; j++) {
    //             dummyThresh = thresholdsArrRaw[j].replace(/'|\[|\]/g, "");
    //             thresholdsArr.push(masterThresholdValuesMap[dummyThresh]);
    //         }
    //         thresholdsModelOptionsMap[model] = thresholdsArr;
    //
    //         var regions = rows[i].regions;
    //         var regionsArrRaw = regions.split(',').map(Function.prototype.call, String.prototype.trim);
    //         var regionsArr = [];
    //         var dummyRegion;
    //         for (var j = 0; j < regionsArrRaw.length; j++) {
    //             dummyRegion = regionsArrRaw[j].replace(/'|\[|\]/g, "");
    //             regionsArr.push(masterRegionValuesMap[dummyRegion]);
    //         }
    //         regionModelOptionsMap[model] = regionsArr;
    //     }
    //
    // } catch (err) {
    //     console.log(err.message);
    // }
    //************************************************************************************************
    //The commented block above will be used once proper metadata is implemented. For now, this is the
    //hardcoded workaround.
    //************************************************************************************************

    var regionsArr = [];
    var prevModel = "";

    try {
        const rows = matsDataUtils.simplePoolQueryWrapSynchronous(sumPool, "show tables;");
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i]['Tables_in_precip2'].replace(/_[0-80]*km.*/g, "");
            var model = model_value;    //could change model to be a more descriptive display text.

            if (Object.values(modelOptionsMap).indexOf(model_value) === -1) {

                modelOptionsMap[model] = [model_value];

                var thresholdsArr = Object.values(masterThresholdValuesMap);
                thresholdsModelOptionsMap[model] = thresholdsArr;

            }

            if (prevModel !== model && prevModel !== "") {
                regionModelOptionsMap[prevModel] = regionsArr;
                regionsArr = [];
            }

            var region_value = rows[i]['Tables_in_precip2'].replace(/.*[0-80]*km_/g, "");

            if (regionsArr.indexOf(masterRegionValuesMap[region_value]) === -1) {
                regionsArr.push(masterRegionValuesMap[region_value]);
            }

            prevModel = model;

        }
        regionModelOptionsMap[prevModel] = regionsArr;

    } catch (err) {
        console.log(err.message);
    }


    if (matsCollections.CurveParams.find({name: 'label'}).count() == 0) {
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
    }

    if (matsCollections.CurveParams.find({name: 'data-source'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap),   // convenience
                dependentNames: ["region", "threshold"],
                controlButtonCovered: true,
                default: 'HRRR',
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'data-source'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap)
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'region'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionModelOptionsMap,
                options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],   // convenience
                valuesMap: masterRegionValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'region'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterRegionValuesMap))) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'region'}, {
                $set: {
                    optionsMap: regionModelOptionsMap,
                    valuesMap: masterRegionValuesMap,
                    options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'statistic'}).count() == 0) {
        var optionsMap = {
            'CSI (Critical Success Index)': ['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny+m0.yn+0.000) as stat'],
            'Bias (Forecast / Observed)': ['(sum(m0.yy+m0.ny)+0.00)/sum(m0.yy+m0.yn+0.000) as stat'],
            'PODy (POD of precip > threshold)': ['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny+0.000) as stat'],
            'PODn (POD of precip < threshold)': ['(sum(m0.nn)+0.00)/sum(m0.nn+m0.yn+0.000) as stat'],
            'FAR (False Alarm Ratio)': ['(sum(m0.yn)+0.00)/sum(m0.yn+m0.yy)+0.000 as stat'],
            'TSS (True Skill Score)': ['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny)+(sum(m0.nn)+0.00)/sum(m0.nn+m0.yn) - 1. as stat'],
            'HSS (Heidke Skill Score)': ['2*(sum(m0.nn+0.00)*sum(m0.yy) - sum(m0.yn)*sum(m0.ny))/((sum(m0.nn+0.00)+sum(m0.ny))*(sum(m0.ny)+sum(m0.yy))+(sum(m0.nn+0.00)+sum(m0.yn))*(sum(m0.yn)+sum(m0.yy))) as stat'],
            'Ratio (fcst / total)': ['sum(m0.yy+m0.ny+0.000)/sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000) as stat']
        };

        matsCollections.CurveParams.insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'CSI (Critical Success Index)',
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.find({name: 'threshold'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'threshold',
                type: matsTypes.InputTypes.select,
                optionsMap: thresholdsModelOptionsMap,
                options: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]],   // convenience
                valuesMap: masterThresholdValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'threshold'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, thresholdsModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterThresholdValuesMap))) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'threshold'}, {
                $set: {
                    optionsMap: thresholdsModelOptionsMap,
                    valuesMap: masterThresholdValuesMap,
                    options: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'average'}).count() == 0) {
        optionsMap = {
            'None': ['ceil(3600*floor(m0.time/3600))'],
            '1D': ['ceil(86400*floor(m0.time/86400)+86400/2)'],
            '3D': ['ceil(259200*floor(m0.time/259200)+259200/2)'],
            '7D': ['ceil(604800*floor(m0.time/604800)+604800/2)'],
            '30D': ['ceil(2592000*floor(m0.time/2592000)+2592000/2)'],
            '60D': ['ceil(5184000*floor(m0.time/5184000)+5184000/2)']
        };

        matsCollections.CurveParams.insert(
            {
                name: 'average',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                selected: 'None',
                default: 'None',
                controlButtonVisibility: 'block',
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.find({name: 'forecast-type'}).count() == 0) {
        optionsMap = {
            '1 hr accums (1 hr total)': '1',
            '6 hr accums (6 hr total)': '6',
            '12 hr accums (6 hr total)': '12'
        };

        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula for wind (element 0 differs from element 1)
                // but stays the same (element 0 and element 1 are the same) otherwise.
                // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
                // time series we never append element 2. Element 3 is used to give us error values for error bars.
                name: 'forecast-type',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.find({name: 'scale'}).count() == 0) {
        optionsMap = {
            '3 km grid': '03km',
            '13 km grid': '13km',
            '20 km grid': '20km',
            '40 km grid': '40km',
            '80 km grid': '80km'
        };

        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula for wind (element 0 differs from element 1)
                // but stays the same (element 0 and element 1 are the same) otherwise.
                // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
                // time series we never append element 2. Element 3 is used to give us error values for error bars.
                name: 'scale',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[2],
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
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
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveTextPatterns.remove({});
    }
    if (matsCollections.CurveTextPatterns.find().count() == 0) {
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ':'],
                ['', 'regionName', ', '],
                ['', 'threshold', ' '],
                ['', 'statistic', ' '],
                ['', 'forecast-type', ' '],
                ['', 'scale', ' '],
                ['avg:', 'average', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "average", "forecast-type", "scale"
            ],
            groupSize: 6

        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.threshold,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ':'],
                ['', 'regionName', ', '],
                ['', 'statistic', ' '],
                ['', 'forecast-type', ' '],
                ['', 'scale', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "forecast-type", "scale"
            ],
            groupSize: 6
        });
    }
};

const doSavedCurveParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.SavedCurveParams.remove({});
    }
    if (matsCollections.SavedCurveParams.find().count() == 0) {
        matsCollections.SavedCurveParams.insert({clName: 'changeList', changeList: []});
    }
};

const doPlotGraph = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotGraphFunctions.remove({});
    }
    if (matsCollections.PlotGraphFunctions.find().count() == 0) {
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            graphFunction: "graphSeries",
            dataFunction: "dataSeries",
            checked: true
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.threshold,
            graphFunction: "graphThreshold",
            dataFunction: "dataThreshold",
            checked: false
        });
    }
};


Meteor.startup(function () {

    matsCollections.Databases.remove({});
    if (matsCollections.Databases.find().count() == 0) {
        matsCollections.Databases.insert({
            name: "sumSetting",
            role: "sum_data",
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'readonly',
            password: 'ReadOnly@2016!',
            database: 'precip2',
            connectionLimit: 10
        });
    }

    const sumSettings = matsCollections.Databases.findOne({role: "sum_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    sumPool = mysql.createPool(sumSettings);
    sumPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "precip2", ['regions_per_model_mats_all_categories']);
    matsMethods.resetApp(mdr);
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
appSpecificResetRoutines = {
    doPlotGraph: doPlotGraph,
    doCurveParams: doCurveParams,
    doSavedCurveParams: doSavedCurveParams,
    doPlotParams: doPlotParams,
    doCurveTextPatterns: doCurveTextPatterns
};


