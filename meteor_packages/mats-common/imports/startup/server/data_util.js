import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
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

const arrayContainsArray = function (superArray, subArray) {
    superArray.sort(function (a, b) {
        return Number(a) - Number(b);
    });
    subArray.sort(function (a, b) {
        return Number(a) - Number(b);
    });
    var i, j;
    for (i = 0, j = 0; i < superArray.length && j < subArray.length;) {
        if (superArray[i] < subArray[j]) {
            ++i;
        } else if (superArray[i] == subArray[j]) {
            ++i;
            ++j;
        } else {
            // sub[j] not in sup, so sub not subbag
            return false;
        }
    }
    // make sure there are no elements left in sub
    return j == subArray.length;
};

// dieoff plots always have interval 1
const getDieOffMatchedDataSet = function (dataset) {
    var curvesLength = dataset.length;
    var dataIndexes = {};
    var ci;
    var sci;
    var hour = 0;
    var hourMax = Number.MIN_VALUE;
    var dataMaxInterval = Number.MIN_VALUE;
    // set up the indexes and determine the minimum hour for the dataset
    if (curvesLength == 1) {
        return dataset;
    }
    for (ci = 0; ci < curvesLength; ci++) {
        dataIndexes[ci] = 0;
        hourMax = hourMax > dataset[ci].data[dataset[ci].data.length - 1][0] ? hourMax : dataset[ci].data[dataset[ci].data.length - 1][0];
    }
    var done = false;
    // find the first common start point (by hour).
    // if there is none then there is no matched data
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
            // since they are the same just use the hour
            // belonging to the current dataindex of the 0th curve
            // that will be our common start hour
            hour = dataset[0].data[dataIndexes[0]][0];
        }
    }
    var hourMatches;
    var newDataSet = [];
    while (hour < hourMax) {
        hourMatches = true;
        for (ci = 0; ci < curvesLength; ci++) {
            // move this curves index to equal or exceed the new hour
            while (dataset[ci].data[dataIndexes[ci]] && dataset[ci].data[dataIndexes[ci]][0] < hour) {
                dataIndexes[ci]++;
            }
            // if the hour isn't right or the data is null it doesn't match
            if (dataset[ci].data[dataIndexes[ci]] == undefined || dataset[ci].data[dataIndexes[ci]][0] != hour) {
                hourMatches = false;
                break;
            } else {
                // if there is no data entry here at this hour it doesn't match
                if (!(dataset[ci].data[dataIndexes[ci]]  !== undefined  && dataset[ci].data[dataIndexes[ci]][0] !== undefined && dataset[ci].data[dataIndexes[ci]][1]  !== undefined )) {
                    hourMatches = false;
                }
            }
        }   // for all the curves
        if (hourMatches) {
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
                // push the data
                newDataSet[sci].data.push(valueObject);
            }
        }
        hour = hour + 1;
    }// while hour
    // have to fix options - specifically annotations because the mean may have changed due to dropping unmatched data
    for (ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].annotation === undefined || dataset[ci].annotation == null || dataset[ci].annotation == "") {
            continue;   // don't do it if there isn't an annotation
        }
        var sum = 0;
        var count = 0;
        d = newDataSet[ci].data;
        var mean = d[0][1];
        for (var i = 0; i < d.length; i++) {
            if (d[i][1] !== null) {
                sum = sum + d[i][1];
                count++
            }
        }
        if (count > 1) {
            mean = sum / count;
        }
        const annotationParts = dataset[ci].annotation.split(" = ");
        annotationParts[1] = mean === null ? null : mean.toPrecision(4);
        const annotation = annotationParts.join(" = ");
        var optionsKeys = Object.keys(dataset[ci]);
        var index = optionsKeys.indexOf('data');
        if (index > -1) {
            optionsKeys.splice(index, 1);
        }
        index = optionsKeys.indexOf('annotation');
        if (index > -1) {
            optionsKeys.splice(index, 1);
        }
        optionsKeys.forEach(function (item) {
            newDataSet[ci][item] = dataset[ci][item];
        });
        newDataSet[ci]['annotation'] = annotation;
    }
    return newDataSet;
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
    var dataMaxInterval = Number.MIN_VALUE;
    // set up the indexes and determine the minimum time for the dataset
    if (curvesLength == 1) {
        return dataset;
    }
    for (ci = 0; ci < curvesLength; ci++) {
        dataIndexes[ci] = 0;
        time = time < dataset[ci].data[0][0] ? time : dataset[ci].data[0][0];
        if (interval === undefined && dataset[ci].data.length > 1) {
            const diff = dataset[ci].data[1][0] - dataset[ci].data[0][0];
            dataMaxInterval = dataMaxInterval > diff ? dataMaxInterval : diff;
        }
        timeMax = timeMax > dataset[ci].data[dataset[ci].data.length - 1][0] ? timeMax : dataset[ci].data[dataset[ci].data.length - 1][0];
    }
    if (interval === undefined && dataMaxInterval === Number.MIN_VALUE) {
        // we can't get an interval, give up
        return dataset;
    }
    var done = false;
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
    var matchCount = 1;
    // no valid maximum interval was given us, we have to use our data derived one
    interval = interval === undefined ? dataMaxInterval : interval;
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
                // push the data
                newDataSet[sci].data.push(valueObject);
                matchCount++;
            }
        } else {
            for (sci = 0; sci < curvesLength; sci++) {
                newDataSet[sci] = newDataSet[sci] === undefined ? {} : newDataSet[sci];
                newDataSet[sci].data = newDataSet[sci].data === undefined ? [] : newDataSet[sci].data;
                newDataSet[sci].data.push([time, null]);
            }
        }
        time = Number(time) + Number(interval);
    }// while time
    // have to fix options - specifically annotations because the mean may have changed due to dropping unmatched data
    for (ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].annotation === undefined || dataset[ci].annotation == null || dataset[ci].annotation == "") {
            continue;   // don't do it if there isn't an annotation
        }

        var sum = 0;
        var count = 0;
        d = newDataSet[ci].data;
        var mean = d[0][1];
        for (var i = 0; i < d.length; i++) {
            if (d[i][1] !== null) {
                sum = sum + d[i][1];
                count++
            }
        }
        if (count > 1) {
            mean = sum / count;
        }
        const annotationParts = dataset[ci].annotation.split(" = ");
        annotationParts[1] = mean === null ? null : mean.toPrecision(4);
        const annotation = annotationParts.join(" = ");
        var optionsKeys = Object.keys(dataset[ci]);
        var index = optionsKeys.indexOf('data');
        if (index > -1) {
            optionsKeys.splice(index, 1);
        }
        index = optionsKeys.indexOf('annotation');
        if (index > -1) {
            optionsKeys.splice(index, 1);
        }
        optionsKeys.forEach(function (item) {
            newDataSet[ci][item] = dataset[ci][item];
        });
        newDataSet[ci]['annotation'] = annotation;
    }
    return newDataSet;
};

