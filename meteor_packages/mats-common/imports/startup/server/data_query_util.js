import {matsDataUtils, matsTypes} from 'meteor/randyp:mats-common';
import {Meteor} from "meteor/meteor";

//const Future = require('fibers/future');

//utility to get the cadence for a particular model, so that the query function
//knows where to include null points for missing data.
const getModelCadence = function (pool, dataSource, startDate, endDate) {
    var rows = [];
    var cycles;
    try {
        //this query should only return data if the model cadence is irregular.
        //otherwise, the cadence will be calculated later by the query function.
        rows = simplePoolQueryWrapSynchronous(pool, "select cycle_seconds " +
            "from mats_common.primary_model_orders " +
            "where model = " +
            "(select new_model as display_text from mats_common.standardized_model_list where old_model = '" + dataSource + "');");
        var cycles_raw = JSON.parse(rows[0].cycle_seconds);
        var cycles_keys = Object.keys(cycles_raw).sort();
        //there can be difference cadences for different time periods (each time period is a key in cycles_keys,
        //with the cadences for that period represented as values in cycles_raw), so this section identifies all
        //time periods relevant to the requested date range, and returns the union of their cadences.
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
            }
        }
    } catch (e) {
        //ignore - just a safety check, don't want to exit if there isn't a cycles_per_model entry
        //if there isn't a cycles_per_model entry, it just means that the model has a regular cadence
    }
    if (cycles !== null && cycles !== undefined && cycles.length > 0) {
        for (var c = 0; c < cycles.length; c++) {
            cycles[c] = cycles[c] * 1000;         // convert to milliseconds
        }
    } else {
        cycles = []; //regular cadence model--cycles will be calculated later by the query function
    }
    return cycles;
};

//this function calculates the interval between the current time and the next time for irregular cadence models.
const getTimeInterval = function (avTime, time_interval, foreCastOffset, cycles) {
    //have to calculate the time_interval
    var ti;
    var dayInMilliSeconds = 24 * 3600 * 1000;
    var minCycleTime = Math.min(...cycles);

    var thisCadence = (avTime % dayInMilliSeconds); //current hour of day (valid time)
    if (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000) < 0) { //check to see if cycle time was on previous day -- if so, need to wrap around 00Z to get current hour of day (cycle time)
        thisCadence = (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000) + dayInMilliSeconds); //current hour of day (cycle time)
    } else {
        thisCadence = (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000)); //current hour of day (cycle time)
    }

    var thisCadenceIdx = cycles.indexOf(thisCadence); //fnd our where the current hour of day is in the cycles array
    if (thisCadenceIdx !== -1) {
        var nextCadenceIdx = thisCadenceIdx + 1; //choose the next hour of the day
        if (nextCadenceIdx >= cycles.length) {
            ti = (dayInMilliSeconds - thisCadence) + minCycleTime; //if we were at the last cycle cadence, wrap back around to the first cycle cadence
        } else {
            ti = cycles[nextCadenceIdx] - cycles[thisCadenceIdx]; //otherwise take the difference between the current and next hours of the day.
        }
    } else {
        ti = time_interval; //if for some reason the current hour of the day isn't in the cycles array, default to the regular cadence interval
    }

    return ti;
};

//utility for querying the DB
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

//this method queries the database for timeseries plots
const queryDBTimeSeries = function (pool, statement, averageStr, dataSource, forecastOffset, startDate, endDate, hasLevels, forceRegularCadence) {
    //upper air is only verified at 00Z and 12Z, so you need to force irregular models to verify at that regular cadence
    const Future = require('fibers/future');
    if (Meteor.isServer) {
        const plotParams = matsDataUtils.getPlotParamsFromStack();
        const completenessQCParam = Number(plotParams["completeness"]) / 100;

        var cycles = getModelCadence(pool, dataSource, startDate, endDate); //if irregular model cadence, get cycle times. If regular, get empty array.
        const regular = !(!forceRegularCadence && averageStr === "None" && (cycles !== null && cycles.length !== 0)); // If curves have averaging, the cadence is always regular, i.e. it's the cadence of the average

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
                const parsedData = parseQueryDataTimeSeries(pool, rows, d, completenessQCParam, hasLevels, averageStr, forecastOffset, cycles, regular);
                d = parsedData.d;
                N0 = parsedData.N0;
                N_times = parsedData.N_times;
                cycles = parsedData.cycles;
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
            averageStr: averageStr,
            cycles: cycles,
        };
    }
};

