/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from "meteor/meteor";
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {matsCache, matsCollections, matsDataQueryUtils, matsDataUtils, matsTypes} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {url} from 'url';
import {Mongo} from 'meteor/mongo';

// PRIVATE

// local collection used to keep the table update times for refresh - won't ever be synchronized or persisted.
const metaDataTableUpdates = new Mongo.Collection(null);
const LayoutStoreCollection = new Mongo.Collection("LayoutStoreCollection"); // initialize collection used for pop-out window functionality
const DownSampleResults = new Mongo.Collection("DownSampleResults");

var MV_DIRS = {};
// Define routes for server
if (Meteor.isServer) {
    if (Meteor.settings.private !== undefined && Meteor.settings.private !== null) {
        const _MV_OUT = Meteor.settings.private.MV_OUTPUT;
        const _MV_HOME = Meteor.settings.private.MV_HOME;
        const _MV_LOGDIR = _MV_OUT + "/xml/";
        const _MV_ERRDIR = _MV_OUT + "/xml/";
        const _MV_DATADIR = _MV_OUT + "/data/";
        const _MV_SQLDIR = _MV_OUT + "/xml/";  // sql output goes with the xml output
        const _MV_XMLDIR = _MV_OUT + "/xml/";
        const _MV_SCRIPTSDIR = _MV_OUT + "/scripts/";
        const _MV_PLOTSSDIR = _MV_OUT + "/plots/";
        process.env.JAVA_HOME = Meteor.settings.private.JAVA_HOME;
        process.env.MV_HOME = Meteor.settings.private.MV_HOME;

        MV_DIRS = {
            LOGDIR: _MV_LOGDIR,
            ERRDIR: _MV_ERRDIR,
            DATADIR: _MV_DATADIR,
            SQLDIR: _MV_SQLDIR,
            XMLDIR: _MV_XMLDIR,
            SCRIPTSDIR: _MV_SCRIPTSDIR,
            PLOTSDIR: _MV_PLOTSSDIR,
            HOME: _MV_HOME
        };
    }

    // add indexes to result and axes collections
    DownSampleResults.rawCollection().createIndex({"createdAt": 1}, {expireAfterSeconds: 3600 * 8}); // 8 hour expiration
    LayoutStoreCollection.rawCollection().createIndex({"createdAt": 1}, {expireAfterSeconds: 900}); // 15 min expiration

    // define some server side routes
    Picker.route('/_getCSV/:key', function (params, req, res, next) {
        Picker.middleware(_getCSV(params, req, res, next));
    });

    Picker.route('/CSV/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(_getCSV(params, req, res, next));
    });

    Picker.route('/:app/CSV/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(_getCSV(params, req, res, next));
    });

    Picker.route('/gsd/mats/:app/CSV/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(_getCSV(params, req, res, next));
    });

    Picker.route('/_getJSON/:key', function (params, req, res, next) {
        Picker.middleware(_getJSON(params, req, res, next));
    });

    Picker.route('/JSON/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(_getJSON(params, req, res, next));
    });

    Picker.route('/:app/JSON/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(_getJSON(params, req, res, next));
    });

    Picker.route('/gsd/mats/:app/JSON/:f/:key/:m/:a', function (params, req, res, next) {
        Picker.middleware(_getJSON(params, req, res, next));
    });

    Picker.route('/_clearCache', function (params, req, res, next) {
        Picker.middleware(_clearCache(params, req, res, next));
    });

    Picker.route('/:app/_clearCache', function (params, req, res, next) {
        Picker.middleware(_clearCache(params, req, res, next));
    });

    Picker.route('/gsd/mats/:app/_clearCache', function (params, req, res, next) {
        Picker.middleware(_clearCache(params, req, res, next));
    });

    Picker.route('/refreshMetadata', function (params, req, res, next) {
        Picker.middleware(_refreshMetadataMWltData(params, req, res, next));
    });

    Picker.route('/:app/refreshMetadata', function (params, req, res, next) {
        Picker.middleware(_refreshMetadataMWltData(params, req, res, next));
    });

    Picker.route('/gsd/mats/:app/refreshMetadata', function (params, req, res, next) {
        Picker.middleware(_refreshMetadataMWltData(params, req, res, next));
    });

// create picker routes for metviewer middleware static files
    Picker.route('/:app/mvdata/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetData(params, req, res, next));
    });
    Picker.route('/gsd/mats/:app/mvdata/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetData(params, req, res, next));
    });

    Picker.route('/:app/mvpoints1/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetPoints1(params, req, res, next));
    });
    Picker.route('/gsd/mats/:app/mvpoints1/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetPoints1(params, req, res, next));
    });

    Picker.route('/:app/mvpoints2/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetPoints2(params, req, res, next));
    });
    Picker.route('/gsd/mats/:app/mvpoints2/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetPoints2(params, req, res, next));
    });

    Picker.route('/:app/mvxml/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetXml(params, req, res, next));
    });
    Picker.route('/gsd/mats/:app/mvxml/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetXml(params, req, res, next));
    });

    Picker.route('/:app/mvplot/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetPlot(params, req, res, next));
    });
    Picker.route('/gsd/mats/:app/mvplot/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetPlot(params, req, res, next));
    });

    Picker.route('/:app/mvscript/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetScript(params, req, res, next));
    });
    Picker.route('/gsd/mats/:app/mvscript/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetScript(params, req, res, next));
    });

    Picker.route('/:app/mvsql/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetSql(params, req, res, next));
    });
    Picker.route('/gsd/mats/:app/mvsql/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetSql(params, req, res, next));
    });

    Picker.route('/:app/mvlog/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetLog(params, req, res, next));
    });
    Picker.route('/gsd/mats/:app/mvlog/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetLog(params, req, res, next));
    });

    Picker.route('/:app/mverr/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetErr(params, req, res, next));
    });
    Picker.route('/gsd/mats/:app/mverr/:key', function (params, req, res, next) {
        Picker.middleware(_mvGetErr(params, req, res, next));
    });
}

// private - used to see if the main page needs to update its selectors
const _checkMetaDataRefresh = function () {
    // This routine compares the current last modified time of the tables used for curveParameter metadata
    // with the last update time to determine if an update is necessary. We really only do this for Curveparams
    /*
        metaDataTableUpdates:
        {
            name: dataBaseName,
            tables: [tableName1, tableName2 ..],
            lastRefreshed : timestamp
        }
     */
    var refresh = false;
    const tableUpdates = metaDataTableUpdates.find({}).fetch();
    for (var tui = 0; tui < tableUpdates.length; tui++) {
        var id = tableUpdates[tui]._id;
        var poolName = tableUpdates[tui].pool;
        var dbName = tableUpdates[tui].name;
        var tableNames = tableUpdates[tui].tables;
        var lastRefreshed = tableUpdates[tui]['lastRefreshed'];
        var updatedEpoch = Number.MAX_VALUE;
        for (var ti = 0; ti < tableNames.length; ti++) {
            var tName = tableNames[ti];
            var rows = matsDataQueryUtils.simplePoolQueryWrapSynchronous(global[poolName], "SELECT UNIX_TIMESTAMP(UPDATE_TIME)" +
                "    FROM   information_schema.tables" +
                "    WHERE  TABLE_SCHEMA = '" + dbName + "'" +
                "    AND TABLE_NAME = '" + tName + "'");
            for (var i = 0; i < rows.length; i++) {
                try {
                    updatedEpoch = rows[i]['UNIX_TIMESTAMP(UPDATE_TIME)'];
                    break;
                } catch (e) {
                    throw new Error("_checkMetaDataRefresh - cannot find last update time for database: " + dbName + " and table: " + tName + " ERROR:" + e.message);
                }
                if (updatedEpoch === Number.MAX_VALUE) {
                    throw new Error("_checkMetaDataRefresh - cannot find last update time for database: " + dbName + " and table: " + tName);
                }
            }
            const lastRefreshedEpoch = moment(lastRefreshed).valueOf() / 1000;
            if (lastRefreshedEpoch < updatedEpoch) {
                refresh = true;
                console.log("Refreshing the metadata in the app selectors because table " + dbName + "." + tName + " was updated at " + moment.utc(updatedEpoch * 1000).format("YYYY-MM-DD HH:mm:ss") + " while the metadata was last refreshed at " + moment.utc(lastRefreshedEpoch * 1000).format("YYYY-MM-DD HH:mm:ss"));
                break;
            }
        }
        if (refresh === true) {
            // refresh the app metadata
            // app specific routines
            //const asrKeys = Object.keys(appSpecificResetRoutines);
            const asrKeys = appSpecificResetRoutines;
            for (var ai = 0; ai < asrKeys.length; ai++) {
                global.appSpecificResetRoutines[ai]();
            }
            // remember that we updated ALL the metadata tables just now
            metaDataTableUpdates.update({_id: id}, {$set: {lastRefreshed: moment().format()}});
        }
    }
    return true;
};

// private middleware for clearing the cache
const _clearCache = function (params, req, res, next) {
    if (Meteor.isServer) {
        matsCache.clear();
        res.end();
    }
};

