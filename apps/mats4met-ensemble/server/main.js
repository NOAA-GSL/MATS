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
                superiorNames: ['database', 'data-source'],
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
    var myDBs = [];
    var dbGroupMap = {};
    var modelOptionsMap = {};
    var dbDateRangeMap = {};
    var regionModelOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var forecastValueOptionsMap = {};
    var levelOptionsMap = {};
    var variableOptionsMap = {};

    var rows;
    var thisGroup;
    var dbs;
    var dbArr;
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "select * from ensemble_database_groups order by db_group;");
        for (var i = 0; i < rows.length; i++) {
            thisGroup = rows[i].db_group.trim();
            dbs = rows[i].dbs;
            dbArr = dbs.split(',').map(Function.prototype.call, String.prototype.trim);
            for (var j = 0; j < dbArr.length; j++) {
                dbArr[j] = dbArr[j].replace(/'|\[|\]/g, "");
            }
            dbGroupMap[thisGroup] = dbArr;
        }
    } catch (err) {
        console.log(err.message);
    }

    var thisDB;
    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "SELECT DISTINCT db FROM ensemble_mats_metadata;");
        for (i = 0; i < rows.length; i++) {
            thisDB = rows[i].db.trim();
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

            rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "select model,display_text,regions,levels,fcst_lens,fcst_orig,variables,mindate,maxdate from ensemble_mats_metadata where db = '" + thisDB + "' group by model,display_text,regions,levels,fcst_lens,fcst_orig,variables,mindate,maxdate order by model;");
            for (i = 0; i < rows.length; i++) {

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
                    if (forecastValue === 'dflt') {
                        // we couldn't parse the forecast lengths in the metadata script,
                        // so we need to check for multiple formats in our query.
                        forecastValue = forecastLengthArr[j] + ',' + (Number(forecastLengthArr[j]) * 10000).toString();
                    }
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

    var defaultGroup = (Object.keys(dbGroupMap).indexOf("EnsembleTest") !== -1) ? "EnsembleTest" : Object.keys(dbGroupMap)[0];
    var defaultDB = dbGroupMap[defaultGroup][0];

    if (matsCollections.CurveParams.findOne({name: 'group'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'group',
                type: matsTypes.InputTypes.select,
                options: Object.keys(dbGroupMap),
                dependentNames: ["database"],
                controlButtonCovered: true,
                default: defaultGroup,
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'group'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.options, Object.keys(dbGroupMap)))) {
            // have to reload model data
            if (process.env.NODE_ENV === "development") {
                console.log("updating model data")
            }
            matsCollections.CurveParams.update({name: 'group'}, {
                $set: {
                    options: Object.keys(dbGroupMap),
                    default: defaultGroup,
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'database'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'database',
                type: matsTypes.InputTypes.select,
                optionsMap: dbGroupMap,
                options: dbGroupMap[defaultGroup],
                dates: dbDateRangeMap,
                superiorNames: ["group"],
                dependentNames: ["data-source"],
                controlButtonCovered: true,
                default: defaultDB,
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'database'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, dbGroupMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.dates, dbDateRangeMap))) {
            // have to reload model data
            if (process.env.NODE_ENV === "development") {
                console.log("updating model data")
            }
            matsCollections.CurveParams.update({name: 'database'}, {
                $set: {
                    optionsMap: dbGroupMap,
                    dates: dbDateRangeMap,
                    options: dbGroupMap[defaultGroup],
                    default: defaultDB
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
                options: Object.keys(modelOptionsMap[defaultDB]),   // convenience
                levelsMap: levelOptionsMap, // need to know what levels the metadata allows for each model.
                superiorNames: ["database"],
                dependentNames: ["region", "variable", "forecast-length", "level", "dates", "curve-dates"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap[defaultDB])[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'data-source'});
        if ((!matsDataUtils.areObjectsEqual(modelOptionsMap, currentParam.optionsMap)) ||
            (!matsDataUtils.areObjectsEqual(levelOptionsMap, currentParam.levelsMap))) {
            // have to reload model data
            if (process.env.NODE_ENV === "development") {
                console.log("updating model data")
            }
            matsCollections.CurveParams.update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    levelsMap: levelOptionsMap,
                    options: Object.keys(modelOptionsMap[defaultDB]),
                    default: Object.keys(modelOptionsMap[defaultDB])[0]
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
                options: regionModelOptionsMap[defaultDB][Object.keys(regionModelOptionsMap[defaultDB])[0]],   // convenience
                superiorNames: ['database', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[defaultDB][Object.keys(regionModelOptionsMap[defaultDB])[0]][0],  // always use the first region for the first model
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3,
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
                    options: regionModelOptionsMap[defaultDB][Object.keys(regionModelOptionsMap[defaultDB])[0]],
                    default: regionModelOptionsMap[defaultDB][Object.keys(regionModelOptionsMap[defaultDB])[0]][0]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'statistic'}) == undefined) {
        const statOptionsMap = {
            'RMSE': ['ensemble', 'line_data_ecnt', 'ld.rmse'],
            'RMSE with obs error': ['ensemble', 'line_data_ecnt', 'ld.rmse_oerr'],
            'Spread': ['ensemble', 'line_data_ecnt', 'ld.spread'],
            'Spread with obs error': ['ensemble', 'line_data_ecnt', 'ld.spread_oerr'],
            'ME (Additive bias)': ['ensemble', 'line_data_ecnt', 'ld.me'],
            'ME with obs error': ['ensemble', 'line_data_ecnt', 'ld.me_oerr'],
            'MAE': ['ensemble', 'line_data_cnt', 'ld.mae'],
            'ACC': ['ensemble', 'line_data_cnt', 'ld.anom_corr'],
            'CRPS': ['ensemble', 'line_data_ecnt', 'ld.crps'],
            'CRPSS': ['ensemble', 'line_data_ecnt', 'ld.crpss'],
            'BS': ['ensemble', 'line_data_pstd', 'ld.brier'],
            'BSS': ['ensemble', 'line_data_pstd', 'ld.bss'],
            'BS reliability': ['ensemble', 'line_data_pstd', 'ld.reliability'],
            'BS resolution': ['ensemble', 'line_data_pstd', 'ld.resolution'],
            'BS uncertainty': ['ensemble', 'line_data_pstd', 'ld.uncertainty'],
            'BS lower confidence limit': ['ensemble', 'line_data_pstd', 'ld.brier_ncl'],
            'BS upper confidence limit': ['ensemble', 'line_data_pstd', 'ld.brier_ncu'],
            'EV': ['ensemble', 'line_data_eclv', 'ld.value_baser'],
            'FSS': ['ensemble', 'line_data_nbrcnt', 'ld.fss'],
            'ROC AUC': ['ensemble', 'line_data_pstd', 'ld.roc_auc']
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
                displayOrder: 2,
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
                options: variableOptionsMap[defaultDB][Object.keys(variableOptionsMap[defaultDB])[0]],   // convenience
                superiorNames: ['database', 'data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: variableOptionsMap[defaultDB][Object.keys(variableOptionsMap[defaultDB])[0]][0],  // always use the first region for the first model
                controlButtonVisibility: 'block',
                displayOrder: 3,
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
                    options: variableOptionsMap[defaultDB][Object.keys(variableOptionsMap[defaultDB])[0]],
                    default: variableOptionsMap[defaultDB][Object.keys(variableOptionsMap[defaultDB])[0]][0]
                }
            });
        }
    }

    const fhrOptions = forecastLengthOptionsMap[defaultDB][Object.keys(forecastLengthOptionsMap[defaultDB])[0]];
    var fhrDefault;
    if (fhrOptions.indexOf("24") !== -1) {
        fhrDefault = "24";
    } else if (fhrOptions.indexOf("12") !== -1) {
        fhrDefault = "12";
    } else {
        fhrDefault = fhrOptions[0];
    }

    if (matsCollections.CurveParams.findOne({name: 'forecast-length'}) == undefined) {

        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: fhrOptions,
                valuesMap: forecastValueOptionsMap,
                superiorNames: ['database', 'data-source'],
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
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, forecastValueOptionsMap))) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    valuesMap: forecastValueOptionsMap,
                    options: fhrOptions,
                    default: fhrDefault
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
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
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
                displayGroup: 4
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'average'}) == undefined) {
        const optionsMap = {
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

    const levelOptions = levelOptionsMap[defaultDB][Object.keys(levelOptionsMap[defaultDB])[0]];
    var levelDefault;
    if (levelOptions.indexOf("P500") !== -1) {
        levelDefault = "P500";
    } else if (levelOptions.indexOf("SFC") !== -1) {
        levelDefault = "SFC";
    } else {
        levelDefault = levelOptions[0];
    }

    if (matsCollections.CurveParams.find({name: 'level'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'level',
                type: matsTypes.InputTypes.select,
                optionsMap: levelOptionsMap,
                options: levelOptions,   // convenience
                superiorNames: ['database', 'data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: levelDefault,
                controlButtonVisibility: 'block',
                controlButtonText: "Level",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5,
                multiple: false
            });
    } else {
        // it is defined but check for necessary updates to forecastLengthOptionsMap
        var currentParam = matsCollections.CurveParams.findOne({name: 'level'});
        if (!matsDataUtils.areObjectsEqual(levelOptionsMap, currentParam.optionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'level'}, {
                $set: {
                    optionsMap: levelOptionsMap,
                    options: levelOptionsMap[defaultDB][Object.keys(levelOptionsMap[defaultDB])[0]],
                    default: levelOptionsMap[defaultDB][Object.keys(levelOptionsMap[defaultDB])[0]][0]
                }
            });
        }
    }

    // determine date defaults for dates and curveDates
    var defaultDb = matsCollections.CurveParams.findOne({name: "database"}, {default: 1}).default;
    var dbDateRangeMap = matsCollections.CurveParams.findOne({name: "database"}, {dates: 1}).dates;
    var defaultDataSource = matsCollections.CurveParams.findOne({name: "data-source"}, {default: 1}).default;
    minDate = dbDateRangeMap[defaultDb][defaultDataSource].minDate;
    maxDate = dbDateRangeMap[defaultDb][defaultDataSource].maxDate;
    var minusMonthMinDate = matsParamUtils.getMinMaxDates(minDate, maxDate).minDate;
    dstr = minusMonthMinDate + ' - ' + maxDate;

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
                superiorNames: ['database', 'data-source'],
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
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ' ']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "statistic", "variable", "valid-time", "average", "forecast-length", "level"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.reliability,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "variable", "valid-time", "forecast-length", "level"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.roc,
            textPattern: [
                ['', 'label', ': '],
                ['', 'database', '.'],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'variable', ', '],
                ['level: ', 'level', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', '']
            ],
            displayParams: [
                "label", "group", "database", "data-source", "region", "variable", "valid-time", "forecast-length", "level"
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
            plotType: matsTypes.PlotTypes.reliability,
            graphFunction: "graphPlotly",
            dataFunction: "dataReliability",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.roc,
            graphFunction: "graphPlotly",
            dataFunction: "dataROC",
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

    var sumSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.SUMS_DATA, status: "active"}, {
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
    const metadataSettings = matsCollections.Databases.findOne({
        role: matsTypes.DatabaseRoles.META_DATA,
        status: "active"
    }, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    metadataPool = mysql.createPool(metadataSettings);
    const mdr = new matsTypes.MetaDataDBRecord("metadataPool", "mats_metadata", ['ensemble_mats_metadata', 'ensemble_database_groups']);
    matsMethods.resetApp({appMdr: mdr, appType: matsTypes.AppTypes.metexpress, app: 'mats4met-ensemble'});
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
