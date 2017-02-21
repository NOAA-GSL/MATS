import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

var modelOptionsMap = {};
var regionModelOptionsMap = {};
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

const doPlotParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.PlotParams.remove({});
    }
// remove for production
    matsCollections.PlotParams.remove({});
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
                controlButtonCovered: true,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });
    }
    return dstr;
};

const doCurveParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }

//remove for production
    matsCollections.CurveParams.remove({});
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
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap),   // convenience
                optionsQuery: "select model from regions_per_model",
                dependentNames: ["region", "forecast-length"],
                controlButtonCovered: true,
                default: 'Bak13',
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
                options: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[3]],   // convenience
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[3]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });


        optionsMap = {
            'TSS (True Skill Score)': ['(sum(m0.yy)+0.00) / sum(m0.yy+m0.ny) + (sum(m0.nn)+0.00) / sum(m0.nn+m0.yn) - 1 as stat'],

            'Nlow (metars < threshold, avg per hr)': ['avg(m0.yy+m0.ny+0.000) / 1000 as stat'],

            'Ntot (total metars, avg per hr)': ['avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000) / 1000 as stat'],

            'Ratio (Nlow / Ntot)': ['sum(m0.yy+m0.ny+0.000) / sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000) as stat'],

            'PODy (POD of visibility < threshold)': ['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny) as stat'],

            'PODn (POD of visibility > threshold)': ['(sum(m0.nn)+0.00)/sum(m0.nn+m0.yn) as stat'],

            'FAR (False Alarm Ratio)': ['(sum(m0.yn)+0.00)/sum(m0.yn+m0.yy) as stat'],

            'Bias (Forecast low cigs/actual)': ['(sum(m0.yy+m0.yn)+0.00)/sum(m0.yy+m0.ny) as stat'],

            'N in average (to nearest 100)': ['avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000)/100000 as stat'],

            'CSI (Critical Success Index)': ['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny+m0.yn) as stat'],

            'HSS (Heidke Skill Score)': ['2*(sum(m0.nn+0.00)*sum(m0.yy) - sum(m0.yn)*sum(m0.ny)) / ((sum(m0.nn+0.00)+sum(m0.ny))*(sum(m0.ny)+sum(m0.yy)) + ' +
            '(sum(m0.nn+0.00)+sum(m0.yn))*(sum(m0.yn)+sum(m0.yy))) as  stat']
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
                default: 'TSS (True Skill Score)',
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });

        optionsMap = {
            '5 (vis < 5 mi)': ['_500_'],
            '3 (vis < 3 mi)': ['_300_'],
            '1 (vis < 1 mi)': ['_100_'],
            '1/2 (vis < 1/2 mi)': ['_50_']
        };

        matsCollections.CurveParams.insert(
            {
                name: 'threshold',
                type: matsTypes.InputTypes.select,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: '5 (vis < 5 mi)',
                controlButtonVisibility: 'block',
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });

        optionsMap = {
            'None': ['ceil(3600*floor(m0.time/3600))'],
            '1D': ['ceil(86400*floor(m0.time/86400)+86400/2)'],
            '3D': ['ceil(259200*floor(m0.time/259200)+259200/2)'],
            '7D': ['ceil(604800*floor(m0.time/604800)+604800/2)'],
            '30D': ['ceil(2592000*floor(m0.time/2592000)+2592000/2)'],
            '60D': ['ceil(5184000*floor(m0.time/5184000)+5184000/2)']
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
                default: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });


        matsCollections.CurveParams.insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                options: ['All', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                selected: 'All',
                controlButtonCovered: true,
                unique: false,
                default: 'All',
                controlButtonVisibility: 'block',
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 3,
                multiple: true
            });
    }
};

