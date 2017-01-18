import { Meteor } from 'meteor/meteor';
import { mysql } from 'meteor/pcel:mysql';
//import { Future } from 'fibers/future';  // this is broken somehow in meteor 1.4.1 - shouldn't be - might be fixed in later release
const Future = Npm.require('fibers/future');
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';


var datesMap ={};
var modelOptionsMap ={};
var regionOptionsMap ={};
var siteOptionsMap ={};
var siteMarkerOptionsMap ={};
var discriminatorOptionsMap ={};
var upperOptionsMap = {};
var lowerOptionsMap = {};
var forecastLengthOptionsMap = {};
var variableFieldsMap = {};
var variableOptionsMap = {};
var variableInfoMap = {};
variableOptionsMap[matsTypes.PlotTypes.profile] = {};
variableOptionsMap[matsTypes.PlotTypes.scatter2d] = {};
variableOptionsMap[matsTypes.PlotTypes.timeSeries] = {};

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
 
var doScatter2dParams = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Scatter2dParams.remove({});
    }

    // NOTE: the name beginning with 'Fit-Type' is significant because if it begins
    // with 'Fit-Type' the parameter will get added to the parameter object
    // that gets passed to the back end. See param_list.js submit form event.
    if (matsCollections.Scatter2dParams.find().count() == 0) {
        matsCollections.Scatter2dParams.insert(
            {
                name: 'axis-selector',
                type: matsTypes.InputTypes.radioGroup,
                options: ['xaxis', 'yaxis'],
                controlButtonCovered: true,
                default: 'xaxis',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: "axis-selector.html"
            });

        var bestFits = {};
        bestFits[matsTypes.BestFits.none] = "None";
        bestFits[matsTypes.BestFits.linear] = "Linear regression";
        bestFits[matsTypes.BestFits.linearThroughOrigin] = 'Linear regression  through origin';
        bestFits[matsTypes.BestFits.exponential] = 'Exponential';
        bestFits[matsTypes.BestFits.logarithmic] = 'Logarithmic';
        bestFits[matsTypes.BestFits.power] = 'Power Law';

        matsCollections.Scatter2dParams.insert(
            {
                name: 'Fit Type',
                type: matsTypes.InputTypes.radioGroup,
                optionsMap: bestFits,
                options: Object.keys(bestFits),
                selected: matsTypes.BestFits.none,
                controlButtonCovered: true,
                default: matsTypes.BestFits.none,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1,
                help: "best-fit.html"
            });
    }
};

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
        plotFormats[matsTypes.PlotFormats.absolute] = "diffs";
        plotFormats[matsTypes.PlotFormats.none] = "no diffs";
        matsCollections.PlotParams.insert(
            {
                name: 'plotFormat',
                type: matsTypes.InputTypes.radioGroup,
                optionsMap: plotFormats,
                options: Object.keys(plotFormats),
                default: matsTypes.PlotFormats.none,
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });


        var matchFormats = {};
        matchFormats[matsTypes.MatchFormats.time] = "match by times";
        matchFormats[matsTypes.MatchFormats.level] = "match by levels";
        matchFormats[matsTypes.MatchFormats.site] = "match by sites";
        matsCollections.PlotParams.insert(
            {
                name: 'matchFormat',
                type: matsTypes.InputTypes.checkBoxGroup,
                optionsMap: matchFormats,
                options: Object.keys(matchFormats),
                default: matsTypes.MatchFormats.time,
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });

    }
    return dstr;
};

