import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';

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
                superiorNames: ['data-source'],
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
    var modelOptionsMap = {};
    var modelDateRangeMap = {};
    var regionModelOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var thresholdsModelOptionsMap = {};
    var scaleModelOptionsMap = {};
    var forecastLengthModels = [];
    var masterRegionValuesMap = {};
    var masterThresholdValuesMap = {};
    var masterScaleValuesMap = {};

    var rows;
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "SELECT short_name,description FROM region_descriptions;");
        var masterRegDescription;
        var masterShortName;
        for (var j = 0; j < rows.length; j++) {
            masterRegDescription = rows[j].description.trim();
            masterShortName = rows[j].short_name.trim();
            masterRegionValuesMap[masterShortName] = masterRegDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(modelPool, "SELECT trsh,description FROM threshold_descriptions;");
        var masterDescription;
        var masterTrsh;
        for (var j = 0; j < rows.length; j++) {
            masterDescription = rows[j].description.trim();
            masterTrsh = rows[j].trsh.trim();
            masterThresholdValuesMap[masterTrsh] = masterDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(modelPool, "SELECT scale,description FROM scale_descriptions;");
        var masterDescription;
        var masterScale;
        for (var j = 0; j < rows.length; j++) {
            masterDescription = rows[j].description.trim();
            masterScale = rows[j].scale.trim();
            masterScaleValuesMap[masterScale] = masterDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,regions,display_text,fcst_lens,trsh,scale,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i].model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_value];

            var minDate = moment.unix(rows[i].mindate).format("MM/DD/YYYY HH:mm");
            var maxDate = moment.unix(rows[i].maxdate).format("MM/DD/YYYY HH:mm");
            modelDateRangeMap[model] = {minDate: minDate, maxDate: maxDate};

            var forecastLengths = rows[i].fcst_lens;
            var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < forecastLengthArr.length; j++) {
                forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]/g, "");
            }
            forecastLengthOptionsMap[model] = forecastLengthArr;

            var thresholds = rows[i].trsh;
            var thresholdsArrRaw = thresholds.split(',').map(Function.prototype.call, String.prototype.trim);
            var thresholdsArr = [];
            var dummyThresh;
            for (var j = 0; j < thresholdsArrRaw.length; j++) {
                dummyThresh = thresholdsArrRaw[j].replace(/'|\[|\]/g, "");
                thresholdsArr.push(masterThresholdValuesMap[dummyThresh]);
            }
            thresholdsModelOptionsMap[model] = thresholdsArr;

            var scales = rows[i].scale;
            var scalesArrRaw = scales.split(',').map(Function.prototype.call, String.prototype.trim);
            var scalesArr = [];
            var dummyScale;
            for (var j = 0; j < scalesArrRaw.length; j++) {
                dummyScale = scalesArrRaw[j].replace(/'|\[|\]/g, "");
                scalesArr.push(masterScaleValuesMap[dummyScale]);
            }
            scaleModelOptionsMap[model] = scalesArr;

            var regions = rows[i].regions;
            var regionsArrRaw = regions.split(',').map(Function.prototype.call, String.prototype.trim);
            var regionsArr = [];
            var dummyRegion;
            for (var j = 0; j < regionsArrRaw.length; j++) {
                dummyRegion = regionsArrRaw[j].replace(/'|\[|\]/g, "");
                regionsArr.push(masterRegionValuesMap[dummyRegion]);
            }
            regionModelOptionsMap[model] = regionsArr;
        }

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
                dates: modelDateRangeMap,
                options: Object.keys(modelOptionsMap),   // convenience
                dependentNames: ["region", "forecast-length", "threshold", "scale", "dates"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap)[0],
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
                options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)],   // convenience
                valuesMap: masterRegionValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],
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
                    options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)]
                }
            });
        }
    }

     if (matsCollections.CurveParams.find({name: 'statistic'}).count() == 0) {
        var optionsMap = {
            'TSS (True Skill Score)': ['((sum(m0.yy)*sum(m0.nn) - sum(m0.ny)*sum(m0.yn))/((sum(m0.yy)+sum(m0.yn))*(sum(m0.ny)+sum(m0.nn)))) * 100 as stat, group_concat(((m0.yy*m0.nn - m0.ny*m0.yn)/((m0.yy+m0.yn)*(m0.ny+m0.nn))) * 100 order by m0.time) as sub_values0, group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'Nlow (metars < threshold, avg per hr)': ['avg(m0.yy+m0.yn+0.000) as stat, group_concat((m0.yy+m0.yn) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'Number', null],

            'Ntot (total metars, avg per hr)': ['avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000) as stat, group_concat((m0.yy+m0.ny+m0.yn+m0.nn) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'Number', null],

            'Ratio (Nlow / Ntot)': ['(sum(m0.yy+m0.yn+0.000)/sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000)) * 100 as stat, group_concat(((m0.yy+m0.yn)/(m0.yy+m0.ny+m0.yn+m0.nn)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', null],

            'PODy (POD of ceiling < threshold)': ['((sum(m0.yy)+0.00)/sum(m0.yy+m0.yn)) * 100 as stat, group_concat(((m0.yy)/(m0.yy+m0.yn)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'PODn (POD of ceiling > threshold)': ['((sum(m0.nn)+0.00)/sum(m0.nn+m0.ny)) * 100 as stat, group_concat(((m0.nn)/(m0.nn+m0.ny)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'FAR (False Alarm Ratio)': ['((sum(m0.ny)+0.00)/sum(m0.ny+m0.yy)) * 100 as stat, group_concat(((m0.ny)/(m0.ny+m0.yy)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 0],

            'Bias (Forecast low cigs/actual)': ['((sum(m0.yy+m0.ny)+0.00)/sum(m0.yy+m0.yn)) * 100 as stat, group_concat(((m0.yy+m0.ny)/(m0.yy+m0.yn)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'N in average (to nearest 100)': ['sum(m0.yy+m0.yn+m0.ny+m0.nn+0.000) as stat, group_concat((m0.yy+m0.yn+m0.ny+m0.nn) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'Number', null],

            'CSI (Critical Success Index)': ['((sum(m0.yy)+0.00)/sum(m0.yy+m0.ny+m0.yn)) * 100 as stat, group_concat(((m0.yy)/(m0.yy+m0.ny+m0.yn)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'HSS (Heidke Skill Score)': ['(2*(sum(m0.nn+0.00)*sum(m0.yy) - sum(m0.yn)*sum(m0.ny)) /((sum(m0.nn+0.00)+sum(m0.ny))*(sum(m0.ny)+sum(m0.yy)) +(sum(m0.nn+0.00)+sum(m0.yn))*(sum(m0.yn)+sum(m0.yy)))) * 100 as  stat, group_concat((2*(m0.nn*m0.yy - m0.yn*m0.ny) / ((m0.nn+m0.ny)*(m0.ny+m0.yy) + (m0.nn+m0.yn)*(m0.yn+m0.yy))) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100]
        };

        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula for wind (element 0 differs from element 1)
                // but stays the same (element 0 and element 1 are the same) otherwise.
                // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
                // time series we never append element 2. Element 3 is used to give us error values for error bars.
                name: 'statistic',
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

    if (matsCollections.CurveParams.find({name: 'threshold'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'threshold',
                type: matsTypes.InputTypes.select,
                optionsMap: thresholdsModelOptionsMap,
                options: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)],   // convenience
                valuesMap: masterThresholdValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]],
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
                    options: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[3]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'scale'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'scale',
                type: matsTypes.InputTypes.select,
                optionsMap: scaleModelOptionsMap,
                options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)],   // convenience
                valuesMap: masterScaleValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]],
                controlButtonVisibility: 'block',
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'scale'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, scaleModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterScaleValuesMap))) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'scale'}, {
                $set: {
                    optionsMap: scaleModelOptionsMap,
                    valuesMap: masterScaleValuesMap,
                    options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]]
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

    if (matsCollections.CurveParams.find({name: 'dieoff-forecast-length'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'dieoff-forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: {},
                options: [matsTypes.ForecastTypes.dieoff, matsTypes.ForecastTypes.singleCycle],
                superiorNames: [],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.ForecastTypes.dieoff,
                controlButtonVisibility: 'block',
                controlButtonText: 'forecast-length',
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.find({name: 'forecast-length'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]],   // convenience
                superiorNames: ['data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time",
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'valid-time'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                selected: [],
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                controlButtonText: "valid utc hour",
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
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ', '],
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "scale", "average", "forecast-length", "valid-time"
            ],
            groupSize: 6

        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'statistic', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ', '],
                ['fcst_len: ', 'dieoff-forecast-length', ', '],
                ['valid-time: ', 'valid-time', ' '],
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "scale", "valid-time", "dieoff-forecast-length"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.validtime,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ', '],
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "scale", "forecast-length"
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
            plotType: matsTypes.PlotTypes.dieoff,
            graphFunction: "graphDieOff",
            dataFunction: "dataDieOff",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.validtime,
            graphFunction: "graphValidTime",
            dataFunction: "dataValidTime",
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
            database: 'cref',
            connectionLimit: 10
        });
        matsCollections.Databases.insert({
            name: "modelSetting",
            role: "model_data",
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'readonly',
            password: 'ReadOnly@2016!',
            database: 'cref',
            connectionLimit: 10
        });
        matsCollections.Databases.insert({
            name: "metadataSetting",
            role: "metadata",
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'readonly',
            password: 'ReadOnly@2016!',
            database: 'mats_common',
            connectionLimit: 10
        });
    }

    const modelSettings = matsCollections.Databases.findOne({role: "model_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    modelPool = mysql.createPool(modelSettings);
    modelPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

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

    const metadataSettings = matsCollections.Databases.findOne({role: "metadata", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
// the pool is intended to be global
    metadataPool = mysql.createPool(metadataSettings);


    const mdr = new matsTypes.MetaDataDBRecord("modelPool", "cref", ['threshold_descriptions']);
    mdr.addRecord("sumPool", "cref", ['regions_per_model_mats_all_categories']);
    mdr.addRecord("metadataPool", "mats_common", ['region_descriptions']);
    matsMethods.resetApp(mdr);

    matsCollections.appName.insert({name: "appName", app: "compositeReflectivity"});

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


