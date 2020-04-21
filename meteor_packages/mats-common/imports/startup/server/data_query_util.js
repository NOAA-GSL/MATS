/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsDataUtils, matsTypes} from 'meteor/randyp:mats-common';
import {Meteor} from "meteor/meteor";

// utility to get the cadence for a particular model, so that the query function
// knows where to include null points for missing data.
const getModelCadence = function (pool, dataSource, startDate, endDate) {
    var rows = [];
    var cycles;
    try {
        // this query should only return data if the model cadence is irregular.
        // otherwise, the cadence will be calculated later by the query function.
        rows = simplePoolQueryWrapSynchronous(pool, "select cycle_seconds " +
            "from mats_common.primary_model_orders " +
            "where model = " +
            "(select new_model as display_text from mats_common.standardized_model_list where old_model = '" + dataSource + "');");
        var cycles_raw = JSON.parse(rows[0].cycle_seconds);
        var cycles_keys = Object.keys(cycles_raw).sort();
        // there can be difference cadences for different time periods (each time period is a key in cycles_keys,
        // with the cadences for that period represented as values in cycles_raw), so this section identifies all
        // time periods relevant to the requested date range, and returns the union of their cadences.
        if (cycles_keys.length !== 0) {
            var newTime;
            var chosenStartTime;
            var chosenEndTime;
            var chosenStartIdx;
            var chosenEndIdx;
            var foundStart = false;
            var foundEnd = false;
            for (var ti = cycles_keys.length - 1; ti >= 0; ti--) {
                newTime = cycles_keys[ti];
                if (startDate >= Number(newTime) && !foundStart) {
                    chosenStartTime = newTime;
                    chosenStartIdx = ti;
                    foundStart = true;
                }
                if (endDate >= Number(newTime) && !foundEnd) {
                    chosenEndTime = newTime;
                    chosenEndIdx = ti;
                    foundEnd = true;
                }
                if (foundStart && foundEnd) {
                    break;
                }
            }
            if (chosenStartTime !== undefined && chosenEndTime !== undefined) {
                if (Number(chosenStartTime) === Number(chosenEndTime)) {
                    cycles = cycles_raw[chosenStartTime];
                } else if (chosenEndIdx - chosenStartIdx === 1) {
                    const startCycles = cycles_raw[chosenStartTime];
                    const endCycles = cycles_raw[chosenEndTime];
                    cycles = _.union(startCycles, endCycles);
                } else {
                    var middleCycles = [];
                    var currCycles;
                    for (ti = chosenStartIdx + 1; ti < chosenEndIdx; ti++) {
                        currCycles = cycles_raw[cycles_keys[ti]];
                        middleCycles = _.union(middleCycles, currCycles);
                    }
                    const startCycles = cycles_raw[chosenStartTime];
                    const endCycles = cycles_raw[chosenEndTime];
                    cycles = _.union(startCycles, endCycles, middleCycles);
                }
                cycles.sort(function (a, b) {
                    return a - b
                });
            }
        }
    } catch (e) {
        // ignore - just a safety check, don't want to exit if there isn't a cycles_per_model entry
        // if there isn't a cycles_per_model entry, it just means that the model has a regular cadence
    }
    if (cycles !== null && cycles !== undefined && cycles.length > 0) {
        for (var c = 0; c < cycles.length; c++) {
            cycles[c] = cycles[c] * 1000;         // convert to milliseconds
        }
    } else {
        cycles = []; // regular cadence model--cycles will be calculated later by the query function
    }
    return cycles;
};

// this function calculates the interval between the current time and the next time for irregular cadence models.
const getTimeInterval = function (avTime, time_interval, foreCastOffset, cycles) {
    // have to calculate the time_interval
    var ti;
    var dayInMilliSeconds = 24 * 3600 * 1000;
    var minCycleTime = Math.min(...cycles);

    var thisCadence = (avTime % dayInMilliSeconds); // current hour of day (valid time)
    if (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000) < 0) { // check to see if cycle time was on a previous day -- if so, need to wrap around 00Z to get current hour of day (cycle time)
        var numberOfDaysBack = Math.ceil(-1 * (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000)) / dayInMilliSeconds);
        thisCadence = (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000) + numberOfDaysBack * dayInMilliSeconds); // current hour of day (cycle time)
    } else {
        thisCadence = (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000)); // current hour of day (cycle time)
    }

    var thisCadenceIdx = cycles.indexOf(thisCadence); // find out where the current hour of day is in the cycles array
    if (thisCadenceIdx !== -1) {
        var nextCadenceIdx = thisCadenceIdx + 1; // choose the next hour of the day
        if (nextCadenceIdx >= cycles.length) {
            ti = (dayInMilliSeconds - thisCadence) + minCycleTime; // if we were at the last cycle cadence, wrap back around to the first cycle cadence
        } else {
            ti = cycles[nextCadenceIdx] - cycles[thisCadenceIdx]; // otherwise take the difference between the current and next hours of the day.
        }
    } else {
        ti = time_interval; // if for some reason the current hour of the day isn't in the cycles array, default to the regular cadence interval
    }

    return ti;
};

// calculates the statistic for ctc station plots
const calculateStatCTC = function (yy, yn, ny, nn, statistic) {
    var queryVal;
    switch (statistic) {
        case 'TSS (True Skill Score)':
            queryVal = ((yy * nn - yn * ny) / ((yy + ny) * (yn + nn))) * 100;
            break;
        case 'PODy (POD of ceiling < threshold)':
            queryVal = yy / (yy + ny) * 100;
            break;
        case 'PODn (POD of ceiling > threshold)':
            queryVal = nn / (nn + yn) * 100;
            break;
        case 'FAR (False Alarm Ratio)':
            queryVal = yn / (yn + yy) * 100;
            break;
        case 'Bias (forecast/actual)':
            queryVal = (yy + yn) / (yy + ny);
            break;
        case 'CSI (Critical Success Index)':
            queryVal = yy / (yy + ny + yn) * 100;
            break;
        case 'HSS (Heidke Skill Score)':
            queryVal = 2 * (nn * yy - ny * yn) / ((nn + yn) * (yn + yy) + (nn + ny) * (ny + yy)) * 100;
            break;
        case 'ETS (Equitable Threat Score)':
            queryVal = (yy - ((yy + yn) * (yy + ny) / (yy + yn + ny + nn))) / ((yy + yn + ny) - ((yy + yn) * (yy + ny) / (yy + yn + ny + nn))) * 100;
            break;
        case 'Nlow (obs < threshold, avg per hr in predefined regions)':
            queryVal = yy + ny;
            break;
        case 'Nhigh (obs > threshold, avg per hr in predefined regions)':
            queryVal = nn + yn;
            break;
        case 'Ntot (total obs, avg per hr in predefined regions)':
            queryVal = yy + yn + ny + nn;
            break;
        case 'Ratio (Nlow / Ntot)':
            queryVal = (yy + ny) / (yy + yn + ny + nn);
            break;
        case 'Ratio (Nhigh / Ntot)':
            queryVal = (nn + yn) / (yy + yn + ny + nn);
            break;
        case 'N per graph point':
            queryVal = yy + yn + ny + nn;
            break;
    }
    return queryVal;
};

