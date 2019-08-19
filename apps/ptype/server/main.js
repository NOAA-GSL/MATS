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

        var yAxisOptionsMap = {
            "Number": ["number"],
            "Relative frequency": ["relFreq"]
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
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });

        var binOptionsMap = {
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
                options: [],   // convenience
                min: '2',
                max: '100',
                step: 'any',
                default: '12',
                controlButtonCovered: true,
                controlButtonText: "number of bins",
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-pivot',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],   // convenience
                min: '-10000',
                max: '10000',
                step: 'any',
                default: '0',
                controlButtonCovered: true,
                controlButtonText: "bin pivot value",
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-start',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],   // convenience
                min: '-10000',
                max: '10000',
                step: 'any',
                default: '0',
                controlButtonCovered: true,
                controlButtonText: "bin start",
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-stride',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],   // convenience
                min: '-10000',
                max: '10000',
                step: 'any',
                default: '0',
                controlButtonCovered: true,
                controlButtonText: "bin stride",
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.PlotParams.insert(
            {
                name: 'bin-bounds',
                type: matsTypes.InputTypes.textInput,
                optionsMap: {},
                options: [],   // convenience
                default: ' ',
                controlButtonCovered: true,
                controlButtonText: "bin bounds (enter numbers separated by commas)",
                displayOrder: 7,
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
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }
    var modelOptionsMap = {};
    var modelDateRangeMap = {};
    var regionModelOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var scaleModelOptionsMap = {};
    var masterRegionValuesMap = {};
    var masterScaleValuesMap = {};
    var masterVariableValuesMap = {};

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
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT scle,description FROM scale_descriptions;");
        var masterDescription;
        var masterScale;
        for (var j = 0; j < rows.length; j++) {
            masterDescription = rows[j].description.trim();
            masterScale = rows[j].scle.trim();
            masterScaleValuesMap[masterScale] = masterDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT ptype,description FROM ptype_descriptions;");
        var masterVarDescription;
        var masterVariable;
        for (var j = 0; j < rows.length; j++) {
            masterVarDescription = rows[j].description.trim();
            masterVariable = rows[j].ptype.trim();
            masterVariableValuesMap[masterVarDescription] = masterVariable;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,regions,display_text,fcst_lens,scale,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i].model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_value];

            var rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
            var rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
            modelDateRangeMap[model] = {minDate: rowMinDate, maxDate: rowMaxDate};

            var forecastLengths = rows[i].fcst_lens;
            var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < forecastLengthArr.length; j++) {
                forecastLengthArr[j] = (Number(forecastLengthArr[j].replace(/'|\[|\]/g, "")) / 60).toString();
            }
            forecastLengthOptionsMap[model] = forecastLengthArr;

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
                dependentNames: ["region", "forecast-length", "scale", "dates", "curve-dates"],
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
                    options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)],
                    default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'statistic'}).count() == 0) {
        var optionsMap = {
            'Frequency': ['avg(m0.{{variable}}) as stat, group_concat(m0.{{variable}}, ";", m0.valid_secs order by m0.valid_secs) as sub_data, count(m0.{{variable}}) as N0', 'Frequency', null],
            'Number of stations': ['avg(m0.{{variable}} * m0.N) as stat, group_concat(m0.{{variable}} * m0.N, ";", m0.valid_secs order by m0.valid_secs) as sub_data, count(m0.{{variable}}) as N0', 'Number', null]
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
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.find({name: 'variable'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: masterVariableValuesMap,
                options: Object.keys(masterVariableValuesMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(masterVariableValuesMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'variable'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, masterVariableValuesMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'variable'}, {
                $set: {
                    optionsMap: masterVariableValuesMap,
                    options: masterVariableValuesMap[Object.keys(masterVariableValuesMap)],
                    default: masterVariableValuesMap[Object.keys(masterVariableValuesMap)[0]],
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
                displayOrder: 3,
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
                    options: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)],
                    default: scaleModelOptionsMap[Object.keys(scaleModelOptionsMap)[0]],
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'average'}).count() == 0) {
        optionsMap = {
            'None': ['m0.valid_secs'],
            '15m': ['ceil(900*floor(m0.valid_secs/900)+900/2)'],
            '30m': ['ceil(1800*floor(m0.valid_secs/1800)+1800/2)'],
            '1h': ['ceil(3600*floor(m0.valid_secs/3600)+3600/2)'],
            '90m': ['ceil(5400*floor(m0.valid_secs/5400)+5400/2)'],
            '2h': ['ceil(7200*floor(m0.valid_secs/7200)+7200/2)'],
            '3h': ['ceil(10800*floor(m0.valid_secs/10800)+10800/2)'],
            '6h': ['ceil(21600*floor(m0.valid_secs/21600)+21600/2)'],
            '12h': ['ceil(43200*floor(m0.valid_secs/43200)+43200/2)'],
            '1D': ['ceil(86400*floor(m0.valid_secs/86400)+86400/2)'],
            '3D': ['ceil(259200*floor(m0.valid_secs/259200)+259200/2)'],
            '7D': ['ceil(604800*floor(m0.valid_secs/604800)+604800/2)'],
            '30D': ['ceil(2592000*floor(m0.valid_secs/2592000)+2592000/2)'],
            '60D': ['ceil(5184000*floor(m0.valid_secs/5184000)+5184000/2)']
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
                displayOrder: 1,
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
                default: 6,
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time",
                displayOrder: 2,
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

    if (matsCollections.CurveParams.find({name: 'dieoff-type'}).count() == 0) {
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
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });
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
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3,
                multiple: true
            });
    }

    if (matsCollections.CurveParams.find({name: 'utc-cycle-start'}).count() == 0) {

        const optionsArr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];

        matsCollections.CurveParams.insert(
            {
                name: 'utc-cycle-start',
                type: matsTypes.InputTypes.select,
                options: optionsArr,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: optionsArr[12],
                controlButtonVisibility: 'block',
                controlButtonText: "utc cycle init hour",
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3,
            });
    }

    if (matsCollections.CurveParams.find({name: 'x-axis-parameter'}).count() == 0) {

        const optionsMap = {
            'Fcst lead time': "select m0.fcst_len/60 as xVal, ",
            'Grid scale': "select m0.scale as xVal, ",
            'Valid UTC hour': "select m0.valid_secs%(24*3600)/3600 as xVal, ",
            'Init UTC hour': "select (m0.valid_secs-m0.fcst_len*60)%(24*3600)/3600 as xVal, ",
            'Valid Date': "select m0.valid_secs as xVal, ",
            'Init Date': "select m0.valid_secs-m0.fcst_len*60 as xVal, "
        };

        matsCollections.CurveParams.insert(
            {
                name: 'x-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                // hideOtherFor: {
                //     'forecast-length': ["Fcst lead time"],
                //     'valid-time': ["Valid UTC hour"],
                //     'pres-level': ["Pressure level"],
                // },
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[2],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5,
            });
    }

    if (matsCollections.CurveParams.find({name: 'y-axis-parameter'}).count() == 0) {

        const optionsMap = {
            'Fcst lead time': "m0.fcst_len/60 as yVal, ",
            'Grid scale': "m0.scale as yVal, ",
            'Valid UTC hour': "m0.valid_secs%(24*3600)/3600 as yVal, ",
            'Init UTC hour': "(m0.valid_secs-m0.fcst_len*60)%(24*3600)/3600 as yVal, ",
            'Valid Date': "m0.valid_secs as yVal, ",
            'Init Date': "m0.valid_secs-m0.fcst_len*60 as yVal, "
        };

        matsCollections.CurveParams.insert(
            {
                name: 'y-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                // hideOtherFor: {
                //     'forecast-length': ["Fcst lead time"],
                //     'valid-time': ["Valid UTC hour"],
                //     'pres-level': ["Pressure level"],
                // },
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5,
            });
    }

    // determine date defaults for dates and curveDates
    var defaultDataSource = matsCollections.CurveParams.findOne({name:"data-source"},{default:1}).default;
    modelDateRangeMap = matsCollections.CurveParams.findOne({name:"data-source"},{dates:1}).dates;
    minDate = modelDateRangeMap[defaultDataSource].minDate;
    maxDate = modelDateRangeMap[defaultDataSource].maxDate;
    var minusMonthMinDate = matsParamUtils.getMinMaxDates(minDate, maxDate).minDate;
    dstr = minusMonthMinDate + ' - ' + maxDate;

    if (matsCollections.CurveParams.find({name: 'curve-dates'}).count() == 0) {
        optionsMap = {
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
                displayGroup: 6,
                help: "dateHelp.html"
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'curve-dates'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.default, dstr))) {
            // have to reload model data
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

 The curveTextPattern is found by its name which must match the corresponding PlotGraphFunctions.PlotType value.
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
                ['', 'scale', ', '],
                ['', 'statistic', ' for '],
                ['', 'variable', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "scale", "average", "forecast-length", "valid-time"
            ],
            groupSize: 6

        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'scale', ', '],
                ['', 'statistic', ' for '],
                ['', 'variable', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "scale", "dieoff-type", "valid-time", "utc-cycle-start", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.validtime,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'scale', ', '],
                ['', 'statistic', ' for '],
                ['', 'variable', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "scale", "forecast-length", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dailyModelCycle,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'scale', ', '],
                ['', 'statistic', ' for '],
                ['', 'variable', ', '],
                ['start utc: ', 'utc-cycle-start', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "scale", "utc-cycle-start"
            ],
            groupSize: 6

        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.histogram,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'scale', ', '],
                ['', 'statistic', ' for '],
                ['', 'variable', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "scale", "forecast-length", "valid-time", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contour,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'scale', ', '],
                ['', 'statistic', ' for '],
                ['', 'variable', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['x-axis: ', 'x-axis-parameter', ', '],
                ['y-axis: ', 'y-axis-parameter', '']

            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "scale", "forecast-length", "valid-time", "x-axis-parameter", "y-axis-parameter"
            ],
            groupSize: 6

        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contourDiff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'scale', ', '],
                ['', 'statistic', ' for '],
                ['', 'variable', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['x-axis: ', 'x-axis-parameter', ', '],
                ['y-axis: ', 'y-axis-parameter', '']

            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "scale", "forecast-length", "valid-time", "x-axis-parameter", "y-axis-parameter"
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
    if (matsCollections.Databases.find().count() == 0) {
        matsCollections.Databases.insert({
            role: matsTypes.DatabaseRoles.SUMS_DATA,
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'readonly',
            password: 'ReadOnly@2016!',
            database: 'ptype2',
            connectionLimit: 10
        });
        matsCollections.Databases.insert({
            role: matsTypes.DatabaseRoles.META_DATA,
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'readonly',
            password: 'ReadOnly@2016!',
            database: 'mats_common',
            connectionLimit: 10
        });
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
    sumPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    const metadataSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.META_DATA, status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
// the pool is intended to be global
    metadataPool = mysql.createPool(metadataSettings);


    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "ptype2", ['scale_descriptions', 'ptype_descriptions', 'regions_per_model_mats_all_categories']);
    mdr.addRecord("metadataPool", "mats_common", ['region_descriptions']);
    matsMethods.resetApp({appMdr:mdr, appType:matsTypes.AppTypes.mats, app:'ptype'});
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