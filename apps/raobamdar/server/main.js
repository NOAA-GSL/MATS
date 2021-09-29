/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
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
        const params = matsCollections.CurveParamsInfo.find({"curve_params": {"$exists": true}}).fetch()[0]["curve_params"];
        for (var cp = 0; cp < params.length; cp++) {
            matsCollections[params[cp]].remove({});
        }
    }
    var modelOptionsMap = {};
    var regionModelOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var truthsModelOptionsMap = {};
    var masterRegionValuesMapU = {};
    var masterRegionValuesMapA = {};
    var modelTableMap = {};
    var modelDateRangeMap = {};

    try {
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "select short_name,id,description from region_descriptions;");
        var masterRegDescription;
        var masterId;
        var masterSn;
        for (var j = 0; j < rows.length; j++) {
            masterRegDescription = rows[j].description.trim();
            masterId = rows[j].id;
            masterSn = rows[j].short_name;
            masterRegionValuesMapU[masterId] = masterRegDescription;
            masterRegionValuesMapA[masterSn] = masterRegDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select upperair_model,aircraft_model,regions,table_name_prefix,display_text,fcst_lens,truths,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
        for (var i = 0; i < rows.length; i++) {

            var model_u_value = rows[i].upperair_model.trim();
            var model_a_value = rows[i].aircraft_model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_u_value, model_a_value];

            var rowMinDate = moment.utc(rows[i].mindate).format("MM/DD/YYYY HH:mm");
            var rowMaxDate = moment.utc(rows[i].maxdate).format("MM/DD/YYYY HH:mm");
            modelDateRangeMap[model] = {minDate: rowMinDate, maxDate: rowMaxDate};

            var tableNamePrefix = rows[i].table_name_prefix.trim();
            modelTableMap[model] = tableNamePrefix;

            var forecastLengths = rows[i].fcst_lens;
            var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < forecastLengthArr.length; j++) {
                forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]|\"/g, "");
            }
            forecastLengthOptionsMap[model] = forecastLengthArr;

            var regions = rows[i].regions;
            var regionsArrRaw = regions.split(',').map(Function.prototype.call, String.prototype.trim);
            var regionsArrU = [];
            var regionsArrA = [];
            var dummyRegion;
            for (var j = 0; j < regionsArrRaw.length; j++) {
                dummyRegion = regionsArrRaw[j].replace(/'|\[|\]|\"/g, "");
                if (isNaN(dummyRegion)) {
                    regionsArrA.push(masterRegionValuesMapA[dummyRegion]);
                } else {
                    regionsArrU.push(masterRegionValuesMapU[dummyRegion]);
                }
            }
            regionModelOptionsMap[model] = {}
            if (regionsArrU.length > 0) {
                regionModelOptionsMap[model]["RAOBs"] = regionsArrU;
            }
            if (regionsArrA.length > 0) {
                regionModelOptionsMap[model]["AMDAR"] = regionsArrA;
            }

            var truths = rows[i].truths;
            var truthArr = truths.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < truthArr.length; j++) {
                truthArr[j] = truthArr[j].replace(/'|\[|\]|\"/g, "");
            }
            truthsModelOptionsMap[model] = truthArr;
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

    if (matsCollections["data-source"].findOne({name: 'data-source'}) == undefined) {
        matsCollections["data-source"].insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                tableMap: modelTableMap,
                dates: modelDateRangeMap,
                options: Object.keys(modelOptionsMap),
                dependentNames: ["truth", "forecast-length", "dates", "curve-dates"],
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
        var currentParam = matsCollections["data-source"].findOne({name: 'data-source'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.dates, modelDateRangeMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.tableMap, modelTableMap))) {
            // have to reload model data
            matsCollections["data-source"].update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    tableMap: modelTableMap,
                    dates: modelDateRangeMap,
                    options: Object.keys(modelOptionsMap),
                    default: Object.keys(modelOptionsMap)[0]
                }
            });
        }
    }

    if (matsCollections["region"].findOne({name: 'region'}) == undefined) {
        matsCollections["region"].insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionModelOptionsMap,
                options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]]['RAOBs'],
                valuesMapU: masterRegionValuesMapU,
                valuesMapA: masterRegionValuesMapA,
                superiorNames: ['data-source', 'truth'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]]['RAOBs'][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["region"].findOne({name: 'region'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMapU, masterRegionValuesMapU)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMapA, masterRegionValuesMapA))) {
            // have to reload region data
            matsCollections["region"].update({name: 'region'}, {
                $set: {
                    optionsMap: regionModelOptionsMap,
                    valuesMapU: masterRegionValuesMapU,
                    valuesMapA: masterRegionValuesMapA,
                    options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]]['RAOBs'],
                    default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]]['RAOBs'][0]
                }
            });
        }
    }

    if (matsCollections["statistic"].findOne({name: 'statistic'}) == undefined) {
        const optionsMap = {
            'RMS': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, stddev(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})) as stdev, sum(m0.N_{{variable0}}) as N0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, stddev(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})) as stdev, sum(m0.N_{{variable0}}) as N0'],
            'Bias (Model - Obs)': ['-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}) as stat, stddev(-m0.sum_{{variable0}}/m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.sum_model_{{variable1}}-m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}}) as stat, stddev((m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0'],
            'N': ['sum(m0.N_{{variable0}}) as stat, stddev(m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.N_{{variable0}}) as stat, stddev(m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0'],
            'Model average': ['sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, stddev((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}}) as stdev, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                'sum(m0.sum_model_{{variable1}})/sum(m0.N_{{variable0}}) as stat, stddev(m0.sum_model_{{variable1}}/m0.N_{{variable0}}) as stdev, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0'],
            'Obs average': ['sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, stddev(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}) as stdev, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                'sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, stddev(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}) as stdev, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0'],
            'Std deviation': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2)) as stat, stddev(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2))) as stdev, sum(m0.N_{{variable0}}) as N0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2)) as stat, stddev(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2))) as stdev, sum(m0.N_{{variable0}}) as N0']
        };

        const statAuxMap = {
            'RMS-winds': 'group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}}), ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'RMS-other': 'group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}}), ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'Bias (Model - Obs)-winds': 'group_concat((m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}}, ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'Bias (Model - Obs)-other': 'group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}}, ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'N-winds': 'group_concat(m0.N_{{variable0}}, ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'N-other': 'group_concat(m0.N_{{variable0}}, ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'Model average-winds': 'group_concat(m0.sum_model_{{variable1}}/m0.N_{{variable0}}, ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'Model average-other': 'group_concat((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}}, ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'Obs average-winds': 'group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}, ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'Obs average-other': 'group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}, ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'Std deviation-winds': 'group_concat(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2)), ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
            'Std deviation-other': 'group_concat(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2)), ";", unix_timestamp(m0.date) + 3600 * m0.hour, ";", m0.mb10 * 10 order by unix_timestamp(m0.date) + 3600 * m0.hour, m0.mb10) as sub_data',
        };

        matsCollections["statistic"].insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                statAuxMap: statAuxMap,
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

    if (matsCollections['variable'].findOne({name: 'variable'}) == undefined) {
        const statVarOptionsMap = {
            temperature: ['dt', 't'],
            RH: ['dR', 'R'],
            winds: ['dw', 'ws']
        };

        const statVarUnitMap = {
            'RMS': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'winds': 'm/s'
            },
            'Bias (Model - Obs)': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'winds': 'm/s'
            },
            'N': {
                'temperature': 'Number',
                'RH': 'Number',
                'winds': 'Number'
            },
            'Model average': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'winds': 'm/s'
            },
            'Obs average': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'winds': 'm/s'
            },
            'Std deviation': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'winds': 'm/s'
            }
        };

        matsCollections['variable'].insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: statVarOptionsMap,
                statVarUnitMap: statVarUnitMap,
                options: Object.keys(statVarOptionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(statVarOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections['truth'].findOne({name: 'truth'}) == undefined) {
        matsCollections['truth'].insert(
            {
                name: 'truth',
                type: matsTypes.InputTypes.select,
                optionsMap: truthsModelOptionsMap,
                options: truthsModelOptionsMap[Object.keys(truthsModelOptionsMap)[0]],
                superiorNames: ['data-source'],
                dependentNames: ['region'],
                hideOtherFor: {
                    'phase': ["RAOBs"]
                },
                controlButtonCovered: true,
                unique: false,
                default: truthsModelOptionsMap[Object.keys(truthsModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections['truth'].findOne({name: 'truth'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, truthsModelOptionsMap)) {
            // have to reload truth data
            matsCollections['truth'].update({name: 'truth'}, {
                $set: {
                    optionsMap: truthsModelOptionsMap,
                    options: truthsModelOptionsMap[Object.keys(truthsModelOptionsMap)[0]],
                    default: truthsModelOptionsMap[Object.keys(truthsModelOptionsMap)[0]][0]
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
        var currentParam = matsCollections["forecast-length"].findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
            // have to reload forecast length data
            matsCollections["forecast-length"].update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]]
                }
            });
        }
    }

    if (matsCollections['dieoff-type'].findOne({name: 'dieoff-type'}) == undefined) {
        var dieoffOptionsMap = {
            "Dieoff": [matsTypes.ForecastTypes.dieoff],
            "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
            "Single cycle forecast (uses first date in range)": [matsTypes.ForecastTypes.singleCycle]
        };
        matsCollections['dieoff-type'].insert(
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
                displayGroup: 4
            });
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
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true
            });
    }

    if (matsCollections["utc-cycle-start"].findOne({name: 'utc-cycle-start'}) == undefined) {
        matsCollections["utc-cycle-start"].insert(
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
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 4,
            });
    }

    if (matsCollections["average"].findOne({name: 'average'}) == undefined) {
        const optionsMap = {
            'None': ['ceil(' + 3600 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 + '/2)/' + 3600 + '))'],
            '3hr': ['ceil(' + 3600 * 3 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 3 + '/2)/' + 3600 * 3 + '))'],
            '6hr': ['ceil(' + 3600 * 6 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 6 + '/2)/' + 3600 * 6 + '))'],
            '12hr': ['ceil(' + 3600 * 12 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 12 + '/2)/' + 3600 * 12 + '))'],
            '1D': ['ceil(' + 3600 * 24 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 24 + '/2)/' + 3600 * 24 + '))'],
            '3D': ['ceil(' + 3600 * 24 * 3 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 24 * 3 + '/2)/' + 3600 * 24 * 3 + '))'],
            '7D': ['ceil(' + 3600 * 24 * 7 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 24 * 7 + '/2)/' + 3600 * 24 * 7 + '))'],
            '30D': ['ceil(' + 3600 * 24 * 30 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 24 * 30 + '/2)/' + 3600 * 24 * 30 + '))'],
            '60D': ['ceil(' + 3600 * 24 * 60 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 24 * 60 + '/2)/' + 3600 * 24 * 60 + '))'],
            '90D': ['ceil(' + 3600 * 24 * 90 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 24 * 90 + '/2)/' + 3600 * 24 * 90 + '))'],
            '180D': ['ceil(' + 3600 * 24 * 180 + '*floor(((unix_timestamp(m0.date)+3600*m0.hour)+' + 3600 * 24 * 180 + '/2)/' + 3600 * 24 * 180 + '))'],
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
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5
            });
    }

    if (matsCollections['top'].findOne({name: 'top'}) == undefined) {
        matsCollections['top'].insert(
            {
                name: 'top',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: 1,
                max: 1000,
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: 1,
                controlButtonVisibility: 'block',
                controlButtonText: 'top (hPa)',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5,
                help: 'top-help.html'
            });
    }

    if (matsCollections['bottom'].findOne({name: 'bottom'}) == undefined) {
        matsCollections['bottom'].insert(
            {
                name: 'bottom',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
                min: 100,
                max: 1050,
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: 1050,
                controlButtonVisibility: 'block',
                controlButtonText: 'bottom (hPa)',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 5,
                help: 'bottom-help.html'
            });
    }

    if (matsCollections['phase'].findOne({name: 'phase'}) == undefined) {
        const optionsMap = {
            "All": "and m0.up_dn = 2 ",
            "EnR": "and m0.up_dn = 0 ",
            "Up": "and m0.up_dn = 1 ",
            "Dn": "and m0.up_dn = -1 "
        };
        matsCollections['phase'].insert(
            {
                name: 'phase',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 5
            });
    }

    if (matsCollections["x-axis-parameter"].findOne({name: 'x-axis-parameter'}) == undefined) {
        const optionsMap = {
            'Fcst lead time': "select m0.fcst_len as xVal, ",
            'Pressure level': "select m0.mb10*10 as xVal, ",
            'Valid UTC hour': "select m0.hour as xVal, ",
            'Init UTC hour': "select (unix_timestamp(m0.date)+3600*(m0.hour-m0.fcst_len))%(24*3600)/3600 as xVal, ",
            'Valid Date': "select unix_timestamp(m0.date)+3600*m0.hour as xVal, ",
            'Init Date': "select unix_timestamp(m0.date)+3600*(m0.hour-m0.fcst_len) as xVal, "
        };

        matsCollections["x-axis-parameter"].insert(
            {
                name: 'x-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 6,
            });
    }

    if (matsCollections["y-axis-parameter"].findOne({name: 'y-axis-parameter'}) == undefined) {
        const optionsMap = {
            'Fcst lead time': "m0.fcst_len as yVal, ",
            'Pressure level': "m0.mb10*10 as yVal, ",
            'Valid UTC hour': "m0.hour as yVal, ",
            'Init UTC hour': "(unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600)%(24*3600)/3600 as yVal, ",
            'Valid Date': "unix_timestamp(m0.date)+3600*m0.hour as yVal, ",
            'Init Date': "unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600 as yVal, "
        };

        matsCollections["y-axis-parameter"].insert(
            {
                name: 'y-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(optionsMap),
                optionsMap: optionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[1],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 6,
            });
    }

    if (matsCollections['significance'].findOne({name: 'significance'}) == undefined) {
        matsCollections['significance'].insert(
            {
                name: 'significance',
                type: matsTypes.InputTypes.select,
                options: ['none', 'standard', 'assume infinite degrees of freedom'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: 'none',
                controlButtonVisibility: 'block',
                controlButtonText: "overlay student's t-test",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 7,
            });
    }

    // determine date defaults for dates and curveDates
    const defaultDataSource = matsCollections["data-source"].findOne({name:"data-source"},{default:1}).default;
    modelDateRangeMap = matsCollections["data-source"].findOne({name:"data-source"},{dates:1}).dates;
    minDate = modelDateRangeMap[defaultDataSource].minDate;
    maxDate = modelDateRangeMap[defaultDataSource].maxDate;

    // need to turn the raw max and min from the metadata into the last valid month of data
    const newDateRange = matsParamUtils.getMinMaxDates(minDate, maxDate);
    const minusMonthMinDate = newDateRange.minDate;
    maxDate = newDateRange.maxDate;
    dstr = moment.utc(minusMonthMinDate).format("MM/DD/YYYY HH:mm") + ' - ' + moment.utc(maxDate).format("MM/DD/YYYY HH:mm");

    if (matsCollections["curve-dates"].findOne({name: 'curve-dates'}) == undefined) {
        const optionsMap = {
            '1 day': ['1 day'],
            '3 days': ['3 days'],
            '7 days': ['7 days'],
            '31 days': ['31 days'],
            '90 days': ['90 days'],
            '180 days': ['180 days'],
            '365 days': ['365 days']
        };
        matsCollections["curve-dates"].insert(
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
        var currentParam = matsCollections["curve-dates"].findOne({name: 'curve-dates'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.startDate, minDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.stopDate, maxDate)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.default, dstr))) {
            // have to reload dates data
            matsCollections["curve-dates"].update({name: 'curve-dates'}, {
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
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['phase: ', 'phase', ', '],
                ['avg: ', 'average', ', '],
                ['', 'truth', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "truth", "average", "top", "bottom"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.profile,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['phase: ', 'phase', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "truth", "top", "bottom", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['phase: ', 'phase', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "dieoff-type", "valid-time", "utc-cycle-start", "phase", "truth", "top", "bottom", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.validtime,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['phase: ', 'phase', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "forecast-length", "phase", "truth", "top", "bottom", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dailyModelCycle,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['phase: ', 'phase', ', '],
                ['', 'truth', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "utc-cycle-start", "phase", "truth", "top", "bottom"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.histogram,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['phase: ', 'phase', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "truth", "top", "bottom", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contour,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['phase: ', 'phase', ', '],
                ['', 'truth', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "truth", "top", "bottom", "x-axis-parameter", "y-axis-parameter"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contourDiff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['phase: ', 'phase', ', '],
                ['', 'truth', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "truth", "top", "bottom", "x-axis-parameter", "y-axis-parameter", "significance"
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
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.profile,
            graphFunction: "graphPlotly",
            dataFunction: "dataProfile",
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
    if (metadataSettings) {
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
    };

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
    mdr.addRecord("sumPool", "ruc_ua_sums2", ['regions_per_model_mats_all_categories']);
    try {
        matsMethods.resetApp({appPools: allPools, appMdr: mdr, appType: matsTypes.AppTypes.mats});
    } catch (error) {
        console.log("raobamdar main - " + error.message);
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