// private middleware for _getCSV route
const _getCSV = function (params, req, res, next) {
    if (Meteor.isServer) {
        var stringify = require('csv-stringify');
        var csv = "";
        try {
            var result = _getFlattenedResultData(params.key, 0, -1000);
            var statArray = Object.values(result.stats);
            var dataArray = Object.values(result.data);
            var statResultArray = [];
            var dataResultArray = [];
            for (var si = 0; si < statArray.length; si++) {
                statResultArray.push(Object.keys(statArray[si])); // push the stat header for this curve(keys)
                statResultArray.push(statArray[si]['n'] === 0 ? [statArray[si].label] : Object.values(statArray[si])); // push the stats for this curve
            }

            for (var di = 0; di < dataArray.length; di++) {
                var dataSubArray = Object.values(dataArray[di]);
                var dataHeader = dataSubArray[0] === undefined ? statArray[di].label : Object.keys(dataSubArray[0]);
                //dataHeader[0] = 'label';
                dataHeader[0] = dataSubArray[0] === undefined ? "NO DATA" : Object.keys(dataSubArray[0]).filter(key => key.indexOf('Curve') != -1)[0];
                dataResultArray.push(dataHeader); // push this curve data header (keys)
                if (dataSubArray[0] === undefined) {
                    continue;
                }
                for (var dsi = 0; dsi < dataSubArray.length; dsi++) {  // push this curves data
                    dataResultArray.push(Object.values(dataSubArray[dsi]));
                }
            }
            var fileName = "matsplot-" + moment.utc().format('YYYYMMDD-HH.mm.ss') + ".csv";
            res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
            res.setHeader('Content-Type', 'attachment.ContentType');
            stringify(statResultArray, {header: true}, function (err, output) {
                if (err) {
                    console.log("error in _getCSV:", err);
                    res.write("error," + err.toLocaleString());
                    res.end();
                    return;
                }
                res.write(output);
                stringify(dataResultArray, {header: true}, function (err, output) {
                    if (err) {
                        console.log("error in _getCSV:", err);
                        res.write("error," + err.toLocaleString());
                        res.end();
                        return;
                    }
                    res.write(output);
                    res.end();
                });
                delete result;
                delete statResultArray;
                delete dataResultArray;
            });
        } catch (e) {
            console.log('error retrieving data: ', e);
            csv = "error," + e.toLocaleString();
            res.setHeader('Content-disposition', 'attachment; filename=matsplot.csv');
            res.setHeader('Content-Type', 'attachment.ContentType');
            res.end(csv);
        }
    }
};

// private middleware for _getJSON route
const _getJSON = function (params, req, res, next) {
    if (Meteor.isServer) {
        var flatJSON = "";
        try {
            var result = _getPagenatedData(params.key, 0, -1000);
            flatJSON = JSON.stringify(result);
        } catch (e) {
            console.log('error retrieving data: ', e);
            flatJSON = JSON.stringify({error: e});
            delete flatJSON.dsiRealPageIndex;
            delete flatJSON.dsiTextDirection;
        }
        res.setHeader('Content-Type', 'application/json');
        res.write(flatJSON);
        res.end();
        delete flatJSON;
        delete result;
    }
};

// private method for getting pagenated results and flattening them in order to be appropriate for text display.
const _getFlattenedResultData = function (rk, p, np) {
    if (Meteor.isServer) {
        var resp;
        try {
            var r = rk;
            var p = p;
            var np = np;
            // get the pagenated data
            var result = _getPagenatedData(r, p, np);
            // find the type
            var plotTypes = result.basis.plotParams.plotTypes;
            var plotType = (_.invert(plotTypes))[true];
            // extract data
            var data = result.data;
            var dsiRealPageIndex = result.dsiRealPageIndex;
            var dsiTextDirection = result.dsiTextDirection;
            switch (plotType) {
                case matsTypes.PlotTypes.timeSeries:
                case matsTypes.PlotTypes.dailyModelCycle:
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of maps
                    /*
                    returnData is
                    {
                        stats: {
                                    curve0: {label:someLabel, mean:someMean,sd:someSd....}
                                    curve1: {label:someLabel, mean:someMean,sd:someSd....}
                                    ...
                                }
                        data: {
                                    curve0: [
                                                {time:someTime, stat: someStat, sd: someSd,....},
                                                {time:someTime, stat: someStat, sd: someSd,....},
                                                ....
                                            ],
                                    curve1: [
                                                {time:someTime, stat: someStat, sd: someSd,....},
                                                {time:someTime, stat: someStat, sd: someSd,....},
                                                ....
                                            ],
                                            ...
                              }
                    }
                     */
                    for (var ci = 0; ci < data.length; ci++) { // for each curve
                        // if the curve label is a reserved word do not process the curve (its a zero or max curve)
                        var reservedWords = Object.values(matsTypes.ReservedWords);
                        if (reservedWords.indexOf(data[ci].label) >= 0) {
                            continue; // don't process the zero or max curves
                        }
                        var stats = {};
                        stats['label'] = data[ci].label;
                        stats['mean'] = data[ci].glob_stats.d_mean;
                        stats['standard deviation'] = data[ci].glob_stats.sd;
                        stats['n'] = data[ci].glob_stats.n_good;
                        stats['standard error'] = data[ci].glob_stats.stde_betsy;
                        stats['lag1'] = data[ci].glob_stats.lag1;
                        stats['minimum'] = data[ci].glob_stats.minVal;
                        stats['maximum'] = data[ci].glob_stats.maxVal;
                        returnData.stats[data[ci].label] = stats;

                        var curveData = [];  // map of maps
                        for (var cdi = 0; cdi < data[ci].x.length; cdi++) { //for each datapoint
                            var curveDataElement = {};
                            curveDataElement[data[ci].label + ' time'] = data[ci].x[cdi];
                            curveDataElement['raw stat from query'] = data[ci].stats[cdi].raw_stat;
                            curveDataElement['plotted stat'] = data[ci].y[cdi];
                            curveDataElement['std dev'] = data[ci].stats[cdi].sd;
                            curveDataElement['std error'] = data[ci].stats[cdi].stde_betsy;
                            curveDataElement['lag1'] = data[ci].stats[cdi].lag1;
                            curveDataElement['n'] = data[ci].stats[cdi].n_good;
                            curveData.push(curveDataElement);
                        }
                        returnData.data[data[ci].label] = curveData;
                    }
                    break;
                case matsTypes.PlotTypes.profile:
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of map
                    for (var ci = 0; ci < data.length; ci++) {  // for each curve
                        var reservedWords = Object.values(matsTypes.ReservedWords);
                        if (reservedWords.indexOf(data[ci].label) >= 0) {
                            continue; // don't process the zero or max curves
                        }
                        var stats = {};
                        stats['label'] = data[ci].label;
                        stats['mean'] = data[ci].glob_stats.d_mean;
                        stats['standard deviation'] = data[ci].glob_stats.sd;
                        stats['n'] = data[ci].glob_stats.n_good;
                        stats['standard error'] = data[ci].glob_stats.stde_betsy;
                        stats['lag1'] = data[ci].glob_stats.lag1;
                        stats['minimum'] = data[ci].glob_stats.minVal;
                        stats['maximum'] = data[ci].glob_stats.maxVal;
                        returnData.stats[data[ci].label] = stats;

                        var cdata = data[ci].data;
                        var curveData = [];  // array of maps
                        for (var cdi = 0; cdi < data[ci].x.length; cdi++) {  // for each datapoint
                            var curveDataElement = {};
                            curveDataElement[data[ci].label + ' level'] = data[ci].y[cdi];
                            curveDataElement['raw stat from query'] = data[ci].stats[cdi].raw_stat;
                            curveDataElement['plotted stat'] = data[ci].x[cdi];
                            curveDataElement['std dev'] = data[ci].stats[cdi].sd;
                            curveDataElement['std error'] = data[ci].stats[cdi].stde_betsy;
                            curveDataElement['lag1'] = data[ci].stats[cdi].lag1;
                            curveDataElement['n'] = data[ci].stats[cdi].n_good;
                            curveData.push(curveDataElement);
                        }
                        returnData.data[data[ci].label] = curveData;
                    }
                    break;
                case matsTypes.PlotTypes.dieoff:
                case matsTypes.PlotTypes.threshold:
                case matsTypes.PlotTypes.validtime:
                    var labelSuffix;
                    switch (plotType) {
                        case matsTypes.PlotTypes.dieoff:
                            labelSuffix = " forecast lead time";
                            break;
                        case matsTypes.PlotTypes.validtime:
                            labelSuffix = " hour of day";
                            break;
                        case matsTypes.PlotTypes.threshold:
                            labelSuffix = " threshold (in)";
                            break;
                    }
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of maps

                    for (var ci = 0; ci < data.length; ci++) {  // for each curve
                        var reservedWords = Object.values(matsTypes.ReservedWords);
                        if (reservedWords.indexOf(data[ci].label) >= 0) {
                            continue; // don't process the zero or max curves
                        }
                        var stats = {};
                        stats['label'] = data[ci].label;
                        stats['mean'] = data[ci].glob_stats.d_mean;
                        stats['standard deviation'] = data[ci].glob_stats.sd;
                        stats['n'] = data[ci].glob_stats.n_good;
                        stats['minimum'] = data[ci].glob_stats.minVal;
                        stats['maximum'] = data[ci].glob_stats.maxVal;
                        returnData.stats[data[ci].label] = stats;

                        var curveData = [];  // map of maps
                        for (var cdi = 0; cdi < data[ci].x.length; cdi++) {  // for each datapoint
                            var curveDataElement = {};
                            curveDataElement[data[ci].label + labelSuffix] = data[ci].x[cdi];
                            curveDataElement['raw stat from query'] = data[ci].stats[cdi].raw_stat;
                            curveDataElement['plotted stat'] = data[ci].y[cdi];
                            curveDataElement['std dev'] = data[ci].stats[cdi].sd;
                            curveDataElement['n'] = data[ci].stats[cdi].n_good;
                            curveData.push(curveDataElement);
                        }
                        returnData.data[data[ci].label] = curveData;
                    }
                    break;
                case matsTypes.PlotTypes.reliability:
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of map
                    for (var ci = 0; ci < data.length; ci++) {  // for each curve
                        var reservedWords = Object.values(matsTypes.ReservedWords);
                        if (reservedWords.indexOf(data[ci].label) >= 0) {
                            continue; // don't process the zero or max curves
                        }
                        var stats = {};
                        stats['label'] = data[ci].label;
                        stats['sample climo'] = data[ci].glob_stats.sample_climo;
                        returnData.stats[data[ci].label] = stats;

                        var cdata = data[ci].data;
                        var curveData = [];  // array of maps
                        for (var cdi = 0; cdi < data[ci].y.length; cdi++) {  // for each datapoint
                            var curveDataElement = {};
                            curveDataElement[data[ci].label + ' probability bin'] = data[ci].stats[cdi].prob_bin;
                            curveDataElement['hit rate'] = data[ci].stats[cdi].hit_rate;
                            curveDataElement['oy'] = data[ci].stats[cdi].obs_y;
                            curveDataElement['on'] = data[ci].stats[cdi].obs_n;
                            curveData.push(curveDataElement);
                        }
                        returnData.data[data[ci].label] = curveData;
                    }
                    break;
                case matsTypes.PlotTypes.map:
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of maps

                    var stats = {};
                    stats['label'] = data[0].label;
                    stats['total number of obs'] = data[0].stats.reduce(function (prev, curr) {
                        return prev + curr.N_times;
                    }, 0);
                    stats['mean difference'] = matsDataUtils.average(data[0].queryVal);
                    stats['standard deviation'] = matsDataUtils.stdev(data[0].queryVal);
                    stats['minimum time'] = data[0].stats.reduce(function (prev, curr) {
                        return (prev < curr.min_time ? prev : curr.min_time);
                    });
                    stats['minimum time'] = moment.utc(stats['minimum time'] * 1000).format('YYYY-MM-DD HH:mm');
                    stats['maximum time'] = data[0].stats.reduce(function (prev, curr) {
                        return (prev > curr.max_time ? prev : curr.max_time);
                    });
                    stats['maximum time'] = moment.utc(stats['maximum time'] * 1000).format('YYYY-MM-DD HH:mm');

                    returnData.stats[data[0].label] = stats;

                    var curveData = [];  // map of maps
                    for (var si = 0; si < data[0].siteName.length; si++) {
                        var curveDataElement = {};
                        curveDataElement['Site Name'] = data[0].siteName[si];
                        curveDataElement['Number of Times'] = data[0].stats[si].N_times;
                        curveDataElement['Start Date'] = moment.utc((data[0].stats[si].min_time) * 1000).format('YYYY-MM-DD HH:mm');
                        curveDataElement['End Date'] = moment.utc((data[0].stats[si].max_time) * 1000).format('YYYY-MM-DD HH:mm');
                        curveDataElement['Average Difference'] = data[0].queryVal[si];
                        curveData.push(curveDataElement);
                    }
                    returnData.data[data[0].label] = curveData;
                    break;
                case matsTypes.PlotTypes.histogram:
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of maps

                    for (var ci = 0; ci < data.length; ci++) { // for each curve
                        var reservedWords = Object.values(matsTypes.ReservedWords);
                        if (reservedWords.indexOf(data[ci].label) >= 0) {
                            continue; // don't process the zero or max curves
                        }
                        var stats = {};
                        stats['label'] = data[ci].label;
                        stats['mean'] = data[ci].glob_stats.glob_mean;
                        stats['standard deviation'] = data[ci].glob_stats.glob_sd;
                        stats['n'] = data[ci].glob_stats.glob_n;
                        stats['minimum'] = data[ci].glob_stats.glob_min;
                        stats['maximum'] = data[ci].glob_stats.glob_max;
                        returnData.stats[data[ci].label] = stats;

                        var curveData = [];  // map of maps
                        for (var cdi = 0; cdi < data[ci].x.length; cdi++) {   // for each datapoint
                            var curveDataElement = {};
                            curveDataElement[data[ci].label + ' bin range'] = data[ci].bin_stats[cdi]['binLabel'];
                            curveDataElement['n'] = data[ci].bin_stats[cdi].bin_n;
                            curveDataElement['bin rel freq'] = data[ci].bin_stats[cdi].bin_rf;
                            curveDataElement['bin lower bound'] = data[ci].bin_stats[cdi].binLowBound;
                            curveDataElement['bin upper bound'] = data[ci].bin_stats[cdi].binUpBound;
                            curveDataElement['bin mean'] = data[ci].bin_stats[cdi].bin_mean;
                            curveDataElement['bin std dev'] = data[ci].bin_stats[cdi].bin_sd;
                            curveData.push(curveDataElement);
                        }
                        returnData.data[data[ci].label] = curveData;
                    }
                    break;
                case matsTypes.PlotTypes.contour:
                case matsTypes.PlotTypes.contourDiff:
                    var returnData = {};
                    returnData.stats = {};   // map of maps
                    returnData.data = {};  // map of arrays of maps
                    var stats = {};
                    stats['label'] = data[0].label;
                    stats['total number of points'] = data[0].glob_stats.n;
                    stats['mean stat'] = data[0].glob_stats.mean;
                    stats['minimum time'] = data[0].glob_stats.minDate;
                    stats['minimum time'] = moment.utc(stats['minimum time'] * 1000).format('YYYY-MM-DD HH:mm');
                    stats['maximum time'] = data[0].glob_stats.maxDate;
                    stats['maximum time'] = moment.utc(stats['maximum time'] * 1000).format('YYYY-MM-DD HH:mm');

                    returnData.stats[data[0].label] = stats;

                    var curveData = [];  // map of maps
                    for (var si = 0; si < data[0].xTextOutput.length; si++) {
                        var curveDataElement = {};
                        curveDataElement['xVal'] = data[0].xTextOutput[si];
                        curveDataElement['yVal'] = data[0].yTextOutput[si];
                        curveDataElement['stat'] = data[0].zTextOutput[si];
                        curveDataElement['N'] = data[0].nTextOutput[si];
                        curveDataElement['Start Date'] = moment.utc((data[0].minDateTextOutput[si]) * 1000).format('YYYY-MM-DD HH:mm');
                        curveDataElement['End Date'] = moment.utc((data[0].maxDateTextOutput[si]) * 1000).format('YYYY-MM-DD HH:mm');
                        curveData.push(curveDataElement);
                    }
                    returnData.data[data[0].label] = curveData;
                    break;
                case matsTypes.PlotTypes.scatter2d:
                    var returnData = {}; // returns a map of arrays of maps
                    /*
                    returnData = {
                                    curve0: [
                                                {
                                                xval: number,
                                                yval: number,
                                                bestfit: number || none
                                                },
                                                {
                                                xval: number,
                                                yval: number,
                                                bestfit: number || none
                                                },
                                               .....
                                            ],
                                     curve1: [
                                                {
                                                xval: number,
                                                yval: number,
                                                bestfit: number || none
                                                },
                                                {
                                                xval: number,
                                                yval: number,
                                                bestfit: number || none
                                                },
                                               .....
                                            ],
                                            ....
                                }
                     */
                    var firstBestFitIndex = -1;
                    var bestFitIndexes = {};
                    for (var ci = 0; ci < data.length; ci++) {
                        if (ci == firstBestFitIndex) {
                            break; // best fit curves are at the end so do not do further processing
                        }
                        var curveData = data[ci];
                        // look for a best fit curve - only have to look at curves with higher index than this one
                        var bestFitIndex = -1;
                        for (var cbi = ci + 1; cbi < data.length; cbi++) {
                            if (((data[cbi].label).indexOf(curveData.label) !== -1) && ((data[cbi].label).indexOf("-best fit") != -1)) {
                                bestFitIndexes[ci] = cbi;
                                if (firstBestFitIndex == -1) {
                                    firstBestFitIndex = cbi;
                                }
                                break;
                            }
                        }
                        var curveTextData = [];
                        for (var cdi = 0; cdi < curveData.data.length; cdi++) {
                            var element = {};
                            element['xAxis'] = curveData.data[cdi][0];
                            element['yAxis'] = curveData.data[cdi][1];
                            if (bestFitIndexes[ci] === undefined) {
                                element['best fit'] = "none;"
                            } else {
                                element['best fit'] = data[bestFitIndexes[ci]].data[cdi][1];
                            }
                            curveTextData.push(element);
                        }
                        returnData[curveData.label] = curveTextData;
                    }
                    break;
                default:
                    return undefined;
            }
            returnData.dsiRealPageIndex = dsiRealPageIndex;
            returnData.dsiTextDirection = dsiTextDirection;
            return returnData;
        } catch (error) {
           throw new Meteor.Error("Error in _getFlattenedResultData function: " + error.message);
        }
    }
};