var doCurveParams = function () {
    if (process.env.NODE_ENV === "development" ||matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
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
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
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
                optionsMap:modelOptionsMap,
                options:Object.keys(modelOptionsMap),   // convenience
                optionsQuery:"call get_data_sources()",
                dependentNames: ["sites","forecast-length","variable"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap)[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2,
                dates:datesMap
            });

        matsCollections.CurveParams.insert(
            {
                name: 'discriminator',
                type: matsTypes.InputTypes.select,
                optionsMap:discriminatorOptionsMap,
                options:Object.keys(discriminatorOptionsMap),   // convenience
                dependentNames: ['upper','lower'],
                disableOtherFor:{'upper':matsTypes.InputTypes.unused,'lower':matsTypes.InputTypes.unused},
                hideOtherFor:{'upper':matsTypes.InputTypes.unused,'lower':matsTypes.InputTypes.unused},
                controlButtonCovered: true,
                unique: false,
                default: -1,   // -1 means selection is optional - enables clear selection button
                controlButtonVisibility: 'block',
                multiple: false,
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 2,
                help: "discriminator-help.html"
            });


        matsCollections.CurveParams.insert(
            {
                name: 'upper',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap:upperOptionsMap,
                options:Object.keys(upperOptionsMap),   // convenience
                superiorNames: ['discriminator'],
                min: upperOptionsMap[Object.keys(upperOptionsMap)[0]].min,
                max: upperOptionsMap[Object.keys(upperOptionsMap)[0]].max,
                step: upperOptionsMap[Object.keys(upperOptionsMap)[0]].step,
                controlButtonCovered: true,
                unique: false,
                default: upperOptionsMap[Object.keys(upperOptionsMap)[0]].max,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });

        matsCollections.CurveParams.insert(
            {
                name: 'lower',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap:lowerOptionsMap,
                options:Object.keys(lowerOptionsMap),   // convenience
                superiorNames: ['discriminator'],
                min: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].min,
                max: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].max,
                step: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].step,
                controlButtonCovered: true,
                unique: false,
                default: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].min,
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });


        var statisticOptionsMap = {
            mean:['mean'],
            bias:['bias'],
            rmse:['rmse'],
            mae:['mae']
        };


        matsCollections.CurveParams.insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap:statisticOptionsMap,
                options:Object.keys(statisticOptionsMap),   // convenience
                controlButtonCovered: true,
                dependentNames: ["sites","forecast-length","variable"],
                disableOtherFor:{'truth-data-source':[statisticOptionsMap.mean][0]},
                hideOtherFor:{'truth-data-source':[statisticOptionsMap.mean][0]},
                unique: false,
                default: Object.keys(statisticOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3,
                help: 'wfip2-statistic.html'
            });

        matsCollections.CurveParams.insert(
            {
                name: 'truth-data-source',
                type: matsTypes.InputTypes.select,
                optionsMap:modelOptionsMap,
                options:Object.keys(modelOptionsMap),   // convenience
                optionsQuery:"call get_data_sources()",
                dependentNames: ["sites","forecast-length","variable"],
                controlButtonCovered: true,
                default: Object.keys(modelOptionsMap)[0],
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 2,
                displayGroup: 3,
                dates:datesMap
            });

        matsCollections.CurveParams.insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap:regionOptionsMap,
                options:Object.keys(regionOptionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: regionOptionsMap[Object.keys(regionOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3
            });

        matsCollections.CurveParams.insert(
            {
                name: 'sites',
                type: matsTypes.InputTypes.select,
                optionsMap:siteOptionsMap,
                options:siteOptionsMap[Object.keys(siteOptionsMap)[0]],
                peerName: 'sitesMap',    // name of the select parameter that is going to be set by selecting from this map
                superiorNames: ['data-source','truth-data-source'],
                controlButtonCovered: true,
                unique: false,
                default: siteOptionsMap[Object.keys(siteOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true
            });

        matsCollections.CurveParams.insert(
            {
                name: 'sitesMap',
                type: matsTypes.InputTypes.selectMap,
                optionsMap:siteMarkerOptionsMap,
                options:Object.keys(siteMarkerOptionsMap),   // convenience
                peerName: 'sites',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                //default: siteMarkerOptionsMap[Object.keys(siteMarkerOptionsMap)[0]],
                default:Object.keys(siteMarkerOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true,
                defaultMapView: {point:[45.904233, -120.814632], zoomLevel:8, minZoomLevel:4, maxZoomLevel:13},
                help: 'map-help.html'
            });

        matsCollections.CurveParams.insert(
            {
                name: 'site-completeness',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap:{},
                options:[],
                min: '0',
                max: '100',
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: '0',
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 4,
                help: "completeness.html"
            });

        matsCollections.CurveParams.insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                //variableMap: {wind_speed:'ws', wind_direction:'wd'}, // used to facilitate the select
                variableMap: variableFieldsMap,
                optionsMap: variableOptionsMap,
                infoMap: variableInfoMap,
                options:variableOptionsMap[matsTypes.PlotTypes.timeSeries][Object.keys(variableOptionsMap[matsTypes.PlotTypes.timeSeries])[0]],   // convenience
                superiorNames: ['data-source','truth-data-source'],
                plotTypeDependent: true,       // causes this param to refresh whenever plotType changes
                controlButtonCovered: true,
                unique: false,
                default: variableOptionsMap[matsTypes.PlotTypes.timeSeries][Object.keys(variableOptionsMap[matsTypes.PlotTypes.timeSeries])[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5,
                help: "variable-help.html"
            });

        optionsMap = {};
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap:forecastLengthOptionsMap,
                options:Object.keys(forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]]),   // convenience
                superiorNames: ['data-source','truth-data-source'],
                //selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]])[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5
            });

        matsCollections.CurveParams.insert(
            {
                name: 'top',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                min: '0',
                max: '5000',
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: '200',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 6,
                help: 'top-help.html'
            });
        matsCollections.CurveParams.insert(
            {
                name: 'bottom',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                min: '0',
                max: '5000',
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: '40',
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 6,
                help: 'bottom-help.html'
            });
        matsCollections.CurveParams.insert(
            {
                name: 'level-completeness',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap:{},
                options:[],
                min: '0',
                max: '100',
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: '0',
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 6,
                help: "completeness.html"
            });


        matsCollections.CurveParams.insert(
            {
                name: 'curve-dates',
                type: matsTypes.InputTypes.dateRange,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                startDate: dstrOneMonthPrior,
                stopDate: dstrToday,
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

 The curveTextPattern is found by its name which must match the corresponding PlotGraphFunctions.PlotType value.
 See curve_item.js and graph.js.
 */
var doCurveTextPatterns = function () {
    if (process.env.NODE_ENV === "development" ||matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveTextPatterns.remove({});
    }
    if (matsCollections.CurveTextPatterns.find().count() == 0) {
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ':'],
                ['', 'truth-data-source', ':'],
                [' region:', 'regionName', ', '],
                [' sites:', 'sites', ', '],
                ['', 'variable', ', '],
                ['units', 'units', ', '],
                ['', 'statistic', ':'],
                [' top:', 'top', 'm, '],
                [' bottom:', 'bottom', 'm, '],
                [' discriminators:', 'discriminator', ', '],
                [' upper:', 'upper', ', '],
                [' lower:', 'lower', ', '],
                ['fcst_len:', 'forecast-length', 'h ']
            ]
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.profile,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data-source', ':'],
                ['', 'truth-data-source', ':'],
                ['', 'regionName', ', '],
                ['', 'sites', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ':'],
                [' top:', 'top', 'm, '],
                [' bottom:', 'bottom', 'm, '],
                [' discriminators:', 'discriminator', ', '],
                [' upper:', 'upper', ', '],
                [' lower:', 'lower', ', '],
                ['fcst_len:', 'forecast-length', 'h '],
                ['','curve-dates','']
            ]
        });
        matsCollections.CurveTextPatterns.insert({
            plotType: matsTypes.PlotTypes.scatter2d,
            textPattern: [
                ['', 'label', ': '],
                ['', 'xaxis-data-source', ':'],
                ['', 'xaxis-truth-data-source', ':'],
                ['', 'xaxis-region', ', '],
                ['', 'xaxis-sites', ', '],
                ['', 'xaxis-variable', ', '],
                ['', 'xaxis-statistic', ':'],
                ['fcst_len:', 'xaxis-forecast-length', 'h, '],
                ['', 'xaxis-discriminator', ', '],
                ['', 'yaxis-data-source', ':'],
                ['', 'yaxis-truth-data-source', ':'],
                ['', 'yaxis-region', ', '],
                ['', 'yaxis-sites', ', '],
                ['', 'yaxis-variable', ', '],
                ['', 'yaxis-statistic', ':'],
                ['fcst_len:', 'yaxis-forecast-length', 'h, '],
                ['', 'yaxis-discriminator', ', '],
                ['lc', 'level-completeness',' '],
                ['sc', 'site-completeness','']
            ]
        });

    }
};

