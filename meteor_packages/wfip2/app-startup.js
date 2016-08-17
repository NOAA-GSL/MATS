var modelOptionsMap ={};
var regionOptionsMap ={};
var siteOptionsMap ={};
var siteMarkerOptionsMap ={};
var discriminatorOptionsMap ={};
var upperOptionsMap = {};
var lowerOptionsMap = {};
var forecastLengthOptionsMap = {};
var variableOptionsMap = {};
variableOptionsMap[PlotTypes.profile] = {};
variableOptionsMap[PlotTypes.scatter2d] = {};
variableOptionsMap[PlotTypes.timeSeries] = {};

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

scatter2dParams = function() {
    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        Scatter2dParams.remove({});
    }

    // NOTE: the name beginning with 'scatter2d' is significant because if it begins
    // with 'scatter2d' the parameter will get added to the parameter object
    // that gets passed to the back end. See param_list.js submit form event.
    if (Scatter2dParams.find().count() == 0) {
        Scatter2dParams.insert(
            {
                name: 'axis selector',
                type: InputTypes.radioGroup,
                options: ['xaxis', 'yaxis'],
                controlButtonCovered: true,
                default: 'xaxis',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1,
                help: "axis-selector.html"
            });


        // var filterOptions = {};
        // filterOptions[PlotAxisFilters.level] = "by level";
        // filterOptions[PlotAxisFilters.site] = "by site";
        //
        // Scatter2dParams.insert(
        //     {
        //         name: 'scatter2d axis matching',
        //         type: InputTypes.checkBoxGroup,
        //         optionsMap: filterOptions,
        //         options: Object.keys(filterOptions),
        //         controlButtonCovered: true,
        //         default: PlotAxisFilters.none,
        //         controlButtonVisibility: 'block',
        //         displayOrder: 2,
        //         displayPriority: 1,
        //         displayGroup: 1
        //     });
        //
        // Scatter2dParams.insert(
        //     {
        //         name: 'scatter2d axis matching quality',
        //         type: InputTypes.numberSpinner,
        //         optionsMap:{},
        //         options:[],
        //         min: '10',
        //         max: '100',
        //         step: '5',
        //         controlButtonCovered: true,
        //         unique: false,
        //         default: '70',
        //         controlButtonVisibility: 'block',
        //         displayOrder: 3,
        //         displayPriority: 1,
        //         displayGroup: 1
        //     });

        var bestFits = {};
        bestFits[BestFits.none] = "None";
        bestFits[BestFits.linear] = "Linear regression";
        bestFits[BestFits.linearThroughOrigin] = 'Linear regression  through origin';
        bestFits[BestFits.exponential] = 'Exponential';
        bestFits[BestFits.logarithmic] = 'Logarithmic';
        bestFits[BestFits.power] = 'Power Law';

        Scatter2dParams.insert(
            {
                name: 'scatter2d best fit',
                type: InputTypes.radioGroup,
                optionsMap: bestFits,
                options: Object.keys(bestFits),
                selected: BestFits.none,
                controlButtonCovered: true,
                default: BestFits.none,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1,
                help: "best-fit.html"
            });
    }
};

plotParams = function () {
    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        PlotParams.remove({});
    }
    if (PlotParams.find().count() == 0) {
        PlotParams.insert(
            {
                name: 'dates',
                type: InputTypes.dateRange,
                options: [''],
                startDate: dstrOneMonthPrior,
                stopDate: dstrToday,
                controlButtonCovered: true,
                default: dstr,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1
            });

        var plotFormats = {};
        plotFormats[PlotFormats.absolute] = "absolute diffs";
        plotFormats[PlotFormats.none] = "no diffs";
        PlotParams.insert(
            {
                name: 'plotFormat',
                type: InputTypes.radioGroup,
                optionsMap: plotFormats,
                options: Object.keys(plotFormats),
                default: PlotFormats.none,
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2
            });


        var matchFormats = {};
        matchFormats[MatchFormats.time] = "match by times";
        matchFormats[MatchFormats.level] = "match by levels";
        matchFormats[MatchFormats.site] = "match by sites";
        PlotParams.insert(
            {
                name: 'matchFormat',
                type: InputTypes.checkBoxGroup,
                optionsMap: matchFormats,
                options: Object.keys(matchFormats),
                default: MatchFormats.time,
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3
            });

    }
    return dstr;
};