//this method queries the database for specialty curves such as profiles, dieoffs, threshold plots, valid time plots, and histograms
const queryDBSpecialtyCurve = function (pool, statement, plotType, hasLevels) {
    if (Meteor.isServer) {
        const Future = require('fibers/future');
        const plotParams = matsDataUtils.getPlotParamsFromStack();
        const completenessQCParam = Number(plotParams["completeness"]) / 100;

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
                if (plotType !== matsTypes.PlotTypes.histogram) {
                    parsedData = parseQueryDataSpecialtyCurve(rows, d, completenessQCParam, plotType, hasLevels);
                } else {
                    parsedData = parseQueryDataHistogram(d, rows, hasLevels);
                }
                d = parsedData.d;
                N0 = parsedData.N0;
                N_times = parsedData.N_times;
            }
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

const queryMapDB = function (pool, statement, d, dBlue, dBlack, dRed, dataSource, variable, varUnits, site, siteIndex, siteMap) {
    if (Meteor.isServer) {
        if (d === undefined) {
            d = {
                siteName: [],
                queryVal: [],
                lat: [],
                lon: [],
                color: [],
                stats: [],
                text: []
            };  // d will contain the curve data
            dBlue = {
                siteName: [],
                queryVal: [],
                lat: [],
                lon: [],
                stats: [],
                text: [],
                color: "rgb(0,0,255)"
            };  // for biases <= -1
            dBlack = {
                siteName: [],
                queryVal: [],
                lat: [],
                lon: [],
                stats: [],
                text: [],
                color: "rgb(0,0,0)"
            };  // for biases > -1 and < 1
            dRed = {
                siteName: [],
                queryVal: [],
                lat: [],
                lon: [],
                stats: [],
                text: [],
                color: "rgb(255,0,0)"
            };  // for biases >= 1
        }
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
                var queryVal;
                for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    queryVal = rows[rowIndex].model_ob_diff;
                    d.siteName.push(rows[rowIndex].sta_name);
                    d.queryVal.push(queryVal);
                    d.stats.push({
                        N_times: rows[rowIndex].N_times,
                        min_time: rows[rowIndex].min_time,
                        max_time: rows[rowIndex].max_time
                    });
                    var tooltips = site +
                        "<br>" + "variable: " + variable +
                        "<br>" + "model: " + dataSource +
                        "<br>" + "model-obs: " + d.queryVal[siteIndex] + " " + varUnits +
                        "<br>" + "n: " + d.stats[siteIndex].N_times;
                    d.text.push(tooltips);

                    var thisSite = siteMap.find(obj => {
                        return obj.name === site;
                    });
                    d.lat.push(thisSite.point[0]);
                    d.lon.push(thisSite.point[1]);

                    var textMarker = queryVal === null ? "" : queryVal.toFixed(0);
                    if (queryVal <= -1) {
                        d.color.push("rgb(0,0,255)");
                        dBlue.siteName.push(rows[rowIndex].sta_name);
                        dBlue.queryVal.push(queryVal);
                        dBlue.text.push(textMarker);
                        dBlue.lat.push(thisSite.point[0]);
                        dBlue.lon.push(thisSite.point[1]);
                    } else if (queryVal >= 1) {
                        d.color.push("rgb(255,0,0)");
                        dRed.siteName.push(rows[rowIndex].sta_name);
                        dRed.queryVal.push(queryVal);
                        dRed.text.push(textMarker);
                        dRed.lat.push(thisSite.point[0]);
                        dRed.lon.push(thisSite.point[1]);
                    } else {
                        d.color.push("rgb(0,0,0)");
                        dBlack.siteName.push(rows[rowIndex].sta_name);
                        dBlack.queryVal.push(queryVal);
                        dBlack.text.push(textMarker);
                        dBlack.lat.push(thisSite.point[0]);
                        dBlack.lon.push(thisSite.point[1]);
                    }
                }// end of loop row
            }
            // done waiting - have results
            pFuture['return']();
        });

        // wait for future to finish
        pFuture.wait();
        return {
            data: d,    // [sub_values,sub_secs] as arrays
            dataBlue: dBlue,    // [sub_values,sub_secs] as arrays
            dataBlack: dBlack,    // [sub_values,sub_secs] as arrays
            dataRed: dRed,    // [sub_values,sub_secs] as arrays
            error: error,
        };
    }
};

