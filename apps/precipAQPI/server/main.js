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
                displayOrder: 3,
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
    var forecastLengthOptionsMap = {};
    var thresholdsModelOptionsMap = {};
    var sourceOptionsMap = {};
    var masterRegionValuesMap = {};
    var masterThresholdValuesMap = {};

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
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(modelPool, "select trsh,description from threshold_descriptions;");
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
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,regions,sources,display_text,fcst_lens,trsh,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i].model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_value];

            var rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
            var rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
            modelDateRangeMap[model] = {minDate: rowMinDate, maxDate: rowMaxDate};

            var sources = rows[i].sources;
            var sourceArr = sources.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < sourceArr.length; j++) {
                sourceArr[j] = sourceArr[j].replace(/'|\[|\]/g, "");
            }
            sourceOptionsMap[model] = sourceArr;

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
                dependentNames: ["region", "forecast-length", "threshold", "truth", "dates", "curve-dates"],
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
            'TSS (True Skill Score)': ['((sum(m0.yy)*sum(m0.nn) - sum(m0.yn)*sum(m0.ny))/((sum(m0.yy)+sum(m0.ny))*(sum(m0.yn)+sum(m0.nn)))) * 100 as stat, group_concat(((m0.yy*m0.nn - m0.yn*m0.ny)/((m0.yy+m0.ny)*(m0.yn+m0.nn))) * 100, ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'PODy (POD of precip > threshold)': ['((sum(m0.yy)+0.00)/sum(m0.yy+m0.ny)) * 100 as stat, group_concat(((m0.yy)/(m0.yy+m0.ny)) * 100, ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'PODn (POD of precip < threshold)': ['((sum(m0.nn)+0.00)/sum(m0.nn+m0.yn)) * 100 as stat, group_concat(((m0.nn)/(m0.nn+m0.yn)) * 100, ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'FAR (False Alarm Ratio)': ['((sum(m0.yn)+0.00)/sum(m0.yn+m0.yy)) * 100 as stat, group_concat(((m0.yn)/(m0.yn+m0.yy)) * 100, ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 0],

            'Bias (forecast/actual)': ['((sum(m0.yy+m0.yn)+0.00)/sum(m0.yy+m0.ny)) as stat, group_concat(((m0.yy+m0.yn)/(m0.yy+m0.ny)), ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'Ratio', 1],

            'CSI (Critical Success Index)': ['((sum(m0.yy)+0.00)/sum(m0.yy+m0.ny+m0.yn)) * 100 as stat, group_concat(((m0.yy)/(m0.yy+m0.ny+m0.yn)) * 100, ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'HSS (Heidke Skill Score)': ['(2*(sum(m0.nn+0.00)*sum(m0.yy)-sum(m0.ny)*sum(m0.yn))/((sum(m0.nn+0.00)+sum(m0.yn))*(sum(m0.yn)+sum(m0.yy))+(sum(m0.nn+0.00)+sum(m0.ny))*(sum(m0.ny)+sum(m0.yy)))) * 100 as stat, group_concat((2*(m0.nn*m0.yy - m0.ny*m0.yn) / ((m0.nn+m0.yn)*(m0.yn+m0.yy) + (m0.nn+m0.ny)*(m0.ny+m0.yy))) * 100, ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'ETS (Equitable Threat Score)': ['(sum(m0.yy)-(sum(m0.yy+m0.yn)*sum(m0.yy+m0.ny)/sum(m0.yy+m0.yn+m0.ny+m0.nn)))/(sum(m0.yy+m0.yn+m0.ny)-(sum(m0.yy+m0.yn)*sum(m0.yy+m0.ny)/sum(m0.yy+m0.yn+m0.ny+m0.nn))) * 100 as stat, group_concat((m0.yy-((m0.yy+m0.yn)*(m0.yy+m0.ny)/(m0.yy+m0.yn+m0.ny+m0.nn)))/((m0.yy+m0.yn+m0.ny)-((m0.yy+m0.yn)*(m0.yy+m0.ny)/(m0.yy+m0.yn+m0.ny+m0.nn))) * 100, ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'x100', 100],

            'Nlow (obs < threshold, avg per hr)': ['avg(m0.nn+m0.yn+0.000) as stat, group_concat((m0.nn+m0.yn), ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.nn) as N0', 'ctc', 'Number', null],

            'Nhigh (obs > threshold, avg per hr)': ['avg(m0.yy+m0.ny+0.000) as stat, group_concat((m0.yy+m0.ny), ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'Number', null],

            'Ntot (total obs, avg per hr)': ['avg(m0.yy+m0.yn+m0.ny+m0.nn+0.000) as stat, group_concat((m0.yy+m0.yn+m0.ny+m0.nn), ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'Number', null],

            'Ratio (Nlow / Ntot)': ['(sum(m0.nn+m0.yn+0.000)/sum(m0.yy+m0.yn+m0.ny+m0.nn+0.000)) as stat, group_concat(((m0.nn+m0.yn)/(m0.yy+m0.yn+m0.ny+m0.nn)), ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.nn) as N0', 'ctc', 'Ratio', null],

            'Ratio (Nhigh / Ntot)': ['(sum(m0.yy+m0.ny+0.000)/sum(m0.yy+m0.yn+m0.ny+m0.nn+0.000)) as stat, group_concat(((m0.yy+m0.ny)/(m0.yy+m0.yn+m0.ny+m0.nn)), ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'Ratio', null],

            'N in average (to nearest 100)': ['sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000) as stat, group_concat((m0.yy+m0.ny+m0.yn+m0.nn), ";", m0.valid_time order by m0.valid_time) as sub_data, count(m0.yy) as N0', 'ctc', 'Number', null]
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

    if (matsCollections.CurveParams.findOne({name: 'truth'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'truth',
                type: matsTypes.InputTypes.select,
                optionsMap: sourceOptionsMap,
                options: sourceOptionsMap[Object.keys(sourceOptionsMap)[0]],
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: sourceOptionsMap[Object.keys(sourceOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'truth'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, sourceOptionsMap)) {
            // have to reload truth data
            matsCollections.CurveParams.update({name: 'truth'}, {
                $set: {
                    optionsMap: sourceOptionsMap,
                    options: sourceOptionsMap[Object.keys(sourceOptionsMap)[0]],
                    default: sourceOptionsMap[Object.keys(sourceOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'forecast-length'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]],
                superiorNames: ['data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: 6,
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time",
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
            // have to reload forecast length data
            matsCollections.CurveParams.update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'dieoff-type'}) == undefined) {
        var dieoffOptionsMap = {
            "Dieoff": [matsTypes.ForecastTypes.dieoff],
            "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
            "Single cycle forecast (uses first date in range)": [matsTypes.ForecastTypes.singleCycle]
        };
        matsCollections.CurveParams.insert(
            {
                name: 'dieoff-type',
                type: matsTypes.InputTypes.select,
                optionsMap: dieoffOptionsMap,
                options: Object.keys(dieoffOptionsMap),
                hideOtherFor: {
                    'valid-time': ["Dieoff for a specified UTC cycle init hour", "Single cycle forecast (uses first date in range)"],
                    'utc-cycle-start': ["Dieoff", "Single cycle forecast (uses first date in range)"],
                },
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(dieoffOptionsMap)[0],
                controlButtonVisibility: 'block',
                controlButtonText: 'dieoff type',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'valid-time'}) == undefined) {
        matsCollections.CurveParams.insert(
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
                displayGroup: 4,
                multiple: true
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'utc-cycle-start'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'utc-cycle-start',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: 12,
                controlButtonVisibility: 'block',
                controlButtonText: "utc cycle init hour",
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4,
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'average'}) == undefined) {
        const optionsMap = {
            'None': ['ceil(' + 3600 + '*floor(((m0.valid_time)+' + 3600 + '/2)/' + 3600 + '))'],
            '3hr': ['ceil(' + 3600 * 3 + '*floor(((m0.valid_time)+' + 3600 * 3 + '/2)/' + 3600 * 3 + '))'],
            '6hr': ['ceil(' + 3600 * 6 + '*floor(((m0.valid_time)+' + 3600 * 6 + '/2)/' + 3600 * 6 + '))'],
            '12hr': ['ceil(' + 3600 * 12 + '*floor(((m0.valid_time)+' + 3600 * 12 + '/2)/' + 3600 * 12 + '))'],
            '1D': ['ceil(' + 3600 * 24 + '*floor(((m0.valid_time)+' + 3600 * 24 + '/2)/' + 3600 * 24 + '))'],
            '3D': ['ceil(' + 3600 * 24 * 3 + '*floor(((m0.valid_time)+' + 3600 * 24 * 3 + '/2)/' + 3600 * 24 * 3 + '))'],
            '7D': ['ceil(' + 3600 * 24 * 7 + '*floor(((m0.valid_time)+' + 3600 * 24 * 7 + '/2)/' + 3600 * 24 * 7 + '))'],
            '30D': ['ceil(' + 3600 * 24 * 30 + '*floor(((m0.valid_time)+' + 3600 * 24 * 30 + '/2)/' + 3600 * 24 * 30 + '))'],
            '60D': ['ceil(' + 3600 * 24 * 60 + '*floor(((m0.valid_time)+' + 3600 * 24 * 60 + '/2)/' + 3600 * 24 * 60 + '))'],
            '90D': ['ceil(' + 3600 * 24 * 90 + '*floor(((m0.valid_time)+' + 3600 * 24 * 90 + '/2)/' + 3600 * 24 * 90 + '))'],
            '180D': ['ceil(' + 3600 * 24 * 180 + '*floor(((m0.valid_time)+' + 3600 * 24 * 180 + '/2)/' + 3600 * 24 * 180 + '))'],
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
            'Fcst lead time': "select m0.fcst_len as xVal, ",
            'Threshold': "select m0.thresh/100 as xVal, ",    // produces thresholds in inches
            'Valid UTC hour': "select m0.valid_time%(24*3600)/3600 as xVal, ",
            'Init UTC hour': "select (m0.valid_time-m0.fcst_len*3600)%(24*3600)/3600 as xVal, ",
            'Valid Date': "select m0.valid_time as xVal, ",
            'Init Date': "select m0.valid_time-m0.fcst_len*3600 as xVal, "
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
                default: Object.keys(optionsMap)[2],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 6,
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}) == undefined) {
        const optionsMap = {
            'Fcst lead time': "m0.fcst_len as yVal, ",
            'Threshold': "m0.thresh/100 as yVal, ",    // produces thresholds in inches
            'Valid UTC hour': "m0.valid_time%(24*3600)/3600 as yVal, ",
            'Init UTC hour': "(m0.valid_time-m0.fcst_len*3600)%(24*3600)/3600 as yVal, ",
            'Valid Date': "m0.valid_time as yVal, ",
            'Init Date': "m0.valid_time-m0.fcst_len*3600 as yVal, "
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
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ', '],
                ['', 'truth', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "average", "forecast-length", "valid-time", "truth"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'statistic', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "dieoff-type", "valid-time", "utc-cycle-start", "truth", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.threshold,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "forecast-length", "valid-time", "truth", "curve-dates"
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
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "forecast-length", "truth", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dailyModelCycle,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'threshold', ' '],
                ['', 'statistic', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'truth', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "utc-cycle-start", "truth"
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
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "forecast-length", "valid-time", "truth", "curve-dates"
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
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "forecast-length", "valid-time", "truth", "x-axis-parameter", "y-axis-parameter"
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
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "threshold", "forecast-length", "valid-time", "truth", "x-axis-parameter", "y-axis-parameter"
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
            plotType: matsTypes.PlotTypes.dieoff,
            graphFunction: "graphPlotly",
            dataFunction: "dataDieOff",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.threshold,
            graphFunction: "graphPlotly",
            dataFunction: "dataThreshold",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.validtime,
            graphFunction: "graphPlotly",
            dataFunction: "dataValidTime",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.dailyModelCycle,
            graphFunction: "graphPlotly",
            dataFunction: "dataDailyModelCycle",
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
    const metadataSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.META_DATA, status: "active"}, {
        host: 1,
        port: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    if (metadataSettings)  {
        metadataPool = mysql.createPool(metadataSettings);
        allPools.push({pool: "metadataPool", role: matsTypes.DatabaseRoles.META_DATA});
    }

    const modelSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.MODEL_DATA, status: "active"}, {
        host: 1,
        port: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    if (modelSettings) {
        modelPool = mysql.createPool(modelSettings);
        allPools.push({pool: "modelPool", role: matsTypes.DatabaseRoles.MODEL_DATA});
    }

    const sumSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.SUMS_DATA, status: "active"}, {
        host: 1,
        port: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    if (sumSettings) {
        sumPool = mysql.createPool(sumSettings);
        allPools.push({pool: "sumPool", role: matsTypes.DatabaseRoles.SUMS_DATA});
    }

    // create list of tables we need to monitor for update
    const mdr = new matsTypes.MetaDataDBRecord("metadataPool", "mats_common", ['region_descriptions']);
    mdr.addRecord("modelPool", "precip_mesonets2", ['threshold_descriptions']);
    mdr.addRecord("sumPool", "precip_mesonets2_sums", ['regions_per_model_mats_all_categories']);
    try {
        matsMethods.resetApp({appPools: allPools, appMdr: mdr, appType: matsTypes.AppTypes.mats, app: 'precipAQPI', title: "AQPI Precipitation", group: "Precipitation"});
    } catch (error) {
        console.log(error.message);
    }
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
