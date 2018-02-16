import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

const dateInitStr = matsCollections.dateInitStr();
const dateInitStrParts = dateInitStr.split(' - ');
const startInit = dateInitStrParts[0];
const stopInit = dateInitStrParts[1];
const dstr = startInit + ' - ' + stopInit;

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
                startDate: startInit,
                stopDate: stopInit,
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
                displayOrder: 3,
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
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(metadataPool, "select id,description from region_descriptions;");
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
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool, "select id,model,display_text,table_name_prefix,regions,fcst_lens,display_order,display_category,mindate,minhour,maxdate,maxhour,numrecs from regions_per_model_mats_all_categories order by display_category, display_order;");

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
                options: myModels,   // convenience
                dependentNames: ["region", "forecast-length", "dates", "curve-dates"],
                controlButtonCovered: true,
                default: myModels[0],
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
                    options: myModels
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
        optionsMap = {
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

        var statAuxMap = {
            'RMS-winds': 'group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})  order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0 ,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0',
            'RMS-other': 'group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})  order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0 ,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0',
            'Bias (Model - Obs)-winds': 'group_concat((m0.sum_model_{{variable1}} - m0.sum_ob_{{variable1}})/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0',
            'Bias (Model - Obs)-other': 'group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}}) order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0, group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0',
            'N-winds': 'group_concat(m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0,group_concat(unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0',
            'N-other': 'group_concat(m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0,group_concat(unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0',
            'Model average-winds': 'group_concat(m0.sum_model_{{variable1}}/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0, group_concat(unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0',
            'Model average-other': 'group_concat((m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0, group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0',
            'Obs average-winds': 'group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0, group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0',
            'Obs average-other': 'group_concat(m0.sum_ob_{{variable1}}/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0, group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0'
        };

        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula for wind (element 0 differs from element 1)
                // but stays the same (element 0 and element 1 are the same) otherwise.
                // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
                // time series we never append element 2. Element 3 is used to give us error values for error bars.
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                statAuxMap:statAuxMap,
                options: ['RMS', 'Bias (Model - Obs)', 'N', 'Model average', 'Obs average'],   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'RMS',
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'variable'}) == undefined) {
        optionsMap = {
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
                optionsMap: optionsMap,
                statVarUnitMap: statVarUnitMap,
                options: ['temperature', 'RH', 'RHobT', 'winds', 'height'],   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'winds',
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
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
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
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'dieoff-forecast-length'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'dieoff-forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: {},
                options: [matsTypes.ForecastTypes.dieoff, matsTypes.ForecastTypes.singleCycle],
                superiorNames: [],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.ForecastTypes.dieoff,
                controlButtonVisibility: 'block',
                controlButtonText: 'forecast-length',
                displayOrder: 9,
                displayPriority: 1,
                displayGroup: 3
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'forecast-length'}) == undefined) {
        optionsMap = {};
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
                default: forecastLengthOptionsMap[myModels[0]][0],
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time",
                displayOrder: 9,
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
                displayOrder: 10,
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
                displayOrder: 11,
                displayPriority: 1,
                displayGroup: 4,
                help: 'bottom-help.html'
            });
    }

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
                startDate: startInit,
                stopDate: stopInit,
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
 See curve_item.js and graph.js.
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
                ['', 'regionName', ', '],
                ['', 'variable', ': '],
                ['', 'statistic', ', '],
                ['level ', 'top', ' '],
                ['to ', 'bottom', ' '],
                ['fcst_len:', 'forecast-length', 'h '],
                ['valid-time:', 'valid-time', ' '],
                ['clouds:', 'cloud-coverage', ' '],
                ['avg:', 'average', ' ']
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
                ['', 'regionName', ', '],
                ['', 'variable', ': '],
                ['', 'statistic', ', '],
                ['level ', 'top', ' '],
                ['to', 'bottom', ' '],
                ['fcst_len:', 'forecast-length', 'h '],
                ['valid-time:', 'valid-time', ' '],
                ['clouds:', 'cloud-coverage', ' '],
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
                ['', 'regionName', ', '],
                ['', 'variable', ': '],
                ['', 'statistic', ', '],
                ['level ', 'top', ' '],
                ['to', 'bottom', ' '],
                ['fcst_len:', 'dieoff-forecast-length', 'h '],
                ['valid-time:', 'valid-time', ' '],
                ['clouds:', 'cloud-coverage', ' '],
                ['', 'curve-dates', '']
            ],
            displayParams: [
                "label", "data-source", "region", "statistic", "variable", "cloud-coverage", "valid-time", "dieoff-forecast-length", "top", "bottom"
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
            graphFunction: "graphSeries",
            dataFunction: "dataSeries",
            checked: true
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.profile,
            graphFunction: "graphProfile",
            dataFunction: "dataProfile",
            checked: false
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            graphFunction: "graphDieOff",
            dataFunction: "dataDieOff",
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
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
// The appSpecificResetRoutines object is a special name,
// as is doCurveParams. The refreshMetaData mechanism depends on them being named that way.
appSpecificResetRoutines = {
    doPlotGraph: doPlotGraph,
    doCurveParams: doCurveParams,
    doSavedCurveParams: doSavedCurveParams,
    doPlotParams: doPlotParams,
    doCurveTextPatterns: doCurveTextPatterns
};