//this method parses the returned query data for timeseries plots
const parseQueryDataTimeSeries = function (pool, rows, d, completenessQCParam, hasLevels, averageStr, foreCastOffset, cycles, regular) {
    /*
        var d = {// d will contain the curve data
            x: [],
            y: [],
            error_x: [],   // curveTime
            error_y: [],   // values
            subVals: [],   //subVals
            subSecs: [],   //subSecs
            subLevs: [],   //subLevs
            stats: [],     //pointStats
            text: [],
            glob_stats: {},     //curveStats
            xmin: Number.MAX_VALUE,
            xmax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
            sum: 0
        };
    */
    d.error_x = null;  // time series doesn't use x errorbars
    var N0 = [];
    var N_times = [];
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;

    var curveTime = [];
    var curveStats = [];
    var subVals = [];
    var subSecs = [];
    var subLevs = [];

    var time_interval = rows.length > 1 ? Number(rows[1].avtime) - Number(rows[0].avtime) : undefined; //calculate a base time interval -- will be used if data is regular
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {

        var avSeconds = Number(rows[rowIndex].avtime);
        var avTime = avSeconds * 1000;
        xmin = avTime < xmin ? avTime : xmin;
        xmax = avTime > xmax ? avTime : xmax;
        var stat = rows[rowIndex].stat;
        N0.push(rows[rowIndex].N0);             // number of values that go into a time series point
        N_times.push(rows[rowIndex].N_times);   // number of times that go into a time series point

        // find the minimum time_interval. For regular models, this will differ from the previous time_interval
        // if the interval was artificially large due to missing values. For irregular models, we need the minimum
        // interval to be sure we don't accidentally go past the next data point.
        if (rowIndex < rows.length - 1) {
            var time_diff = Number(rows[rowIndex + 1].avtime) - Number(rows[rowIndex].avtime);
            if (time_diff < time_interval) {
                time_interval = time_diff;
            }
        }

        // store sub values that will later be used for calculating error bar statistics.
        var sub_values;
        var sub_secs;
        var sub_levs;
        if (stat !== null && stat !== "NULL" && rows[rowIndex].sub_values0 !== undefined) {
            try {
                sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                if (hasLevels) {
                    sub_levs = rows[rowIndex].sub_levs0.toString().split(',');
                    if (!isNaN(Number(sub_levs[0]))) {
                        sub_levs = sub_levs.map(Number);
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

    if (xmin < Number(rows[0].avtime) * 1000 || averageStr !== "None") {
        xmin = Number(rows[0].avtime) * 1000;
    }

    time_interval = time_interval * 1000;
    var loopTime = xmin;
    var sum = 0;
    while (loopTime <= xmax) {
        var d_idx = curveTime.indexOf(loopTime);
        if (d_idx < 0) {
            if (hasLevels) {
                //d.push([loopTime, null, -1, NaN, NaN, NaN]);// add a null for missing data
                d.x.push(loopTime);
                d.y.push(null);
                //d.error_x not used
                d.error_y.push(null);   //placeholder
                d.subVals.push(NaN);
                d.subSecs.push(NaN);
                d.subLevs.push(NaN);
            } else {
                //d.push([loopTime, null, -1, NaN, NaN]);     // add a null for missing data
                d.x.push(loopTime);
                d.y.push(null);
                //d.error_x not used
                d.error_y.push(null); //placeholder
                d.subVals.push(NaN);
                d.subSecs.push(NaN);
            }
        } else {
            var this_N0 = N0[d_idx];
            var this_N_times = N_times[d_idx];
            // Make sure that we don't have any points with far less data than the rest of the graph, and that
            // we don't have any points with a smaller completeness value than specified by the user.
            if (this_N0 < 0.1 * N0_max || this_N_times < completenessQCParam * N_times_max) {
                if (hasLevels) {
//                    d.push([loopTime, null, -1, NaN, NaN, NaN]);     // add a null if this time doesn't pass QC
                    d.x.push(loopTime);
                    d.y.push(null);
                    //d.error_x not used
                    d.error_y.push(null); //placeholder
                    d.subVals.push(NaN);
                    d.subSecs.push(NaN);
                    d.subLevs.push(NaN);
                } else {
//                    d.push([loopTime, null, -1, NaN, NaN]);     // add a null if this time doesn't pass QC
                    d.x.push(loopTime);
                    d.y.push(null);
                    //d.error_x not used
                    d.error_y.push(null); //placeholder
                    d.subVals.push(NaN);
                    d.subSecs.push(NaN);
                }
            } else {
                sum += curveStats[d_idx];
                if (hasLevels) {
                    //d.push([loopTime, curveStats[d_idx], -1, subVals[d_idx], subSecs[d_idx], subLevs[d_idx]]);   // else add the real data
                    d.x.push(loopTime);
                    d.y.push(curveStats[d_idx]);
                    //d.error_x not used
                    d.error_y.push(null);
                    d.subVals.push(subVals[d_idx]);
                    d.subSecs.push(subSecs[d_idx]);
                    d.subLevs.push(subLevs[d_idx]);
                } else {
                    //d.push([loopTime, curveStats[d_idx], -1, subVals[d_idx], subSecs[d_idx]]);   // else add the real data
                    d.x.push(loopTime);
                    d.y.push(curveStats[d_idx]);
                    //d.error_x not used
                    d.error_y.push(null);
                    d.subVals.push(subVals[d_idx]);
                    d.subSecs.push(subSecs[d_idx]);
                }
            }
        }
        if (!regular) {  // it is a model that has an irregular set of intervals, i.e. an irregular cadence
            time_interval = getTimeInterval(loopTime, time_interval, foreCastOffset, cycles);   // the time interval most likely will not be the one calculated above
        }
        loopTime = loopTime + time_interval;    // advance to the next time.
    }
    if (regular) {
        cycles = [time_interval];   // regular models will return one cycle cadence
    }
    const filteredx = d.x.filter(x => x);
    const filteredy = d.y.filter(y => y);
    d.xmin = Math.min(...filteredx);
    d.xmax = Math.max(...filteredx);
    d.ymin = Math.min(...filteredy);
    d.ymax = Math.max(...filteredy);
    d.sum = sum;

    if (d.xmin == "-Infinity" || (d.x.indexOf(0) !== -1 && 0 < d.xmin)){
        d.xmin = 0;
    }
    if (d.ymin == "-Infinity" || (d.y.indexOf(0) !== -1 && 0 < d.ymin)){
        d.ymin = 0;
    }

    if (d.xmax == "-Infinity"){
        d.xmax = 0;
    }
    if (d.ymax == "-Infinity"){
        d.ymax = 0;
    }
    return {
        d: d,
        N0: N0,
        N_times: N_times,
        cycles: cycles
    };
};

//this method parses the returned query data for specialty curves such as profiles, dieoffs, threshold plots, and valid time plots
const parseQueryDataSpecialtyCurve = function (rows, d, completenessQCParam, plotType, hasLevels) {
    /*
        var d = {// d will contain the curve data
            x: [],
            y: [],
            error_x: [],   // curveTime
            error_y: [],   // values
            subVals: [],   //subVals
            subSecs: [],   //subSecs
            subLevs: [],   //subLevs
            stats: [],     //pointStats
            text: [],
            glob_stats: {},     //curveStats
            xmin:num,
            ymin:num,
            xmax:num,
            ymax:num,
            sum:num;
        };
    */
    var N0 = [];
    var N_times = [];
    var curveIndependentVars = [];
    var curveStats = [];
    var subVals = [];
    var subSecs = [];
    var subLevs = [];
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var independentVar;
        if (plotType === matsTypes.PlotTypes.validtime) {
            independentVar = Number(rows[rowIndex].hr_of_day);
        } else if (plotType === matsTypes.PlotTypes.profile) {
            independentVar = Number(rows[rowIndex].avVal);
        } else if (plotType === matsTypes.PlotTypes.dailyModelCycle) {
            independentVar = Number(rows[rowIndex].avtime) * 1000;
        } else {
            independentVar = Number(rows[rowIndex].avtime);
        }

        var stat = rows[rowIndex].stat;
        N0.push(rows[rowIndex].N0);             // number of values that go into a point on the graph
        N_times.push(rows[rowIndex].N_times);   // number of times that go into a point on the graph

        var sub_stats;
        var sub_secs;
        var sub_levs;
        if (stat !== null && stat !== "NULL" && rows[rowIndex].sub_values0 !== undefined) {
            try {
                sub_stats = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                if (hasLevels) {
                    sub_levs = rows[rowIndex].sub_levs0.toString().split(',');
                    if (!isNaN(Number(sub_levs[0]))) {
                        sub_levs = sub_levs.map(Number);
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

        //deal with missing forecast cycles for dailyModelCycle plot type
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
    for (var d_idx = 0; d_idx < curveIndependentVars.length; d_idx++) {
        var this_N0 = N0[d_idx];
        var this_N_times = N_times[d_idx];
        // Make sure that we don't have any points with far less data than the rest of the graph, and that
        // we don't have any points with a smaller completeness value than specified by the user.
        if (this_N0 < 0.05 * N0_max || this_N_times < completenessQCParam * N_times_max) {
            if (plotType === matsTypes.PlotTypes.profile) {
                // profile has the stat first, and then the independent var. The others have independent var and then stat.
                // this is in the pattern of x-plotted-variable, y-plotted-variable.
                //d.push([null, curveIndependentVars[d_idx], -1, NaN, NaN, NaN]);
                d.x.push(null);
                d.y.push(curveIndependentVars[d_idx]);
                d.error_x.push(null);  // placeholder
                //d.error_y not used for profile
                d.subVals.push(NaN);
                d.subSecs.push(NaN);
                d.subLevs.push(NaN);
            } else if (plotType !== matsTypes.PlotTypes.dieoff) {
                // for dieoffs, we don't want to add a null for missing data. Just don't have a point for that FHR.
                if (hasLevels) {
                    //d.push([curveIndependentVars[d_idx], null, -1, NaN, NaN, NaN]);
                    d.x.push(curveIndependentVars[d_idx]);
                    d.y.push(null);
                    //d.error_x not used for curves other than profile
                    d.error_y.push(null);  // placeholder
                    d.subVals.push(NaN);
                    d.subSecs.push(NaN);
                    d.subLevs.push(NaN);
                } else {
                    //d.push([curveIndependentVars[d_idx], null, -1, NaN, NaN]);
                    d.x.push(curveIndependentVars[d_idx]);
                    d.y.push(null);
                    //d.error_x not used for curves other than profile
                    d.error_y.push(null);  // placeholder
                    d.subVals.push(NaN);
                    d.subSecs.push(NaN);
                }
            }
        } else {
            // else add the real data
            sum += curveStats[d_idx];
            if (plotType === matsTypes.PlotTypes.profile) {
                // profile has the stat first, and then the independent var. The others have independent var and then stat.
                // this is in the pattern of x-plotted-variable, y-plotted-variable.
//                d.push([curveStats[d_idx], curveIndependentVars[d_idx], -1, subVals[d_idx], subSecs[d_idx], subLevs[d_idx]]);
                d.x.push(curveStats[d_idx]);
                d.y.push(curveIndependentVars[d_idx]);
                d.error_x.push(null); // placeholder
                //d.error_y not used for curves other than profile
                d.subVals.push(subVals[d_idx]);
                d.subSecs.push(subSecs[d_idx]);
                d.subLevs.push(subLevs[d_idx]);
            } else if (hasLevels) {
//                d.push([curveIndependentVars[d_idx], curveStats[d_idx], -1, subVals[d_idx], subSecs[d_idx], subLevs[d_idx]]);
                d.x.push(curveIndependentVars[d_idx]);
                d.y.push(curveStats[d_idx]);
                //d.error_x not used for curves other than profile
                d.error_y.push(null);  // placeholder
                d.subVals.push(subVals[d_idx]);
                d.subSecs.push(subSecs[d_idx]);
                d.subLevs.push(subLevs[d_idx]);
            } else {
//                d.push([curveIndependentVars[d_idx], curveStats[d_idx], -1, subVals[d_idx], subSecs[d_idx]]);
                d.x.push(curveIndependentVars[d_idx]);
                d.y.push(curveStats[d_idx]);
                //d.error_x not used for curves other than profile
                d.error_y.push(null);  // placeholder
                d.subVals.push(subVals[d_idx]);
                d.subSecs.push(subSecs[d_idx]);
            }
        }
    }
    const filteredx = d.x.filter(x => x);
    const filteredy = d.y.filter(y => y);
    d.xmin = Math.min(...filteredx);
    d.xmax = Math.max(...filteredx);
    d.ymin = Math.min(...filteredy);
    d.ymax = Math.max(...filteredy);
    d.sum = sum;

    if (d.xmin == "-Infinity" || (d.x.indexOf(0) !== -1 && 0 < d.xmin)){
        d.xmin = 0;
    }
    if (d.ymin == "-Infinity" || (d.y.indexOf(0) !== -1 && 0 < d.ymin)){
        d.ymin = 0;
    }

    if (d.xmax == "-Infinity"){
        d.xmax = 0;
    }
    if (d.ymax == "-Infinity"){
        d.ymax = 0;
    }

    return {
        d: d,
        N0: N0,
        N_times: N_times
    };
};

// this method parses the returned query data for histograms
const parseQueryDataHistogram = function (d, rows, hasLevels) {
    /*
        var d = {// d will contain the curve data
            x: [], //placeholder
            y: [], //placeholder
            error_x: [], // unused
            error_y: [], // unused
            subVals: [],
            subSecs: [],
            subLevs: [],
            glob_stats: [], // placeholder
            bin_stats: [], // placeholder
            text: [] //placeholder
            xmin:num,
            xmax:num,
            ymin:num,
            ymax:num
        };
    */

    // these arrays hold all the sub values and seconds (and levels) until they are sorted into bins
    var curveSubStatsRaw = [];
    var curveSubSecsRaw = [];
    var curveSubLevsRaw = [];

    // parse the data returned from the query
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {

        var stat = rows[rowIndex].stat;
        var sub_stats;
        var sub_secs;
        var sub_levs;

        if (stat !== null && stat !== "NULL" && rows[rowIndex].sub_values0 !== undefined) {
            try {
                sub_stats = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                curveSubStatsRaw.push(sub_stats);
                sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                curveSubSecsRaw.push(sub_secs);
                if (hasLevels) {
                    sub_levs = rows[rowIndex].sub_levs0.toString().split(',');
                    if (!isNaN(Number(sub_levs[0]))) {
                        sub_levs = sub_levs.map(Number);
                    }
                    curveSubLevsRaw.push(sub_levs);
                }
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

export default matsDataQueryUtils = {

    simplePoolQueryWrapSynchronous: simplePoolQueryWrapSynchronous,
    queryDBTimeSeries: queryDBTimeSeries,
    queryDBSpecialtyCurve: queryDBSpecialtyCurve,
    queryMapDB: queryMapDB

}