const getDataForProfileMatchingDiffCurve = function (params) {
    // derive the subset data for the difference
    const dataset = params.dataset; // existing dataset - should contain the difference curve and the base curve
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    var d = [];
    const minuendIndex = diffFrom[1];
    const subtrahendIndex = diffFrom[0];
    const minuendData = dataset[minuendIndex].data;
    const subtrahendData = dataset[subtrahendIndex].data;

    // do the differencing
    //[stat,avVal,sub_values,sub_secs] -- avVal is pressure level
    const l = minuendData.length < subtrahendData.length ? minuendData.length : subtrahendData.length;
    for (var i = 0; i < l; i++) { // each pressure level
        d[i] = [];
        d[i][3] = [];
        d[i][4] = [];
        // pressure level
        d[i][1] = subtrahendData[i][1];
        // values diff
        d[i][0] = minuendData[i][0] - subtrahendData[i][0];
        // do the subValues
        var minuendDataSubValues = minuendData[i][3];
        var minuendDataSubSeconds = minuendData[i][4];
        var subtrahendDataSubValues = subtrahendData[i][3];
        var subtrahendDataSubSeconds = subtrahendData[i][4];
        // find the intersection of the subSeconds
//        var secondsIntersection = _.intersection(minuendDataSubSeconds,subtrahendDataSubSeconds);
        const secondsIntersection = minuendDataSubSeconds.filter(function (n) {
            return subtrahendDataSubSeconds.indexOf(n) !== -1;
        });

        for (var siIndex = 0; siIndex < secondsIntersection.length - 1; siIndex++) {
            d[i][4].push(secondsIntersection[siIndex]);
            d[i][3].push(minuendDataSubValues[siIndex] - subtrahendDataSubValues[siIndex]);
        }
    }
    return {dataset: d};
};