var doScatterAxisTextPattern = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.ScatterAxisTextPattern.remove({});
    }
    if (matsCollections.ScatterAxisTextPattern.find().count() == 0) {
        matsCollections.ScatterAxisTextPattern.insert({
            plotType: matsTypes.PlotTypes.scatter2d,
            textPattern: [
                ['label', ':'],
                ['data-source', ':'],
                ['region', ':'],
                ['sites', ':'],
                ['variable', ':'],
                ['forecast-length', ':'],
                ['discriminator',""]
            ]
        });
    }
};

var doSavedCurveParams = function () {
    if (process.env.NODE_ENV === "development" ||matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.SavedCurveParams.remove({});
    }
    if (matsCollections.SavedCurveParams.find().count() == 0) {
        matsCollections.SavedCurveParams.insert({clName: 'changeList', changeList:[]});
    }
};

var doSettings = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Settings.remove({});
    }
    if (matsCollections.Settings.find().count() == 0) {
        matsCollections.Settings.insert({
            LabelPrefix: "C-",
            Title: "WFIP2",
            LineWidth: 3.5,
            NullFillString: "---",
            resetFromCode: true
        });
    }
    // always do the version...
    var settings = matsCollections.Settings.findOne();
    var settingsId = settings._id;
    settings['version'] = Assets.getText('version');
    matsCollections.Settings.update(settingsId,{$set:settings});
};