// utility for querying the DB
const simplePoolQueryWrapSynchronous = function (pool, statement) {
    /*
     simple synchronous query of statement to the specified pool.
     params :
     pool - a predefined db pool (usually defined in main.js). i.e. wfip2Pool = mysql.createPool(wfip2Settings);
     statement - String - a valid sql statement
     actions - queries database and will wait until query returns.
     return: rowset - an array of rows
     throws: error
     */
    if (Meteor.isServer) {
        const Future = require('fibers/future');
        const queryWrap = Future.wrap(function (pool, statement, callback) {
            pool.query(statement, function (err, rows) {
                return callback(err, rows);
            });
        });
        return queryWrap(pool, statement).wait();
    }
};

// utility for querying the DB via Python
const queryDBPython = function (pool, statement, statLineType, statistic, appParams, vts) {
    if (Meteor.isServer) {
        // send the query statement to the python query function
        const pyOptions = {
            mode: 'text',
            pythonPath: Meteor.settings.private.PYTHON_PATH,
            pythonOptions: ['-u'], // get print results in real-time
            scriptPath: process.env.NODE_ENV === "development" ?
                process.env.PWD + "/../../meteor_packages/mats-common/public/python/" :
                process.env.PWD + "/programs/server/assets/packages/randyp_mats-common/public/python/",
            args: [
                "-h", pool.config.connectionConfig.host,
                "-P", pool.config.connectionConfig.port,
                "-u", pool.config.connectionConfig.user,
                "-p", pool.config.connectionConfig.password,
                "-d", pool.config.connectionConfig.database,
                "-q", statement,
                "-L", statLineType,
                "-s", statistic,
                "-t", appParams.plotType,
                "-l", appParams.hasLevels,
                "-g", appParams.hideGaps,
                "-c", appParams.completeness / 100,
                "-v", vts
            ]
        };
        const pyShell = require('python-shell');
        const Future = require('fibers/future');

        var future = new Future();
        var d = {// d will contain the curve data
            x: [],
            y: [],
            z: [],
            n: [],
            error_x: [],
            error_y: [],
            subVals: [],
            subSecs: [],
            subLevs: [],
            stats: [],
            text: [],
            xTextOutput: [],
            yTextOutput: [],
            zTextOutput: [],
            nTextOutput: [],
            minDateTextOutput: [],
            maxDateTextOutput: [],
            glob_stats: {
                mean: 0,
                minDate: 0,
                maxDate: 0,
                n: 0
            },
            xmin: Number.MAX_VALUE,
            xmax: -1 * Number.MAX_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: -1 * Number.MAX_VALUE,
            zmin: Number.MAX_VALUE,
            zmax: -1 * Number.MAX_VALUE,
            sum: 0
        };
        var error = "";
        var N0 = [];
        var N_times = [];

        pyShell.PythonShell.run('python_query_util.py', pyOptions, function (err, results) {
            // query callback - build the curve data from the results - or set an error
            if (err !== undefined && err !== null) {
                error = err.message === undefined ? err : err.message;
            } else if (results === undefined || results === "undefined") {
                error = "Error thrown by python_query_util.py. Please write down exactly how you produced this error, and submit a ticket at mats.gsd@noaa.gov."
            } else {
                // get the data back from the query
                const parsedData = JSON.parse(results);
                d = parsedData.data;
                N0 = parsedData.N0;
                N_times = parsedData.N_times;
                error = parsedData.error;
            }
            // done waiting - have results
            future['return']();
        });

        // wait for future to finish
        future.wait();
        return {
            data: d,
            error: error,
            N0: N0,
            N_times: N_times,
        };
    }
};

// this method queries the database for timeseries plots
const queryDBTimeSeries = function (pool, statement, dataSource, forecastOffset, startDate, endDate, averageStr, statisticStr, validTimes, appParams, forceRegularCadence) {
    // upper air is only verified at 00Z and 12Z, so you need to force irregular models to verify at that regular cadence
    const Future = require('fibers/future');

    if (Meteor.isServer) {
        var cycles = getModelCadence(pool, dataSource, startDate, endDate); // if irregular model cadence, get cycle times. If regular, get empty array.
        if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
            var vtCycles = validTimes.map(function (x) {
                return (Number(x) - forecastOffset) * 3600 * 1000;
            }); // selecting validTimes makes the cadence irregular
            vtCycles = vtCycles.map(function (x) {
                return x < 0 ? (x + 24 * 3600 * 1000) : x;
            }); // make sure no cycles are negative
            vtCycles = vtCycles.sort(function (a, b) {
                return Number(a) - Number(b);
            }); // sort 'em
            cycles = cycles.length > 0 ? _.intersection(cycles, vtCycles) : vtCycles; // if we already had cycles get the ones that correspond to valid times
        }
        const regular = (forceRegularCadence || averageStr !== "None" || !(cycles !== null && cycles.length > 0)); // If curves have averaging, the cadence is always regular, i.e. it's the cadence of the average

        var dFuture = new Future();
        var d = {// d will contain the curve data
            x: [],
            y: [],
            error_x: [],
            error_y: [],
            subVals: [],
            subSecs: [],
            subLevs: [],
            stats: [],
            text: [],
            xmin: Number.MAX_VALUE,
            xmax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
            sum: 0
        };
        var error = "";
        var N0 = [];
        var N_times = [];

        pool.query(statement, function (err, rows) {
            // query callback - build the curve data from the results - or set an error
            if (err !== undefined && err !== null) {
                error = err.message;
            } else if (rows === undefined || rows === null || rows.length === 0) {
                error = matsTypes.Messages.NO_DATA_FOUND;
            } else {
                var parsedData;
                if (appParams.hideGaps) {
                    // if we don't care about gaps, use the general purpose curve parsing function.
                    // the only reason to use the timeseries one is to correctly insert gaps for missing forecast cycles
                    parsedData = parseQueryDataSpecialtyCurve(rows, d, appParams);
                } else {
                    parsedData = parseQueryDataTimeSeries(pool, rows, d, appParams, averageStr, statisticStr, forecastOffset, cycles, regular);
                }
                d = parsedData.d;
                N0 = parsedData.N0;
                N_times = parsedData.N_times;
            }
            // done waiting - have results
            dFuture['return']();
        });

        // wait for future to finish
        dFuture.wait();
        return {
            data: d,
            error: error,
            N0: N0,
            N_times: N_times
        };
    }
};