const getDataForProfileUnMatchedDiffCurve = function (params) {
    // just get the level values - not the subset data
    /*
     DATASET ELEMENTS:
     series: [data,data,data ...... ]   each data is itself an array
     data[0] - statValue (ploted against the x axis)
     data[1] - level (plotted against the y axis)
     data[2] - errorBar (stde_betsy * 1.96)
     data[3] - level values
     data[4] - level times
     data[5] - level stats
     data[6] - tooltip
     */

    const dataset = params.dataset; // existing dataset - should contain the difference curve and the base curve
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    var d = [];
    const minuendIndex = diffFrom[0];
    const subtrahendIndex = diffFrom[1];
    const minuendData = dataset[minuendIndex].data;
    const subtrahendData = dataset[subtrahendIndex].data;
    // do the differencing
    //[stat,avVal,sub_values,sub_secs] -- avVal is pressure level

    // get the list of pressure levels for the minuendData
    const mLevels = minuendData.map(function (a) {
        return a[1];
    });

    // get the list of pressure levels for the subtrahendData
    const sLevels = subtrahendData.map(function (a) {
        return a[1];
    });

    // get the intersection of the levels
    const cLevels = mLevels.filter(function (n) {
        return sLevels.indexOf(n) !== -1;
    });
    // itterate all the common levels
    for (var i = 0; i < cLevels.length; i++) { // each pressure level
        var cl = cLevels[i];
        // find the minuend stat for this level
        const minuendStat = minuendData.filter(function (elem) {
            return elem[1] == cl;
        })[0];
        // find the subtrhend stat for this level
        const subtrahendStat = subtrahendData.filter(function (elem) {
            return elem[1] == cl;
        })[0];
        d[i] = [];
        // do the difference
        d[i][0] = minuendStat[0] - subtrahendStat[0];
        // pressure level
        d[i][1] = cl;
        d[i][2] = -1;
        d[i][3] = [];
        d[i][4] = [];
        d[i][5] = {}; // level stats
        d[i][6] = "<br>" + cl * -1 + "mb <br> value:" + (d[i][0] === null ? null : d[i][0].toPrecision(4)); //tooltip
    }
    return {dataset: d};
};

