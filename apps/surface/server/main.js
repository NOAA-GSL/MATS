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
    var forecastLengthOptionsMap = {};
    var regionModelOptionsMap = {};
    var siteOptionsMap = {};
    var sitesLocationMap = [];
    var siteObjMap = {};
    var masterRegionValuesMap = {};
    var masterMETARValuesMap = {};
    var modelDateRangeMap = {};
    var metarModelOptionsMap = {};
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
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "SELECT metar_string,description FROM metar_string_descriptions;");
        var masterMETARDescription;
        var masterMETARString;
        for (var j = 0; j < rows.length; j++) {
            masterMETARDescription = rows[j].description.trim();
            masterMETARString = rows[j].metar_string.trim();
            masterMETARValuesMap[masterMETARString] = masterMETARDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,metar_string,regions,display_text,fcst_lens,mindate,maxdate from regions_per_model_mats_all_categories order by display_category, display_order;");
        for (var i = 0; i < rows.length; i++) {

            var model_value = rows[i].model.trim();
            var model = rows[i].display_text.trim();
            modelOptionsMap[model] = [model_value];

            var rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
            var rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
            modelDateRangeMap[model] = {minDate: rowMinDate, maxDate: rowMaxDate};

            var metarStrings = rows[i].metar_string;
            var metarStringsArr = metarStrings.split(',').map(Function.prototype.call, String.prototype.trim);
            var metarArr = [];
            var dummyMETAR;
            for (var j = 0; j < metarStringsArr.length; j++) {
                dummyMETAR = metarStringsArr[j].replace(/'|\[|\]/g, "");
                metarArr.push(masterMETARValuesMap[dummyMETAR]);
            }
            metarModelOptionsMap[model] = metarArr;

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

    try {
        matsCollections.SiteMap.remove({});
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sitePool, "select madis_id,name,lat,lon,elev,metar_mats_test.desc from metar_mats_test order by name;");
        for (var i = 0; i < rows.length; i++) {

            var site_name = rows[i].name;
            var site_description = rows[i].desc;
            var site_id = rows[i].madis_id;
            var site_lat = rows[i].lat / 100;
            var site_lon = rows[i].lon / 100;
            var site_elev = rows[i].elev;
            siteOptionsMap[site_name] = [site_id];
            //masterSitesMap[site_name] = [site_description];
            //sitesLocationMap[site_name] = {lat: site_lat, lon: site_lon, elev: site_elev};

            matsCollections.SiteMap.insert({siteName: site_name, siteId: site_id});

            var point = [site_lat, site_lon];
            var obj = {
                name: site_name,
                point: point,
                elevation: site_elev,
                options: {
                    title: site_description,
                    color: 'red',
                    size: 5,
                    network: 'METAR',
                    peerOption: site_name,
                    id: site_id,
                    highLightColor: 'blue'
                }
            };
            sitesLocationMap.push(obj);
        }

    } catch (err) {
        console.log(err.message);
    }
    matsCollections.StationMap.remove({});

    if (matsCollections.StationMap.find({name: 'stations'}).count() == 0) {
        matsCollections.StationMap.insert(
            {
                name: 'stations',
                optionsMap: sitesLocationMap,
            }
        );
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
                dependentNames: ["region", "forecast-length", "truth", "dates", "curve-dates"],
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

    if (matsCollections.CurveParams.find({name: 'statistic'}).count() == 0) {
        const statOptionsMap = {
            //The original RMS query for temp in rucstats ends with 'avg(m0.N_{{variable0}})/1000', not 'sum(m0.N_{{variable0}})/1000'
            //as is used in MATS. For the added queries, I am using the rucstats syntax.

            'RMS': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}}))/1.8 as stat, stddev(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})/1.8) as stdev, sum(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})/1.8, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, stddev(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})) as stdev, sum(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}}), ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}}))/2.23693629 as stat, stddev(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})/2.23693629) as stdev, sum(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})/2.23693629, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data'
            ],
            'Bias (Model - Obs)': ['-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}})/1.8 as stat, stddev(-m0.sum_{{variable0}}/m0.N_{{variable0}}/1.8) as stdev, sum(m0.N_{{variable0}})/1000 as N0, group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}}/1.8, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                '-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}) as stat, stddev(-m0.sum_{{variable0}}/m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}})/1000 as N0, group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}}, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sum(m0.sum_model_{{variable1}}-m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, stddev((m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}}/2.23693629) as stdev, sum(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}}/2.23693629, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data'
            ],
            'N': ['sum(m0.N_{{variable0}}) as stat, stddev(m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0, group_concat(m0.N_{{variable0}}, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sum(m0.N_{{variable0}}) as stat, stddev(m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0, group_concat(m0.N_{{variable0}}, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sum(m0.N_{{variable0}}) as stat, stddev(m0.N_{{variable0}}) as stdev, sum(m0.N_{{variable0}}) as N0, group_concat(m0.N_{{variable0}}, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data'
            ],
            'Model average': [
                '(sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(m0.N_{{variable0}})-32)/1.8 as stat, stddev(((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}}-32.)/1.8) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat(((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}}-32.)/1.8, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                '(sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(m0.N_{{variable0}})) as stat, stddev((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}}) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}}, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sum(m0.sum_model_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, stddev(m0.sum_model_{{variable1}}/m0.N_{{variable0}}/2.23693629) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_model_{{variable1}}/m0.N_{{variable0}}/2.23693629, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data'
            ],
            'Obs average': ['(sum(m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}})-32)/1.8 as stat, stddev((m0.sum_ob_{{variable1}}/m0.N_{{variable0}}-32.)/1.8) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_ob_{{variable1}}/m0.N_{{variable0}}-32.)/1.8, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                '(sum(m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}}))/ as stat, stddev(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sum(m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}})/2.23693629 as stat, stddev(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}/2.23693629) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}}/2.23693629, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data'
            ],
            'Std deviation': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2))/1.8 as stat, stddev(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2))/1.8) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2))/1.8, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2)) as stat, stddev(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2))) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2)), ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})-pow(sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}),2))/2.23693629 as stat, stddev(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2))/2.23693629) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat(sqrt(m0.sum2_{{variable0}}/m0.N_{{variable0}}-pow(m0.sum_{{variable0}}/m0.N_{{variable0}},2))/2.23693629, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data'
            ],
            'MAE': ['sum(m0.sum_a{{variable0}})/sum(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/1.8 as stat, stddev((m0.sum_a{{variable0}})/(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/1.8) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_a{{variable0}})/(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/1.8, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sum(m0.sum_a{{variable0}})/sum(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}})) as stat, stddev((m0.sum_a{{variable0}})/(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_a{{variable0}})/(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}})), ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data',
                'sum(m0.sum_a{{variable0}})/sum(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/2.23693629 as stat, stddev((m0.sum_a{{variable0}})/(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/2.23693629) as stdev, avg(m0.N_{{variable0}})/1000 as N0, group_concat((m0.sum_a{{variable0}})/(if(m0.sum_a{{variable0}} is null,0,m0.N_{{variable0}}))/2.23693629, ";", (m0.valid_day) + 3600 * m0.hour order by (m0.valid_day) + 3600 * m0.hour) as sub_data']

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
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.find({name: 'variable'}).count() == 0) {
        const statVarOptionsMap = {
            '2m temperature': ['dt', 't', 'temp'],
            '2m RH': ['drh', 'rh', 'rh'],
            '2m dewpoint': ['dTd', 'td', 'dp'],
            '10m wind': ['dw', 'ws', 'ws'],
        };

        const statVarUnitMap = {
            'RMS': {
                '2m temperature': '°C',
                '2m RH': 'RH (%)',
                '2m dewpoint': '°C',
                '10m wind': 'm/s'
            },
            'Bias (Model - Obs)': {
                '2m temperature': '°C',
                '2m RH': 'RH (%)',
                '2m dewpoint': '°C',
                '10m wind': 'm/s'
            },
            'N': {
                '2m temperature': 'Number',
                '2m RH': 'Number',
                '2m dewpoint': 'Number',
                '10m wind': 'Number'
            },
            'Model average': {
                '2m temperature': '°C',
                '2m RH': 'RH (%)',
                '2m dewpoint': '°C',
                '10m wind': 'm/s'
            },
            'Obs average': {
                '2m temperature': '°C',
                '2m RH': 'RH (%)',
                '2m dewpoint': '°C',
                '10m wind': 'm/s'
            },
            'Std deviation': {
                '2m temperature': '°C',
                '2m RH': 'RH (%)',
                '2m dewpoint': '°C',
                '10m wind': 'm/s'
            },
            'MAE': {
                '2m temperature': '°C',
                '2m RH': 'RH (%)',
                '2m dewpoint': '°C',
                '10m wind': 'm/s'
            }
        };

        const mapVarUnitMap = {
            'diff': {
                '2m temperature': '°C',
                '2m RH': 'RH (%)',
                '2m dewpoint': '°C',
                '10m wind': 'm/s'
            }
        };

        matsCollections.CurveParams.insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: statVarOptionsMap,
                statVarUnitMap: statVarUnitMap,
                mapVarUnitMap: mapVarUnitMap,
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

    if (matsCollections.CurveParams.find({name: 'average'}).count() == 0) {
        const optionsMap = {
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

    if (matsCollections.CurveParams.find({name: 'truth'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'truth',
                type: matsTypes.InputTypes.select,
                optionsMap: metarModelOptionsMap,
                options: metarModelOptionsMap[Object.keys(metarModelOptionsMap)[0]],
                valuesMap: masterMETARValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: 'QC-METAR',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'truth'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, metarModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterMETARValuesMap))) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'truth'}, {
                $set: {
                    optionsMap: metarModelOptionsMap,
                    valuesMap: masterMETARValuesMap,
                    options: metarModelOptionsMap[Object.keys(metarModelOptionsMap)[0]],
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'sites'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'sites',
                type: matsTypes.InputTypes.select,
                optionsMap: siteOptionsMap,
                options: Object.keys(siteOptionsMap),
                peerName: 'sitesMap',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true,
                /*
                hiddenPlotTypes means that this parameter will be hidden for all the PlotTypes listed here. In other words this param
                will only be visible for matsTypes.PlotTypes.map
                If this param option is missing or empty then the parameter is visible for all plotTypes.
                 */
                hiddenForPlotTypes: [matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.profile, matsTypes.PlotTypes.scatter2d]
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'sites'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, siteOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'sites'}, {
                $set: {
                    optionsMap: siteOptionsMap,
                    options: Object.keys(siteOptionsMap),
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'sitesMap'}).count() == 0) {
        matsCollections.CurveParams.insert(
            {
                name: 'sitesMap',
                type: matsTypes.InputTypes.selectMap,
                optionsMap: sitesLocationMap,
                options: Object.keys(sitesLocationMap),   // convenience
                peerName: 'sites',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                //default: siteOptionsMap[Object.keys(siteOptionsMap)[0]],
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true,
                defaultMapView: {point: [50, -92.5], zoomLevel: 1.25},
                hiddenForPlotTypes: [matsTypes.PlotTypes.dieoff, matsTypes.PlotTypes.timeSeries, matsTypes.PlotTypes.validtime, matsTypes.PlotTypes.profile, matsTypes.PlotTypes.scatter2d],
                help: 'map-help.html'
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'sites'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, siteOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'sites'}, {
                $set: {
                    optionsMap: siteOptionsMap,
                    options: Object.keys(siteOptionsMap),
                }
            });
        }
    }

    if (matsCollections.CurveParams.find({name: 'x-axis-parameter'}).count() == 0) {

        const optionsMap = {
            'Fcst lead time': "select m0.fcst_len as xVal, ",
            'Valid UTC hour': "select m0.hour as xVal, ",
            'Init UTC hour': "select (m0.valid_day+3600*m0.hour-m0.fcst_len*3600)%(24*3600)/3600 as xVal, ",
            'Valid Date': "select m0.valid_day+3600*m0.hour as xVal, ",
            'Init Date': "select m0.valid_day+3600*m0.hour-m0.fcst_len*3600 as xVal, "
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
                default: Object.keys(optionsMap)[1],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5,
            });
    }

    if (matsCollections.CurveParams.find({name: 'y-axis-parameter'}).count() == 0) {

        const optionsMap = {
            'Fcst lead time': "m0.fcst_len as yVal, ",
            'Valid UTC hour': "m0.hour as yVal, ",
            'Init UTC hour': "(m0.valid_day+3600*m0.hour-m0.fcst_len*3600)%(24*3600)/3600 as yVal, ",
            'Valid Date': "m0.valid_day+3600*m0.hour as yVal, ",
            'Init Date': "m0.valid_day+3600*m0.hour-m0.fcst_len*3600 as yVal, "
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
    var defaultDataSource = matsCollections.CurveParams.findOne({name:"data-source"},{default:1}).default;
    modelDateRangeMap = matsCollections.CurveParams.findOne({name:"data-source"},{dates:1}).dates;
    minDate = modelDateRangeMap[defaultDataSource].minDate;
    maxDate = modelDateRangeMap[defaultDataSource].maxDate;
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
var doCurveTextPatterns = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
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
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['avg: ', 'average', ', '],
                ['', 'truth', ' ']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "average", "forecast-length", "valid-time", "truth"
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
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "dieoff-type", "valid-time", "utc-cycle-start", "truth", "curve-dates"
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
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "forecast-length", "truth", "curve-dates"
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
                ['start utc: ', 'utc-cycle-start', ', '],
                ['', 'truth', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "utc-cycle-start", "truth"
            ],
            groupSize: 6

        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.map,
            textPattern: [
                ['', 'data-source', ': '],
                ['', 'sites', ': '],
                ['', 'variable', ', '],
                ['fcst_len: ', 'forecast-length', ' h '],
                [' valid-time:', 'valid-time', '']
            ],
            displayParams: [
                "data-source", "sites", "sitesMap", "variable", "forecast-length", "valid-time"
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
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "forecast-length", "valid-time", "truth", "curve-dates"
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
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['x-axis: ', 'x-axis-parameter', ', '],
                ['y-axis: ', 'y-axis-parameter', '']

            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "forecast-length", "valid-time", "truth", "x-axis-parameter", "y-axis-parameter"
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
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['', 'truth', ', '],
                ['x-axis: ', 'x-axis-parameter', ', '],
                ['y-axis: ', 'y-axis-parameter', '']

            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "forecast-length", "valid-time", "truth", "x-axis-parameter", "y-axis-parameter", "significance"
            ],
            groupSize: 6

        });
    }
};

var doSavedCurveParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.SavedCurveParams.remove({});
    }
    if (matsCollections.SavedCurveParams.find().count() == 0) {
        matsCollections.SavedCurveParams.insert({clName: 'changeList', changeList: []});
    }
};

var doPlotGraph = function () {
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
            plotType: matsTypes.PlotTypes.map,
            graphFunction: "graphPlotly",
            dataFunction: "dataMap",
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
            database: 'surface_sums2',
            connectionLimit: 10
        });
    }

    matsCollections.Databases.insert({
        role: matsTypes.DatabaseRoles.META_DATA,
        status: "active",
        host: 'wolphin.fsl.noaa.gov',
        user: 'readonly',
        password: 'ReadOnly@2016!',
        database: 'mats_common',
        connectionLimit: 10
    });

    matsCollections.Databases.insert({
        name: "siteSetting",
        role: matsTypes.DatabaseRoles.SITE_DATA,
        status: "active",
        host: 'wolphin.fsl.noaa.gov',
        user: 'readonly',
        password: 'ReadOnly@2016!',
        database: 'madis3',
        connectionLimit: 10
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

    const siteSettings = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.SITE_DATA, status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    sitePool = mysql.createPool(siteSettings);
    sitePool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    const mdr = new matsTypes.MetaDataDBRecord("metadataPool", "mats_common", ['region_descriptions']);
    mdr.addRecord("sumPool", "surface_sums2", ['regions_per_model_mats_all_categories']);
    mdr.addRecord("sitePool", "madis3", ['metar_mats_test']);
    matsMethods.resetApp({appMdr:mdr, appType:matsTypes.AppTypes.mats, app:'surface'});});

// this object is global so that the reset code can get to it --
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