// this method queries the database for specialty curves such as profiles, dieoffs, threshold plots, valid time plots, grid scale plots, and histograms
const queryDBSpecialtyCurve = function (pool, statement, appParams) {
    if (Meteor.isServer) {
        const Future = require('fibers/future');

        var dFuture = new Future();
        var d = {// d will contain the curve data
            x: [],
            y: [],
            error_x: [],
            error_y: [],
            subVals: [],
            subSecs: [],
            subLevs: [],
            stats: [],
            text: [],
            xmin: Number.MAX_VALUE,
            xmax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
            sum: 0
        };

        var error = "";
        var N0 = [];
        var N_times = [];

        pool.query(statement, function (err, rows) {
            // query callback - build the curve data from the results - or set an error
            if (err !== undefined && err !== null) {
                error = err.message;
            } else if (rows === undefined || rows === null || rows.length === 0) {
                error = matsTypes.Messages.NO_DATA_FOUND;
            } else {
                var parsedData;
                if (appParams.plotType !== matsTypes.PlotTypes.histogram) {
                    parsedData = parseQueryDataSpecialtyCurve(rows, d, appParams);
                } else {
                    parsedData = parseQueryDataHistogram(rows, d, appParams);
                }
                d = parsedData.d;
                N0 = parsedData.N0;
                N_times = parsedData.N_times;
            }
            // done waiting - have results
            dFuture['return']();
        });

        // wait for future to finish
        dFuture.wait();
        return {
            data: d,
            error: error,
            N0: N0,
            N_times: N_times,
        };
    }
};

// this method queries the database for map plots
const queryDBMap = function (pool, statement, dataSource, variable, varUnits, siteMap, orderOfMagnitude) {
    if (Meteor.isServer) {
        // d will contain the curve data
        var d = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            color: [],
            stats: [],
            text: []
        };
        // for biases <= -OOM
        var dBlue = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(0,0,255)"
        };
        // for biases > -OOM and < OOM
        var dBlack = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(0,0,0)"
        };
        // for biases >= OOM
        var dRed = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(255,0,0)"
        };

        var error = "";
        const Future = require('fibers/future');
        var pFuture = new Future();
        pool.query(statement, function (err, rows) {
            // query callback - build the curve data from the results - or set an error
            if (err !== undefined && err !== null) {
                error = err.message;
            } else if (rows === undefined || rows === null || rows.length === 0) {
                error = matsTypes.Messages.NO_DATA_FOUND;
            } else {
                var parsedData;
                parsedData = parseQueryDataMap(rows, d, dBlue, dRed, dBlack, dataSource, siteMap, variable, varUnits, orderOfMagnitude);
                d = parsedData.d;
                dBlue = parsedData.dBlue;
                dBlack = parsedData.dBlack;
                dRed = parsedData.dRed;
            }
            // done waiting - have results
            pFuture['return']();
        });

        // wait for future to finish
        pFuture.wait();
        return {
            data: d,
            dataBlue: dBlue,
            dataBlack: dBlack,
            dataRed: dRed,
            error: error
        };
    }
};

// this method queries the database for map plots in CTC apps
const queryDBMapCTC = function (pool, statement, dataSource, statistic, siteMap) {
    if (Meteor.isServer) {
        // d will contain the curve data
        var d = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            color: [],
            stats: [],
            text: []
        };
        // for skill scores <= 10%
        var dPurple = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(128,0,255)"
        };
        // for skill scores <= 20%
        var dPurpleBlue = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(64,0,255)"
        };
        // for skill scores <= 30%
        var dBlue = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(0,0,255)"
        };
        // for skill scores <= 40%
        var dBlueGreen = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(64,128,128)"
        };
        // for skill scores <= 50%
        var dGreen = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(128,255,0)"
        };
        // for skill scores <= 60%
        var dGreenYellow = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(160,224,0)"
        };
        // for skill scores <= 70%
        var dYellow = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(192,192,0)"
        };
        // for skill scores <= 80%
        var dOrange = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(255,128,0)"
        };
        // for skill scores <= 90%
        var dOrangeRed = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(255,64,0)"
        };
        // for skill scores <= 100%
        var dRed = {
            siteName: [],
            queryVal: [],
            lat: [],
            lon: [],
            stats: [],
            text: [],
            color: "rgb(255,0,0)"
        };

        var error = "";
        const Future = require('fibers/future');
        var pFuture = new Future();
        pool.query(statement, function (err, rows) {
            // query callback - build the curve data from the results - or set an error
            if (err !== undefined && err !== null) {
                error = err.message;
            } else if (rows === undefined || rows === null || rows.length === 0) {
                error = matsTypes.Messages.NO_DATA_FOUND;
            } else {
                var parsedData;
                parsedData = parseQueryDataMapCTC(rows, d, dPurple, dPurpleBlue, dBlue, dBlueGreen, dGreen, dGreenYellow, dYellow, dOrange, dOrangeRed, dRed, dataSource, siteMap, statistic);
                d = parsedData.d;
                dPurple = parsedData.dPurple;
                dPurpleBlue = parsedData.dPurpleBlue;
                dBlue = parsedData.dBlue;
                dBlueGreen = parsedData.dBlueGreen;
                dGreen = parsedData.dGreen;
                dGreenYellow = parsedData.dGreenYellow;
                dYellow = parsedData.dYellow;
                dOrange = parsedData.dOrange;
                dOrangeRed = parsedData.dOrangeRed;
                dRed = parsedData.dRed;
            }
            // done waiting - have results
            pFuture['return']();
        });

        // wait for future to finish
        pFuture.wait();
        return {
            data: d,
            dataPurple: dPurple,
            dataPurpleBlue: dPurpleBlue,
            dataBlue: dBlue,
            dataBlueGreen: dBlueGreen,
            dataGreen: dGreen,
            dataGreenYellow: dGreenYellow,
            dataYellow: dYellow,
            dataOrange: dOrange,
            dataOrangeRed: dOrangeRed,
            dataRed: dRed,
            error: error
        };
    }
};