const getDataForSeriesDiffCurve = function (params) {
    const dataset = params.dataset;  // existing dataset - should contain the difference curve and the base curve
    var ymin = params.ymin; // optional - current y axis minimum
    var ymax = params.ymax;  // optional - current yaxis minimum
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // time values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    if (dataset[diffFrom[0]].interval < dataset[diffFrom[1]].interval) {
        largeIntervalCurveData = dataset[diffFrom[1]].data;
    }
    var minuendData = dataset[diffFrom[0]].data;
    var subtrahendData = dataset[diffFrom[1]].data;
    var subtrahendIndex = 0;
    var minuendIndex = 0;
    var d = [];
    var count = 0;
    var sum = 0;
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
                ymin = diffValue < ymin ? diffValue : ymin;
                ymax = diffValue > ymax ? diffValue : ymax;
                sum += diffValue;
                count++;
            } else {
                d.push([largeIntervalTime, null])
            }
        }
    }
    return {
        sum: sum,
        count: count,
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

const get_err = function (sVals, sSecs) {
    /* refer to perl error_library.pl sub  get_stats
     to see the perl implementation of these statics calculations.
     These should match exactly those, except that they are processed in reverse order.
     */
    var subVals = sVals;
    var subSecs = sSecs;
    var n = subVals.length;
    var n_good = 0;
    var sum_d = 0;
    var sum2_d = 0;
    var error = "";
    var i;
    for (i = 0; i < n; i++) {
        n_good = n_good + 1;
        sum_d = sum_d + subVals[i];
        sum2_d = sum2_d + subVals[i] * subVals[i];
    }
    var d_mean = sum_d / n_good;
    var sd2 = sum2_d / n_good - d_mean * d_mean;
    var sd = sd2 > 0 ? Math.sqrt(sd2) : sd2;
    var sd_limit = 3 * sd;
    //console.log("get_err");
    //console.log("see error_library.pl l208 These are processed in reverse order to the perl code -  \nmean is " + d_mean + " sd_limit is +/- " + sd_limit + " n_good is " + n_good + " sum_d is" + sum_d + " sum2_d is " + sum2_d);
    // find minimum delta_time, if any value missing, set null
    var last_secs = Number.MIN_VALUE;
    var minDelta = Number.MAX_VALUE;
    var minSecs = Number.MAX_VALUE;
    var max_secs = Number.MIN_VALUE;
    for (i = 0; i < subSecs.length; i++) {
        var secs = (subSecs[i]);
        var delta = Math.abs(secs - last_secs);
        if (delta < minDelta) {
            minDelta = delta;
        }
        if (secs < minSecs) {
            minSecs = secs;
        }
        if (secs > max_secs) {
            max_secs = secs;
        }
        last_secs = secs;
    }

    var data_wg = [];
    var n_gaps = 0;
    n_good = 0;
    var sum = 0;
    var sum2 = 0;
    var loopTime = minSecs;
    if (minDelta < 0) {
        error = ("Invalid time interval - minDelta: " + minDelta);
        console.log("matsDataUtil.getErr: Invalid time interval - minDelta: " + minDelta)
    }
    // remove data more than $sd_limit from mean
    var qaCorrected = [];
    for (i = 0; i < subVals.length; i++) {
        if (Math.abs(subVals[i] - d_mean) > sd_limit) {
            qaCorrected.push("removing datum " + i + " with value " + subVals[i] + " because it exceeds 3 standard deviations from the mean - mean: " + d_mean + " 3 * sd: " + sd_limit + " delta: " + (subVals[i] - d_mean));
            console.log(qaCorrected.join('\n'));
            subVals[i] = null;
        } else {
            n_good++;
            sum += subVals[i];
            sum2 += subVals[i] * subVals[i];
        }
    }
    if (n_good < 1) {
        return {d_mean: null, stde_betsy: null, sd: null, n_good: n_good, lag1: null, min: null, max: null, sum: null};
    }

    // recalculate if we threw anything away.
    d_mean = sum / n_good;
    sd2 = sum2 / n_good - d_mean * d_mean;
    sd = 0;
    if (sd2 > 0) {
        sd = Math.sqrt(sd2);
    }
    //console.log("new mean after throwing away outliers is " + sd + " n_good is " + n_good + " sum is " + sum  + " sum2 is " + sum2 + " d_mean is " + d_mean);
    // look for gaps.... per Bill, we only need one gap per series of gaps...
    var lastSecond = Number.MIN_VALUE;

    for (i = 0; i < subSecs.length; i++) {
        var sec = subSecs[i];
        if (lastSecond >= 0) {
            if (sec - lastSecond > minDelta) {
                // insert a gap
                data_wg.push(null);
                n_gaps++;
            }
        }
        lastSecond = sec;
        data_wg.push(subVals[i]);
    }
    //console.log ("n_gaps: " + n_gaps +  " time gaps in subseries");

    //from http://www.itl.nist.gov/div898/handbook/eda/section3/eda35c.htm
    var r = [];
    for (var lag = 0; lag <= 1; lag++) {
        r[lag] = 0;
        var n_in_lag = 0;
        for (var t = 0; t < ((n + n_gaps) - lag); t++) {
            if (data_wg[t] != null && data_wg[t + lag] != null) {
                r[lag] += +(data_wg[t] - d_mean) * (data_wg[t + lag] - d_mean);
                n_in_lag++;
            }
        }
        if (n_in_lag > 0 && sd > 0) {
            r[lag] /= (n_in_lag * sd * sd);
        } else {
            r[lag] = null;
        }
        //console.log('r for lag ' + lag + " is " + r[lag] + " n_in_lag is " + n_in_lag + " n_good is " + n_good);
    }
    // Betsy Weatherhead's correction, based on lag 1
    if (r[1] >= 1) {
        r[1] = .99999;
    }
    const betsy = Math.sqrt((n_good - 1) * (1 - r[1]));
    var stde_betsy;
    if (betsy != 0) {
        stde_betsy = sd / betsy;
    } else {
        stde_betsy = null;
    }
    const stats = {
        d_mean: d_mean,
        stde_betsy: stde_betsy,
        sd: sd,
        n_good: n_good,
        lag1: r[1],
        min: minSecs,
        max: max_secs,
        sum: sum_d,
        qaCorrected: qaCorrected
    };
    //console.log("stats are " + JSON.stringify(stats));
    // stde_betsy is standard error with auto correlation
    //console.log("---------\n\n");
    return stats;
};

const queryProfileDB = function (pool, statement, statisticSelect, label) {
    var d = [];  // d will contain the curve data
    var error = "";
    var pFuture = new Future();
    pool.query(statement, function (err, rows) {
            if (err != undefined) {
                error = err.message;
                pFuture['return']();
            } else if (rows === undefined || rows.length === 0) {
                error = 'rows undefined error';
                if (rows.length === 0) {
                    error = 'INFO:0 data records found';
                }
                // done waiting - error condition
                pFuture['return']();
            } else {
                for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    var avVal = Number(rows[rowIndex].avVal);
                    var stat = rows[rowIndex].stat;
                    var sub_values = rows[rowIndex].sub_values0.toString().split(',').map(Number);
                    var sub_secs = rows[rowIndex].sub_secs0.toString().split(',').map(Number);
                    d.push([stat, avVal, -1, sub_values, sub_secs]); // -1 is a placeholder for the stde_betsy value
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
const queryDieoffDB = function (pool, statement, interval) {
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    //var ctime = [];
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
            error = 'rows undefined error';
            if (rows.length === 0) {
                error = 'INFO:0 data records found';
            }
            // done waiting - error condition
            dFuture['return']();
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveTime = [];
            var curveStat = [];
            var N0_max = 0;
            var N_times_max = 0;
            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var fhr = Number(rows[rowIndex].avtime);
                var stat = rows[rowIndex].stat;
                var N0_loop = rows[rowIndex].N0;
                var N_times_loop = rows[rowIndex].N_times;
                if (N0_loop > N0) {
                    N0_max = N0_loop;
                }
                if (N_times_loop > N_times) {
                    N_times_max = N_times_loop;
                }
                d.push([fhr, stat]);
                N0.push(N0_loop);
                N_times.push(N_times_loop);
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

const querySeriesDB = function (pool, statement, interval, averageStr) {
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    //var ctime = [];
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
            error = 'rows undefined error';
            if (rows.length === 0) {
                error = 'INFO:0 data records found';
            }
            // done waiting - error condition
            dFuture['return']();
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveTime = [];
            var curveStat = [];
            var N0_max = 0;
            var N_times_max = 0;
            var time_interval = rows.length > 1 ? Number(rows[1].avtime) - Number(rows[0].avtime) : undefined;
            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var avSeconds = Number(rows[rowIndex].avtime);
                var avTime = avSeconds * 1000;
                xmin = avTime < xmin ? avTime : xmin;
                xmax = avTime > xmax ? avTime : xmax;
                var stat = rows[rowIndex].stat;
                var N0_loop = rows[rowIndex].N0;
                var N_times_loop = rows[rowIndex].N_times;
                if (rowIndex < rows.length - 1) {
                    // find the minimum interval for this query
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

                curveTime.push(avTime);
                curveStat.push(stat);
                N0.push(N0_loop);
                N_times.push(N_times_loop);
            }
            var interval = time_interval !== undefined ? time_interval * 1000 : undefined;
            if (xmin < Number(rows[0].avtime) * 1000 || averageStr != "None") {
                xmin = Number(rows[0].avtime) * 1000;
            }
            if (interval < 0) {
                error = ("Invalid time interval: " + interval);
                dFuture['return']();
            }
            var loopTime = xmin;
            while (loopTime <= xmax) {
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
                    }
                }
                loopTime = loopTime + interval;
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
        interval: interval,
    };
};

const generateDieoffPlotOptions = function (dataset, curves, axisMap) {
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    var axisLabel;
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        const ymin = axisMap[axisKey].ymin;
        const ymax = axisMap[axisKey].ymax;
        axisLabel = axisMap[axisKey].axisLabel;
        const yPad = (ymax - ymin) * 0.2;
        const position = dsi === 0 ? "left" : "right";
        const yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: axisLabel,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: axisLabel.length > 40 ? 16 : 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            tickDecimals: 1,
            min: ymin - yPad,
            max: ymax + yPad
        };
        const yaxisOptions = {   // used for zooming
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: 'forecast hour',
            color: 'grey',
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: axisLabel.length > 40 ? 16 : 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
        }],
        xaxis: {
            zoomRange: [0.1, null],
            mode: 'xy'
        },
        yaxes: yaxes,
        yaxis: yaxis,
        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0,
            position: 'ne'
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            content: "<span style='font-size:150%'><strong>%s<br>%x:<br>value %y</strong></span>",
            xDateFormat: "%Y-%m-%d:%H",
            onHover: function (flotItem, $tooltipEl) {
            }
        }
    };
    return options;
};