curveParams = function () {
    if (process.env.NODE_ENV === "development" ||Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        CurveParams.remove({});
    }
    if (CurveParams.find().count() == 0) {
        var date = new Date();
        var yr = date.getFullYear();
        var day = date.getDate();
        var month = date.getMonth();
        var dstr = month + '/' + day + '/' + yr;
        var optionsMap = {};
        CurveParams.insert(
            {
                name: 'label',
                type: InputTypes.textInput,
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
        CurveParams.insert(
            {
                name: 'data source',
                type: InputTypes.select,
                optionsMap:modelOptionsMap,
                options:Object.keys(modelOptionsMap),   // convenience
                optionsQuery:"select model from regions_per_model_mats",
                dependentNames: ["sites","forecast length","variable"],
                controlButtonCovered: true,
                default: 'hrrr_esrl',
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });


        var statisticOptionsMap = {
            mean:['mean'],
            rms:['rmse'],
            rmse:['mae'],
            bias:['bias']
        };


        CurveParams.insert(
            {
                name: 'statistic',
                type: InputTypes.select,
                optionsMap:statisticOptionsMap,
                options:Object.keys(statisticOptionsMap),   // convenience
                controlButtonCovered: true,
                disableOtherFor:{'truth data source':[statisticOptionsMap.mean][0]},
                hideOtherFor:{'truth data source':[statisticOptionsMap.mean][0]},
                unique: false,
                default: statisticOptionsMap.mean,
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 2,
                help: 'wfip2-statistic.html'
            });

        CurveParams.insert(
            {
                name: 'truth data source',
                type: InputTypes.select,
                optionsMap:modelOptionsMap,
                options:Object.keys(modelOptionsMap),   // convenience
                optionsQuery:"select model from regions_per_model_mats",
                dependentNames: ["sites","forecast length","variable"],
                controlButtonCovered: true,
                default: 'hrrr_esrl',
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 2,
                displayGroup: 2
            });

        CurveParams.insert(
            {
                name: 'region',
                type: InputTypes.select,
                optionsMap:regionOptionsMap,
                options:Object.keys(regionOptionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: regionOptionsMap[Object.keys(regionOptionsMap)[0]],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });

        CurveParams.insert(
            {
                name: 'sites',
                type: InputTypes.select,
                optionsMap:siteOptionsMap,
                options:siteOptionsMap[Object.keys(siteOptionsMap)[0]],
                peerName: 'sitesMap',    // name of the select parameter that is going to be set by selecting from this map
                superiorName: 'data source',
                controlButtonCovered: true,
                unique: false,
                default: siteOptionsMap[Object.keys(siteOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3,
                multiple: true
            });

        CurveParams.insert(
            {
                name: 'sitesMap',
                type: InputTypes.selectMap,
                optionsMap:siteMarkerOptionsMap,
                options:Object.keys(siteMarkerOptionsMap),   // convenience
                peerName: 'sites',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                //default: siteMarkerOptionsMap[Object.keys(siteMarkerOptionsMap)[0]],
                default:"map",
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 3,
                multiple: true,
                defaultMapView: {point:[45.904233, -120.814632], zoomLevel:8, minZoomLevel:4, maxZoomLevel:13},
                help: 'map-help.html'
            });

        CurveParams.insert(
            {
                name: 'site completeness',
                type: InputTypes.numberSpinner,
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
                displayGroup: 3,
                help: "completeness.html"
            });

        CurveParams.insert(
            {
                name: 'variable',
                type: InputTypes.select,
                variableMap: {wind_speed:'ws', wind_direction:'wd'}, // used to facilitate the select
                optionsMap: variableOptionsMap,
                options:variableOptionsMap[PlotTypes.timeSeries][Object.keys(variableOptionsMap[PlotTypes.timeSeries])[0]],   // convenience
                superiorName: 'data source',
                plotTypeDependent: true,       // causes this param to refresh whenever plotType changes
                controlButtonCovered: true,
                unique: false,
                default: 'wind_speed',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4
            });

        optionsMap = {};
        CurveParams.insert(
            {
                name: 'forecast length',
                type: InputTypes.select,
                optionsMap:forecastLengthOptionsMap,
                options:Object.keys(forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]]),   // convenience
                superiorName: 'data source',
                //selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]])[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4
            });

        CurveParams.insert(
            {
                name: 'top',
                type: InputTypes.numberSpinner,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                min: '0',
                max: '5000',
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: '5000',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5,
                help: 'top-help.html'
            });
        CurveParams.insert(
            {
                name: 'bottom',
                type: InputTypes.numberSpinner,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                min: '0',
                max: '5000',
                step: 'any',
                controlButtonCovered: true,
                unique: false,
                default: '0',
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5,
                help: 'bottom-help.html'
            });
        CurveParams.insert(
            {
                name: 'level completeness',
                type: InputTypes.numberSpinner,
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
                displayGroup: 5,
                help: "completeness.html"
            });

        CurveParams.insert(
            {
                name: 'discriminator',
                type: InputTypes.select,
                optionsMap:discriminatorOptionsMap,
                options:Object.keys(discriminatorOptionsMap),   // convenience
                dependentNames: ['upper','lower'],
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(discriminatorOptionsMap)[0],
                controlButtonVisibility: 'block',
                multiple: false,
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 6
            });


        CurveParams.insert(
            {
                name: 'upper',
                type: InputTypes.numberSpinner,
                optionsMap:upperOptionsMap,
                options:Object.keys(upperOptionsMap),   // convenience
                superiorName: 'discriminator',
                min: upperOptionsMap[Object.keys(upperOptionsMap)[0]].min,
                max: upperOptionsMap[Object.keys(upperOptionsMap)[0]].max,
                step: upperOptionsMap[Object.keys(upperOptionsMap)[0]].step,
                controlButtonCovered: true,
                unique: false,
                default: upperOptionsMap[Object.keys(upperOptionsMap)[0]].max,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 6
            });

        CurveParams.insert(
            {
                name: 'lower',
                type: InputTypes.numberSpinner,
                optionsMap:lowerOptionsMap,
                options:Object.keys(lowerOptionsMap),   // convenience
                superiorName: 'discriminator',
                min: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].min,
                max: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].max,
                step: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].step,
                controlButtonCovered: true,
                unique: false,
                default: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].min,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 6
            });

        CurveParams.insert(
            {
                name: 'curve-dates',
                type: InputTypes.dateRange,
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
                displayGroup: 7
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
curveTextPatterns = function () {
    if (process.env.NODE_ENV === "development" ||Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        CurveTextPatterns.remove({});
    }
    if (CurveTextPatterns.find().count() == 0) {
        CurveTextPatterns.insert({
            plotType: PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data source', ':'],
                [' region:', 'regionName', ', '],
                [' sites:', 'sites', ', '],
                ['', 'variable', ', '],
                [' top:', 'top', 'm, '],
                [' bottom:', 'bottom', 'm, '],
                [' discriminators:', 'discriminator', ', '],
                [' upper:', 'upper', ', '],
                [' lower:', 'lower', ', '],
                ['fcst_len:', 'forecast length', 'h ']
            ]
        });
        CurveTextPatterns.insert({
            plotType: PlotTypes.profile,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data source', ':'],
                ['', 'regionName', ', '],
                ['', 'sites', ', '],
                ['', 'variable', ' '],
                [' top:', 'top', 'm, '],
                [' bottom:', 'bottom', 'm, '],
                [' discriminators:', 'discriminator', ', '],
                [' upper:', 'upper', ', '],
                [' lower:', 'lower', ', '],
                ['fcst_len:', 'forecast length', 'h '],
                ['','curve-dates','']
            ]
        });
        CurveTextPatterns.insert({
            plotType: PlotTypes.scatter2d,
            textPattern: [
                ['', 'label', ': '],
                ['', 'xaxis-data source', ':'],
                ['', 'xaxis-region', ', '],
                ['', 'xaxis-sites', ', '],
                ['', 'xaxis-variable', ', '],
                ['fcst_len:', 'xaxis-forecast length', 'h, '],
                ['', 'xaxis-discriminator', ', '],
                ['', 'yaxis-data source', ':'],
                ['', 'yaxis-region', ', '],
                ['', 'yaxis-sites', ', '],
                ['', 'yaxis-variable', ', '],
                ['fcst_len:', 'yaxis-forecast length', 'h, '],
                ['', 'yaxis-discriminator', ', '],
                ['','curve-dates',' '],
                ['lc', 'level completeness',' '],
                ['sc', 'site completeness','']
            ]
        });

    }
};

scatterAxisTextPattern = function () {
    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        ScatterAxisTextPattern.remove({});
    }
    if (ScatterAxisTextPattern.find().count() == 0) {
        ScatterAxisTextPattern.insert({
            plotType: PlotTypes.scatter2d,
            textPattern: [
                ['label', ':'],
                ['data source', ':'],
                ['region', ':'],
                ['sites', ':'],
                ['variable', ':'],
                ['forecast length', ':'],
                ['discriminator',""]
            ]
        });
    }
};

