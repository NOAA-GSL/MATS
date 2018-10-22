import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
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
const queryDBTimeSeries = function (pool, statement, averageStr, dataSource, foreCastOffset, startDate, endDate, hasLevels, forceRegularCadence) {
    //upper air is only verified at 00Z and 12Z, so you need to force irregular models to verify at that regular cadence
    const Future = require('fibers/future');
    if (Meteor.isServer) {
        const plotParams = matsDataUtils.getPlotParamsFromStack();
        const completenessQCParam = Number(plotParams["completeness"]) / 100;

        var cycles = getModelCadence(pool, dataSource, startDate, endDate); //if irregular model cadence, get cycle times. If regular, get empty array.
        const regular = !(!forceRegularCadence && averageStr === "None" && (cycles !== null && cycles.length !== 0)); // If curves have averaging, the cadence is always regular, i.e. it's the cadence of the average

        var dFuture = new Future();
        var d = [];  // d will contain the curve data
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
                const parsedData = parseQueryDataTimeSeries(pool, rows, d, completenessQCParam, hasLevels, averageStr, foreCastOffset, cycles, regular);
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
        var d = [];  // d will contain the curve data
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
                    parsedData = parseQueryDataHistogram(rows, hasLevels);
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

const queryMapDB = function (pool, statement) {
    if (Meteor.isServer) {
        var d = [];  // d will contain the curve data
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
                for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    var siteName = rows[rowIndex].sta_name;
                    var N_times = rows[rowIndex].N_times;
                    var min_time = rows[rowIndex].min_time;
                    var max_time = rows[rowIndex].max_time;
                    var model_diff = rows[rowIndex].model_ob_diff;
                    d.push([siteName, N_times, min_time, max_time, model_diff]);
                }// end of loop row
            }
            // done waiting - have results
            pFuture['return']();
        });

        // wait for future to finish
        pFuture.wait();
        return {
            data: d,    // [sub_values,sub_secs] as arrays
            error: error,
        };
    }
};