// private method for getting pagenated data
// a newPageIndex of -1000 means get all the data (used for export)
// a newPageIndex of -2000 means get just the last page
const _getPagenatedData = function (rky, p, np) {
    if (Meteor.isServer) {
        var key = rky;
        var myPageIndex = p;
        var newPageIndex = np;
        var ret;
        var rawReturn;

        try {
            var result = matsCache.getResult(key);
            rawReturn = result === undefined ? undefined : result.result; // getResult structure is {key:something, result:resultObject}
        } catch (e) {
            console.log("_getPagenatedData: Error - ", e);
            return undefined;
        }
        ret = rawReturn === undefined ? undefined : JSON.parse(JSON.stringify(rawReturn));
        var start;
        var end;
        var direction = 1;
        if (newPageIndex === -1000) {
            // all the data
            start = 0;
            end = Number.MAX_VALUE;
        } else if (newPageIndex === -2000) {
            // just the last page
            start = -2000;
            direction = -1;
        } else if (myPageIndex <= newPageIndex) {
            // proceed forward
            start = (newPageIndex - 1) * 100;
            end = newPageIndex * 100;
        } else {
            // move back
            direction = -1;
            start = newPageIndex * 100;
            end = (newPageIndex + 1) * 100;
        }

        var dsiStart;
        var dsiEnd;
        for (var csi = 0; csi < ret.data.length; csi++) {
            if (ret.data[csi].x == null || ret.data[csi].x.length <= 100) {
                continue; // don't bother pagenating datasets less than or equal to a page - ret is rawReturn
            }
            dsiStart = start;
            dsiEnd = end;
            if (dsiStart > ret.data[csi].x.length || dsiStart === -2000) {
                // show the last page if we either requested it specifically or are trying to navigate past it
                dsiStart = Math.floor(rawReturn.data[csi].x.length / 100) * 100;
                dsiEnd = rawReturn.data[csi].x.length;
                if (dsiEnd === dsiStart) {
                    // make sure the last page isn't empty--if rawReturn.data[csi].data.length/100 produces a whole number,
                    // dsiStart and dsiEnd would be the same. This makes sure that the last full page is indeed the last page, without a phantom empty page afterwards
                    dsiStart = dsiEnd - 100;
                }
            }
            if (dsiStart < 0) {
                // show the first page if we are trying to navigate before it
                dsiStart = 0;
                dsiEnd = 100;
            }
            if (dsiEnd < dsiStart) {
                // make sure that the end is after the start
                dsiEnd = dsiStart + 100;
            }
            if (dsiEnd > ret.data[csi].x.length) {
                // make sure we don't request past the end -- if results are one page, this should convert the
                // start and end from 0 and 100 to 0 and whatever the end is.
                dsiEnd = ret.data[csi].x.length;
            }
            ret.data[csi].x = rawReturn.data[csi].x.slice(dsiStart, dsiEnd);
            ret.data[csi].y = rawReturn.data[csi].y.slice(dsiStart, dsiEnd);
            ret.data[csi].stats = rawReturn.data[csi].stats.slice(dsiStart, dsiEnd);
            ret.data[csi].glob_stats = rawReturn.data[csi].glob_stats;
        }

        delete rawReturn;
        if (direction === 1) {
            ret.dsiRealPageIndex = Math.floor(dsiEnd / 100);
        } else {
            ret.dsiRealPageIndex = Math.floor(dsiStart / 100);
        }
        ret.dsiTextDirection = direction;
        return ret;
    }
};