savedCurveParams = function () {
    if (process.env.NODE_ENV === "development" ||Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        SavedCurveParams.remove({});
    }
    if (SavedCurveParams.find().count() == 0) {
        SavedCurveParams.insert({clName: 'changeList', changeList:[]});
    }
};

settings = function () {
    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        Settings.remove({});
    }
    if (Settings.find().count() == 0) {
        Settings.insert({
            LabelPrefix: "C-",
            Title: "WFIP2",
            LineWidth: 3.5,
            NullFillString: "---",
            resetFromCode: true
        });
    }
};

colorScheme = function () {
    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        ColorScheme.remove({});
    }
    if (ColorScheme.find().count() == 0) {
        ColorScheme.insert({
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

plotGraph = function () {
    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        PlotGraphFunctions.remove({});
    }
    if (PlotGraphFunctions.find().count() == 0) {
        PlotGraphFunctions.insert({
            plotType: PlotTypes.timeSeries,
            graphFunction: "graphSeriesZoom",
            dataFunction: "dataSeriesZoom",
            textViewId: "textSeriesView",
            graphViewId: "graphSeriesView",
            checked:true,
            dependents:['variable']
        });
        PlotGraphFunctions.insert({
            plotType: PlotTypes.profile,
            graphFunction: "graphProfileZoom",
            dataFunction: "dataProfileZoom",
            textViewId: "textProfileView",
            graphViewId: "graphSeriesView",
            checked: false,
            dependents:['variable']
        });
        PlotGraphFunctions.insert({
            plotType: PlotTypes.scatter2d,
            graphFunction: "graph2dScatter",
            dataFunction: "data2dScatter",
            textViewId: "textScatter2dView",
            graphViewId: "graphSeriesView",
            checked: false,
            dependents:['variable']
        });
    }
};

credentials = function () {
// the gmail account for the credentials is mats.mail.daemon@gmail.com - pwd mats2015!
    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        Credentials.remove({});
    }
    if (Credentials.find().count() == 0) {
        Credentials.insert({
            name: "oauth_google",
            clientId: "499180266722-aai2tddo8s9edv4km1pst88vebpf9hec.apps.googleusercontent.com",
            clientSecret: "xdU0sc7SbdOOEzSyID_PTIRE",
            refresh_token: "1/3bhWyvCMMfwwDdd4F3ftlJs3-vksgg7G8POtiOBwYnhIgOrJDtdun6zK6XiATCKT"
        });
    }
};

authorization = function () {
    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        Authorization.remove({});
    }
    if (Authorization.find().count() == 0) {
        Authorization.insert({email: "randy.pierce@noaa.gov", roles: ["administrator"]});
        Authorization.insert({email: "xue.wei@noaa.gov", roles: ["administrator"]});
        Authorization.insert({email: "jeffrey.a.hamilton@noaa.gov", roles: ["administrator"]});
    }
    Authorization.upsert({email: "mats.gsd@noaa.gov"},{$set: {roles: ["administrator"]}});
};

