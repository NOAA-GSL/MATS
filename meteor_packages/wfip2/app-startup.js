var modelOptionsMap ={};
var regionOptionsMap ={};

plotParams = function () {
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        PlotParams.remove({});
    }
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
        PlotParams.insert(
            {
                name: 'plotQualifier',
                type: InputTypes.radioGroup,
                options: ['matching', 'unmatched', 'pairwise'],
                selected: 'matching',
                controlButtonCovered: true,
                default: 'matching',
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 100,
                displayGroup: 1
            });
        PlotParams.insert(
            {
                name: 'plotFormat',
                type: InputTypes.radioGroup,
                options: ['show matching diffs', 'pairwise diffs', 'no diffs'],
                default: 'no diffs',
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
    //console.log(JSON.stringify(modelOptiosMap));
    if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
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
                displayGroup: 1
            }
        );
        CurveParams.insert(
            {
                name: 'model',
                type: InputTypes.select,
                optionsMap:modelOptionsMap,
                options:Object.keys(modelOptionsMap),   // convenience
                optionsQuery:"select model from regions_per_model",
                controlButtonCovered: true,
                default: 'FIM',
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
                optionsMap:regionOptionsMap,
                options:Object.keys(regionOptionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: '',
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

        CurveParams.insert(
            {
                name: 'variable',
                type: InputTypes.select,
                optionsMap: optionsMap,
                options:Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'temperature',
                controlButtonVisibility: 'block',
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2
            });

        optionsMap = {All:['All'], Clear:['Clear'], Cloudy:['Cloudy']};
        CurveParams.insert(
            {
                name: 'cloud coverage',
                type: InputTypes.select,
                optionsMap: optionsMap,
                options:Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'All',
                controlButtonVisibility: 'block',
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 2
            });

        optionsMap = {BOTH: [''], '0-UTC': ['and m0.fcst_len = 0'], '12-UTC': ['and m0.fcst_len = 12']};
        CurveParams.insert(
            {
                name: 'valid time',
                type: InputTypes.select,
                optionsMap: optionsMap,
                options:Object.keys(optionsMap),   // convenience
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
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 3
            });

        optionsMap = {};
        CurveParams.insert(
            {
                name: 'forecast length',
                type: InputTypes.select,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                selected: '',
                controlButtonCovered: true,
                unique: false,
                default: '',
                controlButtonVisibility: 'block',
                displayOrder: 9,
                displayPriority: 1,
                displayGroup: 3
            });
        CurveParams.insert(
            {
                name: 'top',
                type: InputTypes.numberSpinner,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                min: '0',
                max: '1000',
                step: '25',
                controlButtonCovered: true,
                unique: false,
                default: '100',
                controlButtonVisibility: 'block',
                displayOrder: 10,
                displayPriority: 1,
                displayGroup: 4
            });
        CurveParams.insert(
            {
                name: 'bottom',
                type: InputTypes.numberSpinner,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                min: '100',
                max: '1000',
                step: '25',
                controlButtonCovered: true,
                unique: false,
                default: '1000',
                controlButtonVisibility: 'block',
                displayOrder: 11,
                displayPriority: 1,
                displayGroup: 4
        });
        optionsMap = {'1 day':['1 day'], '3 days':['3 days'], '7 days':['7 days'],'31 days':['31 days'], '90 days':['90 days'],'180 days':['180 days'],'365 days':['365 days']};
        CurveParams.insert(
            {
                name: 'curve-dates',
                type: InputTypes.dateRange,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                startDate: '03/01/2015',
                stopDate: dstr,
                controlButtonCovered: true,
                unique: false,
                default: '03/01/2015',
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 5
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
    if (CurveTextPatterns.find().count() == 0) {
        CurveTextPatterns.insert({
            plotType:'TimeSeries',
            textPattern: [
                ['', 'label', ': '],
                ['', 'model', ':'],
                ['', 'regionName', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ' '],
                ['fcst_len:', 'forecast length', 'h '],
                [' valid time:', 'valid time', ' '],
                ['avg:', 'average', ' ']
            ]
        });
        CurveTextPatterns.insert({
            plotType:'Profile',
            textPattern: [
                ['', 'label', ': '],
                ['', 'model', ':'],
                ['', 'regionName', ', '],
                ['', 'variable', ' '],
                ['', 'statistic', ' '],
                ['fcst_len:', 'forecast length', 'h '],
                [' valid time:', 'valid time', ' '],
                ['avg:', 'average', ' '],
                ['','curve-dates-dateRange-from','-->'],
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
        Settings.remove({});
    }
    if (Settings.find().count() == 0) {
        Settings.insert({
            LabelPrefix: "C-",
            Title: "Wfip2",
            LineWidth: 3.5,
            NullFillString: "---",
            resetFromCode: false
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
    if (PlotGraphFunctions.find().count() == 0) {
        PlotGraphFunctions.insert({
            plotType: "TimeSeries",
            graphFunction: "graphSeriesZoom",
            dataFunction: "dataSeriesZoom",
            checked:true
        });
        PlotGraphFunctions.insert({
            plotType: "Profile",
            graphFunction: "graphProfileZoom",
            dataFunction: "dataProfileZoom",
            checked: false
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
    if (Databases.find().count() == 0) {
        Databases.insert({
            name:"sumSetting",
            role: "sum_data",
            status: "active",
            host        : 'wolphin.fsl.noaa.gov',
            user        : 'writer',
            password    : 'amt1234',
            database    : 'ruc_ua_sums2',
            connectionLimit : 10
        });
        Databases.insert({
            name:"surfaceSettings",
            role: "model_data",
            status: "active",
            host        : 'wolphin.fsl.noaa.gov',
            user        : 'writer',
            password    : 'amt1234',
            database    : 'ruc_ua',
            connectionLimit : 10
        });
    }
    var sumSettings = Databases.findOne({role:"sum_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});
    var modelSettings = Databases.findOne({role:"model_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});

    var myModels = [];
    sumPool = mysql.createPool(sumSettings);
    modelPool = mysql.createPool(modelSettings);

    modelPool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    try {
        //var statement = "select table_name from information_schema.tables where table_schema='" + modelSettings.database + "'";
        var statement = "select model,regions,model_value,regions_name from regions_per_model_mats";
        var qFuture = new Future();
        modelPool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + modelSettings.database + "! query:" + statement);
            } else {
                Models.remove({});
                RegionsPerModel.remove({});
                for (var i = 0; i < rows.length; i++) {
                    var model = rows[i].model.trim();
                    var regions = rows[i].regions;
                    var model_value = rows[i].model_value.trim();
                    var regionMapping = "Areg";
                    var valueList = [];
                    valueList.push(model_value);
                    modelOptionsMap[model] = valueList;
                    myModels.push(model);
                    Models.insert({name: model, regionMapping: regionMapping,valueMapping:model_value});
                    RegionsPerModel.insert({model: model, regions: regions.split(',')});
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
        modelPool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                //console.log('No data in database ' + uaSettings.database + "! query:" + statement);
                console.log('No data in database ' + modelSettings.database + "! query:" + statement);
            } else {
                FcstLensPerModel.remove({});
                for (var i = 0; i < rows.length; i++) {
                    var model = rows[i].model;
                    var forecastLengths = rows[i].fcst_lens;

                    FcstLensPerModel.insert({model: model, forecastLengths: forecastLengths.split(',')});

                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
    }

    try {
        var statement = "select id,description,short_name,table_name from region_descriptions_mats;";
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
                    var regionNumber = rows[i].id;
                    var description = rows[i].description;
                    var shortName = rows[i].short_name;
                    var appTableName = rows[i].table_name;
                    var valueList = [];
                    valueList.push(regionNumber);
               regionOptionsMap[description] = valueList;

                    RegionDescriptions.insert({regionNumber: regionNumber, shortName: shortName, description: description, appTableName: appTableName});
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
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
    curveTextPatterns();
});


