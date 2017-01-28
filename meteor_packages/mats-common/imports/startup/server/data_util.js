const Future = require('fibers/future');

const getDateRange = function (dateRange) {
    var dates = dateRange.split(' - ');
    var fromDateStr = dates[0];
    var fromDate = dateConvert(fromDateStr);
    var toDateStr = dates[1];
    var toDate = dateConvert(toDateStr);
    var fromSecs = secsConvert(fromDateStr);
    var toSecs = secsConvert(toDateStr);
    return {
        fromDate: fromDate,
        toDate: toDate,
        fromSeconds: fromSecs,
        toSeconds: toSecs
    }
};

const sortFunction = function (a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
};

const dateConvert = function (dStr) {
    if (dStr === undefined || dStr === " ") {
        var now = new Date();
        var date = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        var yr = date.getUTCFullYear();
        var day = date.getUTCDate();
        var month = date.getUTCMonth();
        var hour = date.getUTCHours();
        var minute = date.getUTCMinutes();
        return month + "/" + day + '/' + yr + ' ' + hour + ":" + minute;
    }
    var dateParts = dStr.split(' ');
    var dateArray = dateParts[0].split(/[\-\/]/);  // split on - or /    01-01-2017 OR 01/01/2017
    var month = dateArray[0];
    var day = dateArray[1];
    var yr = dateArray[2];
    var hour = 0;
    var minute = 0;
    if (dateParts[1]) {
        var timeArray = dateParts[1].split(":");
        hour = timeArray[0];
        minute = timeArray[1];
    }
    return month + "/" + day + '/' + yr + ' ' + hour + ":" + minute;
};

const secsConvert = function (dStr) {
    if (dStr === undefined || dStr === " ") {
        var now = new Date();
        return now.getTime() / 1000;
    }
    else {
        var dateParts = dStr.split(' ');
        var dateArray = dateParts[0].split(/[\-\/]/);  // split on - or /    01-01-2017 OR 01/01/2017
        var month = dateArray[0];
        var day = dateArray[1];
        var yr = dateArray[2];
        var hour = 0;
        var minute = 0;
        if (dateParts[1]) {
            var timeArray = dateParts[1].split(":");
            hour = timeArray[0];
            minute = timeArray[1];
        }
        var my_date = new Date(Date.UTC(yr, month - 1, day, hour, minute, 0));
        // to UTC time, not local time
        var date_in_secs = my_date.getTime();
    }
    // to UTC time, not local time
    //return date_in_secs/1000 -3600*6;
    return date_in_secs / 1000;
};

