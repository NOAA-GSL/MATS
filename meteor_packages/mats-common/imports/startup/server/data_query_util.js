import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

const Future = require('fibers/future');

const getModelCadence = function (pool, dataSource, startDate, endDate) {
    var rows = [];
    var cycles;
    try {
        rows = simplePoolQueryWrapSynchronous(pool, "select cycle_seconds " +
            "from mats_common.primary_model_orders_dev " +
            "where model = " +
            "(select new_model as display_text from mats_common.standardized_model_list where old_model = '" + dataSource + "');");
        var cycles_raw = JSON.parse(rows[0].cycle_seconds);
        var cycles_keys = Object.keys(cycles_raw).sort();
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
                    const idxDiff = chosenEndIdx - chosenStartIdx;
                    var middleCycles = [];
                    var currCycles;
                    for (ti = chosenStartIdx + 1; ti < chosenEndIdx; ti++) {
                        currCycles = cycles_raw[cycles_keys[ti]];
                        middleCycles = _.union(middleCycles,currCycles);
                    }
                    const startCycles = cycles_raw[chosenStartTime];
                    const endCycles = cycles_raw[chosenEndTime];
                    cycles = _.union(startCycles, endCycles, middleCycles);
                }
            }
        }
    } catch (e) {
        //ignore - just a safety check, don't want to exit if there isn't a cycles_per_model entry
    }
    if (cycles !== null && cycles !== undefined && cycles.length > 0) {
        for (var c = 0; c < cycles.length; c++) {
            cycles[c] = cycles[c] * 1000;         // convert to milliseconds
        }
    } else {
        cycles = [];
    }
    return cycles;
};


const getTimeInterval = function (avTime, time_interval, foreCastOffset, cycles) {
    //have to calculate the time_interval
    var ti;
    var dayInMilliSeconds = 24 * 60 * 60 * 1000;
    var minCycleTime = Math.min(...cycles);

    var thisCadence = (avTime % dayInMilliSeconds);
    if (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000) < 0) {
        thisCadence = (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000) + dayInMilliSeconds);
    } else {
        thisCadence = (Number(thisCadence) - (Number(foreCastOffset) * 3600 * 1000));
    }

    var thisCadenceIdx = cycles.indexOf(thisCadence);
    if (thisCadenceIdx !== -1) {
        var nextCadenceIdx = thisCadenceIdx + 1;
        if (nextCadenceIdx >= cycles.length) {
            ti = (dayInMilliSeconds - thisCadence) + minCycleTime;
        } else {
            ti = cycles[nextCadenceIdx] - cycles[thisCadenceIdx];
        }
    } else {
        ti = time_interval;
    }

    return ti;
};

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
    const queryWrap = Future.wrap(function (pool, statement, callback) {
        pool.query(statement, function (err, rows) {
            return callback(err, rows);
        });
    });
    return queryWrap(pool, statement).wait();
};

