import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

var modelOptionsMap = {};
var regionModelOptionsMap = {};
var modelTableMap = {};
var forecastLengthOptionsMap = {};

var date = new Date();
var dateOneMonthPrior = new Date();
dateOneMonthPrior.setMonth(dateOneMonthPrior.getMonth() - 1);
var yr = date.getFullYear();
var day = date.getDate();
var month = date.getMonth();
var hour = date.getHours();
var minute = date.getMinutes();
var dstrToday = month + '/' + day + '/' + yr + " " + hour + ":" + minute;
yr = dateOneMonthPrior.getFullYear();
day = dateOneMonthPrior.getDate();
month = dateOneMonthPrior.getMonth();
hour = dateOneMonthPrior.getHours();
minute = dateOneMonthPrior.getMinutes();
var dstrOneMonthPrior = month + '/' + day + '/' + yr + " " + hour + ":" + minute;
var dstr = dstrOneMonthPrior + " - " + dstrToday;

var doPlotParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotParams.remove({});
    }
    if (matsCollections.PlotParams.find().count() == 0) {
        matsCollections.PlotParams.insert(
            {
                name: 'dates',
                type: matsTypes.InputTypes.dateRange,
                options: [''],
                startDate: dstrOneMonthPrior,
                stopDate: dstrToday,
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
                options: Object.keys(plotFormats),
                default: matsTypes.PlotFormats.none,
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });
    }
    return dstr;
};

var doCurveParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }
    if (matsCollections.CurveParams.find().count() == 0) {
        var date = new Date();
        var yr = date.getFullYear();
        var day = date.getDate();
        var month = date.getMonth();
        var dstr = month + '/' + day + '/' + yr;
        var optionsMap = {};
        matsCollections.CurveParams.insert(
            {
                name: 'label',
                type: matsTypes.InputTypes.textInput,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
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
        matsCollections.CurveParams.insert(
            {
                name: 'model',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                tableMap: modelTableMap,
                options: Object.keys(modelOptionsMap),   // convenience
                optionsQuery: "select model from regions_per_model_mats",
                dependentNames: ["region", "forecast-length"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap)[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });
        matsCollections.CurveParams.insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionModelOptionsMap,
                options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]],   // convenience
                superiorNames: ['model'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });

        optionsMap = {
            'RMS': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, sum(m0.N_{{variable0}}) as N0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, sum(m0.N_{{variable0}}) as N0',
                'group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})  order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0 ,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0'],

            'Bias (Model - RAOB)': ['-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.sum_model_{{variable1}}-m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                'group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0'],
            'N': ['sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                ''],
            'model average': ['sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                'sum(m0.sum_model_{{variable1}})/sum(m0.N_{{variable0}}) as stat,m0.N_{{variable0}} as N0',
                ''],
            'RAOB average': ['sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                'sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                '']
        };

        matsCollections.CurveParams.insert(
            {// bias and model average are a different formula for wind (element 0 differs from element 1)
                // but stays the same (element 0 and element 1 are the same) otherwise.
                // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
                // time series we never append element 2. Element 3 is used to give us error values for error bars.
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'RMS',
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });

        optionsMap = {
            temperature: ['dt', 't'],
            RH: ['dR', 'R'],
            RHobT: ['dRoT', 'RoT'],
            winds: ['dw', 'ws'],
            height: ['dH', 'H']
        };

        matsCollections.CurveParams.insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'winds',
                controlButtonVisibility: 'block',
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });

        optionsMap = {All: ['All'], Clear: ['Clear'], Cloudy: ['Cloudy']};
        matsCollections.CurveParams.insert(
            {
                name: 'cloud-coverage',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'All',
                controlButtonVisibility: 'block',
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 2
            });

        optionsMap = {BOTH: [''], '0-UTC': ['and m0.hour = 0'], '12-UTC': ['and m0.hour = 12']};
        matsCollections.CurveParams.insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                selected: 'BOTH',
                unique: false,
                default: 'BOTH',
                controlButtonVisibility: 'block',
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });

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
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                selected: 'None',
                default: 'None',
                controlButtonVisibility: 'block',
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 3
            });

        optionsMap = {};
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]],   // convenience
                superiorNames: ['model'],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]][2],
                controlButtonVisibility: 'block',
                displayOrder: 9,
                displayPriority: 1,
                displayGroup: 3
            });
        matsCollections.CurveParams.insert(
            {
                name: 'top',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                min: '1',
                max: '1000',
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: '1',
                controlButtonVisibility: 'block',
                displayOrder: 10,
                displayPriority: 1,
                displayGroup: 4,
                help: 'top-help.html'
            });
        matsCollections.CurveParams.insert(
            {
                name: 'bottom',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                min: '100',
                max: '1050',
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: '1050',
                controlButtonVisibility: 'block',
                displayOrder: 11,
                displayPriority: 1,
                displayGroup: 4,
                help: 'bottom-help.html'
            });
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
                options: Object.keys(optionsMap),   // convenience
                startDate: dstrOneMonthPrior,
                stopDate: dstrToday,
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
var doCurveTextPatterns = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveTextPatterns.remove({});
    }
    if (matsCollections.CurveTextPatterns.find().count() == 0) {
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'model', ':'],
                ['', 'regionName', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ' '],
                ['level ', 'top', ' '],
                ['to', 'bottom', ' '],
                ['fcst_len:', 'forecast-length', 'h '],
                [' valid-time:', 'valid-time', ' '],
                ['avg:', 'average', ' ']
            ]
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.profile,
            textPattern: [
                ['', 'label', ': '],
                ['', 'model', ':'],
                ['', 'regionName', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ' '],
                ['level ', 'top', ' '],
                ['to', 'bottom', ' '],
                ['fcst_len:', 'forecast-length', 'h '],
                [' valid-time:', 'valid-time', ' '],
                ['avg:', 'average', ' '],
                ['', 'curve-dates', '']
            ]
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
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
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
    }
};


