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
                superiorNames: ['database','data-source'],
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

        matsCollections.PlotParams.insert(
            {
                name: 'metexpress-mode',
                type: matsTypes.InputTypes.radioGroup,
                optionsMap: {'mats':'mats','matsmv':'matsmv'},
                options: ['mats', 'matsmv'],
                default: 'mats',
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
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
    var myDBs = [];
    var modelOptionsMap = {};
    var dbDateRangeMap = {};
    var regionModelOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var forecastValueOptionsMap = {};
    var levelOptionsMap = {};
    var variableOptionsMap = {};

    var rows;
    var thisDB;
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "SELECT DISTINCT db FROM upperair_mats_metadata;");
        for (var j = 0; j < rows.length; j++) {
            thisDB = rows[j].db.trim();
            myDBs.push(thisDB);
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        for (var k = 0; k < myDBs.length; k++) {
            thisDB = myDBs[k];
            modelOptionsMap[thisDB] = {};
            dbDateRangeMap[thisDB] = {};
            forecastLengthOptionsMap[thisDB] = {};
            forecastValueOptionsMap[thisDB] = {};
            levelOptionsMap[thisDB] = {};
            variableOptionsMap[thisDB] = {};
            regionModelOptionsMap[thisDB] = {};

            rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "select model,display_text,regions,levels,fcst_lens,fcst_orig,variables,mindate,maxdate from upperair_mats_metadata where db = '" + thisDB + "' group by model,display_text,regions,levels,fcst_lens,fcst_orig,variables,mindate,maxdate order by model;");
            for (var i = 0; i < rows.length; i++) {

                var model_value = rows[i].model.trim();
                var model = rows[i].display_text.trim();
                modelOptionsMap[thisDB][model] = [model_value];

                var rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
                var rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
                dbDateRangeMap[thisDB][model] = {minDate: rowMinDate, maxDate: rowMaxDate};

                var forecastLengths = rows[i].fcst_lens;
                var forecastValues = rows[i].fcst_orig;
                var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
                var forecastValueArr = forecastValues.split(',').map(Function.prototype.call, String.prototype.trim);
                var forecastValue;
                var lengthValMap = {};
                for (var j = 0; j < forecastLengthArr.length; j++) {
                    forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]/g, "");
                    forecastValue = forecastValueArr[j].replace(/'|\[|\]/g, "");
                    lengthValMap[forecastLengthArr[j]] = forecastValue;
                }
                forecastLengthOptionsMap[thisDB][model] = forecastLengthArr;
                forecastValueOptionsMap[thisDB][model] = lengthValMap;

                var levels = rows[i].levels;
                var levelArr = levels.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < levelArr.length; j++) {
                    levelArr[j] = levelArr[j].replace(/'|\[|\]/g, "");
                }
                levelOptionsMap[thisDB][model] = levelArr;

                var variables = rows[i].variables;
                var variableArr = variables.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < variableArr.length; j++) {
                    variableArr[j] = variableArr[j].replace(/'|\[|\]/g, "");
                }
                variableOptionsMap[thisDB][model] = variableArr;

                var regions = rows[i].regions;
                var regionsArr = regions.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < regionsArr.length; j++) {
                    regionsArr[j] = regionsArr[j].replace(/'|\[|\]/g, "");
                }
                regionModelOptionsMap[thisDB][model] = regionsArr;
            }
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
    if (matsCollections.CurveParams.find({name: 'yaxes'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'yaxes',
                type: matsTypes.InputTypes.selectOrderEnforced,
                options: ['auto-by-variable','y1', 'y2'],
                selected: ['auto-by-variable'],
                controlButtonCovered: true,
                unique: false,
                default: 'auto-by-variable',
                controlButtonVisibility: 'block',
                controlButtonText: "y axes",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1,
                multiple: false
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'database'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'database',
                type: matsTypes.InputTypes.select,
                options: myDBs,
                dates: dbDateRangeMap,
                dependentNames: ["data-source"],
                controlButtonCovered: true,
                default: myDBs[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'database'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.options, myDBs))) {
            // have to reload model data
            if (process.env.NODE_ENV === "development") {
                console.log("updating model data")
            }
            matsCollections.CurveParams.update({name: 'data-source'}, {
                $set: {
                    options: myDBs
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'data-source'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap[myDBs[0]]),   // convenience
                levelsMap: levelOptionsMap, // need to know what levels the metadata allows for each model.
                superiorNames: ["database"],
                dependentNames: ["region", "variable", "forecast-length", "pres-level", "dates", "curve-dates"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap[myDBs[0]])[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'data-source'});
        if ((!matsDataUtils.areObjectsEqual(modelOptionsMap, currentParam.optionsMap)) ||
            (!matsDataUtils.areObjectsEqual(dbDateRangeMap, currentParam.dates))) {
            // have to reload model data
            if (process.env.NODE_ENV === "development") {
                console.log("updating model data")
            }
            matsCollections.CurveParams.update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    levelsMap: levelOptionsMap,
                    dates: dbDateRangeMap,
                    options: Object.keys(modelOptionsMap[myDBs[0]])
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
                options: regionModelOptionsMap[myDBs[0]][Object.keys(regionModelOptionsMap[myDBs[0]])[0]],   // convenience
                superiorNames: ['database','data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[myDBs[0]][Object.keys(regionModelOptionsMap[myDBs[0]])[0]][0],  // always use the first region for the first model
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2,
                help: 'region.html'
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'region'});
        if (!matsDataUtils.areObjectsEqual(regionModelOptionsMap, currentParam.optionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'region'}, {
                $set: {
                    optionsMap: regionModelOptionsMap,
                    options: regionModelOptionsMap[Object.keys(regionModelOptionsMap[myDBs[0]])[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'statistic'}) == undefined) {
        const statOptionsMap = {
            'RMS': ['avg(sqrt(ld.ffbar+ld.oobar - 2*ld.fobar)) as stat, sum(ld.total) as N0, group_concat(sqrt(ld.ffbar+ld.oobar - 2*ld.fobar) order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_values0, group_concat(unix_timestamp(ld.fcst_valid_beg) order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_secs0, group_concat(h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_levs0'],
            'Bias (Model - Obs)': ['avg(ld.fbar - ld.obar) as stat, sum(ld.total) as N0, group_concat(ld.fbar - ld.obar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_values0, group_concat(unix_timestamp(ld.fcst_valid_beg) order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_secs0, group_concat(h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_levs0'],
            // 'N': ['sum(ld.total) as stat, sum(ld.total) as N0, group_concat(ld.total order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_values0, group_concat(unix_timestamp(ld.fcst_valid_beg) order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_secs0, group_concat(h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_levs0'],
            'Model average': ['avg(ld.fbar) as stat, sum(ld.total) as N0, group_concat(ld.fbar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_values0, group_concat(unix_timestamp(ld.fcst_valid_beg) order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_secs0, group_concat(h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_levs0'],
            'Obs average': ['avg(ld.obar) as stat, sum(ld.total) as N0, group_concat(ld.obar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_values0, group_concat(unix_timestamp(ld.fcst_valid_beg) order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_secs0, group_concat(h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_levs0']
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
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'forecast-length'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: variableOptionsMap,
                options: variableOptionsMap[myDBs[0]][Object.keys(variableOptionsMap[myDBs[0]])[0]],   // convenience
                superiorNames: ['database','data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: variableOptionsMap[myDBs[0]][Object.keys(variableOptionsMap[myDBs[0]])[0]][0],  // always use the first region for the first model
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary updates to forecastLengthOptionsMap
        var currentParam = matsCollections.CurveParams.findOne({name: 'variable'});
        if (!matsDataUtils.areObjectsEqual(variableOptionsMap, currentParam.optionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'variable'}, {
                $set: {
                    optionsMap: variableOptionsMap,
                    options: variableOptionsMap[Object.keys(variableOptionsMap[myDBs[0]])[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'forecast-length'}) == undefined) {

        const fhrOptions = forecastLengthOptionsMap[myDBs[0]][Object.keys(forecastLengthOptionsMap[myDBs[0]])[0]];
        var fhrDefault;
        if (fhrOptions.indexOf("24") !== -1) {
            fhrDefault = "24";
        } else if (fhrOptions.indexOf("12") !== -1) {
            fhrDefault = "12";
        } else {
            fhrDefault = fhrOptions[0];
        }

        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: fhrOptions,
                valuesMap: forecastValueOptionsMap,
                superiorNames: ['database','data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: fhrDefault,
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time",
                multiple: true,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary updates to forecastLengthOptionsMap
        var currentParam = matsCollections.CurveParams.findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(forecastLengthOptionsMap, currentParam.optionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap[myDBs[0]])[0]]
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

    if (matsCollections.CurveParams.find({name: 'valid-time'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                options: ['0', '6', '12', '18'],
                selected: [],
                controlButtonCovered: true,
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

    if (matsCollections.CurveParams.find({name: 'utc-cycle-start'}).count() == 0) {

        const optionsArr = ['0', '6', '12', '18'];

        matsCollections.CurveParams.insert(
            {
                name: 'utc-cycle-start',
                type: matsTypes.InputTypes.select,
                options: optionsArr,
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
        optionsMap = {
            'None': ['unix_timestamp(ld.fcst_valid_beg)'],
            '1D': ['ceil(' + 60 * 60 * 24 + '*floor((unix_timestamp(ld.fcst_valid_beg))/' + 60 * 60 * 24 + ')+' + 60 * 60 * 24 + '/2)'],
            '3D': ['ceil(' + 60 * 60 * 24 * 3 + '*floor((unix_timestamp(ld.fcst_valid_beg))/' + 60 * 60 * 24 * 3 + ')+' + 60 * 60 * 24 * 3 + '/2)'],
            '7D': ['ceil(' + 60 * 60 * 24 * 7 + '*floor((unix_timestamp(ld.fcst_valid_beg))/' + 60 * 60 * 24 * 7 + ')+' + 60 * 60 * 24 * 7 + '/2)'],
            '30D': ['ceil(' + 60 * 60 * 24 * 30 + '*floor((unix_timestamp(ld.fcst_valid_beg))/' + 60 * 60 * 24 * 30 + ')+' + 60 * 60 * 24 * 30 + '/2)'],
            '60D': ['ceil(' + 60 * 60 * 24 * 60 + '*floor((unix_timestamp(ld.fcst_valid_beg))/' + 60 * 60 * 24 * 60 + ')+' + 60 * 60 * 24 * 60 + '/2)'],
            '90D': ['ceil(' + 60 * 60 * 24 * 90 + '*floor((unix_timestamp(ld.fcst_valid_beg))/' + 60 * 60 * 24 * 90 + ')+' + 60 * 60 * 24 * 90 + '/2)'],
            '180D': ['ceil(' + 60 * 60 * 24 * 180 + '*floor((unix_timestamp(ld.fcst_valid_beg))/' + 60 * 60 * 24 * 180 + ')+' + 60 * 60 * 24 * 180 + '/2)']
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
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5
            });
    }

    if (matsCollections.CurveParams.find({name: 'pres-level'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'pres-level',
                type: matsTypes.InputTypes.select,
                optionsMap: levelOptionsMap,
                options: levelOptionsMap[myDBs[0]][Object.keys(levelOptionsMap[myDBs[0]])[0]],   // convenience
                superiorNames: ['database','data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                controlButtonText: "Pressure Level",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5,
                multiple: true
            });
    } else {
        // it is defined but check for necessary updates to forecastLengthOptionsMap
        var currentParam = matsCollections.CurveParams.findOne({name: 'pres-level'});
        if (!matsDataUtils.areObjectsEqual(levelOptionsMap, currentParam.optionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'pres-level'}, {
                $set: {
                    optionsMap: levelOptionsMap,
                    options: levelOptionsMap[Object.keys(levelOptionsMap[myDBs[0]])[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'x-axis-parameter'}).count() == 0) {

        const optionsMap = {
            'Fcst lead time': "select ld.fcst_lead as xVal, ",
            'Pressure level': "select h.fcst_lev as xVal, ",
            'Valid UTC hour': "select unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as xVal, ",
            'Init UTC hour': "select unix_timestamp(ld.fcst_init_beg)%(24*3600)/3600 as xVal, ",
            'Valid Date': "select unix_timestamp(ld.fcst_valid_beg) as xVal, ",
            'Init Date': "select unix_timestamp(ld.fcst_init_beg) as xVal, "
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
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 6,
            });
    }

    if (matsCollections.CurveParams.find({name: 'y-axis-parameter'}).count() == 0) {

        const optionsMap = {
            'Fcst lead time': "ld.fcst_lead as yVal, ",
            'Pressure level': "h.fcst_lev as yVal, ",
            'Valid UTC hour': "unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600 as yVal, ",
            'Init UTC hour': "unix_timestamp(ld.fcst_init_beg)%(24*3600)/3600 as yVal, ",
            'Valid Date': "unix_timestamp(ld.fcst_valid_beg) as yVal, ",
            'Init Date': "unix_timestamp(ld.fcst_init_beg) as yVal, "
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
                default: Object.keys(optionsMap)[1],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 6,
            });
    }

    // determine date defaults for dates and curveDates
    var defaultDb = matsCollections.CurveParams.findOne({name:"database"},{default:1}).default;
    var dbDateRangeMap = matsCollections.CurveParams.findOne({name:"database"},{dates:1}).dates;
    var defaultDataSource = matsCollections.CurveParams.findOne({name:"data-source"},{default:1}).default;
    minDate = dbDateRangeMap[defaultDb][defaultDataSource].minDate;
    maxDate = dbDateRangeMap[defaultDb][defaultDataSource].maxDate;
    var minusMonthMinDate = matsParamUtils.getMinMaxDates(minDate, maxDate).minDate;
    dstr = minusMonthMinDate + ' - ' + maxDate;

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
                superiorNames: ['database','data-source'],
                controlButtonCovered: true,
                unique: false,
                default: dstr,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 7,
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
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'pres-level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ' ']
            ],
            displayParams: [
                "label", "yaxes","database", "data-source", "region", "statistic", "variable","valid-time", "average", "forecast-length", "pres-level"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.profile,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'pres-level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "yaxes", "database", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'pres-level', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "yaxes", "database", "data-source", "region", "statistic", "variable", "dieoff-type", "valid-time", "utc-cycle-start", "pres-level", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.validtime,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'pres-level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "yaxes", "database", "data-source", "region", "statistic", "variable", "forecast-length", "pres-level", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.histogram,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'pres-level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "yaxes", "database", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "pres-level", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contour,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'pres-level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['x-axis: ', 'x-axis-parameter', ', '],
                ['y-axis: ', 'y-axis-parameter', '']

            ],
            displayParams: [
                "label", "yaxes", "database", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "pres-level", "x-axis-parameter", "y-axis-parameter"
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
            plotSpecFunction: "plotSpecDataSeries",
            checked: true
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.profile,
            graphFunction: "graphPlotly",
            dataFunction: "dataProfile",
            plotSpecFunction: "plotSpecProfile",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            graphFunction: "graphPlotly",
            dataFunction: "dataDieOff",
            plotSpecFunction: "plotSpecDieOff",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.validtime,
            graphFunction: "graphPlotly",
            dataFunction: "dataValidTime",
            plotSpecFunction: "plotSpecValidTime",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.histogram,
            graphFunction: "graphPlotly",
            dataFunction: "dataHistogram",
            plotSpecFunction: "plotSpecHistogram",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.contour,
            graphFunction: "graphPlotly",
            dataFunction: "dataContour",
            plotSpecFunction: "plotSpecContour",
            checked: false
        });
    }
};


Meteor.startup(function () {
    if (Meteor.settings.private == null) {
        console.log ("There is a problem with your Meteor.settings.private being undefined. Did you forget the -- settings argument?");
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

    var sumSettings = matsCollections.Databases.findOne({role: "sum_data", status: "active"}, {
        host: 1,
        port: 1,
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
    const mdr = new matsTypes.MetaDataDBRecord("metadataPool", "mats_metadata", ['upperair_mats_metadata']);
    matsMethods.resetApp(mdr, matsTypes.AppTypes.metexpress);
    matsCollections.appName.remove({});
    matsCollections.appName.insert({name: "appName", app: "met-upperair"});
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