const querySeriesDB = function (pool, statement, averageStr, dataSource, foreCastOffset, startDate, endDate) {
    //Expects statistic passed in as stat, not stat0, and epoch time passed in as avtime.
    // have to get the optional model_cycle_times_ for this data source. If it isn't available then we will assume a regular interval
    const plotParams = matsDataUtils.getPlotParamsFromStack();
    const completenessQCParam = Number(plotParams["completeness"])/100;

    var cycles = getModelCadence(pool, dataSource, startDate, endDate);

    // regular means regular cadence for model initialization, false is a model that has an irregular cadence
    // If averageing the cadence is always regular i.e. its the cadence of the average
    var regular = !(averageStr == "None" && (cycles !== null && cycles.length != 0));

    var time_interval;
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ymin;
    var ymax;
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;

    pool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = matsTypes.Messages.NO_DATA_FOUND;
            // done waiting - error condition
            dFuture['return']();
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveTime = [];
            var curveStat = [];
            var curveSubValues = [];
            var curveSubSecs = [];

            time_interval = rows.length > 1 ? Number(rows[1].avtime) - Number(rows[0].avtime) : undefined;
            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var avSeconds = Number(rows[rowIndex].avtime);
                var avTime = avSeconds * 1000;
                xmin = avTime < xmin ? avTime : xmin;
                xmax = avTime > xmax ? avTime : xmax;
                var stat = rows[rowIndex].stat;
                N0.push(rows[rowIndex].N0);
                N_times.push(rows[rowIndex].N_times);
                // find the minimum time_interval. This might be what we process the loopTime with unless it's is not a regular model
                if (rowIndex < rows.length - 1) {
                    var time_diff = Number(rows[rowIndex + 1].avtime) - Number(rows[rowIndex].avtime);
                    if (time_diff < time_interval) {
                        time_interval = time_diff;
                    }
                }
                var sub_values;
                var sub_secs;
                if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
                    sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                    sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                } else {
                    sub_values = NaN;
                    sub_secs = NaN;
                }
                curveTime.push(avTime);
                curveStat.push(stat);
                curveSubValues.push(sub_values);
                curveSubSecs.push(sub_secs);
            }

            var N0_max = Math.max(...N0);
            var N_times_max = Math.max(...N_times);

            if (xmin < Number(rows[0].avtime) * 1000 || averageStr != "None") {
                xmin = Number(rows[0].avtime) * 1000;
            }

            time_interval = time_interval * 1000;
            var loopTime = xmin;
            while (loopTime <= xmax) {
                var d_idx = curveTime.indexOf(loopTime);
                if (d_idx < 0) {
                    d.push([loopTime, null, -1, NaN, NaN]);
                } else {
                    var this_N0 = N0[d_idx];
                    var this_N_times = N_times[d_idx];
                    // HIDDEN QC! This needs to be brought out to a notification or status on the gui
                    if (this_N0 < 0.1 * N0_max || this_N_times < completenessQCParam * N_times_max) {
                        d.push([loopTime, null, -1, NaN, NaN]);
                    } else {
                        d.push([loopTime, curveStat[d_idx], -1, curveSubValues[d_idx], curveSubSecs[d_idx]]);
                    }
                }
                if (!regular) {  // it is a model that has an irregular set of intervals, i.e. an irregular cadence
                    time_interval = getTimeInterval(loopTime, time_interval, foreCastOffset, cycles);
                }
                loopTime = loopTime + time_interval;
            }
            if (regular) {
                cycles = [time_interval];
            }
            // done waiting - have results
            dFuture['return']();
        }
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
};

const querySeriesWithLevelsDB = function (pool, statement, averageStr, dataSource, foreCastOffset, startDate, endDate) {
    //Expects statistic passed in as stat, not stat0, and epoch time passed in as avtime.
    // have to get the optional model_cycle_times_ for this data source. If it isn't available then we will assume a regular interval
    const plotParams = matsDataUtils.getPlotParamsFromStack();
    const completenessQCParam = Number(plotParams["completeness"])/100;

    var cycles = getModelCadence(pool, dataSource, startDate, endDate);

    // regular means regular cadence for model initialization, false is a model that has an irregular cadence
    // If averageing the cadence is always regular i.e. its the cadence of the average
    var regular = averageStr == "None" && (cycles !== null && cycles.length != 0) ? false : true;

    var time_interval;
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ymin;
    var ymax;
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;

    pool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = matsTypes.Messages.NO_DATA_FOUND;
            // done waiting - error condition
            dFuture['return']();
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveTime = [];
            var curveStat = [];
            var curveSubValues = [];
            var curveSubSecs = [];
            var curveSubLevs = [];

            time_interval = rows.length > 1 ? Number(rows[1].avtime) - Number(rows[0].avtime) : undefined;
            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var avSeconds = Number(rows[rowIndex].avtime);
                var avTime = avSeconds * 1000;
                xmin = avTime < xmin ? avTime : xmin;
                xmax = avTime > xmax ? avTime : xmax;
                var stat = rows[rowIndex].stat;
                N0.push(rows[rowIndex].N0);
                N_times.push(rows[rowIndex].N_times);
                // find the minimum time_interval. This might be what we process the loopTime with unless it's is not a regular model
                if (rowIndex < rows.length - 1) {
                    var time_diff = Number(rows[rowIndex + 1].avtime) - Number(rows[rowIndex].avtime);
                    if (time_diff < time_interval) {
                        time_interval = time_diff;
                    }
                }
                var sub_values;
                var sub_secs;
                var sub_levs;
                if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
                    sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                    sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                    sub_levs = rows[rowIndex].sub_levs0.toString().split(',').map(Number);
                } else {
                    sub_values = NaN;
                    sub_secs = NaN;
                    sub_levs = NaN;
                }
                curveTime.push(avTime);
                curveStat.push(stat);
                curveSubValues.push(sub_values);
                curveSubSecs.push(sub_secs);
                curveSubLevs.push(sub_levs);
            }

            var N0_max = Math.max(...N0);
            var N_times_max = Math.max(...N_times);

            if (xmin < Number(rows[0].avtime) * 1000 || averageStr != "None") {
                xmin = Number(rows[0].avtime) * 1000;
            }

            time_interval = time_interval * 1000;
            var loopTime = xmin;
            while (loopTime <= xmax) {
                var d_idx = curveTime.indexOf(loopTime);
                if (d_idx < 0) {
                    d.push([loopTime, null, -1, NaN, NaN, NaN]);
                } else {
                    var this_N0 = N0[d_idx];
                    var this_N_times = N_times[d_idx];
                    // HIDDEN QC! This needs to be brought out to a notification or status on the gui
                    if (this_N0 < 0.1 * N0_max || this_N_times < completenessQCParam * N_times_max) {
                        d.push([loopTime, null, -1, NaN, NaN, NaN]);
                    } else {
                        d.push([loopTime, curveStat[d_idx], -1, curveSubValues[d_idx], curveSubSecs[d_idx], curveSubLevs[d_idx]]);
                    }
                }
                if (!regular) {  // it is a model that has an irregular set of intervals, i.e. an irregular cadence
                    time_interval = getTimeInterval(loopTime, time_interval, foreCastOffset, cycles);
                }
                loopTime = loopTime + time_interval;
            }
            if (regular) {
                cycles = [time_interval];
            }
            // done waiting - have results
            dFuture['return']();
        }
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
};

