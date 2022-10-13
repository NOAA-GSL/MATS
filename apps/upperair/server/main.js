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

// This app combines two previous apps, upperair and aircraft.
// This is where we store the databases referenced by those apps.
const dbNames = {
    "RAOBs (Traditional)": {"modelDB": "ruc_ua", "sumsDB": "ruc_ua_sums2"},
    "RAOBs (GDAS)": {"modelDB": "ruc_ua_pb", "sumsDB": "ruc_ua_pb_sums2"},
    "AMDAR": {"modelDB": "acars_RR2", "sumsDB": "acars_RR2"}
};
const dbs = Object.keys(dbNames);

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
                controlButtonText: "bin bounds (Enter numbers separated by commas)",
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 2
            });

        const xOptionsMap = {
            'Fcst lead time': "select m0.fcst_len as xVal, ",
            'Pressure level': "select m0.mb10*10 as xVal, ",
            'Valid UTC hour': "select m0.hour as xVal, ",
            'Init UTC hour': "select (unix_timestamp(m0.date)+3600*(m0.hour-m0.fcst_len))%(24*3600)/3600 as xVal, ",
            'Valid Date': "select unix_timestamp(m0.date)+3600*m0.hour as xVal, ",
            'Init Date': "select unix_timestamp(m0.date)+3600*(m0.hour-m0.fcst_len) as xVal, "
        };

        matsCollections.PlotParams.insert(
            {
                name: 'x-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(xOptionsMap),
                optionsMap: xOptionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(xOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 9,
                displayPriority: 1,
                displayGroup: 2,
            });

        const yOptionsMap = {
            'Fcst lead time': "m0.fcst_len as yVal, ",
            'Pressure level': "m0.mb10*10 as yVal, ",
            'Valid UTC hour': "m0.hour as yVal, ",
            'Init UTC hour': "(unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600)%(24*3600)/3600 as yVal, ",
            'Valid Date': "unix_timestamp(m0.date)+3600*m0.hour as yVal, ",
            'Init Date': "unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600 as yVal, "
        };

        matsCollections.PlotParams.insert(
            {
                name: 'y-axis-parameter',
                type: matsTypes.InputTypes.select,
                options: Object.keys(yOptionsMap),
                optionsMap: yOptionsMap,
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(yOptionsMap)[1],
                controlButtonVisibility: 'block',
                displayOrder: 10,
                displayPriority: 1,
                displayGroup: 2,
            });

        matsCollections.PlotParams.insert(
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
                displayOrder: 11,
                displayPriority: 1,
                displayGroup: 2,
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
    var modelDateRangeMap = {};
    var regionModelOptionsMap = {};
    var siteOptionsMap = {};
    var sitesLocationMap = [];
    var forecastLengthOptionsMap = {};
    var masterRegionValuesMap = {};

    var rows;
    var didx;

    try {
        masterRegionValuesMap["ID"] = {};
        masterRegionValuesMap["shortName"] = {};
        rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(metadataPool, "select short_name,id,description from region_descriptions;");
        var masterRegDescription;
        var masterId;
        var masterSn;
        for (var j = 0; j < rows.length; j++) {
            masterRegDescription = rows[j].description.trim();
            masterId = rows[j].id;
            masterSn = rows[j].short_name;
            masterRegionValuesMap["ID"][masterId] = masterRegDescription;
            masterRegionValuesMap["shortName"]["_" + masterSn + "_sums"] = masterRegDescription;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        for (didx = 0; didx < dbs.length; didx++) {
            modelOptionsMap[dbs[didx]] = {};
            modelDateRangeMap[dbs[didx]] = {};
            forecastLengthOptionsMap[dbs[didx]] = {};
            regionModelOptionsMap[dbs[didx]] = {};

            if (dbs[didx].includes("RAOBs")) {
                rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select table_name_prefix,display_text,regions,fcst_lens,display_order,display_category,mindate,minhour,maxdate,maxhour,numrecs from " + dbNames[dbs[didx]].modelDB + ".regions_per_model_mats_all_categories order by display_category, display_order;");
            } else {
                rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select model,display_text,regions,fcst_lens,mindate,maxdate from " + dbNames[dbs[didx]].modelDB + ".regions_per_model_mats_all_categories order by display_category, display_order;");
            }
            for (var i = 0; i < rows.length; i++) {
                var model_value;
                if (dbs[didx].includes("RAOBs")) {
                    model_value = rows[i].table_name_prefix.trim();
                } else {
                    model_value = rows[i].model.trim();
                }
                var model = rows[i].display_text.trim();
                modelOptionsMap[dbs[didx]][model] = [model_value];

                var rowMinDate;
                var rowMaxDate;
                if (dbs[didx].includes("RAOBs")) {
                    rowMinDate = moment.utc(rows[i].mindate).add(rows[i].minhour, 'hours').format("MM/DD/YYYY HH:mm");
                    rowMaxDate = moment.utc(rows[i].maxdate).add(rows[i].maxhour, 'hours').format("MM/DD/YYYY HH:mm");
                } else {
                    rowMinDate = moment.utc(rows[i].mindate * 1000).format("MM/DD/YYYY HH:mm");
                    rowMaxDate = moment.utc(rows[i].maxdate * 1000).format("MM/DD/YYYY HH:mm");
                }
                modelDateRangeMap[dbs[didx]][model] = {minDate: rowMinDate, maxDate: rowMaxDate};

                var forecastLengths = rows[i].fcst_lens;
                var forecastLengthArr = forecastLengths.split(',').map(Function.prototype.call, String.prototype.trim);
                for (var j = 0; j < forecastLengthArr.length; j++) {
                    forecastLengthArr[j] = forecastLengthArr[j].replace(/'|\[|\]|\"/g, "");
                }
                forecastLengthOptionsMap[dbs[didx]][model] = forecastLengthArr;

                var regions = rows[i].regions;
                var regionsArrRaw = regions.split(',').map(Function.prototype.call, String.prototype.trim);
                var regionsArr = [];
                var dummyRegion;
                for (var j = 0; j < regionsArrRaw.length; j++) {
                    dummyRegion = regionsArrRaw[j].replace(/'|\[|\]|\"/g, "");
                    if (dbs[didx].includes("RAOBs")) {
                        regionsArr.push(masterRegionValuesMap["ID"][dummyRegion]);
                    } else {
                        regionsArr.push(masterRegionValuesMap["shortName"]["_" + dummyRegion + "_sums"]);
                    }
                }
                regionModelOptionsMap[dbs[didx]][model] = regionsArr;
            }
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        matsCollections.SiteMap.remove({});
        const rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(sumPool, "select wmoid,name,lat,lon,elev,descript from ruc_ua_pb.metadata where lat > -9000 and lat < 9000 and lon > -18000 and lon < 18000 order by descript;");
        for (var i = 0; i < rows.length; i++) {

            var site_name = rows[i].name;
            var site_description = rows[i].descript !== null ? rows[i].descript.replace(/\./g, "") : site_name;
            var name_string = site_description !== site_name ? site_description + " (" + site_name + ")" : site_name;
            var site_id = rows[i].wmoid;
            var site_lat = rows[i].lat / 100;
            var site_lon = rows[i].lon / 100;
            var site_elev = rows[i].elev;
            siteOptionsMap[name_string] = [site_id];

            var point = [site_lat, site_lon];
            var obj = {
                name: name_string,
                origName: site_name,
                point: point,
                elevation: site_elev,
                options: {
                    title: name_string,
                    color: 'red',
                    size: 5,
                    network: 'RAOB',
                    peerOption: name_string,
                    id: site_id,
                    highLightColor: 'blue'
                }
            };
            sitesLocationMap.push(obj);

            matsCollections.SiteMap.insert({siteName: name_string, siteId: site_id});
        }
    } catch (err) {
        console.log(err.message);
    }

    matsCollections.StationMap.remove({});
    matsCollections.StationMap.insert(
        {
            name: 'stations',
            optionsMap: sitesLocationMap,
        }
    );

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

    if (matsCollections["database"].findOne({name: 'database'}) == undefined) {
        matsCollections["database"].insert(
            {
                name: 'database',
                type: matsTypes.InputTypes.select,
                optionsMap: dbNames,
                options: dbs,
                dates: modelDateRangeMap,
                dependentNames: ["data-source"],
                controlButtonCovered: true,
                default: dbs[0],
                hideOtherFor: {
                    'phase': ["RAOBs (Traditional)", "RAOBs (GDAS)"]
                },
                unique: false,
                controlButtonVisibility: 'block',
                controlButtonText: "truth",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["database"].findOne({name: 'database'});
        if (!matsDataUtils.areObjectsEqual(currentParam.dates, modelDateRangeMap)) {
            // have to reload database data
            matsCollections["database"].update({name: 'database'}, {
                $set: {
                    dates: modelDateRangeMap
                }
            });
        }
    }

    if (matsCollections['region-type'].findOne({name: 'region-type'}) == undefined) {
        matsCollections['region-type'].insert(
            {
                name: 'region-type',
                type: matsTypes.InputTypes.select,
                options: ['Predefined region', 'Select stations'],
                dependentNames: ["variable"],
                default: 'Predefined region',
                hideOtherFor: {
                    'region': ["Select stations"],
                    'sites': ["Predefined region"],
                    'sitesMap': ["Predefined region"]
                },
                controlButtonCovered: true,
                controlButtonText: 'Region mode',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections["data-source"].findOne({name: 'data-source'}) == undefined) {
        matsCollections["data-source"].insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap[dbs[0]]),
                superiorNames: ["database"],
                dependentNames: ["region", "forecast-length", "dates", "curve-dates"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap[dbs[0]])[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["data-source"].findOne({name: 'data-source'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) {
            // have to reload model data
            matsCollections["data-source"].update({name: 'data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap[dbs[0]]),
                    default: Object.keys(modelOptionsMap[dbs[0]])[0]
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
                options: regionModelOptionsMap[dbs[0]][Object.keys(regionModelOptionsMap[dbs[0]])[0]],
                valuesMap: masterRegionValuesMap,
                superiorNames: ['database', 'data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[dbs[0]][Object.keys(regionModelOptionsMap[dbs[0]])[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections["region"].findOne({name: 'region'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionModelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.valuesMap, masterRegionValuesMap))) {
            // have to reload region data
            matsCollections["region"].update({name: 'region'}, {
                $set: {
                    optionsMap: regionModelOptionsMap,
                    valuesMap: masterRegionValuesMap,
                    options: regionModelOptionsMap[dbs[0]][Object.keys(regionModelOptionsMap[dbs[0]])[0]],
                    default: regionModelOptionsMap[dbs[0]][Object.keys(regionModelOptionsMap[dbs[0]])[0]][0]
                }
            });
        }
    }

    if (matsCollections["statistic"].findOne({name: 'statistic'}) == undefined) {
        const optionsMap = {
            "RMSE": "scalar",

            "Bias (Model - Obs)": "scalar",

            "N": "scalar",

            "Model average": "scalar",

            "Obs average": "scalar",

            "Std deviation": "scalar",

            "MAE (station plots only)": "scalar"
        };

        matsCollections["statistic"].insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(optionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections['variable'].findOne({name: 'variable'}) == undefined) {
        const statVarOptionsMap = {
            // THIS IS KEYED BY REGION-TYPE BECAUSE OUR MYSQL OBS TABLE DOESN'T HAVE RH
            // FOR SOME REASON OR OTHER, SO IT NEEDS TO BE EXCLUDED AS A VARIABLE
            // FROM STATION PLOTS. SIGH.
            //
            // ARRAY ITEMS BY INDEX:
            // 0: sum of squared x-x_bar difference for RMSE/STDEV
            // 1: number of values in sum
            // 2: sum of obs-model difference (-1 * bias * N)
            // 3: sum of model values
            // 4: sum of obs values
            // 5: sum of absolute obs-model difference  (|bias_0| + |bias_1| + |bias_2| + ... + |bias_n|)
            'Predefined region': {
                'Temperature': ['m0.sum2_dt', 'm0.N_dt', 'm0.sum_dt', '-1 * (m0.sum_dt-m1.sum_ob_t)', 'm1.sum_ob_t', '0'],
                'RH': ['m0.sum2_dR', 'm0.N_dR', 'm0.sum_dR', '-1 * (m0.sum_dR-m1.sum_ob_R)', 'm1.sum_ob_R', '0'],
                'RHobT': ['m0.sum2_dRoT', 'm0.N_dRoT', 'm0.sum_dRoT', '-1 * (m0.sum_dRoT-m1.sum_ob_R)', 'm1.sum_ob_R', '0'],
                'Wind': ['m0.sum2_dw', 'm0.N_dw', 'm0.sum_ob_ws-m0.sum_model_ws', 'm0.sum_model_ws', 'm0.sum_ob_ws', '0'],
            },
            'Select stations': {
                'Temperature': ['pow(o.t - m0.t,2)/10000', '(o.t - m0.t)/100', '(o.t - m0.t)/100', '(if(o.t is not null,m0.t,null))/100', '(if(m0.t is not null,o.t,null))/100', '(abs(o.t - m0.t))/100'],
                'RH': ['(pow(o.rh - m0.rh,2))', '(o.rh - m0.rh)', '(o.rh - m0.rh)', '(if(o.rh is not null,m0.rh,null))', '(if(m0.rh is not null,o.rh,null))', '(abs(o.rh - m0.rh))'],
                'RHobT': ['(pow(o.rhot - m0.rhot,2))', '(o.rhot - m0.rhot)', '(o.rhot - m0.rhot)', '(if(o.rhot is not null,m0.rhot,null))', '(if(m0.rhot is not null,o.rhot,null))', '(abs(o.rhot - m0.rhot))'],
                'Dewpoint': ['(pow(o.dp - m0.dp,2))/10000', '(o.dp - m0.dp)/100', '(o.dp - m0.dp)/100', '(if(o.dp is not null,m0.dp,null))/100', '(if(m0.dp is not null,o.dp,null))/100', '(abs(o.dp - m0.dp))/100'],
                'Wind': ['(pow(o.ws,2)+pow(m0.ws,2)-2*o.ws*m0.ws*cos((o.wd-m0.wd)/57.2958))/10000', '(o.ws + m0.ws)/100', '(o.ws - m0.ws)/100', '(if(o.ws is not null,m0.ws,null))/100', '(if(m0.ws is not null,o.ws,null))/100', '(abs(o.ws - m0.ws))/100'],
                'Height': ['pow(o.z - m0.z,2)', '(o.z - m0.z)', '(o.z - m0.z)', '(if(o.z is not null,m0.z,null))', '(if(m0.z is not null,o.z,null))', '(abs(o.z - m0.z))']
            }
        };

        const statVarUnitMap = {
            'RMSE': {
                'Temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'Dewpoint': '°C',
                'Wind': 'm/s',
                'Height': 'z'
            },
            'Bias (Model - Obs)': {
                'Temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'Dewpoint': '°C',
                'Wind': 'm/s',
                'Height': 'z'
            },
            'N': {
                'Temperature': 'Number',
                'RH': 'Number',
                'RHobT': 'Number',
                'Dewpoint': 'Number',
                'Wind': 'Number',
                'Height': 'Number'
            },
            'Model average': {
                'Temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'Dewpoint': '°C',
                'Wind': 'm/s',
                'Height': 'z'
            },
            'Obs average': {
                'Temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'Dewpoint': '°C',
                'Wind': 'm/s',
                'Height': 'z'
            },
            'Std deviation': {
                'Temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'Dewpoint': '°C',
                'Wind': 'm/s',
                'Height': 'z'
            },
            'MAE (station plots only)': {
                'Temperature': '°C',
                'RH': 'RH (%)',
                'RHobT': 'RH (%)',
                'Dewpoint': '°C',
                'Wind': 'm/s',
                'Height': 'z'
            }
        };

        matsCollections['variable'].insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                superiorNames: ['region-type'],
                optionsMap: statVarOptionsMap,
                statVarUnitMap: statVarUnitMap,
                options: Object.keys(statVarOptionsMap["Predefined region"]),
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(statVarOptionsMap["Predefined region"])[0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections["forecast-length"].findOne({name: 'forecast-length'}) == undefined) {
        matsCollections["forecast-length"].insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: forecastLengthOptionsMap[dbs[0]][Object.keys(forecastLengthOptionsMap[dbs[0]])[0]],
                superiorNames: ['database', 'data-source'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: 6,
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time (h)",
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
                    options: forecastLengthOptionsMap[dbs[0]][Object.keys(forecastLengthOptionsMap[dbs[0]])[0]]
                }
            });
        }
    }

    if (matsCollections["dieoff-type"].findOne({name: 'dieoff-type'}) == undefined) {
        var dieoffOptionsMap = {
            "Dieoff": [matsTypes.ForecastTypes.dieoff],
            "Dieoff for a specified UTC cycle init hour": [matsTypes.ForecastTypes.utcCycle],
            "Single cycle forecast (uses first date in range)": [matsTypes.ForecastTypes.singleCycle]
        };
        matsCollections["dieoff-type"].insert(
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
                default: ['12'],
                controlButtonVisibility: 'block',
                controlButtonText: "utc cycle init hour",
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true
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
                controlButtonText: 'top level limit (hPa)',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5
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
                default: 1000,
                controlButtonVisibility: 'block',
                controlButtonText: 'bottom level limit (hPa)',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 5
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

    if (matsCollections["sites"].findOne({name: 'sites'}) == undefined) {
        matsCollections["sites"].insert(
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
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 6,
                multiple: true
            });
    }

    if (matsCollections["sitesMap"].findOne({name: 'sitesMap'}) == undefined) {
        matsCollections["sitesMap"].insert(
            {
                name: 'sitesMap',
                type: matsTypes.InputTypes.selectMap,
                optionsMap: sitesLocationMap,
                options: Object.keys(sitesLocationMap),
                peerName: 'sites',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.InputTypes.unused,
                controlButtonVisibility: 'block',
                controlButtonText: "sites (Map display)",
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 6,
                multiple: true,
                defaultMapView: {point: [50, -92.5], zoomLevel: 1.25},
                help: 'map-help.html'
            });
    }

    // determine date defaults for dates and curveDates
    const defaultDb = matsCollections["database"].findOne({name: "database"}, {default: 1}).default;
    modelDateRangeMap = matsCollections["database"].findOne({name: "database"}, {dates: 1}).dates;
    const defaultDataSource = matsCollections["data-source"].findOne({name: "data-source"}, {default: 1}).default;
    minDate = modelDateRangeMap[dbs[0]][defaultDataSource].minDate;
    maxDate = modelDateRangeMap[dbs[0]][defaultDataSource].maxDate;

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
                ['', 'sites', ': '],
                ['', 'region', ', '],
                ['', 'database', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['phase: ', 'phase', ', '],
                ['avg: ', 'average', '']
            ],
            displayParams: [
                "label", "database", "data-source", "region-type", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "average", "top", "bottom", "sites", "sitesMap"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.profile,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'sites', ': '],
                ['', 'region', ', '],
                ['', 'database', ' '],
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
                "label", "database", "data-source", "region-type", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "top", "bottom", "sites", "sitesMap", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'sites', ': '],
                ['', 'region', ', '],
                ['', 'database', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['', 'dieoff-type', ', '],
                ['valid-time: ', 'valid-time', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['phase: ', 'phase', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "database", "data-source", "region-type", "region", "statistic", "variable", "dieoff-type", "valid-time", "utc-cycle-start", "phase", "top", "bottom", "sites", "sitesMap", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.validtime,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'sites', ': '],
                ['', 'region', ', '],
                ['', 'database', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['phase: ', 'phase', ', '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "database", "data-source", "region-type", "region", "statistic", "variable", "forecast-length", "phase", "top", "bottom", "sites", "sitesMap", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dailyModelCycle,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'sites', ': '],
                ['', 'region', ', '],
                ['', 'database', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['start utc: ', 'utc-cycle-start', ', '],
                ['phase: ', 'phase', ', ']
            ],
            displayParams: [
                "label", "database", "data-source", "region-type", "region", "statistic", "variable", "utc-cycle-start", "phase", "top", "bottom", "sites", "sitesMap"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.map,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ': '],
                ['', 'sites', ': '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', ' h '],
                [' valid-time:', 'valid-time', '']
            ],
            displayParams: [
                "label", "database", "data-source", "statistic", "variable", "forecast-length", "top", "bottom", "valid-time", "sites", "sitesMap"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.histogram,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'sites', ': '],
                ['', 'region', ', '],
                ['', 'database', ' '],
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
                "label", "data-source", "region-type", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "top", "bottom", "sites", "sitesMap", "curve-dates"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contour,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'database', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['phase: ', 'phase', '']
            ],
            displayParams: [
                "label", "database", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "top", "bottom"
            ],
            groupSize: 6
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.contourDiff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'region', ', '],
                ['', 'database', ' '],
                ['', 'variable', ' '],
                ['', 'statistic', ', '],
                ['level: ', 'top', ' '],
                ['to ', 'bottom', ', '],
                ['fcst_len: ', 'forecast-length', 'h, '],
                ['valid-time: ', 'valid-time', ', '],
                ['phase: ', 'phase', '']
            ],
            displayParams: [
                "label", "database", "data-source", "region", "statistic", "variable", "valid-time", "forecast-length", "phase", "top", "bottom"
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
    const metadataSettings = matsCollections.Databases.findOne({
        role: matsTypes.DatabaseRoles.META_DATA,
        status: "active"
    }, {
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
    for (var didx = 0; didx < dbs.length; didx++) {
        mdr.addRecord("sumPool", dbNames[dbs[didx]].modelDB, ['regions_per_model_mats_all_categories']);
    }
    try {
        matsMethods.resetApp({appPools: allPools, appMdr: mdr, appType: matsTypes.AppTypes.mats});
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