//private middleware for getting metviewer data file
const _mvGetData = function(params, req, res, next) {
    const fse = require("fs-extra");
    const filePath = MV_DIRS.DATADIR;
    const baseName = params.key + ".data";
    const fileName = filePath + '/' + baseName;
    try {
        fse.readFile(fileName, function(err, data) {
            res.setHeader('Content-Type', 'text/plain')
            if (err) {console.log(err);} // Fail if the file can't be read.
            res.end(data); // Send the file data to the browser.
        });
    }
    catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        res.write("Error Error getting data file :" + baseName);
        res.end();
    }
}

//private middleware for getting metviewer points1 file
const _mvGetPoints1 = function(params, req, res, next) {
    const fse = require("fs-extra");
    const filePath = MV_DIRS.DATADIR;
    const baseName = params.key + ".points1";
    const fileName = filePath + '/' + baseName;
    try {
        fse.readFile(fileName, function(err, data) {
            res.setHeader('Content-Type', 'text/plain')
            if (err) {console.log(err);} // Fail if the file can't be read.
            res.end(data); // Send the file data to the browser.
        });
    }
    catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        res.write("Error Error getting data file :" + baseName);
        res.end();
    }
}


//private middleware for getting metviewer points1 file
const _mvGetPoints2 = function(params, req, res, next) {
    const fse = require("fs-extra");
    const filePath = MV_DIRS.DATADIR;
    const baseName = params.key + ".points2";
    const fileName = filePath + '/' + baseName;
    try {
        fse.readFile(fileName, function(err, data) {
            res.setHeader('Content-Type', 'text/plain')
            if (err) {console.log(err);} // Fail if the file can't be read.
            res.end(data); // Send the file data to the browser.
        });
    }
    catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        res.write("Error Error getting data file :" + baseName);
        res.end();
    }
}

//private middleware for getting metviewer xml file
const _mvGetXml = function(params, req, res, next) {
    const fse = require("fs-extra");
    const filePath = MV_DIRS.XMLDIR;
    const baseName = params.key + ".xml";
    const fileName = filePath + '/' + baseName;
    try {
        fse.readFile(fileName, function(err, data) {
            res.setHeader('Content-Type', 'text/plain');
            if (err) {console.log(err);} // Fail if the file can't be read.
            res.end(data); // Send the file data to the browser.
        });
    }
    catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        res.write("Error Error getting xml file :" + baseName);
        res.end();
    }
}
//private middleware for getting metviewer plot file
const _mvGetPlot = function(params, req, res, next) {
    const fse = require("fs-extra");
    const filePath = MV_DIRS.PLOTSDIR;
    const baseName = params.key + ".png";
    const fileName = filePath + '/' + baseName;
    try {
        fse.readFile(fileName, function(err, data) {
            res.setHeader('Content-Type', 'image/png');
            if (err) {console.log(err);} // Fail if the file can't be read.
            res.end(data); // Send the file data to the browser.
        });
    }
    catch (error) {
        res.setHeader('Content-Type', 'application/txt');
        res.write("Error Error getting plot file :" + baseName);
        res.end();
    }
}
//private middleware for getting metviewer script file
const _mvGetScript = function(params, req, res, next) {
    const fse = require("fs-extra");
    const filePath = MV_DIRS.SCRIPTSDIR;
    const baseName = params.key + ".R";
    const fileName = filePath + '/' + baseName;
    try {
        fse.readFile(fileName, function(err, data) {
            res.setHeader('Content-Type', 'text/plain');
            if (err) {console.log(err);} // Fail if the file can't be read.
            res.end(data); // Send the file data to the browser.
        });
    }
    catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        res.write("Error Error getting script file :" + baseName);
        res.end();
    }}
//private middleware for getting metviewer sql file
const _mvGetSql = function(params, req, res, next) {
    const fse = require("fs-extra");
    const filePath = MV_DIRS.SQLDIR;
    const baseName = params.key + ".sql";
    const fileName = filePath + '/' + baseName;
    try {
        fse.readFile(fileName, function(err, data) {
            res.setHeader('Content-Type', 'text/sql');
            if (err) {console.log(err);} // Fail if the file can't be read.
            res.end(data); // Send the file data to the browser.
        });
    }
    catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        res.write("Error Error getting sql file :" + baseName);
        res.end();
    }
}
//private middleware for getting metviewer log file
const _mvGetLog = function(params, req, res, next) {
    const fse = require("fs-extra");
    const filePath = MV_DIRS.LOGDIR;
    const baseName = params.key + ".log";
    const fileName = filePath + '/' + baseName;
    try {
        fse.readFile(fileName, function(err, data) {
            res.setHeader('Content-Type', 'text/plain');
            if (err) {console.log(err);} // Fail if the file can't be read.
            res.end(data); // Send the file data to the browser.
        });
    }
    catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        res.write("Error Error getting log file :" + baseName);
        res.end();
    }
}
//private middleware for getting metviewer err file
const _mvGetErr = function(params, req, res, next) {
    const fse = require("fs-extra");
    const filePath = MV_DIRS.ERRDIR;
    const baseName = params.key + ".err";
    const fileName = filePath + '/' + baseName;
    try {
        fse.readFile(fileName, function(err, data) {
            res.setHeader('Content-Type', 'text/plain');
            if (err) {
                res.setHeader('Content-Type', 'text/plain');
                res.write("Error Error getting err file :" + baseName);
                res.end();
            } else {
                res.end(data); // Send the file data to the browser.
            }
        });
    }
    catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        res.write("Error Error getting plot file :" + baseName);
        res.end();
    }
}


// private define a middleware for clearing the cache
const _refreshMetadataMWltData = function (params, req, res, next) {
    if (Meteor.isServer) {
        _checkMetaDataRefresh();
        res.end();
    }
};

// private save the result from the query into mongo and downsample if that result's size is greater than 1Mb
const _saveResultData = function (result) {
    if (Meteor.isServer) {
        var sizeof = require('object-sizeof');
        var hash = require('object-hash');
        var key = hash(result.basis.plotParams);
        var threshold = 1000000;
        var ret = {};
        try {
            var dSize = sizeof(result.data);
            //console.log("result.basis.data size is ", dSize);
            // TimeSeries and DailyModelCycle are the only plot types that require downSampling
            if (dSize > threshold && (result.basis.plotParams.plotTypes.TimeSeries || result.basis.plotParams.plotTypes.DailyModelCycle)) {
                // greater than threshold need to downsample
                // downsample and save it in DownSampleResult
                console.log("DownSampling");
                var downsampler = require("downsample-lttb");
                var totalPoints = 0;
                for (var di = 0; di < result.data.length; di++) {
                    totalPoints += result.data[di].x_epoch.length;
                }
                var allowedNumberOfPoints = (threshold / dSize) * totalPoints;
                var downSampleResult = result === undefined ? undefined : JSON.parse(JSON.stringify(result));
                for (var ci = 0; ci < result.data.length; ci++) {
                    var dsData = {};
                    var xyDataset = result.data[ci].x_epoch.map(function (d, index) {
                        return [result.data[ci].x_epoch[index], result.data[ci].y[index]];
                    });
                    var ratioTotalPoints = xyDataset.length / totalPoints;
                    var myAllowedPoints = Math.round(ratioTotalPoints * allowedNumberOfPoints);
                    // downsample the array
                    var downsampledSeries;
                    if (myAllowedPoints < xyDataset.length && xyDataset.length > 2) {
                        downsampledSeries = downsampler.processData(xyDataset, myAllowedPoints);
                        // replace the y attributes (tooltips etc.) with the y attributes from the nearest x
                        var originalIndex = 0;
                        // skip through the original dataset capturing each downSampled data point
                        var arrayKeys = [];
                        var nonArrayKeys = [];
                        var keys = Object.keys(result.data[ci]);
                        for (var ki = 0; ki < keys.length; ki++) {
                            if (keys[ki] !== 'x_epoch') {
                                if (Array.isArray(result.data[ci][keys[ki]])) {
                                    arrayKeys.push(keys[ki]);
                                    dsData[keys[ki]] = [];
                                } else {
                                    nonArrayKeys.push(keys[ki]);
                                }
                            }
                        }
                        // We only ever downsample series plots - never profiles and series plots only ever have error_y arrays.
                        // This is a little hacky but what is happening is we putting error_y.array on the arrayKeys list so that it gets its
                        // downsampled equivalent values.
                        for (ki = 0; ki < nonArrayKeys.length; ki++) {
                            dsData[nonArrayKeys[ki]] = result.data[ci][nonArrayKeys[ki]];
                        }
                        // remove the original error_y array data.
                        dsData['error_y'].array = [];
                        for (var dsi = 0; dsi < downsampledSeries.length; dsi++) {
                            while (originalIndex < result.data[ci].x_epoch.length && (result.data[ci].x_epoch[originalIndex] < downsampledSeries[dsi][0])) {
                                originalIndex++;
                            }
                            // capture the stuff related to this downSampled data point (downSampled data points are always a subset of original data points)
                            for (ki = 0; ki < arrayKeys.length; ki++) {
                                dsData[arrayKeys[ki]][dsi] = result.data[ci][arrayKeys[ki]][originalIndex];
                            }
                            dsData['error_y']['array'][dsi] = result.data[ci]['error_y']['array'][originalIndex];
                        }
                        // add downsampled annotation to curve options
                        downSampleResult[ci] = dsData;
                        downSampleResult[ci].annotation += "   **DOWNSAMPLED**";
                    } else {
                        downSampleResult[ci] = result.data[ci];
                    }
                    downSampleResult.data[ci] = downSampleResult[ci];
                }
                DownSampleResults.rawCollection().insert({"createdAt": new Date(), key: key, result: downSampleResult});// createdAt ensures expiration set in mats-collections
                ret = {key: key, result: downSampleResult};
            } else {
                ret = {key: key, result: result};
            }
            // save original dataset in the matsCache
            if (result.basis.plotParams.plotTypes.TimeSeries || result.basis.plotParams.plotTypes.DailyModelCycle) {
                for (var ci = 0; ci < result.data.length; ci++) {
                    delete (result.data[ci]['x_epoch']);     // we only needed this as an index for downsampling
                }
            }
            matsCache.storeResult(key, {key: key, result: result}); // lifespan is handled by lowDb (internally) in matscache
        } catch (error) {
            if (error.toLocaleString().indexOf("larger than the maximum size") != -1) {
                throw new Meteor.Error(+": Requesting too much data... try averaging");
            }
        }
        return ret;
    }
};