const arraysEqual = function (a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

const getMatchedDataSet = function (dataset, interval) {
    /*
     Parameters:
    dataset - this is the current dataset. It should like the following format,
    which is for a small two curve plot, one eith 5 points and one with 2 points.
 [
     {
         "yaxis": 1,
         "label": "C-0",
         "annotation": "C-0- mean = 1.541",
         "color": "rgb(255,102,102)",
         "data": [
             [
                 1483833600000,
                 1.850409153847484
             ],
             [
                 1483876800000,
                 1.3400027011510949
             ],
             [
                 1483920000000,
                 1.4691101455839535
             ],
             [
                 1483963200000,
                 1.5483769085191452
             ],
             [
                 1484006400000,
                 1.4995425753387412
             ]
         ],
         "points": {
         "symbol": "circle",
         "fillColor": "rgb(255,102,102)",
         "show": true
         },
         "lines": {
             "show": true,
             "fill": false
         }
     },
     {
         "yaxis": 1,
         "label": "C-1",
         "annotation": "C-1- mean = 1.444",
         "color": "rgb(102,102,255)",
         "data": [
             [
                 1483876800000,
                 1.3400027011510949
             ],
             [
                 1483963200000,
                 1.5483769085191452
             ]
         ],
         "points": {
             "symbol": "square",
             "fillColor": "rgb(102,102,255)",
             "show": true
         },
         "lines": {
             "show": true,
             "fill": false
         }
     }
 ]

interval - a number that contains the integer value of the data interval

RETURN: An object that contains the new dataset and the new yAxisRanges
     {
        dataset:newDataSet,
     }
*/
    //console.log(JSON.stringify(dataset,null,2))
    // for matching - the begin time must be the first coinciding time for all the curves.
    // Once we know at which index the curves coincide we can increment by the interval.
    // time iterator is set to the earliest and timeMax is set to the latest time,
    // interval is the maximum valid time interval
    var curvesLength = dataset.length;
    var dataIndexes = {};
    var ci;
    var sci;
    var time = Number.MAX_VALUE;
    var timeMax = Number.MIN_VALUE;
    // set up the indexes and determine the minimum time for the dataset
    for (ci = 0; ci < curvesLength; ci++) {
        dataIndexes[ci] = 0;
        time = time < dataset[ci].data[0][0] ? time : dataset[ci].data[0][0];
        timeMax = timeMax > dataset[ci].data[dataset[ci].data.length-1][0] ? timeMax : dataset[ci].data[dataset[ci].data.length-1][0];
    }
    // find the first common start point (by time).
    // if the is none then there is no matched data
    while (!done) {
        var same = true;
        for (ci = 0; ci < curvesLength; ci++) {
            if (dataIndexes[ci] >= dataset[ci].data.length) {
                same = false;
                done = true; // I went past the end - no coinciding points
                break;
            }
            if (ci == curvesLength - 1) {
                if (dataset[ci].data[dataIndexes[ci]][0] > dataset[0].data[dataIndexes[0]][0]) {
                    dataIndexes[0]++;
                    same = false;
                }
            } else {
                if (dataset[ci].data[dataIndexes[ci]][0] > dataset[ci + 1].data[dataIndexes[ci + 1]][0]) {
                    dataIndexes[ci + 1]++;
                    same = false;
                }
            }
        }
        if (same) {
            done = true;
            // since they are the same just use the time
            // belonging to the current dataindex of the 0th curve
            // that will be our common start time
            time = dataset[0].data[dataIndexes[0]][0];
        }
    }
    var timeMatches;
    var newDataSet = [];
    while (time < timeMax) {
        timeMatches = true;
        for (ci = 0; ci < curvesLength; ci++) {
            // move this curves index to equal or exceed the new time
            while (dataset[ci].data[dataIndexes[ci]] && dataset[ci].data[dataIndexes[ci]][0] < time) {
                dataIndexes[ci]++;
            }
            // if the time isn't right or the data is null it doesn't match
            if (dataset[ci].data[dataIndexes[ci]] == undefined || dataset[ci].data[dataIndexes[ci]][0] != time) {
                timeMatches = false;
                break;
            } else {
                // if there is no data entry here at this time it doesn't match
                if (!(dataset[ci].data[dataIndexes[ci]] && dataset[ci].data[dataIndexes[ci]][0] && dataset[ci].data[dataIndexes[ci]][1])) {
                    timeMatches = false;
                }
            }
        }   // for all the curves
        if (timeMatches) {
            for (sci = 0; sci < curvesLength; sci++) {
                if (!newDataSet[sci]) {
                    newDataSet[sci] = {};
                    var keys = Object.keys(dataset[sci]);
                    for (var k = 0; k < keys.length; k++) {
                        var key = keys[k];
                        if (key == "data") {
                            newDataSet[sci][key] = [];
                        } else {
                            newDataSet[sci][key] = dataset[sci][key];
                        }
                    }
                }
                const valueObject = dataset[sci].data[dataIndexes[sci]];
                const valData = valueObject[1];
                // push the data
                newDataSet[sci].data.push(valueObject);
            }
        } else {
            for (sci = 0; sci < curvesLength; sci++) {
                newDataSet[sci] = newDataSet[sci] === undefined ? {} : newDataSet[sci];
                newDataSet[sci].data = newDataSet[sci].data === undefined ? [] : newDataSet[sci].data;
                newDataSet[sci].data.push([time, null]);
            }
        }
        time = Number(time) + Number(interval);
    } // while time
    return newDataSet;
};

const getSeriesDataForDiffCurve = function(dataset, ymin, ymax, diffFrom) {
    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // time values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
    var maxInterval = dataset[diffFrom[0]].interval;
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    if (dataset[diffFrom[0]].interval < dataset[diffFrom[1]].interval) {
        maxInterval = dataset[diffFrom[1]].interval;
        largeIntervalCurveData = dataset[diffFrom[1]].data;
    }
    var minuendData = dataset[diffFrom[0]].data;
    var subtrahendData = dataset[diffFrom[1]].data;
    var subtrahendIndex = 0;
    var minuendIndex = 0;
    var d = [];
    for (var largeIntervalCurveIndex = 0; largeIntervalCurveIndex < largeIntervalCurveData.length; largeIntervalCurveIndex++) {
        var subtrahendTime = subtrahendData[subtrahendIndex][0];
        var minuendTime = minuendData[minuendIndex][0];
        var largeIntervalTime = largeIntervalCurveData[largeIntervalCurveIndex][0];
        while (largeIntervalTime > minuendTime) {
            minuendTime = minuendData[++minuendIndex][0];
        }
        while (largeIntervalTime > subtrahendTime) {
            subtrahendTime = subtrahendData[++subtrahendIndex][0];
        }
        var diffValue = null;
        if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // might be a fill value (null)
            if (minuendData[minuendIndex][1] !== null && subtrahendData[subtrahendIndex][1] !== null) {
                diffValue = minuendData[minuendIndex][1] - subtrahendData[subtrahendIndex][1];
                d.push([largeIntervalTime, diffValue]);
                ymin = diffValue <  ymin ? diffValue : ymin;
                ymax = diffValue > ymax ? diffValue : ymax;
            } else {
                d.push([largeIntervalTime, null])
            }
        }
    }
    return {
        dataset: d,
        ymin: ymin,
        ymax: ymax
    };
};