// this method queries the database for contour plots
const queryDBContour = function (pool, statement) {
    if (Meteor.isServer) {
        const Future = require('fibers/future');

        var dFuture = new Future();
        var d = {// d will contain the curve data
            x: [],
            y: [],
            z: [],
            n: [],
            text: [],
            xTextOutput: [],
            yTextOutput: [],
            zTextOutput: [],
            nTextOutput: [],
            minDateTextOutput: [],
            maxDateTextOutput: [],
            stdev: [],
            stats: [],
            glob_stats: {},
            xmin: Number.MAX_VALUE,
            xmax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
            zmin: Number.MAX_VALUE,
            zmax: Number.MIN_VALUE,
            sum: 0
        };

        var error = "";
        pool.query(statement, function (err, rows) {
            // query callback - build the curve data from the results - or set an error
            if (err !== undefined && err !== null) {
                error = err.message;
            } else if (rows === undefined || rows === null || rows.length === 0) {
                error = matsTypes.Messages.NO_DATA_FOUND;
            } else {
                const parsedData = parseQueryDataContour(rows, d);
                d = parsedData.d;
            }
            // done waiting - have results
            dFuture['return']();
        });

        // wait for future to finish
        dFuture.wait();
        return {
            data: d,
            error: error
        };
    }
};

// this method parses the returned query data for timeseries plots
const parseQueryDataTimeSeries = function (pool, rows, d, appParams, averageStr, statisticStr, foreCastOffset, cycles, regular) {
    /*
        var d = {// d will contain the curve data
            x: [],
            y: [],
            error_x: [],   // curveTime
            error_y: [],   // values
            subVals: [],   // subVals
            subSecs: [],   // subSecs
            subLevs: [],   // subLevs
            stats: [],     // pointStats
            text: [],
            glob_stats: {},     // curveStats
            xmin: Number.MAX_VALUE,
            xmax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
            sum: 0
        };
    */
    const hasLevels = appParams.hasLevels;
    const completenessQCParam = Number(appParams.completeness) / 100;

    // initialize local variables
    d.error_x = null;  // time series doesn't use x errorbars
    var N0 = [];
    var N_times = [];
    var xmin = Number.MAX_VALUE;
    var xmax = -1 * Number.MAX_VALUE;
    var curveTime = [];
    var curveStats = [];
    var subVals = [];
    var subSecs = [];
    var subLevs = [];

    // default the time interval to an hour. It won't matter since it won't be used for only 0 or 1 data points.
    var time_interval = rows.length > 1 ? Number(rows[1].avtime) - Number(rows[0].avtime) : 3600;

    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var avSeconds = Number(rows[rowIndex].avtime);
        var avTime = avSeconds * 1000;
        xmin = avTime < xmin ? avTime : xmin;
        xmax = avTime > xmax ? avTime : xmax;
        var stat;
        if (rows[rowIndex].stat === undefined && rows[rowIndex].yy !== undefined) {
            const yy = Number(rows[rowIndex].yy);
            const yn = Number(rows[rowIndex].yn);
            const ny = Number(rows[rowIndex].ny);
            const nn = Number(rows[rowIndex].nn);
            if (yy + yn + ny + nn > 0) {
                stat = calculateStatCTC(yy, yn, ny, nn, statisticStr);
                stat = isNaN(Number(stat)) ? null : stat;
            } else {
                stat = null;
            }
        } else {
            stat = rows[rowIndex].stat === "NULL" ? null : rows[rowIndex].stat;
        }
        N0.push(rows[rowIndex].N0);             // number of values that go into a time series point
        N_times.push(rows[rowIndex].N_times);   // number of times that go into a time series point

        // Find the minimum time_interval to be sure we don't accidentally go past the next data point.
        if (rowIndex < rows.length - 1) {
            var time_diff = Number(rows[rowIndex + 1].avtime) - Number(rows[rowIndex].avtime);
            if (time_diff < time_interval) {
                time_interval = time_diff;
            }
        }

        // store sub values that will later be used for calculating error bar statistics.
        var sub_values = [];
        var sub_secs = [];
        var sub_levs = [];
        if (stat !== null && rows[rowIndex].sub_data !== undefined) {
            try {
                var sub_data = rows[rowIndex].sub_data.toString().split(',');
                var curr_sub_data;
                for (var sd_idx = 0; sd_idx < sub_data.length; sd_idx++) {
                    curr_sub_data = sub_data[sd_idx].split(';');
                    sub_values.push(Number(curr_sub_data[0]));
                    sub_secs.push(Number(curr_sub_data[1]));
                    if (hasLevels) {
                        if (!isNaN(Number(curr_sub_data[2]))) {
                            sub_levs.push(Number(curr_sub_data[2]));
                        } else {
                            sub_levs.push(curr_sub_data[2]);
                        }
                    }
                }
            } catch (e) {
                // this is an error produced by a bug in the query function, not an error returned by the mysql database
                e.message = "Error in parseQueryDataTimeSeries. The expected fields don't seem to be present in the results cache: " + e.message;
                throw new Error(e.message);
            }
        } else {
            sub_values = NaN;
            sub_secs = NaN;
            if (hasLevels) {
                sub_levs = NaN;
            }
        }
        curveTime.push(avTime);
        curveStats.push(stat);
        subVals.push(sub_values);
        subSecs.push(sub_secs);
        if (hasLevels) {
            subLevs.push(sub_levs);
        }
    }

    var N0_max = Math.max(...N0);
    var N_times_max = Math.max(...N_times);

    xmin = xmin < Number(rows[0].avtime) * 1000 || averageStr !== "None" ? Number(rows[0].avtime) * 1000 : xmin;

    time_interval = time_interval * 1000;
    var loopTime = xmin;
    var sum = 0;
    var ymin = Number.MAX_VALUE;
    var ymax = -1 * Number.MAX_VALUE;

    while (loopTime <= xmax) {
        // the reason we need to loop through everything again is to add in nulls for any missing points along the
        // timeseries. The query only returns the data that it actually has.
        var d_idx = curveTime.indexOf(loopTime);
        if (d_idx < 0) {
            d.x.push(loopTime);
            d.y.push(null);
            d.error_y.push(null);   // placeholder
            d.subVals.push(NaN);
            d.subSecs.push(NaN);
            if (hasLevels) {
                d.subLevs.push(NaN);
            }
        } else {
            var this_N0 = N0[d_idx];
            var this_N_times = N_times[d_idx];
            // Make sure that we don't have any points with far less data than the rest of the graph, and that
            // we don't have any points with a smaller completeness value than specified by the user.
            if (curveStats[d_idx] === null || this_N_times < completenessQCParam * N_times_max) {
                d.x.push(loopTime);
                d.y.push(null);
                d.error_y.push(null); // placeholder
                d.subVals.push(NaN);
                d.subSecs.push(NaN);
                if (hasLevels) {
                    d.subLevs.push(NaN);
                }
            } else {
                // there's valid data at this point, so store it
                sum += curveStats[d_idx];
                d.x.push(loopTime);
                d.y.push(curveStats[d_idx]);
                d.error_y.push(null);
                d.subVals.push(subVals[d_idx]);
                d.subSecs.push(subSecs[d_idx]);
                if (hasLevels) {
                    d.subLevs.push(subLevs[d_idx]);
                }
                ymin = curveStats[d_idx] < ymin ? curveStats[d_idx] : ymin;
                ymax = curveStats[d_idx] > ymax ? curveStats[d_idx] : ymax;
            }
        }
        if (!regular) {
            // it is a model that has an irregular set of intervals, i.e. an irregular cadence
            // the time interval most likely will not be the one calculated above
            time_interval = getTimeInterval(loopTime, time_interval, foreCastOffset, cycles);
        }
        loopTime = loopTime + time_interval;    // advance to the next time.
    }

    if (regular) {
        cycles = [time_interval];   // regular models will return one cycle cadence
    }

    d.xmin = xmin;
    d.xmax = xmax;
    d.ymin = ymin;
    d.ymax = ymax;
    d.sum = sum;

    return {
        d: d,
        N0: N0,
        N_times: N_times,
        cycles: cycles
    };
};

