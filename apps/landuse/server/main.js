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
    }
};

const doCurveParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }
    var modelOptionsMap = {};
    var modelDateRangeMap = {};
    var forecastLengthOptionsMap = {};
    var vgtypsModelOptionsMap = {};
    var masterVgtypValuesMap = {};

    try {
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT vgtyp,description FROM vgtyp_descriptions;");
        var masterDescription;
        var masterVgtyp;
        for (var j = 0; j < rows.length; j++) {
            masterDescription = rows[j].description.trim();
            masterVgtyp = rows[j].vgtyp.trim();
            masterVgtypValuesMap[masterVgtyp] = masterDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,display_text,fcst_lens,vgtyp,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i].model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_value];

            var minDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
            var maxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
            modelDateRangeMap[model] = {minDate: minDate, maxDate: maxDate};

            var forecastLengths = rows[i].fcst_lens;
            var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < forecastLengthArr.length; j++) {
                forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]/g, "");
            }
            forecastLengthOptionsMap[model] = forecastLengthArr;

            var vgtyps = rows[i].vgtyp;
            var vgtypsArrRaw = vgtyps.split(',').map(Function.prototype.call, String.prototype.trim);
            var vgtypsArr = [];
            var dummyVgtyp;
            for (var j = 0; j < vgtypsArrRaw.length; j++) {
                dummyVgtyp = vgtypsArrRaw[j].replace(/'|\[|\]/g, "");
                if (dummyVgtyp !== '0') {
                    vgtypsArr.push(masterVgtypValuesMap[dummyVgtyp]);
                }
            }
            vgtypsModelOptionsMap[model] = vgtypsArr;
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
                dependentNames: ["forecast-length", "vgtyp", "dates", "curve-dates"],
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

    if (matsCollections.CurveParams.find({name: 'vgtyp'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'vgtyp',
                type: matsTypes.InputTypes.select,
                optionsMap: vgtypsModelOptionsMap,
                options: vgtypsModelOptionsMap[Object.keys(vgtypsModelOptionsMap)[0]],   // convenience
                valuesMap: masterVgtypValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: vgtypsModelOptionsMap[Object.keys(vgtypsModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'vgtyp'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, vgtypsModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterVgtypValuesMap))) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'vgtyp'}, {
                $set: {
                    optionsMap: vgtypsModelOptionsMap,
                    valuesMap: masterVgtypValuesMap,
                    options: vgtypsModelOptionsMap[Object.keys(vgtypsModelOptionsMap)[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'statistic'}).count() == 0) {
        const statOptionsMap = {
            //The original RMS query for temp in rucstats ends with 'avg(m0.N_{{variable0}})/1000', not 'sum(m0.N_{{variable0}})/1000'
            //as is used in MATS. For the added queries, I am using the rucstats syntax.

            'RMS': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}}))/1.8 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}}) order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}}))/2.23693629 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})/2.23693629 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            'Bias (Model - Obs)': ['-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}})/1.8 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}}/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                '-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_model_{{variable1}}-m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, sum(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}}/2.23693629 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            'N': ['sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0, group_concat(m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0, group_concat(m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0, group_concat(m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            'Model average': [
                '(sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(m0.N_{{variable0}})-32)/1.8 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}}-32.)/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                '(sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(m0.N_{{variable0}})) as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_model_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_model_{{variable1}}/m0.N_{{variable0}}/2.23693629 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            'Obs average': ['(sum(m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}})-32)/1.8 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_ob_{{variable1}}/m0.N_{{variable0}}-32.)/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                '(sum(m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}}))/ as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}} order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}/2.23693629 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0'
            ],
            'Std deviation': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2))/1.8 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2))/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2)) as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2)) order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2))/2.23693629 as stat, avg(m0.N_{{variable0}})/1000 as N0'
            ],
            'MAE': ['sum(m0.sum_a{{variable0}})/sum(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/1.8 as stat, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_a{{variable0}})/(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/1.8 order by (m0.valid_day)+3600*m0.hour) as sub_values0 ,group_concat( (m0.valid_day)+3600*m0.hour order by (m0.valid_day)+3600*m0.hour) as sub_secs0',
                'sum(m0.sum_a{{variable0}})/sum(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}})) as stat, avg(m0.N_{{variable0}})/1000 as N0',
                'sum(m0.sum_a{{variable0}})/sum(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/2.23693629 as stat, avg(m0.N_{{variable0}})/1000 as N0']

        };

        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula with wind than with other variables, so element 0 differs from element 1 in statOptionsMap, and different clauses in statAuxMap are needed.
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: statOptionsMap,
                options: Object.keys(statOptionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(statOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.find({name: 'variable'}).count() == 0) {
        const statVarOptionsMap = {
            'temperature': ['dt', 't'],
            'RH': ['drh', 'rh'],
            'dewpoint': ['dTd', 'td'],
            'wind': ['dw', 'ws'],
        };

        const statVarUnitMap = {
            'RMS': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'Bias (Model - Obs)': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'N': {
                'temperature': 'Number',
                'RH': 'Number',
                'dewpoint': 'Number',
                'wind': 'Number'
            },
            'Model average': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'Obs average': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'Std deviation': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
            },
            'MAE': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'dewpoint': '°C',
                'wind': 'm/s'
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
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.find({name: 'average'}).count() == 0) {
        optionsMap = {
            'None': ['(m0.valid_day)+3600*m0.hour'],
            '3hr': ['ceil(' + 60 * 60 * 3 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 3 + ')+' + 60 * 60 * 3 + '/2)'],
            '6hr': ['ceil(' + 60 * 60 * 6 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 6 + ')+' + 60 * 60 * 6 + '/2)'],
            '12hr': ['ceil(' + 60 * 60 * 12 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 12 + ')+' + 60 * 60 * 12 + '/2)'],
            '1D': ['ceil(' + 60 * 60 * 24 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 + ')+' + 60 * 60 * 24 + '/2)'],
            '3D': ['ceil(' + 60 * 60 * 24 * 3 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 3 + ')+' + 60 * 60 * 24 * 3 + '/2)'],
            '7D': ['ceil(' + 60 * 60 * 24 * 7 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 7 + ')+' + 60 * 60 * 24 * 7 + '/2)'],
            '30D': ['ceil(' + 60 * 60 * 24 * 30 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 30 + ')+' + 60 * 60 * 24 * 30 + '/2)'],
            '60D': ['ceil(' + 60 * 60 * 24 * 60 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 60 + ')+' + 60 * 60 * 24 * 60 + '/2)'],
            '90D': ['ceil(' + 60 * 60 * 24 * 90 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 90 + ')+' + 60 * 60 * 24 * 90 + '/2)'],
            '180D': ['ceil(' + 60 * 60 * 24 * 180 + '*floor(((m0.valid_day)+3600*m0.hour)/' + 60 * 60 * 24 * 180 + ')+' + 60 * 60 * 24 * 180 + '/2)']
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

    if (matsCollections.CurveParams.find({name: 'dieoff-type'}).count() == 0) {
        var dieoffOptionsMap = {
            "Dieoff": [matsTypes.ForecastTypes.dieoff],
            "Dieoff for a specific UTC cycle start time": [matsTypes.ForecastTypes.utcCycle],
            "Single cycle forecast": [matsTypes.ForecastTypes.singleCycle]
        };
        matsCollections.CurveParams.insert(
            {
                name: 'dieoff-type',
                type: matsTypes.InputTypes.select,
                optionsMap: dieoffOptionsMap,
                options: Object.keys(dieoffOptionsMap),
                hideOtherFor: {
                    'valid-time': ["Dieoff for a specific UTC cycle start time", "Single cycle forecast"],
                    'utc-cycle-start': ["Dieoff", "Single cycle forecast"],
                },
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(dieoffOptionsMap)[0],
                controlButtonVisibility: 'block',
                controlButtonText: 'dieoff type',
                displayOrder: 7,
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
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 3,
                multiple: true
            });
    }

    if (matsCollections.CurveParams.find({name: 'utc-cycle-start'}).count() == 0) {

        optionsArr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];

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
                controlButtonText: "utc cycle start time",
                displayOrder: 9,
                displayPriority: 1,
                displayGroup: 3,
            });
    }

    // determine date defaults for dates and curveDates
    var defaultDataSource = matsCollections.CurveParams.findOne({name:"data-source"},{default:1}).default;
    modelDateRangeMap = matsCollections.CurveParams.findOne({name:"data-source"},{dates:1}).dates;
    minDate = modelDateRangeMap[defaultDataSource].minDate;
    maxDate = modelDateRangeMap[defaultDataSource].maxDate;
    minDate = matsParamUtils.getMinMaxDates(minDate, maxDate).minDate;
    dstr = minDate + ' - ' + maxDate;

    if (matsCollections.CurveParams.findOne({name: 'curve-dates'}) == undefined) {
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
                displayGroup: 5,
                help: "dateHelp.html"
            });
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
                ['', 'vgtyp', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ' ']
            ],
            displayParams: [
                "label", "data-source", "vgtyp", "statistic", "variable", "average", "forecast-length", "valid-time"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'vgtyp', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "vgtyp", "statistic", "variable", "dieoff-type", "valid-time", "utc-cycle-start", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.validtime,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'vgtyp', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "vgtyp", "statistic", "variable", "forecast-length", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dailyModelCycle,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'vgtyp', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['start utc: ', 'utc-cycle-start', ', ']
            ],
            displayParams: [
                "label", "data-source", "vgtyp", "statistic", "variable", "utc-cycle-start"
            ],
            groupSize: 6

        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.histogram,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'vgtyp', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "vgtyp", "statistic", "variable", "forecast-length", "valid-time", "curve-dates"
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
            database: 'vgtyp_sums',
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

    const mdr = new matsTypes.MetaDataDBRecord("sumPool", "vgtyp_sums", ['regions_per_model_mats_all_categories', 'vgtyp_descriptions']);
    matsMethods.resetApp(mdr);
    matsCollections.appName.remove({});
    matsCollections.appName.insert({name: "appName", app: "landuse"});
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
