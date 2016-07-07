var modelOptionsMap ={};
//var regionOptionsMap ={};
var regionModelOptionsMap = {};
var forecastLengthOptionsMap = {};

plotParams = function () {
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        PlotParams.remove({});
    }
// remove for production
PlotParams.remove({});
    if (PlotParams.find().count() == 0) {
        var date = new Date();
        var yr = date.getFullYear();
        var day = date.getDate();
        var month = date.getMonth();
        var dstr = month + '/' + day + '/' + yr;

        PlotParams.insert(
            {
                name: 'dates',
                type: InputTypes.dateRange,
                options: [''],
                startDate: '03/01/2015',
                stopDate: dstr,
                controlButtonCovered: true,
                default: '03/01/2015',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 1
            });

        var plotFormats = {};
        plotFormats[PlotFormats.matching] = 'show matching diffs';
        plotFormats[PlotFormats.pairwise] = 'pairwise diffs';
        plotFormats[PlotFormats.none] = 'no diffs';
        PlotParams.insert(
            {
                name: 'plotFormat',
                type: InputTypes.radioGroup,
                optionsMap: plotFormats,
                options: Object.keys(plotFormats),
                default: plotFormats[PlotFormats.none],
                controlButtonCovered: false,
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 2
            });
    }
    return dstr;
};

curveParams = function () {
    //console.log(JSON.stringify(modelOptionsMap));
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        CurveParams.remove({});
    }

//remove for production
CurveParams.remove({});
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
                displayGroup: 1
            }
        );
        CurveParams.insert(
            {
                name: 'data source',
                type: InputTypes.select,
                optionsMap:modelOptionsMap,
                options:Object.keys(modelOptionsMap),   // convenience
                optionsQuery:"select model from regions_per_model",
                dependentNames: ["region", "forecast length"],
                controlButtonCovered: true,
                default: 'Bak13',
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 1
            });
        CurveParams.insert(
            {
                name: 'region',
                type: InputTypes.select,
                optionsMap:regionModelOptionsMap,
                options:regionModelOptionsMap[Object.keys(regionModelOptionsMap)[3]],   // convenience
                superiorName: 'data source',
                controlButtonCovered: true,
                unique: false,
                default: regionModelOptionsMap[Object.keys(regionModelOptionsMap)[3]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 1
            });


        optionsMap = {
            'TSS (True Skill Score)': ['(sum(m0.yy)+0.00) / sum(m0.yy+m0.ny) + (sum(m0.nn)+0.00) / sum(m0.nn+m0.yn) - 1 as stat0'],

            'Nlow (metars < threshold, avg per hr)': ['avg(m0.yy+m0.ny+0.000) / 1000 as stat0'],

            'Ntot (total metars, avg per hr)': ['avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000) / 1000 as stat0'],

            'Ratio (Nlow / Ntot)': ['sum(m0.yy+m0.ny+0.000) / sum(m0.yy+m0.ny+m0.yn+m0.nn+0.000) as stat0'],

            'PODy (POD of visibility < threshold)': ['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny) as stat0'],

            'PODn (POD of visibility > threshold)': ['(sum(m0.nn)+0.00)/sum(m0.nn+m0.yn) as stat0'],

            'FAR (False Alarm Ratio)': ['(sum(m0.yn)+0.00)/sum(m0.yn+m0.yy) as stat0'],

            'Bias (Forecast low cigs/actual)': ['(sum(m0.yy+m0.yn)+0.00)/sum(m0.yy+m0.ny) as stat0'],

            'N in average (to nearest 100)': ['avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000)/100000 as stat0'],

            'CSI (Critical Success Index)': ['(sum(m0.yy)+0.00)/sum(m0.yy+m0.ny+m0.yn) as stat0'],

            'HSS (Heidke Skill Score)': ['2*(sum(m0.nn+0.00)*sum(m0.yy) - sum(m0.yn)*sum(m0.ny)) / ((sum(m0.nn+0.00)+sum(m0.ny))*(sum(m0.ny)+sum(m0.yy)) + ' +
                                         '(sum(m0.nn+0.00)+sum(m0.yn))*(sum(m0.yn)+sum(m0.yy))) as  stat0']
        };

        CurveParams.insert(
            {// bias and model average are a different formula for wind (element 0 differs from element 1)
                // but stays the same (element 0 and element 1 are the same) otherwise.
                // When plotting profiles we append element 2 to whichever element was chosen (for wind variable). For
                // time series we never append element 2. Element 3 is used to give us error values for error bars.
                name: 'statistic',
                type: InputTypes.select,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'TSS (True Skill Score)',
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2
            });

            optionsMap = {
                '5 (vis < 5 mi)' : ['_500_'],
                '3 (vis < 3 mi)' : ['_300_'],
                '1 (vis < 1 mi)': ['_100_'],
                '1/2 (vis < 1/2 mi)' : ['_50_']
            };

        CurveParams.insert(
            {
                name: 'threshold',
                type: InputTypes.select,
                optionsMap: optionsMap,
                options:Object.keys(optionsMap),   // convenience
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

        CurveParams.insert(
            {
                name: 'average',
                type: InputTypes.select,
                optionsMap: optionsMap,
                options:Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                selected: 'None',
                default: 'None',
                controlButtonVisibility: 'block',
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 3
            });

        optionsMap = {};
        CurveParams.insert(
            {
                name: 'forecast length',
                type: InputTypes.select,
                optionsMap:forecastLengthOptionsMap,
                options:forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]],   // convenience
                superiorName: 'data source',
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });


        CurveParams.insert(
            {
                name: 'valid time',
                type: InputTypes.select,
                options:['All',0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
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
curveTextPatterns = function () {
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        CurveTextPatterns.remove({});
    }
    //remove for production
     CurveTextPatterns.remove({});
    if (CurveTextPatterns.find().count() == 0) {
        var insert = CurveTextPatterns.insert({
            plotType: PlotTypes.timeSeries,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data source', ':'],
                ['', 'regionName', ', '],
                ['', 'threshold', ' '],
                ['', 'statistic', ' '],
                ['fcst_len:', 'forecast length', 'h '],
                [' valid time:', 'valid time', ' '],
                ['avg:', 'average', ' ']
            ]
        });
        CurveTextPatterns.insert({
            plotType: PlotTypes.profile,
            textPattern: [
                ['', 'label', ': '],
                ['', 'data source', ':'],
                ['', 'regionName', ', '],
                ['', 'threshold', ' '],
                ['', 'statistic', ' '],
                ['fcst_len:', 'forecast length', 'h '],
                [' valid time:', 'valid time', ' '],
                ['avg:', 'average', ' '],
                ['','curve-dates-dateRange-from','to'],
                ['','curve-dates-dateRange-to','']
            ]
        });
    }
};

savedCurveParams = function () {
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        SavedCurveParams.remove({});
    }
    if (SavedCurveParams.find().count() == 0) {
        SavedCurveParams.insert({clName: 'changeList', changeList:[]});
    }
};

settings = function () {
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        if (Settings.findOne({}) && Settings.findOne({}).resetFromCode) {
            resetFromCode = Settings.findOne({}).resetFromCode;
        } else {
            resetFromCode = false;
        }
        Settings.remove({});
    }
    if (Settings.find().count() == 0) {
        Settings.insert({
            LabelPrefix: "C-",
            Title: "Visibility",
            LineWidth: 3.5,
            NullFillString: "---",
            resetFromCode: resetFromCode
        });
    }
};