// this method parses the returned query data for specialty curves such as profiles, dieoffs, threshold plots, valid time plots, grid scale plots, and histograms
const parseQueryDataSpecialtyCurve = function (rows, d, appParams) {
    /*
        var d = {// d will contain the curve data
            x: [],
            y: [],
            error_x: [],   // curveTime
            error_y: [],   // values
            subVals: [],   // subVals
            subSecs: [],   // subSecs
            subLevs: [],   // subLevs
            stats: [],     // pointStats
            text: [],
            glob_stats: {},     // curveStats
            xmin: Number.MAX_VALUE,
            xmax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
            sum: 0
        };
    */
    const plotType = appParams.plotType;
    const hasLevels = appParams.hasLevels;
    const completenessQCParam = Number(appParams.completeness) / 100;
    const hideGaps = appParams.hideGaps;

    // initialize local variables
    var N0 = [];
    var N_times = [];
    var curveIndependentVars = [];
    var curveStats = [];
    var subVals = [];
    var subSecs = [];
    var subLevs = [];
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var independentVar;
        switch (plotType) {
            case matsTypes.PlotTypes.validtime:
                independentVar = Number(rows[rowIndex].hr_of_day);
                break;
            case matsTypes.PlotTypes.gridscale:
                independentVar = Number(rows[rowIndex].gridscale);
                break;
            case matsTypes.PlotTypes.profile:
                independentVar = Number((rows[rowIndex].avVal).toString().replace('P', ''));
                break;
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.dailyModelCycle:
                independentVar = Number(rows[rowIndex].avtime) * 1000;
                break;
            case matsTypes.PlotTypes.dieoff:
                independentVar = Number(rows[rowIndex].fcst_lead);
                break;
            case matsTypes.PlotTypes.threshold:
                independentVar = Number(rows[rowIndex].thresh);
                break;
            default:
                independentVar = Number(rows[rowIndex].avtime);
        }
        var stat = rows[rowIndex].stat === "NULL" ? null : rows[rowIndex].stat;
        N0.push(rows[rowIndex].N0);             // number of values that go into a point on the graph
        N_times.push(rows[rowIndex].N_times);   // number of times that go into a point on the graph

        var sub_stats = [];
        var sub_secs = [];
        var sub_levs = [];
        if (stat !== null && rows[rowIndex].sub_data !== undefined) {
            try {
                var sub_data = rows[rowIndex].sub_data.toString().split(',');
                var curr_sub_data;
                for (var sd_idx = 0; sd_idx < sub_data.length; sd_idx++) {
                    curr_sub_data = sub_data[sd_idx].split(';');
                    sub_stats.push(Number(curr_sub_data[0]));
                    sub_secs.push(Number(curr_sub_data[1]));
                    if (hasLevels) {
                        if (!isNaN(Number(curr_sub_data[2]))) {
                            sub_levs.push(Number(curr_sub_data[2]));
                        } else {
                            sub_levs.push(curr_sub_data[2]);
                        }
                    }
                }
            } catch (e) {
                // this is an error produced by a bug in the query function, not an error returned by the mysql database
                e.message = "Error in parseQueryDataSpecialtyCurve. The expected fields don't seem to be present in the results cache: " + e.message;
                throw new Error(e.message);
            }
        } else {
            sub_stats = NaN;
            sub_secs = NaN;
            if (hasLevels) {
                sub_levs = NaN;
            }
        }

        // deal with missing forecast cycles for dailyModelCycle plot type
        if (plotType === matsTypes.PlotTypes.dailyModelCycle && rowIndex > 0 && (Number(independentVar) - Number(rows[rowIndex - 1].avtime * 1000)) > 3600 * 24 * 1000) {
            const cycles_missing = Math.floor((Number(independentVar) - Number(rows[rowIndex - 1].avtime * 1000)) / (3600 * 24 * 1000));
            for (var missingIdx = cycles_missing; missingIdx > 0; missingIdx--) {
                curveIndependentVars.push(independentVar - 3600 * 24 * 1000 * missingIdx);
                curveStats.push(null);
                subVals.push(NaN);
                subSecs.push(NaN);
                if (hasLevels) {
                    subLevs.push(NaN);
                }
            }
        }
        curveIndependentVars.push(independentVar);
        curveStats.push(stat);
        subVals.push(sub_stats);
        subSecs.push(sub_secs);
        if (hasLevels) {
            subLevs.push(sub_levs);
        }
    }

    var N0_max = Math.max(...N0);
    var N_times_max = Math.max(...N_times);
    var sum = 0;
    var indVarMin = Number.MAX_VALUE;
    var indVarMax = -1 * Number.MAX_VALUE;
    var depVarMin = Number.MAX_VALUE;
    var depVarMax = -1 * Number.MAX_VALUE;

    for (var d_idx = 0; d_idx < curveIndependentVars.length; d_idx++) {
        var this_N0 = N0[d_idx];
        var this_N_times = N_times[d_idx];
        // Make sure that we don't have any points with far less data than the rest of the graph, and that
        // we don't have any points with a smaller completeness value than specified by the user.
        if (curveStats[d_idx] === null || this_N_times < completenessQCParam * N_times_max) {
            if (!hideGaps) {
                if (plotType === matsTypes.PlotTypes.profile) {
                    // profile has the stat first, and then the independent var. The others have independent var and then stat.
                    // this is in the pattern of x-plotted-variable, y-plotted-variable.
                    d.x.push(null);
                    d.y.push(curveIndependentVars[d_idx]);
                    d.error_y.push(null);  // placeholder
                    d.subVals.push(NaN);
                    d.subSecs.push(NaN);
                    d.subLevs.push(NaN);
                } else {
                    d.x.push(curveIndependentVars[d_idx]);
                    d.y.push(null);
                    d.error_y.push(null);  // placeholder
                    d.subVals.push(NaN);
                    d.subSecs.push(NaN);
                    if (hasLevels) {
                        d.subLevs.push(NaN);
                    }
                }
            }
        } else {
            // there's valid data at this point, so store it
            sum += curveStats[d_idx];
            if (plotType === matsTypes.PlotTypes.profile) {
                // profile has the stat first, and then the independent var. The others have independent var and then stat.
                // this is in the pattern of x-plotted-variable, y-plotted-variable.
                d.x.push(curveStats[d_idx]);
                d.y.push(curveIndependentVars[d_idx]);
                d.error_x.push(null); // placeholder
                d.subVals.push(subVals[d_idx]);
                d.subSecs.push(subSecs[d_idx]);
                d.subLevs.push(subLevs[d_idx]);
            } else {
                d.x.push(curveIndependentVars[d_idx]);
                d.y.push(curveStats[d_idx]);
                d.error_y.push(null);  // placeholder
                d.subVals.push(subVals[d_idx]);
                d.subSecs.push(subSecs[d_idx]);
                if (hasLevels) {
                    d.subLevs.push(subLevs[d_idx]);
                }
            }
            indVarMin = curveIndependentVars[d_idx] < indVarMin ? curveIndependentVars[d_idx] : indVarMin;
            indVarMax = curveIndependentVars[d_idx] > indVarMax ? curveIndependentVars[d_idx] : indVarMax;
            depVarMin = curveStats[d_idx] < depVarMin ? curveStats[d_idx] : depVarMin;
            depVarMax = curveStats[d_idx] > depVarMax ? curveStats[d_idx] : depVarMax;
        }
    }

    if (plotType === matsTypes.PlotTypes.profile) {
        d.xmin = depVarMin;
        d.xmax = depVarMax;
        d.ymin = indVarMin;
        d.ymax = indVarMax;
    } else {
        d.xmin = indVarMin;
        d.xmax = indVarMax;
        d.ymin = depVarMin;
        d.ymax = depVarMax;
    }
    d.sum = sum;

    return {
        d: d,
        N0: N0,
        N_times: N_times
    };
};