// PUBLIC METHODS
//administration tools
const addSentAddress = new ValidatedMethod({
    name: 'matsMethods.addSentAddress',
    validate: new SimpleSchema({
        toAddress: {type: String}
    }).validator(),
    run(toAddress) {
        if (!Meteor.userId()) {
            throw new Meteor.Error(401, "not-logged-in");
        }
        matsCollections.SentAddresses.upsert({address: toAddress}, {address: toAddress, userId: Meteor.userId()});
        return false;
    }
});


//  administation tool
const applyAuthorization = new ValidatedMethod({
    name: 'matsMethods.applyAuthorization',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),
    run(settings) {
        if (Meteor.isServer) {
            var roles;
            var roleName;
            var authorization;

            var userRoleName = settings.userRoleName;
            var userRoleDescription = settings.userRoleDescription;
            var authorizationRole = settings.authorizationRole;
            var newUserEmail = settings.newUserEmail;
            var existingUserEmail = settings.existingUserEmail;

            if (authorizationRole) {
                // existing role - the role roleName - no need to verify as the selection list came from the database
                roleName = authorizationRole;
            } else if (userRoleName && userRoleDescription) {
                // possible new role - see if it happens to already exist
                var role = matsCollections.Roles.findOne({name: userRoleName});
                if (role === undefined) {
                    // need to add new role using description
                    matsCollections.Roles.upsert({name: userRoleName}, {$set: {description: userRoleDescription}});
                    roleName = userRoleName;
                } else {
                    // see if the description matches...
                    roleName = role.name;
                    var description = role.description;
                    if (description != userRoleDescription) {
                        // have to update the description
                        matsCollections.Roles.upsert({name: userRoleName}, {$set: {description: userRoleDescription}});
                    }
                }
            }
            // now we have a role roleName - now we need an email
            if (existingUserEmail) {
                // existing user -  no need to verify as the selection list came from the database
                // see if it already has the role
                authorization = matsCollections.Authorization.findOne({email: existingUserEmail});
                roles = authorization.roles;
                if (roles.indexOf(roleName) == -1) {
                    // have to add the role
                    if (roleName) {
                        roles.push(roleName);
                    }
                    matsCollections.Authorization.upsert({email: existingUserEmail}, {$set: {roles: roles}});
                }
            } else if (newUserEmail) {
                // possible new authorization - see if it happens to exist
                authorization = matsCollections.Authorization.findOne({email: newUserEmail});
                if (authorization !== undefined) {
                    // authorization exists - add role to roles if necessary
                    roles = authorization.roles;
                    if (roles.indexOf(roleName) == -1) {
                        // have to add the role
                        if (roleName) {
                            roles.push(roleName);
                        }
                        matsCollections.Authorization.upsert({email: existingUserEmail}, {$set: {roles: roles}});
                    }
                } else {
                    // need a new authorization
                    roles = [];
                    if (roleName) {
                        roles.push(roleName);
                    }
                    if (newUserEmail) {
                        matsCollections.Authorization.upsert({email: newUserEmail}, {$set: {roles: roles}});
                    }
                }
            }
            return false;
        }
    }
});

// database controls
const applyDatabaseSettings = new ValidatedMethod({
    name: 'matsMethods.applyDatabaseSettings',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),

    run(settings) {
        if (Meteor.isServer) {
            if (settings.name) {
                matsCollections.Databases.upsert({name: settings.name}, {
                    $set: {
                        name: settings.name,
                        role: settings.role,
                        status: settings.status,
                        host: settings.host,
                        database: settings.database,
                        user: settings.user,
                        password: settings.password
                    }
                });
            }
            return false;
        }
    }
});


//administration tools
const deleteSettings = new ValidatedMethod({
    name: 'matsMethods.deleteSettings',
    validate: new SimpleSchema({
        name: {
            type: String
        }
    }).validator(),
    run(params) {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-logged-in");
        }
        if (Meteor.isServer) {
            matsCollections.CurveSettings.remove({name: params.name});
        }
    }
});

//administration tools
const emailImage = new ValidatedMethod({
    name: 'matsMethods.emailImage',
    validate: new SimpleSchema({
        imageStr: {type: String},
        toAddress: {type: String},
        subject: {type: String}
    }).validator(),
    run(params) {
        var imageStr = params.imageStr;
        var toAddress = params.toAddress;
        var subject = params.subject;
        if (!Meteor.userId()) {
            throw new Meteor.Error(401, "not-logged-in");
        }
        var fromAddress = Meteor.user().services.google.email;
        // these come from google - see
        // http://masashi-k.blogspot.fr/2013/06/sending-mail-with-gmail-using-xoauth2.html
        //http://stackoverflow.com/questions/24098461/nodemailer-gmail-what-exactly-is-a-refresh-token-and-how-do-i-get-one/24123550

        // the gmail account for the credentials is mats.mail.daemon@gmail.com - pwd mats2015!
        //var clientId = "339389735380-382sf11aicmgdgn7e72p4end5gnm9sad.apps.googleusercontent.com";
        //var clientSecret = "7CfNN-tRl5QAL595JTW2TkRl";
        //var refresh_token = "1/PDql7FR01N2gmq5NiTfnrT-OlCYC3U67KJYYDNPeGnA";
        var credentials = matsCollections.Credentials.findOne({name: "oauth_google"}, {
            clientId: 1,
            clientSecret: 1,
            refresh_token: 1
        });
        var clientId = credentials.clientId;
        var clientSecret = credentials.clientSecret;
        var refresh_token = credentials.refresh_token;

        var smtpTransporter;
        try {
            smtpTransporter = Nodemailer.createTransport("SMTP", {
                service: "Gmail",
                auth: {
                    XOAuth2: {
                        user: "mats.gsd@noaa.gov",
                        clientId: clientId,
                        clientSecret: clientSecret,
                        refreshToken: refresh_token
                    }
                }
            });

        } catch (e) {
            throw new Meteor.Error(401, "Transport error " + e.message());
        }
        try {
            var mailOptions = {
                sender: fromAddress,
                replyTo: fromAddress,
                from: fromAddress,
                to: toAddress,
                subject: subject,
                attachments: [
                    {
                        filename: "graph.png",
                        contents: new Buffer(imageStr.split("base64,")[1], "base64")
                    }
                ]
            };

            smtpTransporter.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log("smtpTransporter error " + error + " from:" + fromAddress + " to:" + toAddress);
                } else {
                    console.log(response + " from:" + fromAddress + " to:" + toAddress);
                }
                smtpTransporter.close();
            });
        } catch (e) {
            throw new Meteor.Error(401, "Send error " + e.message());
        }
        return false;
    }
});

// administation tool
const getAuthorizations = new ValidatedMethod({
    name: 'matsMethods.getAuthorizations',
    validate: new SimpleSchema({}).validator(),
    run() {
        var roles = [];
        if (Meteor.isServer) {
            var userEmail = Meteor.user().services.google.email.toLowerCase();
            roles = matsCollections.Authorization.findOne({email: userEmail}).roles;
        }
        return roles;
    }
});

// administration tool
const getDataFunctionFileList = new ValidatedMethod({
    name: 'matsMethods.getDataFunctionFileList',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
        }
    }
});


// retrieves the saved query results (or downsampled results)
const getGraphData = new ValidatedMethod({
    name: 'matsMethods.getGraphData',
    validate: new SimpleSchema({
        plotParams: {
            type: Object,
            blackbox: true
        },
        plotType: {
            type: String
        },
        expireKey: {
            type: Boolean
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var plotGraphFunction = matsCollections.PlotGraphFunctions.findOne({plotType: params.plotType});
            var dataFunction = plotGraphFunction.dataFunction;
            var ret;
            try {
                var hash = require('object-hash');
                var key = hash(params.plotParams);
                if (process.env.NODE_ENV === "development" || params.expireKey) {
                    matsCache.expireKey(key);
                }
                var results = matsCache.getResult(key);
                if (results === undefined) {
                    // results aren't in the cache - need to process data routine
                    const Future = require('fibers/future');
                    var future = new Future();
                    global[dataFunction](params.plotParams, function (results) {
                        ret = _saveResultData(results);
                        future["return"](ret);
                    });
                    return future.wait();
                } else { // results were already in the matsCache (same params and not yet expired)
                    // are results in the downsampled collection?
                    var dsResults = DownSampleResults.findOne({key: key}, {}, {disableOplog: true});
                    if (dsResults !== undefined) {
                        // results are in the mongo cache downsampled collection - returned the downsampled graph data
                        ret = dsResults;
                        // update the expire time in the downsampled collection - this requires a new Date
                        DownSampleResults.rawCollection().update({key: key}, {$set: {"createdAt": new Date()}});
                    } else {
                        ret = results;  // {key:someKey, result:resultObject}
                        // refresh expire time. The only way to perform a refresh on matsCache is to re-save the result.
                        matsCache.storeResult(results.key, results);
                    }
                    var sizeof = require('object-sizeof');
                    console.log("result.data size is ", sizeof(results));
                    return ret;
                }
            } catch (dataFunctionError) {
                if (dataFunctionError.toLocaleString().indexOf("INFO:") !== -1) {
                    throw new Meteor.Error(dataFunctionError.message);
                } else {
                    throw new Meteor.Error("Error in getGraphData function:" + dataFunction + " : " + dataFunctionError.message);
                }
            }
            return undefined; // probably won't get here
        }
    }
});

// retrieves the saved query results (or downsampled results) for a specific key
const getGraphDataByKey = new ValidatedMethod({
    name: 'matsMethods.getGraphDataByKey',
    validate: new SimpleSchema({
        resultKey: {
            type: String
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var ret;
            var key = params.resultKey;
            try {
                var dsResults = DownSampleResults.findOne({key: key}, {}, {disableOplog: true});
                if (dsResults !== undefined) {
                    ret = dsResults;
                } else {
                    ret = matsCache.getResult(key); // {key:someKey, result:resultObject}
                }
                var sizeof = require('object-sizeof');
                console.log("getGraphDataByKey results size is ", sizeof(dsResults));
                return ret;
            } catch (error) {
                throw new Meteor.Error("Error in getGraphDataByKey function:" + key + " : " + error.message);
            }
            return undefined;
        }
    }
});

// administration tool
const getGraphFunctionFileList = new ValidatedMethod({
    name: 'matsMethods.getGraphFunctionFileList',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
        }
    }
});

