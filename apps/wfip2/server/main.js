import {Meteor} from 'meteor/meteor';
import {mysql} from 'meteor/pcel:mysql';
import {matsCollections, matsDataUtils, matsPlotUtils, matsTypes} from 'meteor/randyp:mats-common';


const dateInitStr = matsCollections.dateInitStr();
const dateInitStrParts = dateInitStr.split(' - ');
const startInit = dateInitStrParts[0];
const stopInit = dateInitStrParts[1];
const dstr = startInit + ' - ' + stopInit;

const LCM = function(A)  // A is an integer array (e.g. [-50,25,-45,-18,90,447])
{
    var n = A.length, a = Math.abs(A[0]);
    for (var i = 1; i < n; i++)
    { var b = Math.abs(A[i]), c = a;
        while (a && b){ a > b ? a %= b : b %= a; }
        a = Math.abs(c*A[i])/(a+b);
    }
    return a;
}

var doScatter2dParams = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Scatter2dParams.remove({});
    }

    // NOTE: the name beginning with 'Fit-Type' is significant because if it begins
    // with 'Fit-Type' the parameter will get added to the parameter object
    // that gets passed to the back end. See param_list.js submit form event.
    if (matsCollections.Scatter2dParams.find().count() == 0) {
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
                superiorNames: ['data-source', 'truth-data-source'],
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
    var datesMap = {};
    var modelOptionsMap = {};
    var regionOptionsMap = {};
    var siteOptionsMap = {};
    var siteMarkerOptionsMap = {};
    var discriminatorOptionsMap = {};
    var upperOptionsMap = {};
    var lowerOptionsMap = {};
    var forecastLengthOptionsMap = {};
    var variableFieldsMap = {};
    var variableOptionsMap = {};
    var variableInfoMap = {};
    var dataSourcePreviousCycleAveragingMap = {}
    variableOptionsMap[matsTypes.PlotTypes.profile] = {};
    variableOptionsMap[matsTypes.PlotTypes.scatter2d] = {};
    variableOptionsMap[matsTypes.PlotTypes.timeSeries] = {};
    /*
        The profilers and RASS (temp readings on profilers) need to be handled specially.
        a2e profilers time stamp the start of a 50 minute cycle of wind readings - the fifty minutes of wind readings
        are averaged for the time stamp. This results in an hourly cycle time that is for the future 50 minutes of readings from the time stamp.
        To get an approximate correct data point for comparison to a model (which is timestamped at the nearest time) we modify
        the query to retrieve the past hourly reading and the current hourly reading and average the two. THe cycle time is an hour starting
        one hour past and the half interval is really a full interval.

        For RASS readings the last ten minutes of an hour is timestamped at the time 50 minutes prior to the reading. That means the data point
        for a given RASS reading is really more appropriate at the next hourly time stamp. So we modify the query to get the previous hourly reading for a given time.
        The half interval is still a half interval i.e. 30 minutes.
     */
    var previousCycleInstrumentIds = [1,2,13,16,17,22,23,26,27];
    var previousCycleInstrumentRassIds = [5,21,24,25,28]

    // force a reset if requested - simply remove all the existing params to force a reload
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.CurveParams.remove({});
    }
    var rows;
    var dataSourceSites = {};
    var dynamicallyAddedModels = {};  // used to update the siteOptionsMap with dynamically added models - due to sample rates or disparate date ranges
    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, "select * from data_sources order by model;");
        matsCollections.Models.remove({});
        for (var i = 0; i < rows.length; i++) {
            var dataSources = [];
            var dataSourceCycleIntervals = [];
            var model = rows[i].description;
            var cycle_intervals_str = rows[i].cycle_interval.replace(/'/g, '"');
            var cycle_intervals = JSON.parse(cycle_intervals_str);
            var cycle_interval_sampleRates = Object.keys(cycle_intervals);

            // var cycle_interval = rows[i].cycle_interval * 1000;   // seconds to ms
            // cycle interval is a map - indexed by sample rate with valuse being a list of siteIds valid for the sample interval.
            // If there are different sample rates the reuslt will be different data sources with different valid sites. An empty list indicates all sites are valid (like for a model.
            // e.g. {'900': ['9', '7', '4', '1'], '600': ['17', '18', '19', '20']} would result in three different datasources, datasource-1800, datasource-600, and datasource-900
            // where datasource-1800 is the least common multiple of 600 and 900 and has valid sites [1,2,7,9,17,18,19,20],
            // and datasource-600 is valid for sites [17,18,19,20], and datasource-900 is valid for sites [1,4,7,9].
            var ci = 0;
            dataSources[0] = model;
            dataSourceCycleIntervals[0] = Number(cycle_interval_sampleRates[0]);
            dataSourceSites[model] = cycle_intervals[cycle_interval_sampleRates[0]];
            if (cycle_interval_sampleRates.length > 1) {
                    var lcm = LCM(cycle_interval_sampleRates);
                    dataSources.push( model + "-LCM-" + lcm );
                    dataSourceCycleIntervals.push(lcm);
                    dynamicallyAddedModels[model] = [model + "-LCM-" + lcm];
                    for (ci = 0; ci < cycle_interval_sampleRates.length; ci++) {
                        var addedModel = model + "-" + cycle_interval_sampleRates[ci];
                        dynamicallyAddedModels[model].push(addedModel);
                        dataSources.push(addedModel);
                        dataSourceCycleIntervals.push(Number(cycle_interval_sampleRates[ci]));
                        // either a single sampleRate source or the first of multisampleRate source
                        dataSourceSites[model] = dataSourceSites[model].concat(cycle_intervals[cycle_interval_sampleRates[ci]]);
                        dataSourceSites[addedModel] = cycle_intervals[cycle_interval_sampleRates[ci]];
                    }
                    dataSourceSites[model + "-LCM-" + lcm] = dataSourceSites[model];
            }

            //loop through the datasources - most of which will only be one, but multi-sample datasources will have more
            // be sure to save the actual model for use in sub queries and stuff
            var actualModel = model;
            for (var ci = 0; ci < dataSources.length; ci++) {
                model = dataSources[ci];  // might be a multi-sampleRate model
                var cycle_interval = dataSourceCycleIntervals[ci] * 1000; // convert to milliseconds
                var is_instrument = rows[i].is_instrument;
                var tablename = rows[i].tablename;
                var thisid = rows[i].thisid;
                var variable_names = rows[i].variable_names.split(',');
                var is_json = rows[i].isJSON;
                var color = rows[i].color;
                var dataSourcePreviousCycleAveraging = rows[i].is_instrument == 1 && previousCycleInstrumentIds.includes(rows[i].thisid);
                var dataSourcePreviousCycleRass = rows[i].is_instrument == 1 && previousCycleInstrumentRassIds.includes(rows[i].thisid);

                var minDate = rows[i].mindate;
                var maxDate = rows[i].maxdate;
                var minutc = rows[i].minutc;
                var maxutc = rows[i].maxutc;

                var dataSource_has_discriminator = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, "select has_discriminator('" + actualModel.toString() + "') as hd")[0]['hd'];
                var valueList = [];
                valueList.push(dataSource_has_discriminator + ',' + is_instrument + ',' + tablename + ',' + thisid + ',' + cycle_interval + ',' + is_json + "," + color + "," + dataSourcePreviousCycleAveraging + ',' + dataSourcePreviousCycleRass);
                modelOptionsMap[model] = valueList;
                if (model !== actualModel) {
                    modelOptionsMap[actualModel] = valueList;
                }
                datesMap[model] = {};
                datesMap[model]["minDate"] = minDate;
                datesMap[model]["maxDate"] = maxDate;
                datesMap[model]["minutc"] = minutc;
                datesMap[model]["maxutc"] = maxutc;

                var labels = [];
                for (var j = 0; j < variable_names.length; j++) {
                    const rows2 = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, "select getVariableInfo('" + variable_names[j] + "') as info;");
                    var infostring = rows2[0].info.split('|');
                    labels.push(infostring[1]);
                    variableFieldsMap[infostring[1]] = variable_names[j];
                    variableInfoMap[variable_names[j]] = {
                        'type': infostring[0],
                        'units': infostring[2],
                        'minexpected': infostring[3],
                        'maxexpected': infostring[4]
                    };
                    variableOptionsMap[matsTypes.PlotTypes.profile][model] = [];
                    variableOptionsMap[matsTypes.PlotTypes.profile][model].push.apply(variableOptionsMap[matsTypes.PlotTypes.profile][model], labels);
                    variableOptionsMap[matsTypes.PlotTypes.scatter2d][model] = [];
                    variableOptionsMap[matsTypes.PlotTypes.scatter2d][model].push.apply(variableOptionsMap[matsTypes.PlotTypes.scatter2d][model], labels);
                    variableOptionsMap[matsTypes.PlotTypes.timeSeries][model] = [];
                    variableOptionsMap[matsTypes.PlotTypes.timeSeries][model].push.apply(variableOptionsMap[matsTypes.PlotTypes.timeSeries][model], labels);

                    matsCollections.Models.insert({name: model, table_name: tablename, thisid: thisid});
                }
            }
        }
    } catch (err) {
        console.log("Database error 1:", err.message);
        console.log (err.stack)
    }
    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, "SELECT instrid, short_name, description, color, highlight FROM instruments;");
        matsCollections.Instruments.remove({});
        for (var i = 0; i < rows.length; i++) {
            var instrid = rows[i].instrid;
            var instrument = rows[i].description;
            var color = rows[i].color.trim();
            var highlight = rows[i].highlight.trim();
            matsCollections.Instruments.insert({
                name: instrument,
                instrument_id: instrid,
                color: color,
                highlight: highlight
            });
        }
    } catch (err) {
        console.log("Database error 2:", err.message);
        console.log (err.stack)
    }
    var siteIdNameMap = {};// used in added models below
    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, "SELECT siteid, name,description,lat,lon,elev,instruments_instrid FROM sites, instruments_per_site where sites.siteid = instruments_per_site.sites_siteid;");
        siteMarkerOptionsMap = [];
        siteOptionsMap.model = [];
        var instrumentNames = matsCollections.Instruments.find({}, {
            fields: {
                'name': 1,
                'instrument_id': 1,
                'color': 1,
                'highlight': 1,
                '_id': 0
            }
        }).fetch();
        for (var j = 0; j < instrumentNames.length; j++) {
            var name = instrumentNames[j].name;
            siteOptionsMap[name] = [];
        }
        var points = [];
        matsCollections.SiteMap.remove({});
        for (var i = 0; i < rows.length; i++) {
            var name = rows[i].description;
            var siteid = rows[i].siteid;
            siteIdNameMap[siteid] = name; // save use in added models below
            matsCollections.SiteMap.insert({siteName: name, siteId: siteid});
            var description = rows[i].description;
            var lat = rows[i].lat;
            var lon = rows[i].lon;
            if (lon > 180) {
                lon = lon - 360;
            }
            var point = [lat, lon];
            // move slightly north if another marker occupies this location
            if (matsPlotUtils.containsPoint(points, point)) {
                lat = lat + 0.002;
                point = [lat, lon];
            }
            points.push(point);
            var elev = rows[i].elev;
            var instrid = rows[i].instruments_instrid;

            for (var j = 0; j < instrumentNames.length; j++) {
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

        // determine if a model (datasource) is an instrument or not. If it isn't an instrument i.e. it is a model then it gets all the sites.
        var modelNames = matsCollections.Models.find({}, {fields: {'name': 1, '_id': 0}}).fetch();
        for (var i = 0; i < modelNames.length; i++) {
            var mName = modelNames[i].name;
            var test = 1;
            for (var j = 0; j < instrumentNames.length; j++) {
                var int_name = instrumentNames[j].name;
                if ((mName).indexOf(int_name) !== -1) {
                    test = 0;
                }
            }
            if (test == 1) {
                siteOptionsMap[mName] = siteOptionsMap['model'];
            }
        }

        // Now, we may have added datasources due to disparate sample rates or time frames etc.. If so, we have to also add the modified site lists
        var dynamicallyAddedRootModelNames = Object.keys(dynamicallyAddedModels);
        for (var darmni=0; darmni< dynamicallyAddedRootModelNames.length; darmni++) {
            var newModels = dynamicallyAddedModels[dynamicallyAddedRootModelNames[darmni]]; // new models added for this root
            for (var nmi=0; nmi < newModels.length; nmi++) {
                var newModel = newModels[nmi];
                var sitesIdsForNewModel = dataSourceSites[newModel];
                siteOptionsMap[newModel] = [];
                for (var sifnmi=0; sifnmi<sitesIdsForNewModel.length; sifnmi++) {
                    var siteId = sitesIdsForNewModel[sifnmi];
                    var siteName = siteIdNameMap[siteId];
                    siteOptionsMap[newModel].push(siteName);
                }
            }
        }
    } catch (err) {
        console.log("Database error 3:", err.message);
        console.log (err.stack)
    }

    try {
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, "select name, minimum_expected AS min_value, maximum_expected AS max_value, label from variables where type = 2;");
        for (var i = 0; i < rows.length; i++) {
            var label = rows[i].label;
            var name = rows[i].name;
            var min_value = rows[i].min_value;
            var max_value = rows[i].max_value;
            discriminatorOptionsMap[label] = name;
            var step = "any";
            upperOptionsMap[label] = {min: min_value, max: max_value, step: step, default: max_value};
            lowerOptionsMap[label] = {min: min_value, max: max_value, step: step, default: min_value};
        }
    } catch (err) {
        console.log("Database error 4:", err.message);
        console.log (err.stack)
    }
    try {
        var all_fcst_lens = new Set();
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, "select short_name, fcst_hours, description " +
                        "from nwps " +
                        "union select short_name, 0, description  " +
                        "from instruments as U " +
                        "where exists ( select model from data_sources where model = U.short_name) order by upper(short_name);");
        for (var i = 0; i < rows.length; i++) {
            const these_lengths = rows[i].fcst_hours.split(',');
            for (var j = 0; j < these_lengths.length; j++) {
                all_fcst_lens.add(these_lengths[j]);
            }
        }
        for (var i = 0; i < rows.length; i++) {
            var model = rows[i].short_name;
            var description = rows[i].description;
            if (modelOptionsMap[description] === undefined) {
                continue;
            }
            var is_instrument = modelOptionsMap[description][0].split(',')[1];
            var forecastLengths = [];
            forecastLengths.push.apply(forecastLengths, rows[i].fcst_hours.split(','));
            forecastLengthOptionsMap[description] = forecastLengthOptionsMap[description] === undefined ? [] : forecastLengthOptionsMap[description];
            if (is_instrument == 1) {
                forecastLengthOptionsMap[description] = matsTypes.InputTypes.unused;
            } else {
                forecastLengthOptionsMap[description].push.apply(forecastLengthOptionsMap[description], forecastLengths);
            }
            if (Array.isArray(forecastLengthOptionsMap[description])) {
                forecastLengthOptionsMap[description].sort(function (a, b) {
                    return (Number(a) - Number(b));
                });
                forecastLengthOptionsMap[description].push(matsTypes.InputTypes.forecastSingleCycle);
                forecastLengthOptionsMap[description].push(matsTypes.InputTypes.forecastMultiCycle);
            }
            statement = "select has_discriminator('" + description.toString() + "') as hd";
            var model_has_discriminator = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, "select has_discriminator('" + description.toString() + "') as hd;")[0]['hd'];
            if (model_has_discriminator == 1) {
                var discriminators = Object.keys(discriminatorOptionsMap);
                var labels = [];
                for (var j = 0; j < discriminators.length; j++) {
                    var statement2 = "select getVariableInfo('" + discriminatorOptionsMap[discriminators[j]] + "') as info;";
                    var infostring = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, statement2)[0].info.split('|');
                    labels.push(infostring[1]);
                    variableFieldsMap[infostring[1]] = discriminatorOptionsMap[discriminators[j]];
                    variableInfoMap[discriminatorOptionsMap[discriminators[j]]] = {
                        'type': infostring[0],
                        'units': infostring[2],
                        'minexpected': infostring[3],
                        'maxexpected': infostring[4]
                    };
                }
                variableOptionsMap[matsTypes.PlotTypes.scatter2d][description].push.apply(variableOptionsMap[matsTypes.PlotTypes.scatter2d][description], labels);
                variableOptionsMap[matsTypes.PlotTypes.timeSeries][description].push.apply(variableOptionsMap[matsTypes.PlotTypes.timeSeries][description], labels);
            }
        }
    } catch (err) {
        console.log("Database error 5:", err.message);
        console.log (err.stack)
    }

    try {
        matsCollections.RegionDescriptions.remove({});
        rows = matsDataUtils.simplePoolQueryWrapSynchronous(wfip2Pool, "select description from region_descriptions_mats;");
        for (var i = 0; i < rows.length; i++) {
            var description = rows[i].description;
            var valueList = [];
            valueList.push(description);
            regionOptionsMap[description] = valueList;
        }
    } catch (err) {
        console.log("Database error 6:", err.message);
        console.log (err.stack)
    }


    if (matsCollections.CurveParams.findOne({name: 'label'}) == undefined) {
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

        if (matsCollections.CurveParams.findOne({name: 'data-source'}) == undefined) {
            matsCollections.CurveParams.insert(
                {
                    name: 'data-source',
                    type: matsTypes.InputTypes.select,
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap),   // convenience
                    dependentNames: ["sites", "forecast-length", "variable", "dates", "curve-dates"],
                    controlButtonCovered: true,
                    default: Object.keys(modelOptionsMap)[0],
                    unique: false,
                    controlButtonVisibility: 'block',
                    displayOrder: 1,
                    displayPriority: 1,
                    displayGroup: 2,
                    dates: datesMap
                });
        } else {
            // it is defined but check for necessary update
            var currentParam = matsCollections.CurveParams.findOne({name: 'data-source'});
            if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) ||
                (!matsDataUtils.areObjectsEqual(currentParam.dates, datesMap)))
            // have to reload model data
                matsCollections.CurveParams.update({name: 'data-source'}, {
                    $set: {
                        optionsMap: modelOptionsMap,
                        options: Object.keys(modelOptionsMap),   // convenience
                        dates: datesMap
                    }
                });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'discriminator'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'discriminator',
                type: matsTypes.InputTypes.select,
                optionsMap: discriminatorOptionsMap,
                options: Object.keys(discriminatorOptionsMap),   // convenience
                dependentNames: ['upper', 'lower'],
                disableOtherFor: {'upper': matsTypes.InputTypes.unused, 'lower': [matsTypes.InputTypes.unused]},
                hideOtherFor: {'upper': [matsTypes.InputTypes.unused], 'lower': [matsTypes.InputTypes.unused]},
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
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'discriminator'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, discriminatorOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'discriminator'}, {
                $set: {
                    optionsMap: discriminatorOptionsMap,
                    options: Object.keys(discriminatorOptionsMap),   // convenience
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'upper'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'upper',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: upperOptionsMap,
                options: Object.keys(upperOptionsMap),   // convenience
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
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'upper'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, upperOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'upper'}, {
                $set: {
                    optionsMap: upperOptionsMap,
                    options: Object.keys(upperOptionsMap),   // convenience
                    min: upperOptionsMap[Object.keys(upperOptionsMap)[0]].min,
                    max: upperOptionsMap[Object.keys(upperOptionsMap)[0]].max,
                    step: upperOptionsMap[Object.keys(upperOptionsMap)[0]].step,
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'lower'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'lower',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: lowerOptionsMap,
                options: Object.keys(lowerOptionsMap),   // convenience
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
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'lower'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, lowerOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'lower'}, {
                $set: {
                    optionsMap: lowerOptionsMap,
                    options: Object.keys(lowerOptionsMap),   // convenience
                    min: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].min,
                    max: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].max,
                    step: lowerOptionsMap[Object.keys(lowerOptionsMap)[0]].step,
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'statistic'}) == undefined) {
        var statisticOptionsMap = {
            mean: ['mean'],
            bias: ['bias'],
            rmse: ['rmse'],
            mae: ['mae']
        };
        matsCollections.CurveParams.insert(
            {
                name: 'statistic',
                type: matsTypes.InputTypes.select,
                optionsMap: statisticOptionsMap,
                options: Object.keys(statisticOptionsMap),   // convenience
                controlButtonCovered: true,
                dependentNames: ["sites", "forecast-length", "variable"],
                disableOtherFor: {'truth-data-source': statisticOptionsMap.mean},
                hideOtherFor: {'truth-data-source': statisticOptionsMap.mean},
                unique: false,
                default: Object.keys(statisticOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 3,
                help: 'wfip2-statistic.html'
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'truth-data-source'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'truth-data-source',
                type: matsTypes.InputTypes.select,
                optionsMap: modelOptionsMap,
                options: Object.keys(modelOptionsMap),   // convenience
                dependentNames: ["sites", "forecast-length", "variable", "dates", "curve-dates"],
                controlButtonCovered: true,
                default: 'HRRR NCEP',
                unique: false,
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 2,
                displayGroup: 3,
                dates: datesMap
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'truth-data-source'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.optionsMap, modelOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.dates, datesMap))) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'truth-data-source'}, {
                $set: {
                    optionsMap: modelOptionsMap,
                    options: Object.keys(modelOptionsMap),   // convenience
                    dates: datesMap
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'region'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'region',
                type: matsTypes.InputTypes.select,
                optionsMap: regionOptionsMap,
                options: Object.keys(regionOptionsMap),   // convenience
                controlButtonCovered: true,
                unique: false,
                default: regionOptionsMap[Object.keys(regionOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 3,
                displayPriority: 1,
                displayGroup: 3
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'region'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, regionOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'region'}, {
                $set: {
                    optionsMap: regionOptionsMap,
                    options: Object.keys(regionOptionsMap),   // convenience
                }
            });
        }
    }


    if (matsCollections.CurveParams.findOne({name: 'valid-time'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'valid-time',
                type: matsTypes.InputTypes.select,
                options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
                selected: [],
                controlButtonCovered: true,
                unique: false,
                default: 'All',
                controlButtonVisibility: 'block',
                controlButtonText: "valid utc hour",
                displayOrder: 4,
                displayPriority: 1,
                displayGroup: 3,
                multiple: true
            });
    }

    if (matsCollections.CurveParams.findOne({name: 'sites'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'sites',
                type: matsTypes.InputTypes.select,
                optionsMap: siteOptionsMap,
                options: siteOptionsMap[Object.keys(siteOptionsMap)[0]],
                peerName: 'sitesMap',    // name of the select parameter that is going to be set by selecting from this map
                superiorNames: ['data-source', 'truth-data-source'],
                controlButtonCovered: true,
                unique: false,
                default: siteOptionsMap[Object.keys(siteOptionsMap)[0]][0],
                controlButtonVisibility: 'block',
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'sites'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, siteOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'sites'}, {
                $set: {
                    optionsMap: siteOptionsMap,
                    options: Object.keys(siteOptionsMap),   // convenience
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'sitesMap'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'sitesMap',
                type: matsTypes.InputTypes.selectMap,
                optionsMap: siteMarkerOptionsMap,
                options: Object.keys(siteMarkerOptionsMap),   // convenience
                peerName: 'sites',    // name of the select parameter that is going to be set by selecting from this map
                controlButtonCovered: true,
                unique: false,
                //default: siteMarkerOptionsMap[Object.keys(siteMarkerOptionsMap)[0]],
                default: Object.keys(siteMarkerOptionsMap)[0],
                controlButtonVisibility: 'block',
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 4,
                multiple: true,
                defaultMapView: {point: [45.904233, -120.814632], zoomLevel: 8, minZoomLevel: 4, maxZoomLevel: 13},
                help: 'map-help.html'
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'sitesMap'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, siteMarkerOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'sitesMap'}, {
                $set: {
                    optionsMap: siteMarkerOptionsMap,
                    options: Object.keys(siteMarkerOptionsMap),   // convenience
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'site-completeness'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'site-completeness',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
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
    }

    if (matsCollections.CurveParams.findOne({name: 'variable'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'variable',
                type: matsTypes.InputTypes.select,
                //variableMap: {wind_speed:'ws', wind_direction:'wd'}, // used to facilitate the select
                variableMap: variableFieldsMap,
                optionsMap: variableOptionsMap,
                infoMap: variableInfoMap,
                options: variableOptionsMap[matsTypes.PlotTypes.timeSeries][Object.keys(variableOptionsMap[matsTypes.PlotTypes.timeSeries])[0]],   // convenience
                superiorNames: ['data-source', 'truth-data-source'],
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
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'variable'});
        if ((!matsDataUtils.areObjectsEqual(currentParam.variableMap, variableFieldsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, variableOptionsMap)) ||
            (!matsDataUtils.areObjectsEqual(currentParam.infoMap, variableInfoMap))) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'variable'}, {
                $set: {
                    variableMap: variableFieldsMap,
                    optionsMap: variableOptionsMap,
                    infoMap: variableInfoMap,
                    options: variableOptionsMap[matsTypes.PlotTypes.timeSeries][Object.keys(variableOptionsMap[matsTypes.PlotTypes.timeSeries])[0]]
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'forecast-length'}) == undefined) {
        optionsMap = {};
        matsCollections.CurveParams.insert(
            {
                name: 'forecast-length',
                type: matsTypes.InputTypes.select,
                optionsMap: forecastLengthOptionsMap,
                options: Object.keys(forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]]),   // convenience
                superiorNames: ['data-source', 'truth-data-source'],
                //selected: '',
                controlButtonCovered: true,
                unique: false,
                default: Object.keys(forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]])[0],
                controlButtonVisibility: 'block',
                controlButtonText: "forecast lead time",
                displayOrder: 2,
                displayPriority: 1,
                displayGroup: 5
            });
    } else {
        // it is defined but check for necessary update
        var currentParam = matsCollections.CurveParams.findOne({name: 'forecast-length'});
        if (!matsDataUtils.areObjectsEqual(currentParam.optionsMap, forecastLengthOptionsMap)) {
            // have to reload model data
            matsCollections.CurveParams.update({name: 'forecast-length'}, {
                $set: {
                    optionsMap: forecastLengthOptionsMap,
                    options: Object.keys(forecastLengthOptionsMap[Object.keys(forecastLengthOptionsMap)[0]])
                }
            });
        }
    }

    if (matsCollections.CurveParams.findOne({name: 'top'}) == undefined) {
        optionsMap = {};
        matsCollections.CurveParams.insert(
            {
                name: 'top',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
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
    }

    if (matsCollections.CurveParams.findOne({name: 'bottom'}) == undefined) {
        optionsMap = {};
        matsCollections.CurveParams.insert(
            {
                name: 'bottom',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
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
    }

    if (matsCollections.CurveParams.findOne({name: 'level-completeness'}) == undefined) {
        matsCollections.CurveParams.insert(
            {
                name: 'level-completeness',
                type: matsTypes.InputTypes.numberSpinner,
                optionsMap: {},
                options: [],
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
    }

    if (matsCollections.CurveParams.findOne({name: 'curve-dates'}) == undefined) {
        optionsMap = {};
        matsCollections.CurveParams.insert(
            {
                name: 'curve-dates',
                type: matsTypes.InputTypes.dateRange,
                optionsMap: optionsMap,
                options: Object.keys(optionsMap),   // convenience
                startDate: startInit,
                stopDate: stopInit,
                superiorNames: ['data-source', 'truth-data-source'],
                controlButtonCovered: true,
                unique: false,
                default: dstr,
                controlButtonVisibility: 'block',
                controlButtonText: "curve-bounding-dates",
                displayOrder: 1,
                displayPriority: 1,
                displayGroup: 7,
                help: "dateHelp.html"
            });
    }
}

/* The format of a curveTextPattern is an array of arrays, each sub array has
 [labelString, localVariableName, delimiterString]  any of which can be null.
 Each sub array will be joined (the localVariableName is always dereferenced first)
 and then the sub arrays will be joined maintaining order.

 The curveTextPattern is found by its name which must match the corresponding PlotGraphFunctions.PlotType value.
 See curve_item.js and graph.js.
 */
var doCurveTextPatterns = function () {
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
                ['fcst_len:', 'forecast-length', ' ,'],
                ['', 'valid-time', '']
            ],
            displayParams: [
                "label", "data-source", "truth-data-source", "discriminator", "upper", "lower", "statistic", "region", "sites", "site-completeness", "variable", "forecast-length", "top", "bottom", "level-completeness", "valid-time"
            ],
            groupSize: 6
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
                ['fcst_len:', 'forecast-length', ' ,'],
                ['', 'curve-dates', ''],
                ['', 'valid-time', '']
            ],
            displayParams: [
                "label", "data-source", "truth-data-source", "discriminator", "upper", "lower", "statistic", "region", "sites", "site-completeness", "variable", "forecast-length", "top", "bottom", "level-completeness", "curve-dates", "valid-time"
            ],
            groupSize: 6
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
                ['fcst_len:', 'xaxis-forecast-length', ', '],
                ['', 'xaxis-discriminator', ', '],
                ['', 'xaxis-valid-time', ':']
                    ['lc', 'xaxis-level-completeness', ' '],
                ['sc', 'xaxis-site-completeness', '']
                    ['', 'yaxis-data-source', ':'],
                ['', 'yaxis-truth-data-source', ':'],
                ['', 'yaxis-region', ', '],
                ['', 'yaxis-sites', ', '],
                ['', 'yaxis-variable', ', '],
                ['', 'yaxis-statistic', ':'],
                ['fcst_len:', 'yaxis-forecast-length', ', '],
                ['', 'yaxis-discriminator', ', '],
                ['', 'yaxis-valid-time', ', '],
                ['lc', 'yaxis-level-completeness', ' '],
                ['sc', 'yaxis-site-completeness', ''],
                ['', 'Fit-Type', '']
            ],
            displayParams: [
                "label",
                "Fit-Type",
                "xaxis", "xaxis-data-source", "xaxis-truth-data-source", "xaxis-discriminator",
                "xaxis-upper", "xaxis-lower", "xaxis-statistic", "xaxis-region", "xaxis-sites",
                "xaxis-site-completeness", "xaxis-variable", "xaxis-forecast-length", "xaxis-top", "xaxis-bottom", "xaxis-level-completeness", "xaxis-valid-time",

                "yaxis", "yaxis-data-source", "yaxis-truth-data-source", "yaxis-discriminator",
                "yaxis-upper", "yaxis-lower", "yaxis-statistic", "yaxis-region", "yaxis-sites",
                "yaxis-site-completeness", "yaxis-variable", "yaxis-forecast-length", "yaxis-top", "yaxis-bottom", "yaxis-level-completeness", "yaxis-valid-time"
            ],
            groupSize: 6
        });
    }
};