Meteor.startup(function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Databases.remove({});
    }
    if (matsCollections.Databases.find().count() == 0) {
        matsCollections.Databases.insert({
            name: "sumSetting",
            role: "sum_data",
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'writer',
            password: 'amt1234',
            database: 'ruc_ua_sums2',
            connectionLimit: 10
        });
        matsCollections.Databases.insert({
            name: "modelSetting",
            role: "model_data",
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'writer',
            password: 'amt1234',
            database: 'ruc_ua',
            connectionLimit: 10
        });
    }
    var modelSettings = matsCollections.Databases.findOne({role: "model_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    var myModels = [];
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
        connectionLimit: 1
    });
    // the pool is intended to be global
    sumPool = mysql.createPool(sumSettings);
    sumPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });
    var modelRegionNumberMap = {};
    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool, "select model,regions from regions_per_model_mats;");
        for (var i = 0; i < rows.length; i++) {
            var model = rows[i].model.trim();
            var regions = rows[i].regions;
            var regionMapping = "Areg";
            if (model == "NAM" || model == "isoRR1h" || model == "isoRRrapx" || model == "isoBak13") {
                regionMapping = "reg";
            }

            var valueList = [];
            valueList.push(model);
            modelOptionsMap[model] = valueList;

            var tablevalueList = [];
            tablevalueList.push(regionMapping);
            modelTableMap[model] = tablevalueList;
            myModels.push(model);

            var regionArr = regions.split(',');

            modelRegionNumberMap[model] = regionArr;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool, "SELECT model, fcst_lens FROM fcst_lens_per_model;");
        for (var i = 0; i < rows.length; i++) {
            var model = rows[i].model;
            var forecastLengths = rows[i].fcst_lens;
            var forecastLengthArr = forecastLengths.split(',');
            forecastLengthOptionsMap[model] = forecastLengthArr;
        }
    } catch (err) {
        console.log(err.message);
    }

    var regionNumberDescriptionMapping = [];

    try {
        matsCollections.RegionDescriptions.remove({});
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool, "select regionMapTable,description from region_descriptions_mats_new;");
        for (var i = 0; i < rows.length; i++) {
            var regionNumber = (rows[i].regionMapTable);
            var description = rows[i].description;
            var valueList = [];
            valueList.push(regionNumber);
            regionNumberDescriptionMapping[regionNumber] = description;
            matsCollections.RegionDescriptions.insert({regionMapTable: regionNumber, description: description});
        }
    } catch (err) {
        console.log(err.message);
    }

    // build RegionModelOptionsMap
    for (var i = 0; i < myModels.length; i++) {
        var regionNumbers = modelRegionNumberMap[myModels[i]];
        regionModelOptionsMap[myModels[i]] = [];
        for (var i1 = 0; i1 < regionNumbers.length; i1++) {
            regionModelOptionsMap[myModels[i]].push(regionNumberDescriptionMapping[regionNumbers[i1]]);
        }
    }

    // common settings
    matsDataUtils.doRoles();
    matsDataUtils.doAuthorization();
    matsDataUtils.doCredentials();
    matsDataUtils.doColorScheme();
    matsDataUtils.doSettings('Upper Air', Assets.getText('version'));
    // app specific settings
    doPlotGraph();
    doCurveParams();
    doSavedCurveParams();
    doPlotParams();
    doCurveTextPatterns();
    console.log("Running in " + process.env.NODE_ENV + " mode... App version is " + matsCollections.Settings.findOne().version);
    console.log("process.env", JSON.stringify(process.env, null, 2));
});
