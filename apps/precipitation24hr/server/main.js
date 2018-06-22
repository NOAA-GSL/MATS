import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';

var modelOptionsMap = {};
var modelDateRangeMap = {};
var regionModelOptionsMap = {};
var thresholdsModelOptionsMap = {};
var scaleModelOptionsMap = {};
var fcstTypeModelOptionsMap = {};
var masterRegionValuesMap = {};
var masterThresholdValuesMap = {};
var masterScaleValuesMap = {};
var masterFcstTypeValuesMap = {};
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
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT trsh,description FROM threshold_descriptions;");
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
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT scle,description FROM scale_descriptions;");
        var masterScaleDescription;
        var masterScale;
        for (var j = 0; j < rows.length; j++) {
            masterScaleDescription = rows[j].description.trim();
            masterScale = rows[j].scle.trim();
            masterScaleValuesMap[masterScale] = masterScaleDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT fcst_type,description FROM fcst_type_descriptions;");
        var masterFcstTypeDescription;
        var masterFcstType;
        for (var j = 0; j < rows.length; j++) {
            masterFcstTypeDescription = rows[j].description.trim();
            masterFcstType = rows[j].fcst_type.trim();
            masterFcstTypeValuesMap[masterFcstType] = masterFcstTypeDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,regions,display_text,fcst_types,trsh,scle,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i].model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_value];

            var minDate = moment.unix(rows[i].mindate).format("MM/DD/YYYY HH:mm");
            var maxDate = moment.unix(rows[i].maxdate).format("MM/DD/YYYY HH:mm");
            modelDateRangeMap[model] = {minDate: minDate, maxDate: maxDate};

            var fcstTypes = rows[i].fcst_types;
            var fcstTypesArrRaw = fcstTypes.split(',').map(Function.prototype.call, String.prototype.trim);
            var fcstTypesArr = [];
            var dummyfcstType;
            for (var j = 0; j < fcstTypesArrRaw.length; j++) {
                dummyfcstType = fcstTypesArrRaw[j].replace(/'|\[|\]/g, "");
                fcstTypesArr.push(masterFcstTypeValuesMap[dummyfcstType]);
            }
            fcstTypeModelOptionsMap[model] = fcstTypesArr;

            var thresholds = rows[i].trsh;
            var thresholdsArrRaw = thresholds.split(',').map(Function.prototype.call, String.prototype.trim);
            var thresholdsArr = [];
            var dummyThresh;
            for (var j = 0; j < thresholdsArrRaw.length; j++) {
                dummyThresh = thresholdsArrRaw[j].replace(/'|\[|\]/g, "");
                thresholdsArr.push(masterThresholdValuesMap[dummyThresh]);
            }
            thresholdsModelOptionsMap[model] = thresholdsArr;

            var regions = rows[i].regions;
            var regionsArrRaw = regions.split(',').map(Function.prototype.call, String.prototype.trim);
            var regionsArr = [];
            var dummyRegion;
            for (var j = 0; j < regionsArrRaw.length; j++) {
                dummyRegion = regionsArrRaw[j].replace(/'|\[|\]/g, "");
                regionsArr.push(masterRegionValuesMap[dummyRegion]);
            }
            regionModelOptionsMap[model] = regionsArr;

            var scales = rows[i].scle;
            var scalesArrRaw = scales.split(',').map(Function.prototype.call, String.prototype.trim);
            var scalesArr = [];
            var dummyScale;
            for (var j = 0; j < scalesArrRaw.length; j++) {
                dummyScale = scalesArrRaw[j].replace(/'|\[|\]/g, "");
                scalesArr.push(masterScaleValuesMap[dummyScale]);
            }
            scaleModelOptionsMap[model] = scalesArr;
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
                dependentNames: ["region", "threshold", "scale", "forecast-type", "dates"],
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
            'TSS (True Skill Score)': ['((sum(m0.yy)*sum(m0.nn) - sum(m0.ny)*sum(m0.yn))/((sum(m0.yy)+sum(m0.yn))*(sum(m0.ny)+sum(m0.nn)))) * 100 as stat, group_concat(((m0.yy*m0.nn - m0.ny*m0.yn)/((m0.yy+m0.yn)*(m0.ny+m0.nn))) * 100 order by m0.time) as sub_values0, group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'PODy (POD of precip < threshold)': ['((sum(m0.yy)+0.00)/sum(m0.yy+m0.yn)) * 100 as stat, group_concat(((m0.yy)/(m0.yy+m0.yn)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'PODn (POD of precip > threshold)': ['((sum(m0.nn)+0.00)/sum(m0.nn+m0.ny)) * 100 as stat, group_concat(((m0.nn)/(m0.nn+m0.ny)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'FAR (False Alarm Ratio)': ['((sum(m0.ny)+0.00)/sum(m0.ny+m0.yy)) * 100 as stat, group_concat(((m0.ny)/(m0.ny+m0.yy)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 0],

            'Bias (forecast/actual)': ['((sum(m0.yy+m0.ny)+0.00)/sum(m0.yy+m0.yn)) as stat, group_concat(((m0.yy+m0.ny)/(m0.yy+m0.yn)) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'Ratio', 1],

            'CSI (Critical Success Index)': ['((sum(m0.yy)+0.00)/sum(m0.yy+m0.yn+m0.ny)) * 100 as stat, group_concat(((m0.yy)/(m0.yy+m0.yn+m0.ny)) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'HSS (Heidke Skill Score)': ['(2*(sum(m0.nn+0.00)*sum(m0.yy)-sum(m0.yn)*sum(m0.ny))/((sum(m0.nn+0.00)+sum(m0.ny))*(sum(m0.ny)+sum(m0.yy))+(sum(m0.nn+0.00)+sum(m0.yn))*(sum(m0.yn)+sum(m0.yy)))) * 100 as  stat, group_concat((2*(m0.nn*m0.yy - m0.yn*m0.ny) / ((m0.nn+m0.ny)*(m0.ny+m0.yy) + (m0.nn+m0.yn)*(m0.yn+m0.yy))) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'ETS (Equitable Threat Score)': ['(sum(m0.yy)-(sum(m0.yy+m0.ny)*sum(m0.yy+m0.yn)/sum(m0.yy+m0.ny+m0.yn+m0.nn)))/(sum(m0.yy+m0.ny+m0.yn)-(sum(m0.yy+m0.ny)*sum(m0.yy+m0.yn)/sum(m0.yy+m0.ny+m0.yn+m0.nn))) * 100 as stat, group_concat((m0.yy-((m0.yy+m0.ny)*(m0.yy+m0.yn)/(m0.yy+m0.ny+m0.yn+m0.nn)))/((m0.yy+m0.ny+m0.yn)-((m0.yy+m0.ny)*(m0.yy+m0.yn)/(m0.yy+m0.ny+m0.yn+m0.nn))) * 100 order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'x100', 100],

            'Nlow (obs < threshold, avg per hr)': ['avg(m0.yy+m0.yn+0.000) as stat, group_concat((m0.yy+m0.yn) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'Number', null],

            'Nhigh (obs > threshold, avg per hr)': ['avg(m0.nn+m0.ny+0.000) as stat, group_concat((m0.nn+m0.ny) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.nn) as N0', 'Number', null],

            'Ntot (total obs, avg per hr)': ['avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000) as stat, group_concat((m0.yy+m0.ny+m0.yn+m0.nn) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'Number', null],

            'Ratio (Nlow / Ntot)': ['(sum(m0.yy+m0.yn+0.000)/sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000)) as stat, group_concat(((m0.yy+m0.yn)/(m0.yy+m0.ny+m0.yn+m0.nn)) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'Ratio', null],

            'Ratio (Nhigh / Ntot)': ['(sum(m0.nn+m0.ny+0.000)/sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000)) as stat, group_concat(((m0.nn+m0.ny)/(m0.yy+m0.ny+m0.yn+m0.nn)) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.nn) as N0', 'Ratio', null],

            'N in average (to nearest 100)': ['sum(m0.yy+m0.yn+m0.ny+m0.nn+0.000) as stat, group_concat((m0.yy+m0.yn+m0.ny+m0.nn) order by m0.time) as sub_values0 ,group_concat(m0.time order by m0.time) as sub_secs0, count(m0.yy) as N0', 'Number', null]
        };
        matsCollections.CurveParams.insert(
            {
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
                options: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]],   // convenience
                valuesMap: masterThresholdValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
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
            'None': ['m0.time'],
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
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.find({name: 'forecast-type'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula for wind (element 0 differs from element 1)
                // but stays the same (element 0 and element 1 are the same) otherwise.
                // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
                // time series we never append element 2. Element 3 is used to give us error values for error bars.
                name: 'forecast-type',
                type: matsTypes.InputTypes.select,
                optionsMap: fcstTypeModelOptionsMap,
                options: fcstTypeModelOptionsMap[Object.keys(fcstTypeModelOptionsMap)[0]],   // convenience
                valuesMap: masterFcstTypeValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: fcstTypeModelOptionsMap[Object.keys(fcstTypeModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'forecast-type'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, fcstTypeModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterFcstTypeValuesMap))) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'forecast-type'}, {
                $set: {
                    optionsMap: fcstTypeModelOptionsMap,
                    valuesMap: masterFcstTypeValuesMap,
                    options: fcstTypeModelOptionsMap[Object.keys(fcstTypeModelOptionsMap)[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'scale'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula for wind (element 0 differs from element 1)
                // but stays the same (element 0 and element 1 are the same) otherwise.
                // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
                // time series we never append element 2. Element 3 is used to give us error values for error bars.
                name: 'scale',
                type: matsTypes.InputTypes.select,
                optionsMap: scaleModelOptionsMap,
                options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]],   // convenience
                valuesMap: masterScaleValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]][0],
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
                ['', 'regionName', ', '],
                ['', 'threshold', ' '],
                ['', 'statistic', ', '],
                ['fcst_type: ', 'forecast-type', ', '],
                ['', 'scale', ', '],
                ['avg: ', 'average', ' ']
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
                ['', 'data-source', ' in '],
                ['', 'regionName', ', '],
                ['', 'statistic', ', '],
                ['fcst_type: ', 'forecast-type', ', '],
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
            database: 'precip',
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

    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "precip", ['regions_per_model_mats_all_categories', 'threshold_descriptions', 'scale_descriptions', 'fcst_type_descriptions']);
    mdr.addRecord("metadataPool", "mats_common", ['region_descriptions']);
    matsMethods.resetApp(mdr);

    matsCollections.appName.insert({name: "appName", app: "precipitation24hr"});

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


