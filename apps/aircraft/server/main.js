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
    var regionModelOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var masterRegionValuesMap = {};
    var modelDateRangeMap = {};

    try {
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "select short_name,description from region_descriptions;");
        var masterRegDescription;
        var masterId;
        for (var j = 0; j < rows.length; j++) {
            masterRegDescription = rows[j].description.trim();
            masterId = rows[j].short_name;
            masterRegionValuesMap[masterId] = masterRegDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,regions,display_text,fcst_lens,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
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
                forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]/g, "");
            }
            forecastLengthOptionsMap[model] = forecastLengthArr;

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
                dependentNames: ["region", "forecast-length", "dates", "curve-dates"],
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
                    options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],
                    default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'statistic'}) == undefined) {
        const statOptionsMap = {
            'RMS': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, stddev(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})) as stdev, sum(m0.N_{{variable0}}) as N0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, stddev(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})) as stdev, sum(m0.N_{{variable0}}) as N0'],
            'Bias (Model - Obs)': ['-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}) as stat, stddev(-m0.sum_{{variable0}}/m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.sum_model_{{variable1}}-m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}}) as stat, stddev((m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0'],
            'N': ['sum(m0.N_{{variable0}}) as stat, stddev(m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.N_{{variable0}}) as stat, stddev(m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0'],
            'Model average': ['sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, stddev((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}}) as stdev, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                'sum(m0.sum_model_{{variable1}})/sum(m0.N_{{variable0}}) as stat, stddev(m0.sum_model_{{variable1}}/m0.N_{{variable0}}) as stdev, m0.N_{{variable0}} as N0'],
            'Obs average': ['sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, stddev(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}) as stdev, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                'sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, stddev(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}) as stdev, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0']
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
        };

        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula with wind than with other variables, so element 0 differs from element 1 in statOptionsMap, and different clauses in statAuxMap are needed.
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: statOptionsMap,
                statAuxMap: statAuxMap,
                options: Object.keys(statOptionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(statOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'variable'}) == undefined) {
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
            }
        };

        matsCollections.CurveParams.insert(
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

    if (matsCollections.CurveParams.find({name: 'average'}).count() == 0) {
        const optionsMap = {
            'None': ['ceil(3600*floor((unix_timestamp(m0.date)+3600*m0.hour)/3600))'],
            '3hr': ['ceil(10800*floor((unix_timestamp(m0.date)+3600*m0.hour)/10800)+10800/2)'],
            '6hr': ['ceil(21600*floor((unix_timestamp(m0.date)+3600*m0.hour)/21600)+21600/2)'],
            '12hr': ['ceil(43200*floor((unix_timestamp(m0.date)+3600*m0.hour)/43200)+43200/2)'],
            '1D': ['ceil(86400*floor((unix_timestamp(m0.date)+3600*m0.hour)/86400)+86400/2)'],
            '3D': ['ceil(259200*floor((unix_timestamp(m0.date)+3600*m0.hour)/259200)+259200/2)'],
            '7D': ['ceil(604800*floor((unix_timestamp(m0.date)+3600*m0.hour)/604800)+604800/2)'],
            '30D': ['ceil(2592000*floor((unix_timestamp(m0.date)+3600*m0.hour)/2592000)+2592000/2)'],
            '60D': ['ceil(5184000*floor((unix_timestamp(m0.date)+3600*m0.hour)/5184000)+5184000/2)']
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
                displayGroup: 4
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
                displayOrder: 1,
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

    if (matsCollections.CurveParams.findOne({name: 'phase'}) == undefined) {
        const optionsMap = {
            "All": "and m0.up_dn = 2 ",
            "EnR": "and m0.up_dn = 0 ",
            "Up": "and m0.up_dn = 1 ",
            "Dn": "and m0.up_dn = -1 "
//            "R" : ""
        };
        matsCollections.CurveParams.insert(
            {
                name: 'phase',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'top'}) == undefined) {
        matsCollections.CurveParams.insert(
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
                displayGroup: 4,
                help: 'top-help.html'
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'bottom'}) == undefined) {
        matsCollections.CurveParams.insert(
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
                displayGroup: 4,
                help: 'bottom-help.html'
            });
    }

    if (matsCollections.CurveParams.find({name: 'x-axis-parameter'}).count() == 0) {

        const optionsMap = {
            'Pressure level': "select m0.mb10*10 as xVal, ",
            'Valid UTC hour': "select m0.hour as xVal, ",
            'Valid Date': "select unix_timestamp(m0.date)+3600*m0.hour as xVal, ",
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
                //     'level': ["Pressure level"],
                // },
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[1],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5,
            });
    }

    if (matsCollections.CurveParams.find({name: 'y-axis-parameter'}).count() == 0) {

        const optionsMap = {
            'Pressure level': "m0.mb10*10 as yVal,",
            'Valid UTC hour': "m0.hour as yVal,",
            'Valid Date': "unix_timestamp(m0.date)+3600*m0.hour as yVal, ",
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
                //     'level': ["Pressure level"],
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

   if (matsCollections.CurveParams.find({name: 'significance'}).count() == 0) {

        matsCollections.CurveParams.insert(
            {
                name: 'significance',
                type: matsTypes.InputTypes.select,
                options: ['false', 'true'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: 'false',
                controlButtonVisibility: 'block',
                controlButtonText: "overlay student's t-test",
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

    if (matsCollections.CurveParams.find({name: 'curve-dates'}).count() == 0) {
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
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['phase: ', 'phase', ', '],
                ['avg: ', 'average', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "average", "top", "bottom"
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
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "top", "bottom", "curve-dates"
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
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "forecast-length", "phase", "top", "bottom", "curve-dates"
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
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "top", "bottom", "curve-dates"
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
                ['x-axis: ', 'x-axis-parameter', ', '],
                ['y-axis: ', 'y-axis-parameter', '']

            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "top", "bottom", "x-axis-parameter", "y-axis-parameter"
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
                ['x-axis: ', 'x-axis-parameter', ', '],
                ['y-axis: ', 'y-axis-parameter', '']

            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "top", "bottom", "x-axis-parameter", "y-axis-parameter", "significance"
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
            plotType: matsTypes.PlotTypes.validtime,
            graphFunction: "graphPlotly",
            dataFunction: "dataValidTime",
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
        port: 1,
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

    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "acars_RR", ['regions_per_model_mats_all_categories']);
    mdr.addRecord("metadataPool", "mats_common", ['region_descriptions']);
    matsMethods.resetApp({appMdr:mdr, appType:matsTypes.AppTypes.mats, app:'aircraft'});
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