/* The format of a curveTextPattern is an array of arrays, each sub array has
 [labelString, localVariableName, delimiterString]  any of which can be null.
 Each sub array will be joined (the localVariableName is always dereferenced first)
 and then the sub arrays will be joined maintaining order.

 The curveTextPattern is found by its name which must match the corresponding PlotGraphFunctions.PlotType value.
 See curve_item.js and graph.js.
 */
const doCurveTextPatterns = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveTextPatterns.remove({});
    }
    if (matsCollections.CurveTextPatterns.find().count() == 0) {
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ':'],
                ['', 'regionName', ', '],
                ['', 'threshold', ' '],
                ['', 'statistic', ' '],
                ['fcst_len:', 'forecast-length', 'h '],
                [' valid-time:', 'valid-time', ' '],
                ['avg:', 'average', ' ']
            ]
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ':'],
                ['', 'regionName', ', '],
                ['', 'threshold', ' '],
                ['', 'statistic', ' '],
                ['fcst_len:', 'forecast-length', 'h '],
                [' valid-time:', 'valid-time', ' '],
                ['avg:', 'average', ' '],
                ['', 'curve-dates', '']
            ]
        });
    }
};

const doSavedCurveParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.SavedCurveParams.remove({});
    }
    if (matsCollections.SavedCurveParams.find().count() == 0) {
        matsCollections.SavedCurveParams.insert({clName: 'changeList', changeList: []});
    }
};

const doPlotGraph = function () {
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
            plotType: matsTypes.PlotTypes.dieoff,
            graphFunction: "graphDieOff",
            dataFunction: "dataDieOff",
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
            user: 'readonly',
            password: 'ReadOnly@2016!',
            database: 'visibility_sums',
            connectionLimit: 10
        });
        matsCollections.Databases.insert({
            name: "modelSetting",
            role: "model_data",
            status: "active",
            host: 'wolphin.fsl.noaa.gov',
            user: 'readonly',
            password: 'ReadOnly@2016!',
            database: 'visibility',
            connectionLimit: 10
        });
    }


    const modelSettings = matsCollections.Databases.findOne({role:"model_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});
    // the pool is intended to be global
    modelPool = mysql.createPool(modelSettings);
    modelPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });
    // the pool is intended to be global
    const sumSettings = matsCollections.Databases.findOne({role:"sum_data", status:"active"}, {host:1, user:1, password:1, database:1, connectionLimit:1});
    sumPool = mysql.createPool(sumSettings);
    sumPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    try {
        var rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool, "select model,regions_name,model_value from visibility.regions_per_model;");
        for (var i = 0; i < rows.length; i++) {
            var model = rows[i].model.trim();
            var regions = rows[i].regions_name;
            var model_value = rows[i].model_value.trim();
            var valueList = [];
            valueList.push(model_value);
            modelOptionsMap[model] = valueList;
            var regionsArr = regions.split(',');
            regionModelOptionsMap[model] = regionsArr;
        }
    } catch (err) {
        console.log(err.message);
    }

    try {
        var rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool, "SELECT model, fcst_lens FROM visibility.fcst_lens_per_model;");
        for (var i = 0; i < rows.length; i++) {
            var model = rows[i].model;
            var forecastLengths = rows[i].fcst_lens;
            var forecastLengthArr = forecastLengths.split(',');
            forecastLengthOptionsMap[model] = forecastLengthArr;
        }
    } catch (err) {
        console.log(err.message);
    }
    // common settings
    matsDataUtils.doRoles();
    matsDataUtils.doAuthorization();
    matsDataUtils.doCredentials();
    matsDataUtils.doColorScheme();
    matsDataUtils.doSettings('Anomaly Correlation', Assets.getText('version'));
    // app specific settings    doRoles();
    doPlotGraph();
    doCurveParams();
    doSavedCurveParams();
    doPlotParams();
    doCurveTextPatterns();
    console.log("Running in " + process.env.NODE_ENV + " mode... App version is " + matsCollections.Settings.findOne().version);
    console.log("process.env", JSON.stringify(process.env, null, 2));
});