const queryProfileDB = function (pool, statement) {

    const plotParams = matsDataUtils.getPlotParamsFromStack();
    const completenessQCParam = Number(plotParams["completeness"])/100;

    var pFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];

    pool.query(statement, function (err, rows) {
        if (err != undefined) {
            error = err.message;
            pFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = matsTypes.Messages.NO_DATA_FOUND;
            // done waiting - error condition
            pFuture['return']();
        } else {
            var curveLevels = [];
            var curveStat = [];
            var curveSubValues = [];
            var curveSubSecs = [];
            var curveSubLevs = [];

            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var avVal = Number(rows[rowIndex].avVal);
                var stat = rows[rowIndex].stat;
                N0.push(rows[rowIndex].N0);
                N_times.push(rows[rowIndex].N_times);
                var sub_values;
                var sub_secs;
                var sub_levs;
                if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
                    sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                    sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                    sub_levs = rows[rowIndex].sub_levs0.toString().split(',').map(Number);
                } else {
                    sub_values = NaN;
                    sub_secs = NaN;
                    sub_levs = NaN;
                }
                curveLevels.push(avVal);
                curveStat.push(stat);
                curveSubValues.push(sub_values);
                curveSubSecs.push(sub_secs);
                curveSubLevs.push(sub_levs);
            }

            var N0_max = Math.max(...N0);
            var N_times_max = Math.max(...N_times);

            for (var d_idx = 0; d_idx < curveLevels.length; d_idx++) {
                var this_N0 = N0[d_idx];
                var this_N_times = N_times[d_idx];
                // HIDDEN QC! This needs to be brought out to a notification or status on the gui
                if (this_N0 < 0.1 * N0_max || this_N_times < completenessQCParam * N_times_max) {
                    d.push([null, curveLevels[d_idx], -1, NaN, NaN, NaN]); // -1 is a placeholder for the stde_betsy value
                } else {
                    d.push([curveStat[d_idx], curveLevels[d_idx], -1, curveSubValues[d_idx], curveSubSecs[d_idx], curveSubLevs[d_idx]]); // -1 is a placeholder for the stde_betsy value
                }
            }

            pFuture['return']();
        }
    });

    // wait for future to finish
    pFuture.wait();
    return {
        data: d,    // [sub_values,sub_secs] as arrays
        error: error,
    };
};