//this method parses the returned query data for timeseries plots
const parseQueryDataTimeSeries = function (pool, rows, d, completenessQCParam, hasLevels, averageStr, foreCastOffset, cycles, regular) {

    var N0 = [];
    var N_times = [];
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;

    var curveTime = [];
    var curveStat = [];
    var curveSubStats = [];
    var curveSubSecs = [];
    var curveSubLevs = [];

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
        if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
            try {
                sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                if (hasLevels) {
                    sub_levs = rows[rowIndex].sub_levs0.toString().split(',').map(Number);
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
        curveStat.push(stat);
        curveSubStats.push(sub_values);
        curveSubSecs.push(sub_secs);
        if (hasLevels) {
            curveSubLevs.push(sub_levs);
        }
    }

    var N0_max = Math.max(...N0);
    var N_times_max = Math.max(...N_times);

    if (xmin < Number(rows[0].avtime) * 1000 || averageStr !== "None") {
        xmin = Number(rows[0].avtime) * 1000;
    }

    time_interval = time_interval * 1000;
    var loopTime = xmin;
    while (loopTime <= xmax) {
        var d_idx = curveTime.indexOf(loopTime);
        if (d_idx < 0) {
            if (hasLevels) {
                d.push([loopTime, null, -1, NaN, NaN, NaN]);     // add a null for missing data
            } else {
                d.push([loopTime, null, -1, NaN, NaN]);     // add a null for missing data
            }
        } else {
            var this_N0 = N0[d_idx];
            var this_N_times = N_times[d_idx];
            // Make sure that we don't have any points with far less data than the rest of the graph, and that
            // we don't have any points with a smaller completeness value than specified by the user.
            if (this_N0 < 0.1 * N0_max || this_N_times < completenessQCParam * N_times_max) {
                if (hasLevels) {
                    d.push([loopTime, null, -1, NaN, NaN, NaN]);     // add a null if this time doesn't pass QC
                } else {
                    d.push([loopTime, null, -1, NaN, NaN]);     // add a null if this time doesn't pass QC
                }
            } else {
                if (hasLevels) {
                    d.push([loopTime, curveStat[d_idx], -1, curveSubStats[d_idx], curveSubSecs[d_idx], curveSubLevs[d_idx]]);   // else add the real data
                } else {
                    d.push([loopTime, curveStat[d_idx], -1, curveSubStats[d_idx], curveSubSecs[d_idx]]);   // else add the real data
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
    return {
        d: d,
        N0: N0,
        N_times: N_times,
        cycles: cycles
    };
};

//this method parses the returned query data for specialty curves such as profiles, dieoffs, threshold plots, and valid time plots
const parseQueryDataSpecialtyCurve = function (rows, d, completenessQCParam, plotType, hasLevels) {

    var N0 = [];
    var N_times = [];

    var curveIndependentVars = [];
    var curveStat = [];
    var curveSubStats = [];
    var curveSubSecs = [];
    var curveSubLevs = [];

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
        if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
            try {
                sub_stats = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                if (hasLevels) {
                    sub_levs = rows[rowIndex].sub_levs0.toString().split(',').map(Number);
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
                curveStat.push(null);
                curveSubStats.push(NaN);
                curveSubSecs.push(NaN);
                if (hasLevels) {
                    curveSubLevs.push(NaN);
                }
            }
        }

        curveIndependentVars.push(independentVar);
        curveStat.push(stat);
        curveSubStats.push(sub_stats);
        curveSubSecs.push(sub_secs);
        if (hasLevels) {
            curveSubLevs.push(sub_levs);
        }
    }

    var N0_max = Math.max(...N0);
    var N_times_max = Math.max(...N_times);

    for (var d_idx = 0; d_idx < curveIndependentVars.length; d_idx++) {
        var this_N0 = N0[d_idx];
        var this_N_times = N_times[d_idx];
        // Make sure that we don't have any points with far less data than the rest of the graph, and that
        // we don't have any points with a smaller completeness value than specified by the user.
        if (this_N0 < 0.05 * N0_max || this_N_times < completenessQCParam * N_times_max) {
            if (plotType === matsTypes.PlotTypes.profile) {
                // profile has the stat first, and then the independent var. The others have independent var and then stat.
                // this is in the pattern of x-plotted-variable, y-plotted-variable.
                d.push([null, curveIndependentVars[d_idx], -1, NaN, NaN, NaN]);
            } else if (plotType !== matsTypes.PlotTypes.dieoff) {
                // for dieoffs, we don't want to add a null for missing data. Just don't have a point for that FHR.
                if (hasLevels) {
                    d.push([curveIndependentVars[d_idx], null, -1, NaN, NaN, NaN]);
                } else {
                    d.push([curveIndependentVars[d_idx], null, -1, NaN, NaN]);
                }
            }
        } else {
            // else add the real data
            if (plotType === matsTypes.PlotTypes.profile) {
                // profile has the stat first, and then the independent var. The others have independent var and then stat.
                // this is in the pattern of x-plotted-variable, y-plotted-variable.
                d.push([curveStat[d_idx], curveIndependentVars[d_idx], -1, curveSubStats[d_idx], curveSubSecs[d_idx], curveSubLevs[d_idx]]);
            } else if (hasLevels) {
                d.push([curveIndependentVars[d_idx], curveStat[d_idx], -1, curveSubStats[d_idx], curveSubSecs[d_idx], curveSubLevs[d_idx]]);
            } else {
                d.push([curveIndependentVars[d_idx], curveStat[d_idx], -1, curveSubStats[d_idx], curveSubSecs[d_idx]]);
            }
        }
    }

    return {
        d: d,
        N0: N0,
        N_times: N_times
    };
};

// this method parses the returned query data for histograms
const parseQueryDataHistogram = function (rows, hasLevels) {

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

        if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
            try {
                sub_stats = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                curveSubStatsRaw.push(sub_stats);
                sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                curveSubSecsRaw.push(sub_secs);
                if (hasLevels) {
                    sub_levs = rows[rowIndex].sub_levs0.toString().split(',').map(Number);
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
    const curveSubStats = [].concat.apply([], curveSubStatsRaw);
    const curveSubSecs = [].concat.apply([], curveSubSecsRaw);
    var curveSubLevs;
    if (hasLevels) {
        curveSubLevs = [].concat.apply([], curveSubLevsRaw);
    }

    return {
        d: {
            'curveSubStats': curveSubStats,
            'curveSubSecs': curveSubSecs,
            'curveSubLevs': curveSubLevs
        },
        N0: curveSubStats.length,
        N_times: curveSubSecs.length
    };
};

export default matsDataQueryUtils = {

    simplePoolQueryWrapSynchronous: simplePoolQueryWrapSynchronous,
    queryDBTimeSeries: queryDBTimeSeries,
    queryDBSpecialtyCurve: queryDBSpecialtyCurve,
    queryMapDB: queryMapDB

}