// this method parses the returned query data for maps
const parseQueryDataMap = function (rows, d, dBlue, dRed, dBlack, dataSource, siteMap, variable, varUnits, orderOfMagnitude) {
    var queryVal;
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const site = rows[rowIndex].sta_id;
        queryVal = rows[rowIndex].stat;
        d.queryVal.push(queryVal);
        d.stats.push({
            N_times: rows[rowIndex].N_times,
            min_time: rows[rowIndex].min_secs,
            max_time: rows[rowIndex].max_secs
        });

        var thisSite = siteMap.find(obj => {
            return obj.options.id === site;
        });

        var tooltips = thisSite.origName +
            "<br>" + "variable: " + variable +
            "<br>" + "model: " + dataSource +
            "<br>" + "model-obs: " + queryVal + " " + varUnits +
            "<br>" + "n: " + rows[rowIndex].N_times;
        d.text.push(tooltips);
        d.siteName.push(thisSite.origName);
        d.lat.push(thisSite.point[0]);
        d.lon.push(thisSite.point[1]);

        var displayLength = orderOfMagnitude >= 0 ? 0 : Math.abs(orderOfMagnitude);
        var textMarker = queryVal === null ? "" : queryVal.toFixed(displayLength);
        if (queryVal <= -1 * Math.pow(10, orderOfMagnitude)) {
            d.color.push("rgb(0,0,255)");
            dBlue.siteName.push(thisSite.origName);
            dBlue.queryVal.push(queryVal);
            dBlue.text.push(textMarker);
            dBlue.lat.push(thisSite.point[0]);
            dBlue.lon.push(thisSite.point[1]);
        } else if (queryVal >= Math.pow(10, orderOfMagnitude)) {
            d.color.push("rgb(255,0,0)");
            dRed.siteName.push(thisSite.origName);
            dRed.queryVal.push(queryVal);
            dRed.text.push(textMarker);
            dRed.lat.push(thisSite.point[0]);
            dRed.lon.push(thisSite.point[1]);
        } else {
            d.color.push("rgb(0,0,0)");
            dBlack.siteName.push(thisSite.origName);
            dBlack.queryVal.push(queryVal);
            dBlack.text.push(textMarker);
            dBlack.lat.push(thisSite.point[0]);
            dBlack.lon.push(thisSite.point[1]);
        }
    }// end of loop row
    return {
        d: d,
        dBlue: dBlue,
        dRed: dRed,
        dBlack: dBlack
    };
};

