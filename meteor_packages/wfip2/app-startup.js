var modelOptionsMap ={};
var regionOptionsMap ={};
var siteOptionsMap ={};
var siteMarkers={};
var descriptorOptionsMap ={};
var upperOptionsMap = {};
var lowerOptionsMap = {};

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
                //options: ['show matching diffs', 'pairwise diffs', 'no diffs'],
                options: ['show matching diffs', 'show matching RMS','pairwise diffs', 'no diffs'],
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
   // if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        CurveParams.remove({});
   // }
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
              //  name: 'Model Forecast or OBS',
                type: InputTypes.select,
                optionsMap:modelOptionsMap,
                //tableMap:modelTableMap,
                options:Object.keys(modelOptionsMap),   // convenience
                optionsQuery:"select model from regions_per_model_mats",
                controlButtonCovered: true,
                default: 'hrrr_esrl',
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
                default: 'All',
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
                options:Object.keys(siteOptionsMap),
                targetName: 'sitesMap',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                default: 'All',
                controlButtonVisibility: 'block',
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 2,
                multiple: true
            });

      /* var siteMarkers = {default:[{point:[40.015517, -105.264830],options:{title:"boulder", color:"red", size:20, dataSource:"SODAR", targetOption:"BO2OR"}},
                                    {point:[37.6956794,-97.3116876],options:{title:"wichita", color:"blue", size:20, dataSource:"PROFILE", targetOption:"CD2OR"}}]
                            };*/
        CurveParams.insert(
            {
                name: 'sitesMap',
                type: InputTypes.selectMap,
                optionsMap:siteMarkers,
                options:Object.keys(optionsMap),   // convenience
                targetName: 'sites',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                default: 'ALL',
                controlButtonVisibility: 'block',
                displayOrder: 5,
                displayPriority: 1,
                displayGroup: 2,
                multiple: true,
                defaultMapView: {point:[45.5139, -120], zoomLevel:7},

            });

        CurveParams.insert(
            {
                name: 'descriptors',
                type: InputTypes.select,
                optionsMap:descriptorOptionsMap,
                options:Object.keys(descriptorOptionsMap),   // convenience
                dependentNames: ['upper','lower'],
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(descriptorOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 6,
                displayPriority: 1,
                displayGroup: 3
            });




        CurveParams.insert(
            {
                name: 'upper',
                type: InputTypes.numberSpinner,
                optionsMap:upperOptionsMap,
                options:Object.keys(upperOptionsMap),   // convenience
                superiorName: 'descriptors',
                min: upperOptionsMap[Object.keys(upperOptionsMap)[0]].min,
                max: upperOptionsMap[Object.keys(upperOptionsMap)[0]].max,
                step: upperOptionsMap[Object.keys(upperOptionsMap)[0]].step,
                controlButtonCovered: true,
                unique: false,
                default: upperOptionsMap[Object.keys(upperOptionsMap)[0]].max,
                controlButtonVisibility: 'block',
                displayOrder: 7,
                displayPriority: 1,
                displayGroup: 3
            });

        CurveParams.insert(
            {
                name: 'lower',
                type: InputTypes.numberSpinner,
                optionsMap:lowerOptionsMap,
                options:Object.keys(lowerOptionsMap),   // convenience
                superiorName: 'descriptors',
                min: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].min,
                max: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].max,
                step: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].step,
                controlButtonCovered: true,
                unique: false,
                default: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].min,
                controlButtonVisibility: 'block',
                displayOrder: 8,
                displayPriority: 1,
                displayGroup: 3
            });






        optionsMap = {
            'RMS': ['sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, sum(m0.N_{{variable0}}) as N0',
                'sqrt(sum(m0.sum2_{{variable0}})/sum(m0.N_{{variable0}})) as stat, sum(m0.N_{{variable0}}) as N0',
                'group_concat(sqrt((m0.sum2_{{variable0}})/m0.N_{{variable0}})  order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0 ,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0'],

                'Bias (Model - OB)': ['-sum(m0.sum_{{variable0}})/sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.sum_model_{{variable1}}-m0.sum_ob_{{variable1}})/sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                'group_concat(-m0.sum_{{variable0}}/m0.N_{{variable0}} order by unix_timestamp(m0.date)+3600*m0.hour) as sub_values0,group_concat( unix_timestamp(m0.date)+3600*m0.hour order by unix_timestamp(m0.date)+3600*m0.hour) as sub_secs0'],
                'N': ['sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                'sum(m0.N_{{variable0}}) as stat, sum(m0.N_{{variable0}}) as N0',
                ''],
                'average': ['sum(m0.sum_ob_{{variable1}} - m0.sum_{{variable0}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
                'sum(m0.sum_model_{{variable1}})/sum(m0.N_{{variable0}}) as stat,m0.N_{{variable0}} as N0',
                ''],
               // 'RAOB average': ['sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
               // 'sum(m0.sum_ob_{{variable1}})/sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as stat, sum(if(m0.sum_ob_{{variable1}} is null,0,m0.N_{{variable0}})) as N0',
               // '']
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
               default: 'average',
                controlButtonVisibility: 'block',
                displayOrder: 9,
                displayPriority: 1,
                displayGroup: 4
            });

            optionsMap = {
                temperature: ['dt', 't'],
                RH: ['dR', 'R'],
                RHobT: ['dRoT', 'RoT'],
                winds: ['dw', 'ws'],
                height: ['dH', 'H']
            };



        optionsMap = {wind_speed:['wind_speed'], wind_direction:['wind_direction']};
        CurveParams.insert(
            {
                name: 'variable',
                type: InputTypes.select,
                optionsMap: optionsMap,
                options:Object.keys(optionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: 'wind_speed',
                controlButtonVisibility: 'block',
                displayOrder: 10,
                displayPriority: 1,
                displayGroup: 4
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
                displayOrder: 11,
                displayPriority: 1,
                displayGroup: 5
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
                displayOrder: 12,
                displayPriority: 1,
                displayGroup: 5
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
                //default: '',
                default: '0',
                controlButtonVisibility: 'block',
                displayOrder: 13,
                displayPriority: 1,
                displayGroup: 5
            });
        CurveParams.insert(
            {
                name: 'top',
                type: InputTypes.numberSpinner,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                min: '0',
                max: '5000',
                step: '20',
                controlButtonCovered: true,
                unique: false,
                default: '5000',
                controlButtonVisibility: 'block',
                displayOrder: 14,
                displayPriority: 1,
                displayGroup: 6
            });
        CurveParams.insert(
            {
                name: 'bottom',
                type: InputTypes.numberSpinner,
                optionsMap:optionsMap,
                options:Object.keys(optionsMap),   // convenience
                min: '0',
                max: '5000',
                step: '20',
                controlButtonCovered: true,
                unique: false,
                default: '0',
                controlButtonVisibility: 'block',
                displayOrder: 15,
                displayPriority: 1,
                displayGroup: 6
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
               // ['', 'Model Forecast or OBS', ':'],
                [' region:', 'regionName', ', '],
                [' sites:', 'sites', ', '],
                ['', 'variable', ', '],
                ['', 'statistic', ', '],
                [' top:', 'top', 'm, '],
                [' bottom:', 'bottom', 'm, '],
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
               // ['', 'Model Forecast or OBS', ':'],
                ['', 'regionName', ', '],
                ['', 'sites', ', '],
                ['', 'variable', ' '],
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
            var resetFromCode = Settings.findOne({}).resetFromCode;
        } else {
            resetFromCode = false;
        }
        Settings.remove({});
    }
    if (Settings.find().count() == 0) {
        Settings.insert({
            LabelPrefix: "C-",
            Title: "WFIP2",
            LineWidth: 3.5,
            NullFillString: "---",
           // resetFromCode: resetFromCode
            resetFromCode: true
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

    //if (Settings.findOne({}) === undefined || Settings.findOne({}).resetFromCode === undefined || Settings.findOne({}).resetFromCode == true) {
        Databases.remove({});
    //}
    if (Databases.find().count() == 0) {

        Databases.insert({
            name:"wfip2Setting",
            role: "wfip2_data",
            status: "active",
            host        : 'wfip2-db.gsd.esrl.noaa.gov',
            user        : 'dev',
            password    : 'Pass4userdev*',

           // host        : 'wfip2-dmzdb.gsd.esrl.noaa.gov',
           // user        : 'readonly',
           // password    : 'Readonlyp@$$405',
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
                console.log('No data in database ' + modelSettings.database + "! query:" + statement);
            } else {
                Models.remove({});
                RegionsPerModel.remove({});

               // RegionsPerModel =['hrrr_esrl,All'];
                for (var i = 0; i < rows.length; i++) {
                    var model = rows[i].model.trim();
                    var regions = rows[i].regions;
                    var model_values = rows[i].model_value.split(',');
                    var table_name = model_values[0];
                    var instruments_instrid =-1;

                        instruments_instrid = model_values[1];


                    var regionMapping = "Areg";
                    if (model=="NAM" || model=="isoRR1h" || model=="isoRRrapx" || model=="isoBak13"){
                        regionMapping = "reg";
                    }

                    var valueList = [];
                    valueList.push(table_name+','+instruments_instrid);
                    modelOptionsMap[model] = valueList;

                    var tablevalueList = [];
                    tablevalueList.push(table_name);

                    Models.insert({name: model, table_name: table_name,instruments_instrid:instruments_instrid});
                    var regionsArr = regions.split(',');
                    regionsArr.unshift('All');
                    RegionsPerModel.insert({model: model, regions: regionsArr});
                }
            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        console.log(err.message);
    }



    var stn_color;
    try {
        var statement = "SELECT siteid, name,description ,lat,lon FROM sites;";
        var qFuture = new Future();
        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            var sodar_sites =['All,All'];
            var profile_sites =['All,All'];
            var all_sites =['All,All'];



            if (rows === undefined || rows.length === 0) {

                console.log('No data in database ' + wfip2Settings.database + "! query:" + statement);
            } else {
                //FcstLensPerModel.remove({});
                SitesPerModel.remove({});
                siteOptionsMap['All'] = 'All';
                siteOptionsMap['All Sodar'] = 'All Sodar';
                siteOptionsMap['All Profile'] = 'All Profile';
                siteMarkers.default = [];
                for (var i = 0; i < rows.length; i++) {
                    var siteid = rows[i].siteid;
                    var name = rows[i].name;
                    var description = rows[i].description;
                    var lat = rows[i].lat;
                    var lon = Number(rows[i].lon)-360;
                    var obs_net ;

                    if(description.includes("SODAR")) {
                        sodar_sites.push(siteid +","+name);
                        obs_net = "SODAR";
                        stn_color ="red";

                    }else{
                        profile_sites.push(siteid +","+name);
                        obs_net = "PROFILE";
                        stn_color = "blue"

                    }
                    all_sites.push(siteid +","+name);


                    siteOptionsMap[name] = siteid;

                    //siteMarkers.default.push({point: [lat,lon],options:{title:name+"="+obs_net}});

                    /* var siteMarkers = {default:[{point:[40.015517, -105.264830],options:{title:"boulder", color:"red", size:20, dataSource:"SODAR", targetOption:"BO2OR"}},
                     {point:[37.6956794,-97.3116876],options:{title:"wichita", color:"blue", size:20, dataSource:"PROFILE", targetOption:"CD2OR"}}]
                     };*/
                    siteMarkers.default.push({point: [lat,lon],options:{title:name, color:stn_color,size:20, network:obs_net,targetOption:name}});


                }
                SitesPerModel.insert({model:"sodar", sites:sodar_sites});
                SitesPerModel.insert({model:"profile", sites:profile_sites});
                SitesPerModel.insert({model:"model", sites:all_sites});

            }
            qFuture['return']();
        }));
        qFuture.wait();
    } catch (err) {
        Console.log(err.message);
    }



    try {
        //var statement = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE  TABLE_NAME = 'hrrr_wfip_discriminator';";
        var statement = "select * from discriminator_range;";
        var qFuture = new Future();

        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                //console.log('No data in database ' + uaSettings.database + "! query:" + statement);
                console.log('No data in database ' + modelSettings.database + "! query:" + statement);
            } else {
                //RangePerDescriptor.remove({});
                for (var i = 0; i < rows.length; i++) {
                    var descriptor = rows[i].name;
                    var min_value = rows[i].min_value;
                    var max_value = rows[i].max_value;

                    descriptorOptionsMap[descriptor] = descriptor;

                   /* dependentOptions = {
                        a:{min:0, max:20, step:1},
                        b:{min:0, max:20, step:1},
                        c:{min:0, max:20, step:1}
                    }*/

                    var step = (max_value - min_value)/10.;
                    upperOptionsMap[descriptor] = {min:min_value,max:max_value,default:max_value};
                    lowerOptionsMap[descriptor] = {min:min_value,max:max_value,step:step,default:min_value};

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

        var statement = "select regionMapTable,description from region_descriptions_mats;";
        var qFuture = new Future();

        wfip2Pool.query(statement, Meteor.bindEnvironment(function (err, rows, fields) {
            if (err != undefined) {
                console.log(err.message);
            }
            if (rows === undefined || rows.length === 0) {
                console.log('No data in database ' + modelSettings.database + "! query:" + statement);
            } else {
                RegionDescriptions.remove({});
                RegionDescriptions.insert({regionMapTable: 'All',  description: 'All'});


                regionOptionsMap['All'] = ['All'];
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