const queryDieoffDB = function (pool, statement, interval) {

    const plotParams = matsDataUtils.getPlotParamsFromStack();
    const completenessQCParam = Number(plotParams["completeness"])/100;

    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ymin;
    var ymax;
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;

    pool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = matsTypes.Messages.NO_DATA_FOUND;
            // done waiting - error condition
            dFuture['return']();
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveFhrs = [];
            var curveStat = [];
            var curveSubValues = [];
            var curveSubSecs = [];

            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var fhr = Number(rows[rowIndex].avtime);
                var stat = rows[rowIndex].stat;
                N0.push(rows[rowIndex].N0);
                N_times.push(rows[rowIndex].N_times);
                var sub_values;
                var sub_secs;
                if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
                    sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                    sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                } else {
                    sub_values = NaN;
                    sub_secs = NaN;
                }
                curveFhrs.push(fhr);
                curveStat.push(stat);
                curveSubValues.push(sub_values);
                curveSubSecs.push(sub_secs);
            }

            var N0_max = Math.max(...N0);
            var N_times_max = Math.max(...N_times);

            for (var d_idx = 0; d_idx < curveFhrs.length; d_idx++) {
                var this_N0 = N0[d_idx];
                var this_N_times = N_times[d_idx];
                // HIDDEN QC! This needs to be brought out to a notification or status on the gui
                if (this_N0 < 0.05 * N0_max || this_N_times < completenessQCParam * N_times_max) {
                    // d.push([curveFhrs[d_idx], null, -1, NaN, NaN]); // -1 is a placeholder for the stde_betsy value
                } else {
                    d.push([curveFhrs[d_idx], curveStat[d_idx], -1, curveSubValues[d_idx], curveSubSecs[d_idx]]); // -1 is a placeholder for the stde_betsy value
                }
            }

            dFuture['return']();
        }
    });

    // wait for future to finish
    dFuture.wait();
    return {
        data: d,
        error: error,
        N0: N0,
        N_times: N_times,
    };
};

const queryDieoffWithLevelsDB = function (pool, statement) {

    const plotParams = matsDataUtils.getPlotParamsFromStack();
    const completenessQCParam = Number(plotParams["completeness"])/100;

    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ymin;
    var ymax;
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;

    pool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = matsTypes.Messages.NO_DATA_FOUND;
            // done waiting - error condition
            dFuture['return']();
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveFhrs = [];
            var curveStat = [];
            var curveSubValues = [];
            var curveSubSecs = [];
            var curveSubLevs = [];

            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var fhr = Number(rows[rowIndex].avtime);
                var stat = rows[rowIndex].stat;
                N0.push(rows[rowIndex].N0);
                N_times.push(rows[rowIndex].N_times);
                var sub_values;
                var sub_secs;
                var sub_levs;
                if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
                    sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                    sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                    sub_levs = rows[rowIndex].sub_levs0.toString().split(',').map(Number);
                } else {
                    sub_values = NaN;
                    sub_secs = NaN;
                    sub_levs = NaN;
                }
                curveFhrs.push(fhr);
                curveStat.push(stat);
                curveSubValues.push(sub_values);
                curveSubSecs.push(sub_secs);
                curveSubLevs.push(sub_levs);
            }

            var N0_max = Math.max(...N0);
            var N_times_max = Math.max(...N_times);

            for (var d_idx = 0; d_idx < curveFhrs.length; d_idx++) {
                var this_N0 = N0[d_idx];
                var this_N_times = N_times[d_idx];
                // HIDDEN QC! This needs to be brought out to a notification or status on the gui
                if (this_N0 < 0.05 * N0_max || this_N_times < completenessQCParam * N_times_max) {
                    // d.push([curveFhrs[d_idx], null, -1, NaN, NaN, NaN]); // -1 is a placeholder for the stde_betsy value
                } else {
                    d.push([curveFhrs[d_idx], curveStat[d_idx], -1, curveSubValues[d_idx], curveSubSecs[d_idx], curveSubLevs[d_idx]]); // -1 is a placeholder for the stde_betsy value
                }
            }

            dFuture['return']();
        }
    });

    // wait for future to finish
    dFuture.wait();
    return {
        data: d,
        error: error,
        N0: N0,
        N_times: N_times,
    };
};

const queryThresholdDB = function (pool, statement) {

    const plotParams = matsDataUtils.getPlotParamsFromStack();
    const completenessQCParam = Number(plotParams["completeness"])/100;

    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ymin;
    var ymax;
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;

    pool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = matsTypes.Messages.NO_DATA_FOUND;
            // done waiting - error condition
            dFuture['return']();
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveTrsh = [];
            var curveStat = [];
            var curveSubValues = [];
            var curveSubSecs = [];

            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var trsh = Number(rows[rowIndex].avtime);
                var stat = rows[rowIndex].stat;
                N0.push(rows[rowIndex].N0);
                N_times.push(rows[rowIndex].N_times);
                var sub_values;
                var sub_secs;
                if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
                    sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                    sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                } else {
                    sub_values = NaN;
                    sub_secs = NaN;
                }
                curveTrsh.push(trsh);
                curveStat.push(stat);
                curveSubValues.push(sub_values);
                curveSubSecs.push(sub_secs);
            }

            var N0_max = Math.max(...N0);
            var N_times_max = Math.max(...N_times);

            for (var d_idx = 0; d_idx < curveTrsh.length; d_idx++) {
                var this_N0 = N0[d_idx];
                var this_N_times = N_times[d_idx];
                // HIDDEN QC! This needs to be brought out to a notification or status on the gui
                if (this_N_times < completenessQCParam * N_times_max) {
                    d.push([curveTrsh[d_idx], null, -1, NaN, NaN]); // -1 is a placeholder for the stde_betsy value
                } else {
                    d.push([curveTrsh[d_idx], curveStat[d_idx], -1, curveSubValues[d_idx], curveSubSecs[d_idx]]); // -1 is a placeholder for the stde_betsy value
                }
            }

            dFuture['return']();
        }
    });

    // wait for future to finish
    dFuture.wait();
    return {
        data: d,
        error: error,
        N0: N0,
        N_times: N_times,
    };
};