// this method parses the returned query data for maps in CTC apps
const parseQueryDataMapCTC = function (rows, d, dPurple, dPurpleBlue, dBlue, dBlueGreen, dGreen, dGreenYellow, dYellow, dOrange, dOrangeRed, dRed, dataSource, siteMap, statistic) {
    var queryVal;
    var lowLimit = Number(rows[0].N0);
    var highLimit = Number(rows[rows.length - 1].N0);
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const site = rows[rowIndex].sta_id;
        const yy = Number(rows[rowIndex].yy);
        const yn = Number(rows[rowIndex].yn);
        const ny = Number(rows[rowIndex].ny);
        const nn = Number(rows[rowIndex].nn);
        if (yy + yn + ny + nn > 0) {
            queryVal = calculateStatCTC(yy, yn, ny, nn, statistic);
            switch (statistic) {
                case 'TSS (True Skill Score)':
                    lowLimit = -100;
                    highLimit = 100;
                    break;
                case 'PODy (POD of ceiling < threshold)':
                    lowLimit = 0;
                    highLimit = 100;
                    break;
                case 'PODn (POD of ceiling > threshold)':
                    lowLimit = 0;
                    highLimit = 100;
                    break;
                case 'FAR (False Alarm Ratio)':
                    lowLimit = 0;
                    highLimit = 100;
                    break;
                case 'Bias (forecast/actual)':
                    lowLimit = 0;
                    highLimit = 2;
                    break;
                case 'CSI (Critical Success Index)':
                    lowLimit = 0;
                    highLimit = 100;
                    break;
                case 'HSS (Heidke Skill Score)':
                    lowLimit = -100;
                    highLimit = 100;
                    break;
                case 'ETS (Equitable Threat Score)':
                    lowLimit = -100 / 3;
                    highLimit = 100;
                    break;
                case 'Ratio (Nlow / Ntot)':
                    lowLimit = 0;
                    highLimit = 1;
                    break;
                case 'Ratio (Nhigh / Ntot)':
                    lowLimit = 0;
                    highLimit = 1;
                    break;
            }
            if (!isNaN(Number(queryVal))) {
                d.queryVal.push(queryVal);
                d.stats.push({
                    N_times: rows[rowIndex].N_times,
                    min_time: rows[rowIndex].min_secs,
                    max_time: rows[rowIndex].max_secs
                });

                var thisSite = siteMap.find(obj => {
                    return obj.options.id === site;
                });

                var tooltips = thisSite.origName +
                    "<br>" + "model: " + dataSource +
                    "<br>" + statistic + ": " + queryVal +
                    "<br>" + "n: " + rows[rowIndex].N_times;
                d.text.push(tooltips);
                d.siteName.push(thisSite.origName);
                d.lat.push(thisSite.point[0]);
                d.lon.push(thisSite.point[1]);

                var textMarker = queryVal === null ? "" : queryVal.toFixed(0);
                if (queryVal <= lowLimit + (highLimit - lowLimit) * .1) {
                    d.color.push("rgb(128,0,255)");
                    dPurple.siteName.push(thisSite.origName);
                    dPurple.queryVal.push(queryVal);
                    dPurple.text.push(textMarker);
                    dPurple.lat.push(thisSite.point[0]);
                    dPurple.lon.push(thisSite.point[1]);
                } else if (queryVal <= lowLimit + (highLimit - lowLimit) * .2) {
                    d.color.push("rgb(64,0,255)");
                    dPurpleBlue.siteName.push(thisSite.origName);
                    dPurpleBlue.queryVal.push(queryVal);
                    dPurpleBlue.text.push(textMarker);
                    dPurpleBlue.lat.push(thisSite.point[0]);
                    dPurpleBlue.lon.push(thisSite.point[1]);
                } else if (queryVal <= lowLimit + (highLimit - lowLimit) * .3) {
                    d.color.push("rgb(0,0,255)");
                    dBlue.siteName.push(thisSite.origName);
                    dBlue.queryVal.push(queryVal);
                    dBlue.text.push(textMarker);
                    dBlue.lat.push(thisSite.point[0]);
                    dBlue.lon.push(thisSite.point[1]);
                } else if (queryVal <= lowLimit + (highLimit - lowLimit) * .4) {
                    d.color.push("rgb(64,128,128)");
                    dBlueGreen.siteName.push(thisSite.origName);
                    dBlueGreen.queryVal.push(queryVal);
                    dBlueGreen.text.push(textMarker);
                    dBlueGreen.lat.push(thisSite.point[0]);
                    dBlueGreen.lon.push(thisSite.point[1]);
                } else if (queryVal <= lowLimit + (highLimit - lowLimit) * .5) {
                    d.color.push("rgb(128,255,0)");
                    dGreen.siteName.push(thisSite.origName);
                    dGreen.queryVal.push(queryVal);
                    dGreen.text.push(textMarker);
                    dGreen.lat.push(thisSite.point[0]);
                    dGreen.lon.push(thisSite.point[1]);
                } else if (queryVal <= lowLimit + (highLimit - lowLimit) * .6) {
                    d.color.push("rgb(160,224,0)");
                    dGreenYellow.siteName.push(thisSite.origName);
                    dGreenYellow.queryVal.push(queryVal);
                    dGreenYellow.text.push(textMarker);
                    dGreenYellow.lat.push(thisSite.point[0]);
                    dGreenYellow.lon.push(thisSite.point[1]);
                } else if (queryVal <= lowLimit + (highLimit - lowLimit) * .7) {
                    d.color.push("rgb(192,192,0)");
                    dYellow.siteName.push(thisSite.origName);
                    dYellow.queryVal.push(queryVal);
                    dYellow.text.push(textMarker);
                    dYellow.lat.push(thisSite.point[0]);
                    dYellow.lon.push(thisSite.point[1]);
                } else if (queryVal <= lowLimit + (highLimit - lowLimit) * .8) {
                    d.color.push("rgb(255,128,0)");
                    dOrange.siteName.push(thisSite.origName);
                    dOrange.queryVal.push(queryVal);
                    dOrange.text.push(textMarker);
                    dOrange.lat.push(thisSite.point[0]);
                    dOrange.lon.push(thisSite.point[1]);
                } else if (queryVal <= lowLimit + (highLimit - lowLimit) * .9) {
                    d.color.push("rgb(255,64,0)");
                    dOrangeRed.siteName.push(thisSite.origName);
                    dOrangeRed.queryVal.push(queryVal);
                    dOrangeRed.text.push(textMarker);
                    dOrangeRed.lat.push(thisSite.point[0]);
                    dOrangeRed.lon.push(thisSite.point[1]);
                } else {
                    d.color.push("rgb(255,0,0)");
                    dRed.siteName.push(thisSite.origName);
                    dRed.queryVal.push(queryVal);
                    dRed.text.push(textMarker);
                    dRed.lat.push(thisSite.point[0]);
                    dRed.lon.push(thisSite.point[1]);
                }
            }
        }
    }// end of loop row
    return {
        d: d,
        dPurple: dPurple,
        dPurpleBlue: dPurpleBlue,
        dBlue: dBlue,
        dBlueGreen: dBlueGreen,
        dGreen: dGreen,
        dGreenYellow: dGreenYellow,
        dYellow: dYellow,
        dOrange: dOrange,
        dOrangeRed: dOrangeRed,
        dRed: dRed
    };
};