const getLayout = new ValidatedMethod({
    name: 'matsMethods.getLayout',
    validate: new SimpleSchema({
        resultKey: {
            type: String
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var ret;
            var key = params.resultKey;
            try {
                ret = LayoutStoreCollection.rawCollection().findOne({key: key});
                return ret;
            } catch (error) {
                throw new Meteor.Error("Error in getLayout function:" + key + " : " + error.message);
            }
            return undefined;
        }
    }
});

// retrieves the saved artifacts (file urls) that were generated by nvBatch for a specific key
const getMvArtifactsByKey = new ValidatedMethod({
    name: 'matsMethods.getMvArtifactsByKey',
    validate: new SimpleSchema({
        key: {
            type: String
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var ret;
            var key = params.key;
            try {
                ret = matsCache.getResult(key); // {key:someKey, result:resultObject}
                return ret;
            } catch (error) {
                throw new Meteor.Error("Error in getMvArtifactsByKey function:" + key + " : " + error.message);
            }
            return undefined;
        }
    }
});

/*
getPlotResult is used by the graph/text_*_output templates which are used to display textual results.
Because the data isn't being rendered graphically this data is always full size, i.e. NOT downsampled.
That is why it only finds it in the Result file cache, never the DownSampleResult collection.

Because the dataset can be so large ... e.g. megabytes the data retrieval is pagenated. The index is
applied to the underlying datasets.The data gets stripped down and flattened to only contain the data neccesary for text presentation.
A new page index of -1000 means get all the data i.e. no pagenation.
 */
const getPlotResult = new ValidatedMethod({
    name: 'matsMethods.getPlotResult',
    validate: new SimpleSchema({
        resultKey: {type: String},
        pageIndex: {type: Number},
        newPageIndex: {type: Number}
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var rKey = params.resultKey;
            var pi = params.pageIndex;
            var npi = params.newPageIndex;
            var ret = {};
            try {
                ret = _getFlattenedResultData(rKey, pi, npi);
            } catch (e) {
                console.log(e);
            }
            return ret;
        }
    }
});


const getReleaseNotes = new ValidatedMethod({
    name: 'matsMethods.getReleaseNotes',
    validate: new SimpleSchema({}).validator(),
    run() {
        //     return Assets.getText('public/MATSReleaseNotes.html');
        // }
        if (Meteor.isServer) {
            var future = require('fibers/future');
            var fse = require('fs-extra');
            var dFuture = new future();
            var fData;
            console.log(process.env.PWD);
            var file;
            if (process.env.NODE_ENV === "development") {
                file = process.env.PWD + "/../../meteor_packages/mats-common/public/MATSReleaseNotes.html";
            } else {
                file = process.env.PWD + "/programs/server/assets/packages/randyp_mats-common/public/MATSReleaseNotes.html";
            }
            try {
                fse.readFile(file, 'utf8', function (err, data) {
                    if (err) {
                        fData = err.message;
                        dFuture["return"]();
                    } else {
                        fData = data;
                        dFuture["return"]();
                    }
                });
            } catch (e) {
                fData = e.message;
                dFuture["return"]();
            }
            dFuture.wait();
            return fData;
        }
    }
});


// administration tool
const getUserAddress = new ValidatedMethod({
    name: 'matsMethods.getUserAddress',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
            return Meteor.user().services.google.email.toLowerCase();
        }
    }
});

// app utility
const insertColor = new ValidatedMethod({
    name: 'matsMethods.insertColor',
    validate: new SimpleSchema({
        newColor: {type: String},
        insertAfterIndex: {type: Number}
    }).validator(),
    run(params) {
        if (params.newColor == "rgb(255,255,255)") {
            return false;
        }
        var colorScheme = matsCollections.ColorScheme.findOne({});
        colorScheme.colors.splice(params.insertAfterIndex, 0, newColor);
        matsCollections.update({}, colorScheme);
        return false;
    }
});