const generateSeriesPlotOptions = function (dataset, curves, axisMap) {
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    var axisLabel;
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        const ymin = axisMap[axisKey].ymin;
        const ymax = axisMap[axisKey].ymax;
        axisLabel = axisMap[axisKey].axisLabel;
        const yPad = (ymax - ymin) * 0.2;
        const position = dsi === 0 ? "left" : "right";
        const yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: axisLabel,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: axisLabel.length > 40 ? 16 : 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            tickDecimals: 1,
            min: ymin - yPad,
            max: ymax + yPad
        };
        const yaxisOptions = {   // used for zooming
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: 'time',
            color: 'grey',
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: axisLabel.length > 40 ? 16 : 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
        }],
        xaxis: {
            zoomRange: [0.1, null],
            mode: 'time'
        },
        yaxes: yaxes,
        yaxis: yaxis,
        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0,
            position: 'ne'
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            content: "<span style='font-size:150%'><strong>%s<br>%x:<br>value %y</strong></span>",
            xDateFormat: "%Y-%m-%d:%H",
            onHover: function (flotItem, $tooltipEl) {
            }
        }
    };
    return options;
};


const generateProfileCurveOptions = function (curve, curveIndex, axisMap, dataSeries) {
    /*
     some curves will share an axis based on the axis map key.
     for example all the curves that have the same variable and statistic might share an axis.
     The axis key might be different for different apps.
     These axis have parameters that have been stashed in the axisMap
     PARAMETERS:
     curve -  the curve object
     curveIndex : Number - the integer index of this curve
     axisMap: object - a map of axis params ....
     required curve params for generating an axisMap are:
     label : String - that is the label of an axis
     axisKey : String - the axisMap key for this curve, i.e. the curves variable and statistic concatenated together.
     optional params in an axisMap:
     annotation : String - gets placed on the graph at the top left. e.g. "mean" for a time series.
     dataSeries : array - the actual flot dataSeries array for this curve.  like [[x,y],[x,y], .... [x,y]]
     */
    const label = curve['label'];
    const axisKey = curve['axisKey'];
    const annotation = curve['annotation'];
    const color = curve['color'];
    const ymin = curve['ymin'];
    const ymax = curve['ymax'];
    const xmin = curve['xmin'];
    const xmax = curve['xmax'];
    const pointSymbol = getPointSymbol(curveIndex);
    if (axisKey in axisMap) {
        if (axisMap[axisKey].axisLabel === undefined || axisMap[axisKey].axisLabel == "") {
            axisMap[axisKey].axisLabel = label;
        } else {
            axisMap[axisKey].axisLabel = axisMap[axisKey].axisLabel + " | " + label;
        }
        axisMap[axisKey].ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        axisMap[axisKey].ymax = ymax > axisMap[axisKey].ymax ? ymax : axisMap[axisKey].ymax;
        axisMap[axisKey].xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        axisMap[axisKey].xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
    } else {
        axisMap[axisKey] = {
            index: curveIndex + 1,
            label: label,
            xmin: xmin,
            xmax: xmax,
            ymin: ymin,
            ymax: ymax,
            axisLabel: axisKey + " - " + label
        };
    }
    const curveOptions = {
        yaxis: 1,   // for profiles there is only one xaxis and one yaxis
        label: label,
        color: color,
        data: dataSeries,
        points: {
            symbol: pointSymbol,
            fillColor: color,
            show: true,
            errorbars: "x",
            xerr: {
                show: true,
                asymmetric: false,
                upperCap: "squareCap",
                lowerCap: "squareCap",
                color: color,
                radius: 5
            }
        },

        lines: {
            show: true,
            fill: false
        }
    };
    return curveOptions;
};