const queryValidTimeDB = function (pool, statement) {

    const plotParams = matsDataUtils.getPlotParamsFromStack();
    const completenessQCParam = Number(plotParams["completeness"])/100;

    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ymin;
    var ymax;
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;

    pool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = matsTypes.Messages.NO_DATA_FOUND;
            // done waiting - error condition
            dFuture['return']();
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveVTs = [];
            var curveStat = [];
            var curveSubValues = [];
            var curveSubSecs = [];

            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var hr_of_day = Number(rows[rowIndex].hr_of_day);
                var stat = rows[rowIndex].stat;
                N0.push(rows[rowIndex].N0);
                N_times.push(rows[rowIndex].N_times);
                var sub_values;
                var sub_secs;
                if (stat !== null && rows[rowIndex].sub_values0 !== undefined) {
                    sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                    sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                } else {
                    sub_values = NaN;
                    sub_secs = NaN;
                }
                curveVTs.push(hr_of_day);
                curveStat.push(stat);
                curveSubValues.push(sub_values);
                curveSubSecs.push(sub_secs);
            }

            var N0_max = Math.max(...N0);
            var N_times_max = Math.max(...N_times);

            for (var d_idx = 0; d_idx < curveVTs.length; d_idx++) {
                var this_N0 = N0[d_idx];
                var this_N_times = N_times[d_idx];
                // HIDDEN QC! This needs to be brought out to a notification or status on the gui
                if (this_N_times < completenessQCParam * N_times_max) {
                    d.push([curveVTs[d_idx], null, -1, NaN, NaN]); // -1 is a placeholder for the stde_betsy value
                } else {
                    d.push([curveVTs[d_idx], curveStat[d_idx], -1, curveSubValues[d_idx], curveSubSecs[d_idx]]); // -1 is a placeholder for the stde_betsy value
                }
            }
            // done waiting - have results
            dFuture['return']();
        }
    });

    // wait for future to finish
    dFuture.wait();
    return {
        data: d,
        error: error,
        N0: N0,
        N_times: N_times,
    };
};

const queryMapDB = function (pool, statement) {
    var d = [];  // d will contain the curve data
    var error = "";
    var pFuture = new Future();
    pool.query(statement, function (err, rows) {
            if (err != undefined) {
                error = err.message;
                pFuture['return']();
            } else if (rows === undefined || rows.length === 0) {
                error = matsTypes.Messages.NO_DATA_FOUND;
                // done waiting - error condition
                pFuture['return']();
            } else {
                for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    var siteName = rows[rowIndex].sta_name;
                    var N_times = rows[rowIndex].N_times;
                    var min_time = rows[rowIndex].min_time;
                    var max_time = rows[rowIndex].max_time;
                    var model_diff = rows[rowIndex].model_ob_diff;
                    d.push([siteName, N_times, min_time, max_time, model_diff]);
                }// end of loop row
                // done waiting - have results
                pFuture['return']();
            }
        }
    );
    // wait for future to finish
    pFuture.wait();
    return {
        data: d,    // [sub_values,sub_secs] as arrays
        error: error,
    };
};

export default matsDataQueryUtils = {

    simplePoolQueryWrapSynchronous: simplePoolQueryWrapSynchronous,
    querySeriesDB: querySeriesDB,
    querySeriesWithLevelsDB: querySeriesWithLevelsDB,
    queryProfileDB: queryProfileDB,
    queryDieoffDB: queryDieoffDB,
    queryDieoffWithLevelsDB: queryDieoffWithLevelsDB,
    queryThresholdDB: queryThresholdDB,
    queryValidTimeDB:queryValidTimeDB,
    queryMapDB:queryMapDB

}