// checks to see if the mv artifacts are cached (based on plotspec hash) if not execs an mvbatch and caches the results
const mvBatch = new ValidatedMethod({
    name: 'matsMethods.mvBatch',
    validate: new SimpleSchema({
        plotParams: {
            type: Object,
            blackbox: true
        },
        plotType: {
            type: String
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var mvbatch = MV_DIRS.HOME + "/bin/mv_batch.sh";
            var plotGraphFunction = matsCollections.PlotGraphFunctions.findOne({plotType: params.plotType});
            var plotSpecFunction = plotGraphFunction.plotSpecFunction;
            var ret;
            const appName = matsCollections.appName.findOne({}).app;
            const fse = require('fs-extra');
            // generate the key from the params
            const hash = require('object-hash');
            const key = hash(params.plotParams);
            // generate the server router (Picker) urls according to the hash key.
            var artifacts = {};
            if (process.env.NODE_ENV === "development") {
                artifacts = {
                    png: appName + "/mvplot/" + key,
                    xml: appName + "/mvxml/" + key,
                    sql: appName + "/mvsql/" + key,
                    log: appName + "/mvlog/" + key,
                    err: appName + "/mverr/" + key,
                    R: appName + "/mvscript/" + key,
                    data: appName + "/mvdata/" + key,
                    points1: appName + "/mvpoints1/" + key,
                    points2: appName + "/mvpoints2/" + key,
                };
            } else {
                // in production the appName is already at the end of the location.href
                // - which is used to form a url for retrieving the artifact
                artifacts = {
                    png: "/mvplot/" + key,
                    xml: "/mvxml/" + key,
                    sql: "/mvsql/" + key,
                    log: "/mvlog/" + key,
                    err: "/mverr/" + key,
                    R: "/mvscript/" + key,
                    data: "/mvdata/" + key,
                    points1: "/mvpoints1/" + key,
                    points2: "/mvpoints2/" + key,
                };
            }
            // generate the real file paths (these are not exposed to clients)
            const plotSpecFilePath = MV_DIRS.XMLDIR + key + ".xml";
            const pngFilePath = MV_DIRS.PLOTSDIR + key + ".png";
            const sqlFilePath = MV_DIRS.SQLDIR + key + ".sql";
            const logFilePath = MV_DIRS.LOGDIR + key + ".log";
            const errFilePath = MV_DIRS.ERRDIR + key + ".err";
            const scriptFilePath = MV_DIRS.SCRIPTSDIR + key + ".R";
            const dataFilePath = MV_DIRS.DATADIR + key + ".data";
            const points1Path = MV_DIRS.DATADIR + key + ".points1";
            const points2Path = MV_DIRS.DATADIR + key + ".points2";
            // NOTE: the plotParams should include an mvPlot:true parameter.
            // This should have been set in the caller. This makes the mv plotSpec cache entry unique from a MATS plot
            if (params.plotParams.mvPlot !== true) {
                throw new Meteor.Error("Error in mvBatch: Not an mv plot request: no plotParams.mvPlot:true");
            }
            if (process.env.NODE_ENV === "development" || params.expireKey) {
                matsCache.expireKey(key);
                // in development just blow away the files too
                try {
                    fse.unlinkSync(plotSpecFilePath);
                } catch (ignore){}
                try {
                    fse.unlinkSync(pngFilePath);
                } catch (ignore){}
                try {
                    fse.unlinkSync(sqlFilePath);
                } catch (ignore){}
                try {
                    fse.unlinkSync(logFilePath);
                } catch (ignore){}
                try {
                    fse.unlinkSync(errFilePath);
                } catch (ignore){}
                try {
                    fse.unlinkSync(scriptFilePath);
                } catch (ignore){}
                try {
                    fse.unlinkSync(dataFilePath);
                } catch (ignore){}
                try {
                    fse.unlinkSync(points1Path);
                } catch (ignore){}
                try {
                    fse.unlinkSync(points2Path);
                } catch (ignore){}
            }
            // try to get the key from the cache
            var artifactPaths = matsCache.getResult(key);
            var filesExist = false;
            if (artifactPaths != null) {
                // artifact paths were already cached
                // do the files exist?
                // check for file existence
                var xmlSpecExists = fse.existsSync(plotSpecFilePath);
                var plotExists = fse.existsSync(pngFilePath);
                var scriptExists = fse.existsSync(scriptFilePath);
                var dataExists = fse.existsSync(dataFilePath);
                var sqlExists = fse.existsSync(sqlFilePath);
                var logExists = fse.existsSync(logFilePath);
                filesExist = xmlSpecExists && plotExists && scriptExists && dataExists && sqlExists && logExists;
            }
            // either the artifacts were cached but the files don't exist or the artifacts were not cached
            if (artifactPaths == null || filesExist === false) {
                // artifactPaths are not in the cache - or the files are not there - need to process plotSpecFunction routine
                // translate the plotparams to a plotSpec and use the key in the plotSpec reference
                global[plotSpecFunction](params.plotParams, key, function (err, plotSpec) {
                    // callback
                    if (err) {
                        console.log(err, "plotspecFunction:", plotSpecFunction);
                        throw new Meteor.Error(err + "plotspecFunction: " + plotSpecFunction);
                    } else {

                        // no error and we have a plot spec
                        // see if the artifacts exist as files. They might have been run before and are still hanging around.
                        // NOTE: the MV_OUTPUT aren't cached at all (i.e. no expiration) -
                        // therefore the expiration of the MATS cache plotSpec and the actual artifacts is sloppy.

                        // check for file existence
                        var xmlSpecExists = fse.existsSync(plotSpecFilePath);
                        var plotExists = fse.existsSync(pngFilePath);
                        var scriptExists = fse.existsSync(scriptFilePath);
                        var dataExists = fse.existsSync(dataFilePath);
                        var sqlExists = fse.existsSync(sqlFilePath);
                        var logExists = fse.existsSync(logFilePath);
                        var filesExist = xmlSpecExists && plotExists && scriptExists && dataExists && sqlExists && logExists;
                        if (!filesExist) {
                            const mvBatchCmd = MV_DIRS.HOME + "/bin/mv_batch.sh " + ' ' + plotSpecFilePath;
                            const cp = require('child_process');
                            // save the plotSpec
                            fse.outputFileSync(plotSpecFilePath, plotSpec);
                            // exec mv batch with this plotSpec - this should be synchronous
                            cp.execSync(mvBatchCmd, (error, stdout, stderr) => {
                                if (stderr) {
                                    fse.outputFileSync(errFilePath, stderr, function (err) {
                                        if (err) {
                                            console.log("Error:couldn't write error file" + err); //null
                                        }
                                    });
                                } else {
                                    fse.outputFileSync(errFilePath, "no stderr for key: " + key, function (err) {
                                        if (err) {
                                            console.log("Error:couldn't write error file" + err); //null
                                        }
                                    });
                                }
                                if (stdout) {
                                    if (stdout.match(/ERROR/)) {
                                        fse.outputFileSync(errFilePath, stdout, function (err) {
                                            if (err) {
                                                console.log("Error:couldn't write log/err file" + err);
                                            }
                                        });
                                    }
                                    fse.outputFileSync(logFilePath, stdout, function (err) {
                                        if (err) {
                                            console.log("Error:couldn't write log file" + err);
                                        }
                                    });
                                    var sqlout = stdout.match(/[\s\S]*#*(SELECT[\s\S]*)Database/) == null ? null : stdout.match(/[\s\S]*#*(SELECT[\s\S]*)Database/)[1];
                                    if (sqlout == null) {
                                        fse.outputFileSync(sqlFilePath, "no sql statement found in output for key: " + key, function (err) {
                                            if (err) {
                                                console.log("Error:couldn't write sql file" + err);
                                            }
                                        });
                                    } else {
                                        fse.outputFileSync(sqlFilePath, sqlout, function (err) {
                                            if (err) {
                                                console.log("Error:couldn't write sql file" + err);
                                            }
                                        });
                                    }
                                } else {
                                    fse.outputFileSync(logFilePath, "No stdout captured for: " + key, function (err) {
                                        if (err) {
                                            console.log("Error:couldn't write log file" + err);
                                        }
                                    });
                                }

                                // no error - check for the files and cache the spec and filePaths
                                var xmlSpecExists = fse.existsSync(plotSpecFilePath);
                                var plotExists = fse.existsSync(pngFilePath);
                                var scriptExists = fse.existsSync(scriptFilePath);
                                var dataExists = fse.existsSync(dataFilePath);
                                var sqlExists = fse.existsSync(sqlFilePath);
                                var logExists = fse.existsSync(logFilePath);
                                var filesExist = xmlSpecExists && plotExists && scriptExists && dataExists && sqlExists && logExists;
                                if (!filesExist) {
                                    console.error('exec error: expected files do not exist');
                                }
                                matsCache.storeResult(key, artifacts);
                                /*
                                    The mvbatch should have saved the plot artifacts according to the following plotSpec elements
                                        <data_file>key.data</data_file>
                                        <plot_file>key.png</plot_file>
                                        <r_file>key.R</r_file>
                                    where key is the same as the key for the matsCache
                                    The stored artifacts shoulkd be like ...
                                        MV_OUTPUT/plots/key.png
                                        MV_OUTPUT/xml/key.xml
                                        MV_OUTPUT/xml/key.sql
                                        MV_OUTPUT/xml/key.log
                                        MV_OUTPUT/scripts/key.R
                                        MV_OUTPUT/data/key.data
                                        MV_OUTPUT/data/key.sum_stat.info
                                        MV_OUTPUT/data/key.data.sum_stat

                                        MV_OUTPUT/xml/key.xml is the plotSpec
                                */
                                return {'key': key, 'artifacts':artifacts};
                            }); //ret = {key:key, result:{artifacts:artifacts}}
                            // return the key and the artifacts
                        }  // plotspec did not exist
                        else {
                            // the files actually already existed but we needed the plotspec
                            // so just refresh the cache and return the key right away
                            matsCache.storeResult(key, artifacts);
                            return {'key': key, 'artifacts':artifacts};
                        }
                    }
                });
            } // either artifactPaths == null || filesExist === false
            else {
                // artifacts existed and plotspec existed - refresh the cache
                matsCache.storeResult(key, artifacts);
                return {'key': key, 'artifacts':artifacts};
            }
            return {'key': key, 'artifacts':artifacts};
        } // if Meteor is Server
    } // run
});

// administration tool
const readFunctionFile = new ValidatedMethod({
    name: 'matsMethods.readFunctionFile',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
            var future = require('fibers/future');
            var fse = require('fs-extra');
            var path = "";
            var fData;
            if (type == "data") {
                path = "/web/static/dataFunctions/" + file;
                console.log('exporting data file: ' + path);
            } else if (type == "graph") {
                path = "/web/static/displayFunctions/" + file;
                console.log('exporting graph file: ' + path);
            } else {
                return ("error - wrong type");
            }
            fse.readFile(path, function (err, data) {
                if (err) throw err;
                fData = data.toString();
                future["return"](fData);
            });
            return future.wait();
        }
    }
});

// refreshes the metadata for the app that's running
const refreshMetaData = new ValidatedMethod({
    name: 'matsMethods.refreshMetaData',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
            try {
                //console.log("Asked to refresh metadata");
                _checkMetaDataRefresh();
            } catch (e) {
                console.log(e);
                throw new Meteor.Error("Server error: ", e.message);
            }
        }
        return metaDataTableUpdates.find({}).fetch();
    }
});

// administation tool
const removeAuthorization = new ValidatedMethod({
    name: 'matsMethods.removeAuthorization',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),
    run(settings) {
        if (Meteor.isServer) {
            var email;
            var roleName;
            var userRoleName = settings.userRoleName;
            var authorizationRole = settings.authorizationRole;
            var newUserEmail = settings.newUserEmail;
            var existingUserEmail = settings.existingUserEmail;
            if (authorizationRole) {
                // existing role - the role roleName - no need to verify as the selection list came from the database
                roleName = authorizationRole;
            } else if (userRoleName) {
                roleName = userRoleName;
            }
            if (existingUserEmail) {
                email = existingUserEmail;
            } else {
                email = newUserEmail;
            }

            // if user and role remove the role from the user
            if (email && roleName) {
                matsCollections.Authorization.update({email: email}, {$pull: {roles: roleName}});
            }
            // if user and no role remove the user
            if (email && !roleName) {
                matsCollections.Authorization.remove({email: email});
            }
            // if role and no user remove role and remove role from all users
            if (roleName && !email) {
                // remove the role
                matsCollections.Roles.remove({name: roleName});
                // remove the roleName role from all the authorizations
                matsCollections.Authorization.update({roles: roleName}, {$pull: {roles: roleName}}, {multi: true});
            }
            return false;
        }
    }
});

// app utility
const removeColor = new ValidatedMethod({
    name: 'matsMethods.removeColor',
    validate: new SimpleSchema({
        removeColor: {type: String}
    }).validator(),
    run(removeColor) {
        var colorScheme = matsCollections.ColorScheme.findOne({});
        var removeIndex = colorScheme.colors.indexOf(removeColor);
        colorScheme.colors.splice(removeIndex, 1);
        matsCollections.ColorScheme.update({}, colorScheme);
        return false;
    }
});

// database controls
const removeDatabase = new ValidatedMethod({
    name: 'matsMethods.removeDatabase',
    validate: new SimpleSchema({
        dbName: {type: String}
    }).validator(),
    run(dbName) {
        if (Meteor.isServer) {
            matsCollections.Databases.remove({name: dbName});
        }
    }
});

// makes sure all of the parameters display appropriate selections in relation to one another
const resetApp = function (appRef) {
    var fse = require('fs-extra');
    const metaDataTableRecords = appRef.appMdr;
    const type = appRef.appType;
    const appName = appRef.app;
    var dep_env = process.env.NODE_ENV;
    // set some defaults for python processing - these can be overridden
    if (Meteor.settings.private != null && Meteor.settings.private.PYTHON_PATH == null) {
        Meteor.settings.private.PYTHON_PATH = "/usr/bin/python";
    }

    if (Meteor.settings.private != null && Meteor.settings.private.process != null && Meteor.settings.private.process.RUN_ENV != null) {
        switch (Meteor.settings.private.process.RUN_ENV) {
            case "development":
            case "integration":
            case "production":
                dep_env = Meteor.settings.private.process.RUN_ENV;
                break;
            default:
                dep_env = process.env.NODE_ENV;
               break;
        }
    }
    var deployment;
    var deploymentText = Assets.getText('public/deployment/deployment.json');
    if (deploymentText == null) {  // equivilent to deploymentText === null || deploymentText === undefined
    }
    deployment = JSON.parse(deploymentText);
    var app = {};
    for (var ai = 0; ai < deployment.length; ai++) {
        var dep = deployment[ai];
        if (dep.deployment_environment == dep_env) {
            app = dep.apps.filter(function (app) {
                return app.app === appName;
            })[0];
        }
    }
    const appVersion = app ? app.version : "unknown";
    const appTitle = app ? app.title : "unknown";
    const buildDate = app ? app.buildDate : "unknown";
    const appType = type ? type : matsTypes.AppTypes.mats;
    matsCollections.appName.upsert({app:appName},{$set:{app:appName}});

    // remember that we updated the metadata tables just now - create metaDataTableUpdates
    /*
        metaDataTableUpdates:
        {
            name: dataBaseName,
            tables: [tableName1, tableName2 ..],
            lastRefreshed : timestamp
        }
     */
    // only create metadata tables if the resetApp was called with a real metaDataTables object
    if (metaDataTableRecords instanceof matsTypes.MetaDataDBRecord) {
        var metaDataTables = metaDataTableRecords.getRecords();
        for (var mdti = 0; mdti < metaDataTables.length; mdti++) {
            const metaDataRef = metaDataTables[mdti];
            metaDataRef.lastRefreshed = moment().format();
            if (metaDataTableUpdates.find({name: metaDataRef.name}).count() == 0) {
                metaDataTableUpdates.update({name: metaDataRef.name}, metaDataRef, {upsert: true});
            }
        }
    } else {
        throw new Meteor.Error("Server error: ", "resetApp: bad pool-database entry");
    }

    matsCollections.Roles.remove({});
    matsDataUtils.doRoles();
    matsCollections.Authorization.remove({});
    matsDataUtils.doAuthorization();
    matsCollections.Credentials.remove({});
    matsDataUtils.doCredentials();
    matsCollections.PlotGraphFunctions.remove({});
    matsCollections.ColorScheme.remove({});
    matsDataUtils.doColorScheme();
    matsCollections.Settings.remove({});
    matsDataUtils.doSettings(appTitle, appVersion, buildDate, appType);
    matsCollections.CurveParams.remove({});
    matsCollections.PlotParams.remove({});
    matsCollections.CurveTextPatterns.remove({});
// app specific routines
    //const asrKeys = Object.keys(appSpecificResetRoutines);
    const asrKeys = appSpecificResetRoutines;
    for (var ai = 0; ai < asrKeys.length; ai++) {
        global.appSpecificResetRoutines[ai]();
    }
    matsCache.clear();
};