const generateDieoffCurveOptions = function (curve, curveIndex, axisMap, dataSeries) {
    /*
     some curves will share an axis based on the axis map key.
     for example all the curves that have the same variable and statistic might share an axis.
     The axis key might be different for different apps.
     These axis have parameters that have been stashed in the axisMap
     PARAMETERS:
     curve -  the curve object
     curveIndex : Number - the integer index of this curve
     axisMap: object - a map of axis params ....
     required curve params for generating an axisMap are:
     label : String - that is the label of an axis
     ymin : Number - the minimum value of the curves y axis that corresponds to this axisKey (in other words for this curve)
     ymax : the maximum value of the curves y axis that corresponds to this axisKey (in other words for this curve)
     axisKey : String - the axisMap key for this curve, i.e. the curves variable and statistic concatenated together.
     optional params in an axisMap:
     annotation : String - gets placed on the graph at the top left. e.g. "mean" for a time series.

     dataSeries : array - the actual flot dataSeries array for this curve.  like [[x,y],[x,y], .... [x,y]]
     */
    const label = curve['label'];
    const ymin = curve['ymin'];
    const ymax = curve['ymax'];
    const axisKey = curve['axisKey'];
    const annotation = curve['annotation'];
    const pointSymbol = getPointSymbol(curveIndex);
    if (axisKey in axisMap) {
        if (axisMap[axisKey].axisLabel === undefined || axisMap[axisKey].axisLabel == "") {
            axisMap[axisKey].axisLabel = label;
        } else {
            axisMap[axisKey].axisLabel = axisMap[axisKey].axisLabel + " | " + label;
        }
        axisMap[axisKey].label = axisMap[axisKey].label + " | " + label;
        axisMap[axisKey].ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        axisMap[axisKey].ymax = ymax > axisMap[axisKey].ymax ? ymax : axisMap[axisKey].ymax;
    } else {
        axisMap[axisKey] = {
            index: curveIndex + 1,
            label: label,
            ymin: ymin,
            ymax: ymax,
            axisLabel: axisKey + " - " + label
        };
    }
    const curveOptions = {
        yaxis: axisMap[axisKey].index,
        label: axisMap[axisKey].axisLabel,
        annotation: annotation,
        color: curve['color'],
        data: dataSeries,
        points: {symbol: pointSymbol, fillColor: curve['color'], show: true},
        lines: {show: true, fill: false}
    };
    return curveOptions;
};