var doColorScheme = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.ColorScheme.remove({});
    }
    if (matsCollections.ColorScheme.find().count() == 0) {
        matsCollections.ColorScheme.insert({
            colors: [
                "rgb(255,102,102)",
                "rgb(102,102,255)",
                "rgb(255,153,102)",
                "rgb(153,153,153)",
                "rgb(210,130,130)",

                "rgb(245,92,92)",
                "rgb(92,92,245)",
                "rgb(245,143,92)",
                "rgb(143,143,143)",
                "rgb(200,120,120)",

                "rgb(235,92,92)",
                "rgb(82,92,245)",
                "rgb(235,143,92)",
                "rgb(133,143,143)",
                "rgb(190,120,120)",

                "rgb(225,82,92)",
                "rgb(72,82,245)",
                "rgb(225,133,92)",
                "rgb(123,133,143)",
                "rgb(180,120,120)"
            ]
        });
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
            textViewId: "textSeriesView",
            graphViewId: "graphSeriesView",
            checked:true,
            dependents:['variable']
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.profile,
            graphFunction: "graphProfile",
            dataFunction: "dataProfile",
            textViewId: "textProfileView",
            graphViewId: "graphSeriesView",
            checked: false,
            dependents:['variable']
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.scatter2d,
            graphFunction: "graph2dScatter",
            dataFunction: "data2dScatter",
            textViewId: "textScatter2dView",
            graphViewId: "graphSeriesView",
            checked: false,
            dependents:['variable']
        });
    }
};

var doCredentials = function () {
// the gmail account for the credentials is mats.mail.daemon@gmail.com - pwd mats2015!
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Credentials.remove({});
    }
    if (matsCollections.Credentials.find().count() == 0) {
        matsCollections.Credentials.insert({
            name: "oauth_google",
            clientId: "499180266722-aai2tddo8s9edv4km1pst88vebpf9hec.apps.googleusercontent.com",
            clientSecret: "xdU0sc7SbdOOEzSyID_PTIRE",
            refresh_token: "1/3bhWyvCMMfwwDdd4F3ftlJs3-vksgg7G8POtiOBwYnhIgOrJDtdun6zK6XiATCKT"
        });
    }
};

var doAuthorization = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Authorization.remove({});
    }
    if (matsCollections.Authorization.find().count() == 0) {
        matsCollections.Authorization.insert({email: "randy.pierce@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "kirk.l.holub@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "jeffrey.a.hamilton@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "bonny.strong@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "mats.gsd@noaa.gov", roles: ["administrator"]});
    }
};

var doRoles = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Roles.remove({});
    }
    if (matsCollections.Roles.find().count() == 0) {
        matsCollections.Roles.insert({name: "administrator", description: "administrator privileges"});
    }
};


Meteor.startup(function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Databases.remove({});
    }
