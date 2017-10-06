import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

var modelOptionsMap = {};
var regionModelOptionsMap = {};
var forecastLengthOptionsMap = {};
// this should be in the metdata someday
var thresholdValuesMap = {
    '10 (visibility < 10 mi)' : '1000',
    '5 (visibility < 5 mi)': '500',
    '3 (visibility < 3 mi)': '300',
    '1 (visibility < 1 mi)': '100',
    '1/2 (visibility < 1/2 mi)': '50'
};
var thresholdsModelOptionsMap = {};
var forecastLengthModels = [];
const dateInitStr = matsCollections.dateInitStr();
const dateInitStrParts = dateInitStr.split(' - ');
const startInit = dateInitStrParts[0];
const stopInit = dateInitStrParts[1];
const dstr = startInit + ' - ' + stopInit;

const doPlotParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
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
                options: [matsTypes.PlotFormats.matching,matsTypes.PlotFormats.pairwise,matsTypes.PlotFormats.none],
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
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }
    if (matsCollections.CurveParams.find().count() == 0) {
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
        matsCollections.CurveParams.insert(
            {
                name: 'data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap),   // convenience
                dependentNames: ["region", "forecast-length", "threshold"],
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


        var optionsMap = {
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


        matsCollections.CurveParams.insert(
            {
                name: 'threshold',
                type: matsTypes.InputTypes.select,
                optionsMap: thresholdsModelOptionsMap,
                options: thresholdsModelOptionsMap['HRRR'],   // convenience
                valuesMap: thresholdValuesMap,
                superiorNames: ['data-source'],
                controlButtonCovered: true,
                unique: false,
                default: thresholdsModelOptionsMap['HRRR'][0],
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
                name: 'dieoff-forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: {},
                options: [matsTypes.ForecastTypes.dieoff,matsTypes.ForecastTypes.singleCycle],
                superiorNames: [],
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: matsTypes.ForecastTypes.dieoff,
                controlButtonVisibility: 'block',
                controlButtonText: 'forecast-length',
                displayOrder: 7,
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
                controlButtonText: "forecast lead time",
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });

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
            ],
            displayParams: [
                "label","data-source","region","statistic","threshold","average","forecast-length","valid-time"
            ],
            groupSize: 6

        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.dieoff,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ' in '],
                ['', 'regionName', ', '],
                ['', 'statistic', ', '],
                ['', 'threshold', ', '],
                ['fcst_len:', 'dieoff-forecast-length', 'h '],
                [' valid-time:', 'valid-time', ' '],
            ],
            displayParams: [
                "label","data-source","region","statistic","threshold","valid-time","dieoff-forecast-length"
            ],
            groupSize: 6
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
            database: 'visibility_sums2',
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


    const modelSettings = matsCollections.Databases.findOne({role: "model_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    modelPool = mysql.createPool(modelSettings);
    modelPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });
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

    var rows;
    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool, "select model,regions_name,model_value from regions_per_model;");
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



    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(modelPool, "SELECT model, thresholds FROM thresholds_per_model;");
        for (var i = 0; i < rows.length; i++) {
            var model = rows[i].model;
            var thresholds = rows[i].thresholds;
            var thresholdsArr = thresholds.split(',');
            var thresholdsDescriptions = [];

            for (var thi = 0; thi < thresholdsArr.length; thi++) {
                var th = thresholdsArr[thi];
                switch (th) {
                    case "50":
                        thresholdsDescriptions.push("1/2 (visibility < 1/2 mi)");
                        break;
                    case "100":
                        thresholdsDescriptions.push("1 (visibility < 1 mi)");
                        break;
                    case "300":
                        thresholdsDescriptions.push("3 (visibility < 3 mi)");
                        break;
                    case "500":
                        thresholdsDescriptions.push("5 (visibility < 5 mi)");
                        break;
                    case "1000":
                        thresholdsDescriptions.push("10 (visibility < 10 mi)");
                        break;
                    default:
                        thresholdsDescriptions.push(th);
                        break;
                }
            }
            thresholdsModelOptionsMap[model] = thresholdsDescriptions;
        }
    } catch (err) {
        console.log(err.message);
    }

    matsMethods.resetApp();
});

// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
appSpecificResetRoutines = {
    doPlotGraph:doPlotGraph,
    doCurveParams:doCurveParams,
    doSavedCurveParams:doSavedCurveParams,
    doPlotParams:doPlotParams,
    doCurveTextPatterns:doCurveTextPatterns
};