const generateSeriesCurveOptions = function (curve, curveIndex, axisMap, dataSeries) {
    /*
     some curves will share an axis based on the axis map key.
     for example all the curves that have the same variable and statistic might share an axis.
     The axis key might be different for different apps.
     These axis have parameters that have been stashed in the axisMap
     PARAMETERS:
     curve -  the curve object
     curveIndex : Number - the integer index of this curve
     axisMap: object - a map of axis params ....
     required curve params for generating an axisMap are:
     label : String - that is the label of an axis
     ymin : Number - the minimum value of the curves y axis that corresponds to this axisKey (in other words for this curve)
     ymax : the maximum value of the curves y axis that corresponds to this axisKey (in other words for this curve)
     axisKey : String - the axisMap key for this curve, i.e. the curves variable and statistic concatenated together.
     optional params in an axisMap:
     annotation : String - gets placed on the graph at the top left. e.g. "mean" for a time series.

     dataSeries : array - the actual flot dataSeries array for this curve.  like [[x,y],[x,y], .... [x,y]]
     */
    const label = curve['label'];
    const ymin = curve['ymin'];
    const ymax = curve['ymax'];
    const axisKey = curve['axisKey'];
    const annotation = curve['annotation'];
    const pointSymbol = getPointSymbol(curveIndex);
    if (axisKey in axisMap) {
        if (axisMap[axisKey].axisLabel === undefined || axisMap[axisKey].axisLabel == "") {
            axisMap[axisKey].axisLabel = label;
        } else {
            axisMap[axisKey].axisLabel = axisMap[axisKey].axisLabel + " | " + label;
        }
        axisMap[axisKey].label = axisMap[axisKey].label + " | " + label;
        axisMap[axisKey].ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        axisMap[axisKey].ymax = ymax > axisMap[axisKey].ymax ? ymax : axisMap[axisKey].ymax;
    } else {
        axisMap[axisKey] = {
            index: curveIndex + 1,
            label: label,
            ymin: ymin,
            ymax: ymax,
            axisLabel: axisKey + " - " + label
        };
    }
    const curveOptions = {
        yaxis: axisMap[axisKey].index,
        label: axisMap[axisKey].axisLabel,
        annotation: annotation,
        color: curve['color'],
        data: dataSeries,
        points: {symbol: pointSymbol, fillColor: curve['color'], show: true},
        lines: {show: true, fill: false}
    };
    return curveOptions;
};

const generateProfilePlotOptions = function (dataset, curves, axisMap, errorMax) {
// generate y-axis
    var xmin = Number.MAX_VALUE;
    var xmax = Number.MIN_VALUE;
    var xAxislabel = "";
    var axisVariables = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        // only need one xaxisLable (they should all be the same anyway for profiles)
        const thisVar = axisKey.split(':')[0];
        if (xAxislabel == "") {
            axisVariables.push(thisVar);
            xAxislabel = axisMap[axisKey].axisLabel;
        }
        else {
            if (axisVariables.indexOf(thisVar) === -1) {
                axisVariables.push(thisVar);
                if (xAxislabel.length > 30) {
                    xAxislabel += "\n";  // wrap long labels
                }
                xAxislabel = xAxislabel + '|' + axisMap[axisKey].axisLabel;
            }
        }
        xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
    }

    // account for error bars on xaxis
    xmax = xmax + errorMax;
    xmin = xmin - errorMax;
    const xpad = (xmax - xmin) * 0.05;
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: xAxislabel,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: xAxislabel.length > 40 ? 16 : 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
            alignTicksWithAxis: 1,
            color: 'grey',
            min: xmin - xpad,
            max: xmax + xpad,
            font: {
                size: 20,
                lineHeight: 23,
                style: "italic",
                weight: "bold",
                family: "sans-serif",
                variant: "small-caps",
                color: "#545454"
            }
        }],
        xaxis: {
            zoomRange: [0.1, null]
        },
        yaxes: [{
            position: "left",
            color: 'grey',
            axisLabel: ' Pressure (hPa)',
            axisLabelColour: "black",
            font: {
                size: 20,
                lineHeight: 23,
                style: "italic",
                weight: "bold",
                family: "sans-serif",
                variant: "small-caps",
                color: "#545454"
            },
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            ticks: [[-1000, 1000], [-900, 900], [-800, 800], [-700, 700], [-600, 600], [-500, 500], [-400, 400], [-300, 300], [-200, 200], [-100, 100], [0, 0]],
            min: -1100,
            max: 0
        }],
        yaxis: [{
            zoomRange: [0.1, null]
        }],
        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0,
            position: 'ne'
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            // the ct value is the last element of the data series for profiles. This is the tooltip content.
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };
    return options;
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