// administration tool
const restoreFromFile = new ValidatedMethod({
    name: 'matsMethods.restoreFromFile',
    validate: new SimpleSchema({
        type: {type: String},
        name: {type: String},
        data: {type: Object, blackbox: true}
    }).validator(),

    run(params) {
        if (Meteor.isServer) {
            console.log("restoring " + params.type + " file " + params.name);
            var path = "";
            if (params.type == "data") {
                path = "/web/static/dataFunctions/" + params.name;
            } else if (params.ype == "graph") {
                path = "/web/static/displayFunctions/" + params.name;
            } else {
                return ("error - wrong tyoe");
            }
            console.log('importing ' + params.type + ' file: ' + path);
            var fse = require('fs-extra');
            fse.writeFile(path, params.data.toString(), function (err) {
                if (err) {
                    return (err.toLocaleString());
                }
                console.log('imported ' + params.type + ' file: ' + path);
            });
        }
    }
});

// administration tool
const restoreFromParameterFile = new ValidatedMethod({
    name: 'matsMethods.restoreFromParameterFile',
    validate: new SimpleSchema({
        name: {type: String},
        data: {type: Object, blackbox: true}
    }).validator(),
    run(params) {
        var data = params.data;
        if (Meteor.isServer) {
            var d = [];
            if (data.CurveParams) {
                matsCollections.CurveParams.remove({});
                d = _.map(data.CurveParams, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.CurveParams.insert(o);
                });
            }
            if (data.PlotParams) {
                matsCollections.PlotParams.remove({});
                d = _.map(data.PlotParams, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.PlotParams.insert(o);
                });
            }
            if (data.PlotGraphFunctions) {
                matsCollections.PlotGraphFunctions.remove({});
                d = _.map(data.PlotGraphFunctions, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.PlotGraphFunctions.insert(o);
                });
            }
            if (data.Settings) {
                matsCollections.Settings.remove({});
                d = _.map(data.Settings, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Settings.insert(o);
                });
            }
            if (data.ColorScheme) {
                matsCollections.ColorScheme.remove({});
                d = _.map(data.ColorScheme, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.ColorScheme.insert(o);
                });
            }
            if (data.Authorization) {
                matsCollections.Authorization.remove({});
                d = _.map(data.Authorization, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Authorization.insert(o);
                });
            }
            if (data.Roles) {
                matsCollections.Roles.remove({});
                d = _.map(data.Roles, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Roles.insert(o);
                });
            }
            if (data.Databases) {
                matsCollections.Databases.remove({});
                d = _.map(data.Databases, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Databases.insert(o);
                });
            }
            if (data.Credentials) {
                matsCollections.Credentials.remove({});
                d = _.map(data.Credentials, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Credentials.insert(o);
                });
            }
        }
    }
});

const saveLayout = new ValidatedMethod({
    name: 'matsMethods.saveLayout',
    validate: new SimpleSchema({
        resultKey: {
            type: String
        },
        layout: {
            type: Object, blackbox: true
        },
        curveOpsUpdate: {
            type: Object, blackbox: true
        }
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var key = params.resultKey;
            var layout = params.layout;
            var curveOpsUpdate = params.curveOpsUpdate;
            try {
                LayoutStoreCollection.upsert({key: key}, {$set: {"createdAt": new Date(), layout: layout, curveOpsUpdate: curveOpsUpdate}});
            } catch (error) {
                throw new Meteor.Error("Error in saveLayout function:" + key + " : " + error.message);
            }
        }
    }
});

//administration tools
const saveSettings = new ValidatedMethod({
    name: 'matsMethods.saveSettings',
    validate: new SimpleSchema({
        saveAs: {
            type: String
        },
        p: {
            type: Object,
            blackbox: true
        },
        permission: {
            type: String
        }
    }).validator(),
    run(params) {
        var user = "anonymous";
        matsCollections.CurveSettings.upsert({name: params.saveAs}, {
            created: moment().format("MM/DD/YYYY HH:mm:ss"),
            name: params.saveAs,
            data: params.p,
            owner: Meteor.userId() == null ? "anonymous" : Meteor.userId(),
            permission: params.permission,
            savedAt: new Date(),
            savedBy: Meteor.user() == null ? "anonymous" : user
        });
    }
});

// administation tool
const setCredentials = new ValidatedMethod({
    name: 'matsMethods.setCredentials',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),
    run(settings) {
        if (Meteor.isServer) {
            var name = settings.name;
            var clientId = settings.clientId;
            var clientSecret = settings.clientSecret;
            var clientRefreshToken = settings.clientRefreshToken;
            matsCollections.Credentials.update({}, {
                $set: {
                    name: name,
                    clientId: clientId,
                    clientSecret: clientSecret,
                    refresh_token: clientRefreshToken
                }
            });
            return false;
        }
    }
});

const setSettings = new ValidatedMethod({
    name: 'matsMethods.setSettings',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox: true}
    }).validator(),
    run(params) {
        if (Meteor.isServer) {
            var settings = params.settings;
            var labelPrefix = settings.labelPrefix;
            var title = settings.title;
            var lineWidth = settings.lineWidth;
            var nullFillString = settings.nullFillString;
            var resetFromCode = settings.resetFromCode;
            matsCollections.Settings.update({}, {
                $set: {
                    LabelPrefix: labelPrefix,
                    Title: title,
                    LineWidth: lineWidth,
                    NullFillString: nullFillString,
                    resetFromCode: resetFromCode
                }
            });
        }
        return false;
    }
});


/* test methods */

const testGetMetaDataTableUpdates = new ValidatedMethod({
    name: 'matsMethods.testGetMetaDataTableUpdates',
    validate: new SimpleSchema({}).validator(),
    run() {
        return metaDataTableUpdates.find({}).fetch();
    }
});

const testGetTables = new ValidatedMethod({
    name: 'matsMethods.testGetTables',
    validate: new SimpleSchema(
        {
            host: {type: String},
            user: {type: String},
            password: {type: String},
            database: {type: String}
        }).validator(),
    run(params) {
        if (Meteor.isServer) {
            const Future = require('fibers/future');
            const queryWrap = Future.wrap(function (callback) {
                const connection = mysql.createConnection({
                    host: params.host,
                    user: params.user,
                    password: params.password,
                    database: params.database
                });
                connection.query("show tables;", function (err, result) {
                    const tables = result.map(function (a) {
                        return a.Tables_in_ruc_ua_sums2;
                    });
                    return callback(err, tables);
                });
                connection.end(function (err) {
                    if (err) {
                        console.log("testGetTables cannot end connection");
                    }
                });
            });
            return queryWrap().wait();
        }
    }
});

const testSetMetaDataTableUpdatesLastRefreshedBack = new ValidatedMethod({
    name: 'matsMethods.testSetMetaDataTableUpdatesLastRefreshedBack',
    validate: new SimpleSchema({}).validator(),
    run() {
        var mtu = metaDataTableUpdates.find({}).fetch();
        var id = mtu[0]._id;
        metaDataTableUpdates.update({_id: id}, {$set: {lastRefreshed: 0}});
        return metaDataTableUpdates.find({}).fetch();
    }
});

export default matsMethods = {
    addSentAddress: addSentAddress,
    applyAuthorization: applyAuthorization,
    applyDatabaseSettings: applyDatabaseSettings,
    deleteSettings: deleteSettings,
    emailImage: emailImage,
    getAuthorizations: getAuthorizations,
    getDataFunctionFileList: getDataFunctionFileList,
    getGraphData: getGraphData,
    getGraphDataByKey: getGraphDataByKey,
    getGraphFunctionFileList: getGraphFunctionFileList,
    getLayout: getLayout,
    getMvArtifactsByKey:getMvArtifactsByKey,
    getPlotResult: getPlotResult,
    getReleaseNotes: getReleaseNotes,
    getUserAddress: getUserAddress,
    insertColor: insertColor,
    mvBatch: mvBatch,
    readFunctionFile: readFunctionFile,
    refreshMetaData: refreshMetaData,
    removeAuthorization: removeAuthorization,
    removeColor: removeColor,
    removeDatabase: removeDatabase,
    resetApp: resetApp,
    restoreFromFile: restoreFromFile,
    restoreFromParameterFile: restoreFromParameterFile,
    saveLayout: saveLayout,
    saveSettings: saveSettings,
    setCredentials: setCredentials,
    setSettings: setSettings,
    testGetMetaDataTableUpdates: testGetMetaDataTableUpdates,
    testGetTables: testGetTables,
    testSetMetaDataTableUpdatesLastRefreshedBack: testSetMetaDataTableUpdatesLastRefreshedBack,
    MV_DIRS: MV_DIRS
};