roles = function () {
    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        Roles.remove({});
    }
    if (Roles.find().count() == 0) {
        Roles.insert({name: "administrator", description: "administrator privileges"});
    }
};

var containsPoint = function(pointArray,point) {
    var lat = point[0];
    var lon = point[1];
    for (var i =0; i < pointArray.length; i++) {
        var pLat = pointArray[i][0];
        var pLon = pointArray[i][1];
        if (lat === pLat && lon === pLon) {
            return true
        }
    }
    return false;
};
    

Meteor.startup(function () {
    Future = Npm.require('fibers/future');

    if (process.env.NODE_ENV === "development" || Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        Databases.remove({});
    }
// remove for production
Databases.remove({});

    if (Databases.find().count() == 0) {
        Databases.insert({
            name:"wfip2Setting",
            role: "wfip2_data",
            status: "active",
            // host        : 'wfip2-db.gsd.esrl.noaa.gov',
            // user        : 'dev',
            // password    : 'Pass4userdev*',

           host        : 'wfip2-dmzdb.gsd.esrl.noaa.gov',
           user        : 'readonly',
           password    : 'Readonlyp@$$405',
           database    : 'WFIP2',
           connectionLimit : 10
        });
    }

    var wfip2Settings = Databases.findOne({role:"wfip2_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});
    wfip2Pool = mysql.createPool(wfip2Settings);
    wfip2Pool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });
    try {

        var statement = "select model,regions,model_value from regions_per_model_mats";
        var qFuture = new Future();

        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                Models.remove({});
                for (var i = 0; i < rows.length; i++) {
                    var model = rows[i].model.trim();

                    var model_values = rows[i].model_value.split(',');
                    var table_name = model_values[0];
                    var instruments_instrid = model_values[1];

                    var valueList = [];
                    valueList.push(table_name+','+instruments_instrid);
                    modelOptionsMap[model] = valueList;
                    variableOptionsMap[PlotTypes.profile][model] = ['wind_speed', 'wind_direction'];
                    variableOptionsMap[PlotTypes.scatter2d][model] = ['wind_speed', 'wind_direction'];
                    variableOptionsMap[PlotTypes.timeSeries][model] = ['wind_speed', 'wind_direction'];
                    Models.insert({name: model, table_name: table_name,instruments_instrid:instruments_instrid});
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        console.log(err.message);
    }

    try {
        var statement = "SELECT siteid, name,description,lat,lon,elev FROM sites;";
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
                siteOptionsMap.sodar = [];
                siteOptionsMap.profiler_915 = [];

                var points = [];
                SiteMap.remove({});
                for (var i = 0; i < rows.length; i++) {
                    var name = rows[i].name;
                    var siteid = rows[i].siteid;
                    SiteMap.insert({siteName: name,  siteId: siteid});
                    var description = rows[i].description;
                    var lat = rows[i].lat;
                    var lon = rows[i].lon;
                    if (lon > 180) {
                        lon = lon - 360;
                    }
                    var point = [lat, lon ];
                    // move slightly north if another marker occupies this location
                    if (containsPoint(points,point)) {
                        lat = lat + 0.002;
                        point = [lat, lon];
                    }
                    points.push(point);
                    var elev = rows[i].elev;
                    if (description.includes("SODAR")) {
                        var obj = {point:point,elevation:elev, options:{title:description, color:"red", size:20, network:"SODAR", peerOption:name, highLightColor:'pink'}};
                        siteMarkerOptionsMap.push(obj);
                        siteOptionsMap.model.push(name);
                        siteOptionsMap.sodar.push(name);
                    } else {
                        var obj = {point:point,elevation:elev, options:{title:description, color:"blue", size:20, network:"PROFILE", peerOption:name, highLightColor:'cyan'}};
                        siteMarkerOptionsMap.push(obj);
                        siteOptionsMap.model.push(name);
                        siteOptionsMap.profiler_915.push(name);
                    }
                }
                var modelNames = Models.find({},{fields:{'name':1, '_id': 0}}).fetch();
                for (var i=0; i < modelNames.length; i++) {
                    var mName = modelNames[i].name;
                    var mNameUpper = mName.toUpperCase();
                    if (((mNameUpper).indexOf('SODAR') === -1) && ((mNameUpper).indexOf('PROFILE') === -1)) {
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

        var statement = "select * from discriminator_range;";
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
                    var discriminator = rows[i].name;
                    var min_value = rows[i].min_value;
                    var max_value = rows[i].max_value;
                    discriminatorOptionsMap[discriminator] = discriminator;
                    var step = "any";
                    upperOptionsMap[discriminator] = {min:min_value,max:max_value,step:step,default:max_value};
                    lowerOptionsMap[discriminator] = {min:min_value,max:max_value,step:step,default:min_value};
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
    }

    try {
        var statement = "SELECT model, fcst_lens FROM fcst_lens_per_model;";
        var qFuture = new Future();
        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                for (var i = 0; i < rows.length; i++) {
                     var model = rows[i].model;
                     var forecastLengths = rows[i].fcst_lens;
                    forecastLengthOptionsMap[model] = forecastLengths.split(',');
                    if (model === 'hrrr_wfip') {
                        variableOptionsMap[PlotTypes.profile][model] = [
                            'wind_speed',
                            'wind_direction'
                        ];
                        variableOptionsMap[PlotTypes.scatter2d][model] = [
                            'wind_speed',
                            'wind_direction'
                        ];
                        variableOptionsMap[PlotTypes.timeSeries][model] = [
                            'wind_speed',
                            'wind_direction'
                        ];

                        var discriminators = Object.keys(discriminatorOptionsMap);
                        for (var j =0; j < discriminators.length; j++) {
                            variableOptionsMap[PlotTypes.scatter2d][model].push(discriminators[j]);
                            variableOptionsMap[PlotTypes.timeSeries][model].push(discriminators[j]);
                        }
                    } else {
                        variableOptionsMap[PlotTypes.profile][model] = ['wind_speed', 'wind_direction'];
                        variableOptionsMap[PlotTypes.scatter2d][model] = ['wind_speed', 'wind_direction'];
                        variableOptionsMap[PlotTypes.timeSeries][model] = ['wind_speed', 'wind_direction'];
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
        var statement = "select regionMapTable,description from region_descriptions_mats;";
        var qFuture = new Future();
       wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                RegionDescriptions.remove({});
                for (var i = 0; i < rows.length; i++) {
                    var regionMapTable = (rows[i].regionMapTable);
                    var description = rows[i].description;
                    var valueList = [];
                    valueList.push(regionMapTable);
                    regionOptionsMap[description] = valueList;
                    RegionDescriptions.insert({regionMapTable: regionMapTable,  description: description});
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        console.log(err.message);
    }

    if (process.env.NODE_ENV === "development" ) {
        console.log("Running in development mode...")
    } else {
        console.log("Running in production mode...")
    }
    roles();
    authorization();
    credentials();
    plotGraph();
    colorScheme();
    settings();
    curveParams();
    savedCurveParams();
    plotParams();
    scatter2dParams();
    curveTextPatterns();
    scatterAxisTextPattern();
});