// this method parses the returned query data for histograms
const parseQueryDataHistogram = function (rows, d, appParams) {
    /*
        var d = {// d will contain the curve data
            x: [], // placeholder
            y: [], // placeholder
            error_x: [], // unused
            error_y: [], // unused
            subVals: [],
            subSecs: [],
            subLevs: [],
            glob_stats: [], // placeholder
            bin_stats: [], // placeholder
            text: [] // placeholder
            xmin:num,
            xmax:num,
            ymin:num,
            ymax:num
        };
    */
    const hasLevels = appParams.hasLevels;

    // these arrays hold all the sub values and seconds (and levels) until they are sorted into bins
    var curveSubStatsRaw = [];
    var curveSubSecsRaw = [];
    var curveSubLevsRaw = [];

    // parse the data returned from the query
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var stat = rows[rowIndex].stat === "NULL" ? null : rows[rowIndex].stat;
        var sub_stats = [];
        var sub_secs = [];
        var sub_levs = [];
        if (stat !== null && rows[rowIndex].sub_data !== undefined) {
            try {
                var sub_data = rows[rowIndex].sub_data.toString().split(',');
                var curr_sub_data;
                for (var sd_idx = 0; sd_idx < sub_data.length; sd_idx++) {
                    curr_sub_data = sub_data[sd_idx].split(';');
                    sub_stats.push(Number(curr_sub_data[0]));
                    sub_secs.push(Number(curr_sub_data[1]));
                    if (hasLevels) {
                        if (!isNaN(Number(curr_sub_data[2]))) {
                            sub_levs.push(Number(curr_sub_data[2]));
                        } else {
                            sub_levs.push(curr_sub_data[2]);
                        }
                    }
                    curveSubLevsRaw.push(sub_levs);
                }
                curveSubStatsRaw.push(sub_stats);
                curveSubSecsRaw.push(sub_secs);
            } catch (e) {
                // this is an error produced by a bug in the query function, not an error returned by the mysql database
                e.message = "Error in parseQueryDataHistogram. The expected fields don't seem to be present in the results cache: " + e.message;
                throw new Error(e.message);
            }
        }
    }

    // we don't have bins yet, so we want all of the data in one array
    const subVals = [].concat.apply([], curveSubStatsRaw);
    const subSecs = [].concat.apply([], curveSubSecsRaw);
    var subLevs;
    if (hasLevels) {
        subLevs = [].concat.apply([], curveSubLevsRaw);
    }

    d.subVals = subVals;
    d.subSecs = subSecs;
    d.subLevs = subLevs;

    return {
        d: d,
        N0: subVals.length,
        N_times: subSecs.length
    };
};

// this method parses the returned query data for contour plots
const parseQueryDataContour = function (rows, d) {
    /*
        var d = {// d will contain the curve data
            x: [],
            y: [],
            z: [],
            n: [],
            text: [],
            xTextOutput: [],
            yTextOutput: [],
            zTextOutput: [],
            nTextOutput: [],
            minDateTextOutput: [],
            maxDateTextOutput: [],
            stdev: [],
            stats: [],
            glob_stats: {},
            xmin:num,
            ymin:num,
            zmin:num,
            xmax:num,
            ymax:num,
            zmax:num,
            sum:num
        };
    */
    // initialize local variables
    var curveStatLookup = {};
    var curveStdevLookup = {};
    var curveNLookup = {};

    // get all the data out of the query array
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var rowXVal = rows[rowIndex].xVal;
        var rowYVal = rows[rowIndex].yVal;
        var statKey = rowXVal.toString() + '_' + rowYVal.toString();
        var stat = rows[rowIndex].stat === "NULL" ? null : rows[rowIndex].stat;
        var stdev = rows[rowIndex].stdev !== undefined ? rows[rowIndex].stdev : null;
        var n = rows[rowIndex].sub_data !== undefined && rows[rowIndex].sub_data !== null ? rows[rowIndex].sub_data.toString().split(',').length : 0;
        var minDate = rows[rowIndex].min_secs;
        var maxDate = rows[rowIndex].max_secs;
        if (stat === undefined || stat === null) {
            stat = null;
            stdev = 0;
            n = 0;
            minDate = null;
            maxDate = null;
        }
        // store flat arrays of all the parsed data, used by the text output and for some calculations later
        d.xTextOutput.push(Number(rowXVal));
        d.yTextOutput.push(Number(rowYVal));
        d.zTextOutput.push(stat);
        d.nTextOutput.push(n);
        d.minDateTextOutput.push(minDate);
        d.maxDateTextOutput.push(maxDate);
        curveStatLookup[statKey] = stat;
        curveStdevLookup[statKey] = stdev;
        curveNLookup[statKey] = n;
    }
    // get the unique x and y values and sort the stats into the 2D z array accordingly
    d.x = matsDataUtils.arrayUnique(d.xTextOutput).sort(function (a, b) {
        return a - b
    });
    d.y = matsDataUtils.arrayUnique(d.yTextOutput).sort(function (a, b) {
        return a - b
    });

    var i;
    var j;
    var currX;
    var currY;
    var currStat;
    var currStdev;
    var currN;
    var currStatKey;
    var currYStatArray;
    var currYStdevArray;
    var currYNArray;
    var sum = 0;
    var nPoints = 0;
    var zmin = Number.MAX_VALUE;
    var zmax = -1 * Number.MAX_VALUE;

    for (j = 0; j < d.y.length; j++) {
        currY = d.y[j];
        currYStatArray = [];
        currYStdevArray = [];
        currYNArray = [];
        for (i = 0; i < d.x.length; i++) {
            currX = d.x[i];
            currStatKey = currX.toString() + '_' + currY.toString();
            currStat = curveStatLookup[currStatKey];
            currStdev = curveStdevLookup[currStatKey];
            currN = curveNLookup[currStatKey];
            if (currStat === undefined) {
                currYStatArray.push(null);
                currYStdevArray.push(null);
                currYNArray.push(0);
            } else {
                sum += currStat;
                nPoints = nPoints + 1;
                currYStatArray.push(currStat);
                currYStdevArray.push(currStdev);
                currYNArray.push(currN);
                zmin = currStat < zmin ? currStat : zmin;
                zmax = currStat > zmax ? currStat : zmax;
            }
        }
        d.z.push(currYStatArray);
        d.stdev.push(currYStdevArray);
        d.n.push(currYNArray);
    }

    // calculate statistics
    d.xmin = d.x[0];
    d.xmax = d.x[d.x.length - 1];
    d.ymin = d.y[0];
    d.ymax = d.y[d.y.length - 1];
    d.zmin = zmin;
    d.zmax = zmax;
    d.sum = sum;

    const filteredMinDate = d.minDateTextOutput.filter(t => t);
    const filteredMaxDate = d.maxDateTextOutput.filter(t => t);
    d.glob_stats['mean'] = sum / nPoints;
    d.glob_stats['minDate'] = Math.min(...filteredMinDate);
    d.glob_stats['maxDate'] = Math.max(...filteredMaxDate);
    d.glob_stats['n'] = nPoints;

    return {
        d: d
    };
};

export default matsDataQueryUtils = {

    simplePoolQueryWrapSynchronous: simplePoolQueryWrapSynchronous,
    queryDBPython: queryDBPython,
    queryDBTimeSeries: queryDBTimeSeries,
    queryDBSpecialtyCurve: queryDBSpecialtyCurve,
    queryDBMap: queryDBMap,
    queryDBMapCTC: queryDBMapCTC,
    queryDBContour: queryDBContour

}