var doScatterAxisTextPattern = function () {
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
                ['discriminator', ""]
            ]
        });
    }
};

var doSavedCurveParams = function () {
    if (matsCollections.SavedCurveParams.find().count() == 0) {
        matsCollections.SavedCurveParams.insert({clName: 'changeList', changeList: []});
    }
};

var doPlotGraph = function () {
    if (matsCollections.PlotGraphFunctions.find().count() == 0) {
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.timeSeries,
            graphFunction: "graphSeries",
            dataFunction: "dataSeries",
            textViewId: "textSeriesView",
            graphViewId: "graphSeriesView",
            checked: true,
            dependents: ['variable']
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.profile,
            graphFunction: "graphProfile",
            dataFunction: "dataProfile",
            textViewId: "textProfileView",
            graphViewId: "graphSeriesView",
            checked: false,
            dependents: ['variable']
        });
        matsCollections.PlotGraphFunctions.insert({
            plotType: matsTypes.PlotTypes.scatter2d,
            graphFunction: "graph2dScatter",
            dataFunction: "data2dScatter",
            textViewId: "textScatter2dView",
            graphViewId: "graphSeriesView",
            checked: false,
            dependents: ['variable']
        });
    }
};

Meteor.startup(function () {
    matsCollections.Databases.remove({});
    if (matsCollections.Databases.find().count() == 0) {
        matsCollections.Databases.insert({
            name: "wfip2Setting-wfip2-dmz",
            role: "wfip2_data",
            status: "inactive",
            host: 'wfip2-dmzdb.gsd.esrl.noaa.gov',
            user: 'readonly',
            password: 'Readonlyp@$$405',
            database: 'WFIP2_v2',
            port: 3306,
            connectionLimit: 10
        });

        matsCollections.Databases.insert({
            name: "wfip2Setting-model-vxtest",
            role: "wfip2_data",
            status: "active",
            host: 'model-vxtest.gsd.esrl.noaa.gov',
            user: 'ambverif',
            password: 'Pass4ambverif#',
            database: 'wfip_dev',
            port: 3308,
            connectionLimit: 10
        });
    }
    var wfip2Settings = matsCollections.Databases.findOne({role: "wfip2_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        port: 1,
        connectionLimit: 1
    });
    // the pool is intended to be global
    wfip2Pool = mysql.createPool(wfip2Settings);
    wfip2Pool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });

    const mdr = new matsTypes.MetaDataDBRecord("wfip2Pool", wfip2Settings.database, ['data_sources', 'discriminator_range', 'region_descriptions_mats','variables','instruments_per_site','sites']);
    matsMethods.resetApp(mdr);

    matsCollections.appName.insert({name: "appName", app: "wfip2"});

});
// this object is global so that the reset code can get to it
// These are application specific mongo data - like curve params
appSpecificResetRoutines = {
    doPlotGraph: doPlotGraph,
    doCurveParams: doCurveParams,
    doScatter2dParams: doScatter2dParams,
    doSavedCurveParams: doSavedCurveParams,
    doPlotParams: doPlotParams,
    doCurveTextPatterns: doCurveTextPatterns
};