colorScheme = function () {
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
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
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        PlotGraphFunctions.remove({});
    }
    //remove for production
    PlotGraphFunctions.remove({});
    if (PlotGraphFunctions.find().count() == 0) {
        PlotGraphFunctions.insert({
            plotType: PlotTypes.timeSeries,
            graphFunction: "graphSeriesZoom",
            dataFunction: "dataSeriesZoom",
            checked:true
        });
    }
};

credentials = function () {
// the gmail account for the credentials is mats.mail.daemon@gmail.com - pwd mats2015!
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
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
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
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
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        Roles.remove({});
    }
    if (Roles.find().count() == 0) {
        Roles.insert({name: "administrator", description: "administrator privileges"});
    }
};

Meteor.startup(function () {
    Future = Npm.require('fibers/future');

    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        Databases.remove({});
    }
    //remove for production
    Databases.remove({});

    if (Databases.find().count() == 0) {
        Databases.insert({
            name:"sumSetting",
            role: "sum_data",
            status: "active",
            host        : 'wolphin.fsl.noaa.gov',
            user        : 'writer',
            password    : 'amt1234',
            database    : 'visibility_sums',
            connectionLimit : 10
        });
        Databases.insert({
            name:"modelSetting",
            role: "model_data",
            status: "active",
            host        : 'wolphin.fsl.noaa.gov',
            user        : 'writer',
            password    : 'amt1234',
            database    : 'visibility',
            connectionLimit : 10
        });
    }
    

    var sumSettings = Databases.findOne({role:"sum_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});
    var modelSettings = Databases.findOne({role:"model_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});
    
    sumPool = mysql.createPool(sumSettings);
    modelPool = mysql.createPool(modelSettings);

    modelPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    try {

        var statement = "select model,regions_name,model_value from visibility.regions_per_model";
        var qFuture = new Future();
        modelPool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + modelSettings.database + "! query:" + statement);
            } else {
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
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
    }




    try {
        var statement = "SELECT model, fcst_lens FROM visibility.fcst_lens_per_model;";
        var qFuture = new Future();
        modelPool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                //console.log('No data in database ' + uaSettings.database + "! query:" + statement);
                console.log('No data in database ' + modelSettings.database + "! query:" + statement);
            } else {
                for (var i = 0; i < rows.length; i++) {
                    var model = rows[i].model;
                    var forecastLengths = rows[i].fcst_lens;
                    var forecastLengthArr = forecastLengths.split(',');
                    forecastLengthOptionsMap[model] = forecastLengthArr;
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
    }
/*
    try {
        var statement = "select model_value,regions_name from region_per_model;";
        var qFuture = new Future();
        modelPool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + modelSettings.database + "! query:" + statement);
            } else {
                RegionDescriptions.remove({});
                for (var i = 0; i < rows.length; i++) {
                    var description = rows[i].description;
                    var regionMapTable = rows[i].regionMapTable;
                    var valueList = [];
                     valueList.push(regionMapTable);
                    RegionDescriptions.insert({regionMapTable: regionMapTable ,  description: description});
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
    }
*/

    roles();
    authorization();
    credentials();
    plotGraph();
    colorScheme();
    settings();
    curveParams();
    savedCurveParams();
    plotParams();
    curveTextPatterns();

    // $(window).resize(function() {
    //     $('#map').css('height', window.innerHeight - 82 - 45);
    // });
    // $(window).resize(); // trigger resize event
});