const doColorScheme = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.ColorScheme.remove({});
    }
    if (matsCollections.ColorScheme.find().count() == 0) {
        matsCollections.ColorScheme.insert({
            colors: [
                "rgb(255,0,0)",
                "rgb(0,0,255)",
                "rgb(255,165,0)",
                "rgb(128,128,128)",
                "rgb(238,130,238)",

                "rgb(238,130,238)",
                "rgb(0,0,139)",
                "rgb(148,0,211)",
                "rgb(105,105,105)",
                "rgb(255,140,0)",

                "rgb(235,92,92)",
                "rgb(82,92,245)",
                "rgb(133,143,143)",
                "rgb(235,143,92)",
                "rgb(190,120,120)",

                "rgb(225,82,92)",
                "rgb(72,82,245)",
                "rgb(123,133,143)",
                "rgb(225,133,92)",
                "rgb(180,120,120)"
            ]
        });
    }
};

const doSettings = function (title, version) {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Settings.remove({});
    }
    if (matsCollections.Settings.find().count() == 0) {
        matsCollections.Settings.insert({
            LabelPrefix: "Curve",
            Title: title,
            appVersion: version,
            LineWidth: 3.5,
            NullFillString: "---",
            resetFromCode: true
        });
    }
    // always update the version, not just if it doesn't exist...
    var settings = matsCollections.Settings.findOne();
    var settingsId = settings._id;
    settings['version'] = version;
    matsCollections.Settings.update(settingsId, {$set: settings});
};

const doCredentials = function () {
// the gmail account for the credentials is mats.mail.daemon@gmail.com - pwd mats2015!
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Credentials.remove({});
    }
    if (matsCollections.Credentials.find().count() == 0) {
        matsCollections.Credentials.insert({
            name: "oauth_google",
            clientId: "499180266722-aai2tddo8s9edv4km1pst88vebpf9hec.apps.googleusercontent.com",
            clientSecret: "xdU0sc7SbdOOEzSyID_PTIRE",
            refresh_token: "1/3bhWyvCMMfwwDdd4F3ftlJs3-vksgg7G8POtiOBwYnhIgOrJDtdun6zK6XiATCKT"
        });
    }
};

const doAuthorization = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Authorization.remove({});
    }
    if (matsCollections.Authorization.find().count() == 0) {
        matsCollections.Authorization.insert({email: "randy.pierce@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "kirk.l.holub@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "jeffrey.a.hamilton@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "bonny.strong@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "molly.b.smith@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "mats.gsd@noaa.gov", roles: ["administrator"]});
    }
};

const doRoles = function () {
    if (process.env.NODE_ENV === "development" || matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Roles.remove({});
    }
    if (matsCollections.Roles.find().count() == 0) {
        matsCollections.Roles.insert({name: "administrator", description: "administrator privileges"});
    }
};

export default matsDataUtils = {
    getDateRange: getDateRange,
    sortFunction: sortFunction,
    dateConvert: dateConvert,
    secsConvert: secsConvert,
    arraysEqual: arraysEqual,
    arrayContainsArray: arrayContainsArray,
    getMatchedDataSet: getMatchedDataSet,
    getDieOffMatchedDataSet: getDieOffMatchedDataSet,
    getDataForSeriesDiffCurve: getDataForSeriesDiffCurve,
    getDataForProfileMatchingDiffCurve: getDataForProfileMatchingDiffCurve,
    getDataForProfileUnMatchedDiffCurve: getDataForProfileUnMatchedDiffCurve,
    getPointSymbol: getPointSymbol,
    generateDieoffPlotOptions: generateDieoffPlotOptions,
    queryDieoffDB: queryDieoffDB,
    querySeriesDB:querySeriesDB,
    generateSeriesPlotOptions: generateSeriesPlotOptions,
    generateSeriesCurveOptions: generateSeriesCurveOptions,
    queryProfileDB: queryProfileDB,
    get_err: get_err,
    generateProfileCurveOptions: generateProfileCurveOptions,
    generateProfilePlotOptions: generateProfilePlotOptions,
    simplePoolQueryWrapSynchronous: simplePoolQueryWrapSynchronous,
    doColorScheme: doColorScheme,
    doSettings: doSettings,
    doCredentials: doCredentials,
    doAuthorization: doAuthorization,
    doRoles: doRoles
}