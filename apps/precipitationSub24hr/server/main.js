/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';

// determined in doCurveParanms
var minDate;
var maxDate;
var dstr;

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
                startDate: minDate,
                stopDate: maxDate,
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
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3
            });

        const yAxisOptionsMap = {
            "Relative frequency": ["relFreq"],
            "Number": ["number"]
        };
        matsCollections.PlotParams.insert(
            {
                name: 'histogram-yaxis-controls',
                type: matsTypes.InputTypes.select,
                optionsMap: yAxisOptionsMap,
                options: Object.keys(yAxisOptionsMap),
                default: Object.keys(yAxisOptionsMap)[0],
                controlButtonCovered: true,
                controlButtonText: 'Y-axis mode',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });

        const binOptionsMap = {
            "Default bins": ["default"],
            "Set number of bins": ["binNumber"],
            "Make zero a bin bound": ["zeroBound"],
            "Choose a bin bound": ["chooseBound"],
            "Set number of bins and make zero a bin bound": ["binNumberWithZero"],
            "Set number of bins and choose a bin bound": ["binNumberWithChosen"],
            "Manual bins": ["manual"],
            "Manual bin start, number, and stride": ["manualStride"]
        };
        matsCollections.PlotParams.insert(
            {
                name: 'histogram-bin-controls',
                type: matsTypes.InputTypes.select,
                optionsMap: binOptionsMap,
                options: Object.keys(binOptionsMap),
                hideOtherFor: {
                    'bin-number': ["Default bins", "Make zero a bin bound", "Manual bins", "Choose a bin bound"],
                    'bin-pivot': ["Default bins", "Set number of bins", "Make zero a bin bound", "Set number of bins and make zero a bin bound", "Manual bins", "Manual bin start, number, and stride"],
                    'bin-start': ["Default bins", "Set number of bins", "Make zero a bin bound", "Choose a bin bound", "Set number of bins and make zero a bin bound", "Set number of bins and choose a bin bound", "Manual bins"],
                    'bin-stride': ["Default bins", "Set number of bins", "Make zero a bin bound", "Choose a bin bound", "Set number of bins and make zero a bin bound", "Set number of bins and choose a bin bound", "Manual bins"],
                    'bin-bounds': ["Default bins", "Set number of bins", "Make zero a bin bound", "Choose a bin bound", "Set number of bins and make zero a bin bound", "Set number of bins and choose a bin bound", "Manual bin start, number, and stride"],
                },
                default: Object.keys(binOptionsMap)[0],
                controlButtonCovered: true,
                controlButtonText: 'customize bins',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-number',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: '2',
                max: '100',
                step: 'any',
                default: '12',
                controlButtonCovered: true,
                controlButtonText: "number of bins",
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-pivot',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: '-10000',
                max: '10000',
                step: 'any',
                default: '0',
                controlButtonCovered: true,
                controlButtonText: "bin pivot value",
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-start',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: '-10000',
                max: '10000',
                step: 'any',
                default: '0',
                controlButtonCovered: true,
                controlButtonText: "bin start",
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-stride',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: '-10000',
                max: '10000',
                step: 'any',
                default: '0',
                controlButtonCovered: true,
                controlButtonText: "bin stride",
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-bounds',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],
                default: ' ',
                controlButtonCovered: true,
                controlButtonText: "bin bounds (enter numbers separated by commas)",
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 2
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
};

const doCurveParams = function () {
    // force a reset if requested - simply remove all the existing params to force a reload
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }
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

    try {
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "select short_name,description from region_descriptions;");
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
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select trsh,description from threshold_descriptions;");
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
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select scle,description from scale_descriptions;");
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
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select fcst_type,description from fcst_type_descriptions;");
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
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,regions,display_text,fcst_types,trsh,scle,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i].model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_value];

            var rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
            var rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
            modelDateRangeMap[model] = {minDate: rowMinDate, maxDate: rowMaxDate};

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

            var scales = rows[i].scle;
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

    if (matsCollections.CurveParams.findOne({name: 'label'}) == undefined) {
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
    }

    if (matsCollections.CurveParams.findOne({name: 'data-source'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                dates: modelDateRangeMap,
                options: Object.keys(modelOptionsMap),
                dependentNames: ["region", "threshold", "scale", "forecast-type", "dates", "curve-dates"],
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
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap) ||
            (!matsDataUtils.areObjectsEqual(currentParam.dates, modelDateRangeMap))) {
            // have to reload model data
            if (process.env.NODE_ENV === "development") {
                console.log("updating model data")
            }
            matsCollections.CurveParams.update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    dates: modelDateRangeMap,
                    options: Object.keys(modelOptionsMap),
                    default: Object.keys(modelOptionsMap)[0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'region'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionModelOptionsMap,
                options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],
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
            // have to reload region data
            matsCollections.CurveParams.update({name: 'region'}, {
                $set: {
                    optionsMap: regionModelOptionsMap,
                    valuesMap: masterRegionValuesMap,
                    options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],
                    default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'statistic'}) == undefined) {
        const optionsMap = {
            'TSS (True Skill Score)': ['((sum(m0.yy)*sum(m0.nn) - sum(m0.ny)*sum(m0.yn))/((sum(m0.yy)+sum(m0.yn))*(sum(m0.ny)+sum(m0.nn)))) * 100 as stat, group_concat(((m0.yy*m0.nn - m0.ny*m0.yn)/((m0.yy+m0.yn)*(m0.ny+m0.nn))) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'PODy (POD of precip > threshold)': ['((sum(m0.yy)+0.00)/sum(m0.yy+m0.yn)) * 100 as stat, group_concat(((m0.yy)/(m0.yy+m0.yn)) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'PODn (POD of precip < threshold)': ['((sum(m0.nn)+0.00)/sum(m0.nn+m0.ny)) * 100 as stat, group_concat(((m0.nn)/(m0.nn+m0.ny)) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'FAR (False Alarm Ratio)': ['((sum(m0.ny)+0.00)/sum(m0.ny+m0.yy)) * 100 as stat, group_concat(((m0.ny)/(m0.ny+m0.yy)) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 0],

            'Bias (forecast/actual)': ['((sum(m0.yy+m0.ny)+0.00)/sum(m0.yy+m0.yn)) as stat, group_concat(((m0.yy+m0.ny)/(m0.yy+m0.yn)), ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'Ratio', 1],

            'CSI (Critical Success Index)': ['((sum(m0.yy)+0.00)/sum(m0.yy+m0.yn+m0.ny)) * 100 as stat, group_concat(((m0.yy)/(m0.yy+m0.yn+m0.ny)) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'HSS (Heidke Skill Score)': ['(2*(sum(m0.nn+0.00)*sum(m0.yy)-sum(m0.yn)*sum(m0.ny))/((sum(m0.nn+0.00)+sum(m0.ny))*(sum(m0.ny)+sum(m0.yy))+(sum(m0.nn+0.00)+sum(m0.yn))*(sum(m0.yn)+sum(m0.yy)))) * 100 as  stat, group_concat((2*(m0.nn*m0.yy - m0.yn*m0.ny) / ((m0.nn+m0.ny)*(m0.ny+m0.yy) + (m0.nn+m0.yn)*(m0.yn+m0.yy))) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'ETS (Equitable Threat Score)': ['(sum(m0.yy)-(sum(m0.yy+m0.ny)*sum(m0.yy+m0.yn)/sum(m0.yy+m0.ny+m0.yn+m0.nn)))/(sum(m0.yy+m0.ny+m0.yn)-(sum(m0.yy+m0.ny)*sum(m0.yy+m0.yn)/sum(m0.yy+m0.ny+m0.yn+m0.nn))) * 100 as stat, group_concat((m0.yy-((m0.yy+m0.ny)*(m0.yy+m0.yn)/(m0.yy+m0.ny+m0.yn+m0.nn)))/((m0.yy+m0.ny+m0.yn)-((m0.yy+m0.ny)*(m0.yy+m0.yn)/(m0.yy+m0.ny+m0.yn+m0.nn))) * 100, ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'Nlow (obs < threshold, avg per hr)': ['avg(m0.nn+m0.ny+0.000) as stat, group_concat((m0.nn+m0.ny), ";", m0.time order by m0.time) as sub_data, count(m0.nn) as N0', 'ctc', 'Number', null],

            'Nhigh (obs > threshold, avg per hr)': ['avg(m0.yy+m0.yn+0.000) as stat, group_concat((m0.yy+m0.yn), ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'Number', null],

            'Ntot (total obs, avg per hr)': ['avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000) as stat, group_concat((m0.yy+m0.ny+m0.yn+m0.nn), ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'Number', null],

            'Ratio (Nlow / Ntot)': ['(sum(m0.nn+m0.ny+0.000)/sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000)) as stat, group_concat(((m0.nn+m0.ny)/(m0.yy+m0.ny+m0.yn+m0.nn)), ";", m0.time order by m0.time) as sub_data, count(m0.nn) as N0', 'ctc', 'Ratio', null],

            'Ratio (Nhigh / Ntot)': ['(sum(m0.yy+m0.yn+0.000)/sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000)) as stat, group_concat(((m0.yy+m0.yn)/(m0.yy+m0.ny+m0.yn+m0.nn)), ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'Ratio', null],

            'N in average (to nearest 100)': ['sum(m0.yy+m0.yn+m0.ny+m0.nn+0.000) as stat, group_concat((m0.yy+m0.yn+m0.ny+m0.nn), ";", m0.time order by m0.time) as sub_data, count(m0.yy) as N0', 'ctc', 'Number', null]
        };
        matsCollections.CurveParams.insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'threshold'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'threshold',
                type: matsTypes.InputTypes.select,
                optionsMap: thresholdsModelOptionsMap,
                options: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]],
                valuesMap: masterThresholdValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'threshold'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, thresholdsModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterThresholdValuesMap))) {
            // have to reload threshold data
            matsCollections.CurveParams.update({name: 'threshold'}, {
                $set: {
                    optionsMap: thresholdsModelOptionsMap,
                    valuesMap: masterThresholdValuesMap,
                    options: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]],
                    default: thresholdsModelOptionsMap[Object.keys(thresholdsModelOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'scale'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'scale',
                type: matsTypes.InputTypes.select,
                optionsMap: scaleModelOptionsMap,
                options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]],
                valuesMap: masterScaleValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'scale'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, scaleModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterScaleValuesMap))) {
            // have to reload scale data
            matsCollections.CurveParams.update({name: 'scale'}, {
                $set: {
                    optionsMap: scaleModelOptionsMap,
                    valuesMap: masterScaleValuesMap,
                    options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]],
                    default: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'forecast-type'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-type',
                type: matsTypes.InputTypes.select,
                optionsMap: fcstTypeModelOptionsMap,
                options: fcstTypeModelOptionsMap[Object.keys(fcstTypeModelOptionsMap)[0]],
                valuesMap: masterFcstTypeValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: fcstTypeModelOptionsMap[Object.keys(fcstTypeModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'forecast-type'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, fcstTypeModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterFcstTypeValuesMap))) {
            // have to reload forecast type data
            matsCollections.CurveParams.update({name: 'forecast-type'}, {
                $set: {
                    optionsMap: fcstTypeModelOptionsMap,
                    valuesMap: masterFcstTypeValuesMap,
                    options: fcstTypeModelOptionsMap[Object.keys(fcstTypeModelOptionsMap)[0]],
                    default: fcstTypeModelOptionsMap[Object.keys(fcstTypeModelOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'average'}) == undefined) {
        const optionsMap = {
            'None': ['ceil(' + 3600 + '*floor(((m0.time)+' + 3600 + '/2)/' + 3600 + '))'],
            '3hr': ['ceil(' + 3600 * 3 + '*floor(((m0.time)+' + 3600 * 3 + '/2)/' + 3600 * 3 + '))'],
            '6hr': ['ceil(' + 3600 * 6 + '*floor(((m0.time)+' + 3600 * 6 + '/2)/' + 3600 * 6 + '))'],
            '12hr': ['ceil(' + 3600 * 12 + '*floor(((m0.time)+' + 3600 * 12 + '/2)/' + 3600 * 12 + '))'],
            '1D': ['ceil(' + 3600 * 24 + '*floor(((m0.time)+' + 3600 * 24 + '/2)/' + 3600 * 24 + '))'],
            '3D': ['ceil(' + 3600 * 24 * 3 + '*floor(((m0.time)+' + 3600 * 24 * 3 + '/2)/' + 3600 * 24 * 3 + '))'],
            '7D': ['ceil(' + 3600 * 24 * 7 + '*floor(((m0.time)+' + 3600 * 24 * 7 + '/2)/' + 3600 * 24 * 7 + '))'],
            '30D': ['ceil(' + 3600 * 24 * 30 + '*floor(((m0.time)+' + 3600 * 24 * 30 + '/2)/' + 3600 * 24 * 30 + '))'],
            '60D': ['ceil(' + 3600 * 24 * 60 + '*floor(((m0.time)+' + 3600 * 24 * 60 + '/2)/' + 3600 * 24 * 60 + '))'],
            '90D': ['ceil(' + 3600 * 24 * 90 + '*floor(((m0.time)+' + 3600 * 24 * 90 + '/2)/' + 3600 * 24 * 90 + '))'],
            '180D': ['ceil(' + 3600 * 24 * 180 + '*floor(((m0.time)+' + 3600 * 24 * 180 + '/2)/' + 3600 * 24 * 180 + '))'],
        };
        matsCollections.CurveParams.insert(
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
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}) == undefined) {
        const optionsMap = {
            'Threshold': "select m0.trsh as xVal, ",
            'Valid Date': "select m0.time as xVal, "
        };

        matsCollections.CurveParams.insert(
            {
                name: 'x-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[1],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 6,
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}) == undefined) {
        const optionsMap = {
            'Threshold': "m0.trsh as yVal, ",
            'Valid Date': "m0.time as yVal, "
        };

        matsCollections.CurveParams.insert(
            {
                name: 'y-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 6,
            });
    }

    // determine date defaults for dates and curveDates
    const defaultDataSource = matsCollections.CurveParams.findOne({name:"data-source"},{default:1}).default;
    modelDateRangeMap = matsCollections.CurveParams.findOne({name:"data-source"},{dates:1}).dates;
    minDate = modelDateRangeMap[defaultDataSource].minDate;
    maxDate = modelDateRangeMap[defaultDataSource].maxDate;

    // need to turn the raw max and min from the metadata into the last valid month of data
    const newDateRange = matsParamUtils.getMinMaxDates(minDate, maxDate);
    const minusMonthMinDate = newDateRange.minDate;
    maxDate = newDateRange.maxDate;
    dstr = moment.utc(minusMonthMinDate).format("MM/DD/YYYY HH:mm") + ' - ' + moment.utc(maxDate).format("MM/DD/YYYY HH:mm");

    if (matsCollections.CurveParams.findOne({name: 'curve-dates'}) == undefined) {
        const optionsMap = {
            '1 day': ['1 day'],
            '3 days': ['3 days'],
            '7 days': ['7 days'],
            '31 days': ['31 days'],
            '90 days': ['90 days'],
            '180 days': ['180 days'],
            '365 days': ['365 days']
        };
        matsCollections.CurveParams.insert(
            {
                name: 'curve-dates',
                type: matsTypes.InputTypes.dateRange,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap).sort(),
                startDate: minDate,
                stopDate: maxDate,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: dstr,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 7,
                help: "dateHelp.html"
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'curve-dates'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.default, dstr))) {
            // have to reload dates data
            matsCollections.CurveParams.update({name: 'curve-dates'}, {
                $set: {
                    startDate: minDate,
                    stopDate: maxDate,
                    default: dstr
                }
            });
        }
    }
};

/* The format of a curveTextPattern is an array of arrays, each sub array has
 [labelString, localVariableName, delimiterString]  any of which can be null.
 Each sub array will be joined (the localVariableName is always dereferenced first)
 and then the sub arrays will be joined maintaining order.

 The curveTextPattern is found by its name which must match the corresponding matsCollections.PlotGraphFunctions.PlotType value.
 See curve_item.js and standAlone.js.
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
                ['fcst_type: ', 'forecast-type', ', '],
                ['avg: ', 'average', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "scale", "average", "forecast-type"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.threshold,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'scale', ', '],
                ['', 'statistic', ', '],
                ['fcst_type: ', 'forecast-type', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "scale", "forecast-type", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.histogram,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ', '],
                ['', 'statistic', ', '],
                ['fcst_type: ', 'forecast-type', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "scale", "forecast-type", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contour,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ', '],
                ['', 'statistic', ', '],
                ['fcst_type: ', 'forecast-type', ', ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "scale", "forecast-type", "x-axis-parameter", "y-axis-parameter"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contourDiff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'scale', ', '],
                ['', 'statistic', ', '],
                ['fcst_type: ', 'forecast-type', ', ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "scale", "forecast-type", "x-axis-parameter", "y-axis-parameter"
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
            graphFunction: "graphPlotly",
            dataFunction: "dataSeries",
            checked: true
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.threshold,
            graphFunction: "graphPlotly",
            dataFunction: "dataThreshold",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.histogram,
            graphFunction: "graphPlotly",
            dataFunction: "dataHistogram",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.contour,
            graphFunction: "graphPlotly",
            dataFunction: "dataContour",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.contourDiff,
            graphFunction: "graphPlotly",
            dataFunction: "dataContourDiff",
            checked: false
        });
    }
};

Meteor.startup(function () {
    if (Meteor.settings.private == null) {
        console.log("There is a problem with your Meteor.settings.private being undefined. Did you forget the -- settings argument?");
        throw new Meteor.Error("There is a problem with your Meteor.settings.private being undefined. Did you forget the -- settings argument?");
    }
    matsCollections.Databases.remove({});
    if (matsCollections.Databases.find({}).count() === 0) {
        var databases = Meteor.settings.private.databases;
        if (databases !== null && databases !== undefined && Array.isArray(databases)) {
            for (var di = 0; di < databases.length; di++) {
                matsCollections.Databases.insert(databases[di]);
            }
        }
    }

    const sumSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.SUMS_DATA, status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    sumPool = mysql.createPool(sumSettings);

    const metadataSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.META_DATA, status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    metadataPool = mysql.createPool(metadataSettings);

    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "precip2", ['regions_per_model_mats_all_categories', 'threshold_descriptions', 'scale_descriptions', 'fcst_type_descriptions']);
    mdr.addRecord("metadataPool", "mats_common", ['region_descriptions']);
    matsMethods.resetApp({appMdr:mdr, appType:matsTypes.AppTypes.mats, app:'precipitationSub24hr'});
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
// The appSpecificResetRoutines object is a special name,
// as is doCurveParams. The refreshMetaData mechanism depends on them being named that way.
appSpecificResetRoutines = [
    doPlotGraph,
    doCurveParams,
    doSavedCurveParams,
    doPlotParams,
    doCurveTextPatterns
];