const getPointSymbol = function (curveIndex) {
    var pointSymbol = "circle";
    switch (curveIndex % 5) {
        case 0:
            pointSymbol = "circle";
            break;
        case 1:
            pointSymbol = "square";
            break;
        case 2:
            pointSymbol = "diamond";
            break;
        case 3:
            pointSymbol = "triangle";
            break;
        case 4:
            pointSymbol = "cross";
            break;
    }
    return pointSymbol;
};

const queryDB = function (statement, validTimeStr, xmin, xmax, interval, averageStr) {
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ctime = [];
    var ymin;
    var ymax;
    sumPool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = 'INFO:0 data records found';
            dFuture['return']();
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveTime = [];
            var curveStat = [];
            var N0_max = 0;
            var N_times_max = 0;
            var time_interval = Number(rows[1].avtime) - Number(rows[0].avtime);
            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var avSeconds = Number(rows[rowIndex].avtime);
                var stat = rows[rowIndex].stat;
                var N0_loop = rows[rowIndex].N0;
                var N_times_loop = rows[rowIndex].N_times;
                if (rowIndex < rows.length - 1) {
                    var time_diff = Number(rows[rowIndex + 1].avtime) - Number(rows[rowIndex].avtime);
                    if (time_diff < time_interval) {
                        time_interval = time_diff;
                    }
                }

                if (N0_loop > N0) {
                    N0_max = N0_loop;
                }
                if (N_times_loop > N_times) {
                    N_times_max = N_times_loop;
                }

                curveTime.push(avSeconds * 1000);
                curveStat.push(stat);
                N0.push(N0_loop);
                N_times.push(N_times_loop);
            }
            interval = time_interval * 1000;
            if (xmin < Number(rows[0].avtime) * 1000 || averageStr != "None") {
                xmin = Number(rows[0].avtime) * 1000;
            }
            var loopTime = xmin;
            while (loopTime < xmax + 1) {
                if (curveTime.indexOf(loopTime) < 0) {
                    d.push([loopTime, null]);
                } else {
                    var d_idx = curveTime.indexOf(loopTime);
                    var this_N0 = N0[d_idx];
                    var this_N_times = N_times[d_idx];
                    if (this_N0 < 0.1 * N0_max || this_N_times < 0.75 * N_times_max) {
                        d.push([loopTime, null]);
                    } else {
                        d.push([loopTime, curveStat[d_idx]]);
                        ctime.push(loopTime);
                    }
                }
                loopTime = loopTime + interval;
            }
            // done waiting - have results
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
        averageStr: averageStr,
        interval: interval,
        ctime:ctime
    };
};

export default matsDataUtils = {
    getDateRange: getDateRange,
    sortFunction: sortFunction,
    dateConvert: dateConvert,
    secsConvert: secsConvert,
    arraysEqual: arraysEqual,
    getMatchedDataSet: getMatchedDataSet,
    getSeriesDataForDiffCurve: getSeriesDataForDiffCurve,
    getPointSymbol: getPointSymbol,
    queryDB:queryDB
}