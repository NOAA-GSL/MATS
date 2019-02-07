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
    var modelOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var regionModelOptionsMap = {};
    var masterRegionValuesMap = {};
    var modelOptionsGroups = {};
    var modelDisabledOptions = [];  // model select has optionGroups (disabled options are group labels)
    var myModels = [];
    var modelTableMap = {};
    var modelDateRangeMap = {};

    // force a reset if requested - simply remove all the existing params to force a reload
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }

    var rows;
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "select id,description from region_descriptions;");
        var masterRegDescription;
        var masterId;
        for (var j = 0; j < rows.length; j++) {
            masterRegDescription = rows[j].description.trim();
            masterId = rows[j].id;
            masterRegionValuesMap[masterId] = masterRegDescription;
        }
    } catch (err) {
        console.log("regionNumberDescriptionMapping:" + err.message);
    }
    // all the rest
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(modelPool, "select id,model,display_text,table_name_prefix,regions,fcst_lens,display_order,display_category,mindate,minhour,maxdate,maxhour,numrecs from regions_per_model_mats_all_categories order by display_category, display_order;");

        var label = "";
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i].model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_value];

            var tableNamePrefix = rows[i].table_name_prefix.trim();
            var category = "──" + rows[i].display_category + "──";
            if (label === "" || label !== category) {
                label = category;
                // the models param has option groups so we have to create a list of disabled options that act as the group labels
                if (!modelOptionsGroups[label]) {
                    modelDisabledOptions.push(label);
                    modelOptionsGroups[label] = [];
                }
            }
            var minDate = moment(rows[i].mindate).add(rows[i].minhour, 'hours').format("MM/DD/YYYY HH:mm");
            var maxDate = moment(rows[i].maxdate).add(rows[i].maxhour, 'hours').format("MM/DD/YYYY HH:mm");
            myModels.push(model);
            // modelOptionsGroups
            modelOptionsGroups[label].push(model);
            // modelDates - holds the valid data date range for a model
            modelDateRangeMap[model] = {minDate: minDate, maxDate: maxDate};
            modelTableMap[model] = tableNamePrefix;

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
        console.log("upperair main.js", err.message);
    }


    // all the rest
    if (matsCollections.CurveParams.findOne({name: 'label'}) == undefined) {
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

    if (matsCollections.CurveParams.findOne({name: 'data-source'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                optionsGroups: modelOptionsGroups,
                disabledOptions: modelDisabledOptions,
                tableMap: modelTableMap,
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
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.dates, modelDateRangeMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.tableMap, modelTableMap))) {
            // have to reload model data
            if (process.env.NODE_ENV === "development") {
                console.log("updating model data")
            }
            matsCollections.CurveParams.update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    optionsGroups: modelOptionsGroups,
                    disabledOptions: modelDisabledOptions,
                    tableMap: modelTableMap,
                    dates: modelDateRangeMap,
                    options: Object.keys(modelOptionsMap)
                }
            });
        }
    }
    /* regionModelOptionsMap is indexed by model(data_source) and contains array of regions.
       masterRegionValuesMap is indexed by table id and contains a region description.
     */
    if (matsCollections.CurveParams.findOne({name: 'region'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionModelOptionsMap,
                options: regionModelOptionsMap[myModels[0]],   // convenience
                valuesMap: masterRegionValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[myModels[0]][0],  // always use the first region for the first model
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1,
                help: 'region.html'
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
                    options: regionModelOptionsMap[myModels[0]],
                    valuesMap: masterRegionValuesMap
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'statistic'}) == undefined) {
        const statOptionsMap = {
            'RMS': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, sum(m0.N_{{variable0}}) as N0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, sum(m0.N_{{variable0}}) as N0'],
            'Bias (Model - Obs)': ['-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.sum_model_{{variable1}}-m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0'],
            'N': ['sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0'],
            'Model average': ['sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                'sum(m0.sum_model_{{variable1}})/sum(m0.N_{{variable0}}) as stat,m0.N_{{variable0}} as N0'],
            'Obs average': ['sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                'sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0']
        };

        const statAuxMap = {
            'RMS-winds': 'group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}}) order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0 ,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0',
            'RMS-other': 'group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}}) order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0 ,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0',
            'Bias (Model - Obs)-winds': 'group_concat((m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0',
            'Bias (Model - Obs)-other': 'group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0, group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0',
            'N-winds': 'group_concat(m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0,group_concat(unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0',
            'N-other': 'group_concat(m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0,group_concat(unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0',
            'Model average-winds': 'group_concat(m0.sum_model_{{variable1}}/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0, group_concat(unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0',
            'Model average-other': 'group_concat((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0, group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0',
            'Obs average-winds': 'group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0, group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0',
            'Obs average-other': 'group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_values0, group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_secs0 ,group_concat( m0.mb10 * 10 order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10) as sub_levs0'
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
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'variable'}) == undefined) {
        const statVarOptionsMap = {
            'temperature': ['dt', 't'],
            'RH': ['dR', 'R'],
            'RHobT': ['dRoT', 'RoT'],
            'winds': ['dw', 'ws'],
            'height': ['dH', 'H']
        };

        const statVarUnitMap = {
            'RMS': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'winds': 'm/s',
                'height': 'm'
            },
            'Bias (Model - Obs)': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'winds': 'm/s',
                'height': 'm'
            },
            'N': {
                'temperature': 'Number',
                'RH': 'Number',
                'RHobT': 'Number',
                'winds': 'Number',
                'height': 'Number'
            },
            'Model average': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'winds': 'm/s',
                'height': 'm'
            },
            'Obs average': {
                'temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'winds': 'm/s',
                'height': 'm'
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

    if (matsCollections.CurveParams.findOne({name: 'cloud-coverage'}) == undefined) {
        optionsMap = {All: ['All'], Clear: ['Clear'], Cloudy: ['Cloudy']};
        matsCollections.CurveParams.insert(
            {
                name: 'cloud-coverage',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: ['All', 'Clear', 'Cloudy'],
                controlButtonCovered: true,
                unique: false,
                default: 'All',
                controlButtonVisibility: 'block',
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'forecast-length'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: forecastLengthOptionsMap[myModels[0]],
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
        // it is defined but check for necessary updates to forecastLengthOptionsMap
        var currentParam = matsCollections.CurveParams.findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: forecastLengthOptionsMap[myModels[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'dieoff-forecast-length'}) == undefined) {
        var dieoffOptionsMap = {
            "Dieoff": [matsTypes.ForecastTypes.dieoff],
            "Dieoff for a specific UTC cycle start time": [matsTypes.ForecastTypes.utcCycle],
            "Single cycle forecast": [matsTypes.ForecastTypes.singleCycle]
        };
        matsCollections.CurveParams.insert(
            {
                name: 'dieoff-forecast-length',
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

    if (matsCollections.CurveParams.findOne({name: 'valid-time'}) == undefined) {
        optionsMap = {both: [''], '0-UTC': ['and m0.hour = 0'], '12-UTC': ['and m0.hour = 12']};
        matsCollections.CurveParams.insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: ['both', '0-UTC', '12-UTC',],
                controlButtonCovered: true,
                selected: 'both',
                unique: false,
                default: 'both',
                controlButtonVisibility: 'block',
                controlButtonText: "valid utc hour",
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 3
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

    if (matsCollections.CurveParams.findOne({name: 'average'}) == undefined) {
        optionsMap = {
            'None': ['unix_timestamp(m0.date)+3600*m0.hour'],
            '1D': ['ceil(' + 60 * 60 * 24 + '*floor((unix_timestamp(m0.date)+3600*m0.hour)/' + 60 * 60 * 24 + ')+' + 60 * 60 * 24 + '/2)'],
            '3D': ['ceil(' + 60 * 60 * 24 * 3 + '*floor((unix_timestamp(m0.date)+3600*m0.hour)/' + 60 * 60 * 24 * 3 + ')+' + 60 * 60 * 24 * 3 + '/2)'],
            '7D': ['ceil(' + 60 * 60 * 24 * 7 + '*floor((unix_timestamp(m0.date)+3600*m0.hour)/' + 60 * 60 * 24 * 7 + ')+' + 60 * 60 * 24 * 7 + '/2)'],
            '30D': ['ceil(' + 60 * 60 * 24 * 30 + '*floor((unix_timestamp(m0.date)+3600*m0.hour)/' + 60 * 60 * 24 * 30 + ')+' + 60 * 60 * 24 * 30 + '/2)'],
            '60D': ['ceil(' + 60 * 60 * 24 * 60 + '*floor((unix_timestamp(m0.date)+3600*m0.hour)/' + 60 * 60 * 24 * 60 + ')+' + 60 * 60 * 24 * 60 + '/2)'],
            '90D': ['ceil(' + 60 * 60 * 24 * 90 + '*floor((unix_timestamp(m0.date)+3600*m0.hour)/' + 60 * 60 * 24 * 90 + ')+' + 60 * 60 * 24 * 90 + '/2)'],
            '180D': ['ceil(' + 60 * 60 * 24 * 180 + '*floor((unix_timestamp(m0.date)+3600*m0.hour)/' + 60 * 60 * 24 * 180 + ')+' + 60 * 60 * 24 * 180 + '/2)']
        };
        matsCollections.CurveParams.insert(
            {
                name: 'average',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: ['None', '1D', '3D', '7D', '30D', '60D', '90D', '180D'],
                controlButtonCovered: true,
                unique: false,
                selected: 'None',
                default: 'None',
                controlButtonVisibility: 'block',
                displayOrder: 10,
                displayPriority: 1,
                displayGroup: 4
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
                displayOrder: 11,
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
                displayOrder: 12,
                displayPriority: 1,
                displayGroup: 4,
                help: 'bottom-help.html'
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
                ['clouds: ', 'cloud-coverage', ', '],
                ['avg: ', 'average', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "cloud-coverage", "valid-time", "average", "forecast-length", "top", "bottom"
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
                ['clouds: ', 'cloud-coverage', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "cloud-coverage", "valid-time", "forecast-length", "top", "bottom", "curve-dates"
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
                ['', 'dieoff-forecast-length', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['clouds: ', 'cloud-coverage', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "cloud-coverage", "dieoff-forecast-length", "valid-time", "utc-cycle-start", "top", "bottom", "curve-dates"
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
                ['clouds: ', 'cloud-coverage', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "cloud-coverage", "valid-time", "forecast-length", "top", "bottom", "curve-dates"
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
            plotType: matsTypes.PlotTypes.profile,
            graphFunction: "graphPlotly",
            dataFunction: "dataProfile",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            graphFunction: "graphPlotly",
            dataFunction: "dataDieOff",
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
            database: 'ruc_ua_sums2',
            connectionLimit: 10
        });
        matsCollections.Databases.insert({
            name: "modelSetting",
            role: "model_data",
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'readonly',
            password: 'ReadOnly@2016!',
            database: 'ruc_ua',
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
    var modelSettings = matsCollections.Databases.findOne({role: "model_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 10
    });
    var rows;
    // the pool is intended to be global
    modelPool = mysql.createPool(modelSettings);
    modelPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });
    var sumSettings = matsCollections.Databases.findOne({role: "sum_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 10
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


    const mdr = new matsTypes.MetaDataDBRecord("modelPool", "ruc_ua", ['regions_per_model_mats_all_categories']);
    mdr.addRecord("metadataPool", "mats_common", ['region_descriptions']);
    matsMethods.resetApp(mdr);
    matsCollections.appName.remove({});
    matsCollections.appName.insert({name: "appName", app: "upperair"});
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