// remove for production
    matsCollections.Databases.remove({});

    if (matsCollections.Databases.find().count() == 0) {
        matsCollections.Databases.insert({
            name:"wfip2Setting",
            role: "wfip2_data",
            status: "active",
            host        : 'wfip2-dmzdb.gsd.esrl.noaa.gov',
            user        : 'readonly',
            password    : 'Readonlyp@$$405',
            database    : 'WFIP2_v2',
            connectionLimit : 10
        });
    }

    var wfip2Settings = matsCollections.Databases.findOne({role:"wfip2_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});
    // the pool is intended to be global
    wfip2Pool = mysql.createPool(wfip2Settings);
    wfip2Pool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    try {
        var statement = "call get_data_sources();";
        var qFuture = new Future();

        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                matsCollections.Models.remove({});
                for (var i = 0; i < rows[0].length; i++) {
                    var model = rows[0][i].description;
                    var is_instrument = rows[0][i].is_instrument;
                    var tablename = rows[0][i].tablename;
                    var thisid = rows[0][i].thisid;
                    var cycle_interval = rows[0][i].cycle_interval * 1000;   // seconds to ms
                    var variable_names = rows[0][i].variable_names.split(',');
                    var is_json = rows[0][i].isJSON;
                    var color = rows[0][i].color;


                    var mindate = rows[0][i].mindate;
                    var maxdate = rows[0][i].maxdate;
                    var minutc = rows[0][i].minutc;
                    var maxutc = rows[0][i].maxutc;

                    statement = "select has_discriminator('" + model.toString() + "') as hd";
                    //console.log("statement: " + statement);
                    var dFuture = new Future();
                    dFuture['hd'] = 0;
                    wfip2Pool.query(statement, function (err, rows) {
                        if (err != undefined) {
                            throw( new Error( "dataSeries error = has_discriminator error: " + err.message ) );
                        } else {
                            dFuture['hd'] = rows[0]['hd'];
                        }
                        dFuture['return']();
                    });
                    dFuture.wait();
                    var dataSource_has_discriminator = dFuture['hd'];

                    var valueList = [];
                    valueList.push(dataSource_has_discriminator + ',' + is_instrument + ',' + tablename + ',' + thisid + ',' + cycle_interval + ',' + is_json + "," + color );
                    modelOptionsMap[model] = valueList;
                    datesMap[model] = "{ \"mindate\":\"" + mindate + "\", \"maxdate\":\"" + maxdate + "\", \"minutc\":\"" + minutc + "\", \"maxutc\":\"" + maxutc + "\"}}";

                    var labels = [];
                    for (var j = 0; j < variable_names.length; j++) {
                        var statement2 = "select getVariableInfo('" + variable_names[j] + "') as info;";
                        var qFuture2 = new Future();
                        wfip2Pool.query(statement2, Meteor.bindEnvironment(function (err2, rows2) {
                            if (err2 != undefined) {
                                console.log(err2.message);
                            }
                            if (rows2 === undefined || rows2.length === 0) {
                                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement2);
                            } else {
                                var infostring = rows2[0].info.split('|');
                                labels.push(infostring[1]);
                                variableFieldsMap[infostring[1]] = variable_names[j];
                                variableInfoMap[variable_names[j]] = { 'type': infostring[0], 'units': infostring[2], 'minexpected': infostring[3], 'maxexpected': infostring[4] };
                            }
                            qFuture2['return']();
                        }));
                    qFuture2.wait();
                    }
                    variableOptionsMap[matsTypes.PlotTypes.profile][model] = [];
                    variableOptionsMap[matsTypes.PlotTypes.profile][model].push.apply(variableOptionsMap[matsTypes.PlotTypes.profile][model],labels);
                    variableOptionsMap[matsTypes.PlotTypes.scatter2d][model] = [];
                    variableOptionsMap[matsTypes.PlotTypes.scatter2d][model].push.apply(variableOptionsMap[matsTypes.PlotTypes.scatter2d][model],labels);
                    variableOptionsMap[matsTypes.PlotTypes.timeSeries][model] = [];
                    variableOptionsMap[matsTypes.PlotTypes.timeSeries][model].push.apply(variableOptionsMap[matsTypes.PlotTypes.timeSeries][model],labels);

                    matsCollections.Models.insert({name: model, table_name: tablename, thisid: thisid});
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        console.log(err.message);
    }

    try {
        var statement = "SELECT instrid, short_name, description, color, highlight FROM instruments;";
        var qFuture = new Future();
        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows == undefined || rows.length == 0) {
                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                matsCollections.Instruments.remove({});
                for (var i = 0; i < rows.length; i++) {
                    var instrid = rows[i].instrid;
                    //var instrument = rows[i].short_name.trim();
                    var instrument = rows[i].description;
                    var color = rows[i].color.trim();
                    var highlight = rows[i].highlight.trim();
                    matsCollections.Instruments.insert({name: instrument, instrument_id: instrid, color: color, highlight: highlight});
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        console.log(err.message);
    }

    try {
        var statement = "SELECT siteid, name,description,lat,lon,elev,instruments_instrid FROM sites, instruments_per_site where sites.siteid = instruments_per_site.sites_siteid;";
        var qFuture = new Future();
        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                siteMarkerOptionsMap = [];
                siteOptionsMap.model = [];
                var instrumentNames = matsCollections.Instruments.find({},{fields:{'name':1, 'instrument_id': 1, 'color':1, 'highlight':1, '_id': 0}}).fetch();
                for (var j = 0; j< instrumentNames.length; j++) {
                    var name = instrumentNames[j].name;
                    siteOptionsMap[name] = [];
                }
                var points = [];
                matsCollections.SiteMap.remove({});
                for (var i = 0; i < rows.length; i++) {
                    var name = rows[i].description;
                    var siteid = rows[i].siteid;
                    matsCollections.SiteMap.insert({siteName: name,  siteId: siteid});
                    var description = rows[i].description;
                    var lat = rows[i].lat;
                    var lon = rows[i].lon;
                    if (lon > 180) {
                        lon = lon - 360;
                    }
                    var point = [lat, lon ];
                    // move slightly north if another marker occupies this location
                    if (matsPlotUtils.containsPoint(points,point)) {
                        lat = lat + 0.002;
                        point = [lat, lon];
                    }
                    points.push(point);
                    var elev = rows[i].elev;
                    var instrid = rows[i].instruments_instrid;

                    for (var j = 0; j< instrumentNames.length; j++) {
                        var int_name = instrumentNames[j].name;
                        var id = instrumentNames[j].instrument_id;
                        var base_color = instrumentNames[j].color;
                        var highlight_color = instrumentNames[j].highlight;
                        if (instrid == id) {
                            var obj = {
                                point: point,
                                elevation: elev,
                                options: {
                                    title: description,
                                    color: base_color,
                                    size: 20,
                                    network: int_name,
                                    peerOption: name,
                                    highLightColor: highlight_color
                                }
                            };
                            siteMarkerOptionsMap.push(obj);
                            siteOptionsMap[int_name].push(name);
                            if ((siteOptionsMap.model).indexOf(name) === -1) {
                                siteOptionsMap.model.push(name);
                            }
                        }
                    }
                }
                var modelNames = matsCollections.Models.find({},{fields:{'name':1, '_id': 0}}).fetch();
                for (var i=0; i < modelNames.length; i++) {
                    var mName = modelNames[i].name;
                    var test = 1;
                    for (var j = 0; j< instrumentNames.length; j++) {
                        var int_name = instrumentNames[j].name;
                        if ((mName).indexOf(int_name) !== -1) {
                            test = 0;
                        }
                    }
                    if (test == 1){
                        siteOptionsMap[mName] = siteOptionsMap['model'];
                    }
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
    }

    try {

        var statement = "select D.name as name, min_value, max_value, label from discriminator_range as D, variables as V where D.name = V.name;";
        var qFuture = new Future();
        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                //console.log('No data in database ' + uaSettings.database + "! query:" + statement);
                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                for (var i = 0; i < rows.length; i++) {
                    var label = rows[i].label;
                    var name = rows[i].name;
                    var min_value = rows[i].min_value;
                    var max_value = rows[i].max_value;
                    discriminatorOptionsMap[label] = name;
                    var step = "any";
                    upperOptionsMap[label] = {min:min_value,max:max_value,step:step,default:max_value};
                    lowerOptionsMap[label] = {min:min_value,max:max_value,step:step,default:min_value};
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
    }

    try {
        var statement = "CALL fl_per_model();";
        var qFuture = new Future();
        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                var all_fcst_lens = new Set();
                for (var i = 0; i < rows[0].length; i++) {
                    these_lengths = rows[0][i].fcst_lens.split(',');
                    for (var j = 0; j < these_lengths.length; j++) {
                        all_fcst_lens.add(these_lengths[j]);
                    }
                }
                for (var i = 0; i < rows[0].length; i++) {
                    var model = rows[0][i].model;
                    var description = rows[0][i].description;
                    var is_instrument = modelOptionsMap[description][0].split(',')[1];
                    var forecastLengths = [];
                    forecastLengths.push.apply(forecastLengths, rows[0][i].fcst_lens.split(',').sort());
                    forecastLengthOptionsMap[description] = forecastLengthOptionsMap[description] === undefined ? [] : forecastLengthOptionsMap[description];
                    if (is_instrument == 1) {
                        forecastLengthOptionsMap[description] = matsTypes.InputTypes.unused;
                    } else {
                        forecastLengthOptionsMap[description].push.apply(forecastLengthOptionsMap[description], forecastLengths);
                    }
                    statement = "select has_discriminator('" + description.toString() + "') as hd";
                    //console.log("statement: " + statement);
                    var dFuture = new Future();
                    dFuture['hd'] = 0;
                    wfip2Pool.query(statement, function (hderr, hdrows) {
                        if (hderr != undefined) {
                            error = "   has_discriminator error: " + hderr.message;
                        } else {
                            dFuture['hd'] = hdrows[0]['hd'];
                        }
                        dFuture['return']();
                    });
                    dFuture.wait();
                    var model_has_discriminator = dFuture['hd'];
                    if ( model_has_discriminator == 1) {
                        var discriminators = Object.keys(discriminatorOptionsMap);
                        var labels = [];
                        for (var j = 0; j < discriminators.length; j++) {
                            var statement2 = "select getVariableInfo('" + discriminatorOptionsMap[discriminators[j]] + "') as info;";
                            var qFuture2 = new Future();
                            wfip2Pool.query(statement2, Meteor.bindEnvironment(function (err2, rows2) {
                                if (err2 != undefined) {
                                    console.log(err2.message);
                                }
                                if (rows2 === undefined || rows2.length === 0) {
                                    console.log('No data in database ' + wfip2Settings.database + "! query:" + statement2);
                                } else {
                                    var infostring = rows2[0].info.split('|');
                                    labels.push(infostring[1]);
                                    variableFieldsMap[infostring[1]] = discriminatorOptionsMap[discriminators[j]];
                                    variableInfoMap[discriminatorOptionsMap[discriminators[j]]] = { 'type': infostring[0], 'units': infostring[2], 'minexpected': infostring[3], 'maxexpected': infostring[4] };
                                }
                                qFuture2['return']();
                            }));
                            qFuture2.wait();
                        }
                        variableOptionsMap[matsTypes.PlotTypes.scatter2d][description].push.apply(variableOptionsMap[matsTypes.PlotTypes.scatter2d][description], labels);
                        variableOptionsMap[matsTypes.PlotTypes.timeSeries][description].push.apply(variableOptionsMap[matsTypes.PlotTypes.timeSeries][description], labels);
                    }
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
    }

    try {
        var statement = "select description from region_descriptions_mats;";
        var qFuture = new Future();
        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                matsCollections.RegionDescriptions.remove({});
                for (var i = 0; i < rows.length; i++) {
                    //var regionMapTable = (rows[i].regionMapTable);
                    var description = rows[i].description;
                    var valueList = [];
                    valueList.push(description);
                    regionOptionsMap[description] = valueList;
                    //matsCollections.RegionDescriptions.insert({regionMapTable: regionMapTable,  description: description});
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        console.log(err.message);
    }

    

    doRoles();
    doAuthorization();
    doCredentials();
    doPlotGraph();
    doColorScheme();
    doSettings();
    doCurveParams();
    doSavedCurveParams();
    doScatter2dParams();
    doScatterAxisTextPattern();
    doPlotParams();
    doCurveTextPatterns();
    console.log("Running in " + process.env.NODE_ENV + " mode... App version is " + matsCollections.Settings.findOne().version);
});


