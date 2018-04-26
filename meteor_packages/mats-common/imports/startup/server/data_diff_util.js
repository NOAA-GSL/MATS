import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';

const getDataForSeriesDiffCurve = function (params) {
    const dataset = params.dataset;  // existing dataset - should contain the difference curve and the base curve
    var ymin = params.ymin; // optional - current y axis minimum
    var ymax = params.ymax;  // optional - current yaxis minimum
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // time values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve

    var curvesLength = dataset.length;
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    // set up the indexes and determine the minimum time for the dataset
    for (var ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible. Just use interval from first curve
            break;
        }
        if (dataset[ci].data.length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci].data[di + 1][0] - dataset[ci].data[di][0];
                if (diff > dataMaxInterval) {
                    dataMaxInterval = diff;
                    largeIntervalCurveData = dataset[ci].data;
                }
            }
        }
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

        var minuendChanged = false;
        while (largeIntervalTime > minuendTime && minuendIndex < minuendData.length - 1) {
            minuendTime = minuendData[++minuendIndex][0];
            minuendChanged = true;
        }
        if (!minuendChanged && minuendIndex >= minuendData.length - 1) {
            ++minuendIndex;
        }

        var subtrahendChanged = false;
        while (largeIntervalTime > subtrahendTime && subtrahendIndex < subtrahendData.length - 1) {
            subtrahendTime = subtrahendData[++subtrahendIndex][0];
            subtrahendChanged = true;
        }
        if (!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) {
            ++subtrahendIndex;
        }

        var diffValue = null;
        if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // might be a fill value (null)
            if ((minuendData[minuendIndex][1] !== null && subtrahendData[subtrahendIndex][1] !== null) && minuendData[minuendIndex][0] === subtrahendData[subtrahendIndex][0]) {
                diffValue = minuendData[minuendIndex][1] - subtrahendData[subtrahendIndex][1];

                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = diffValue;

                var minuendDataSubValues = minuendData[minuendIndex][3];
                var minuendDataSubSeconds = minuendData[minuendIndex][4];
                var subtrahendDataSubValues = subtrahendData[subtrahendIndex][3];
                var subtrahendDataSubSeconds = subtrahendData[subtrahendIndex][4];

                const secondsIntersection = minuendDataSubSeconds.filter(function (n) {
                    return subtrahendDataSubSeconds.indexOf(n) !== -1;
                });
                for (var siIndex = 0; siIndex < secondsIntersection.length; siIndex++) {
                    d[largeIntervalCurveIndex][4].push(secondsIntersection[siIndex]);
                    d[largeIntervalCurveIndex][3].push(minuendDataSubValues[siIndex] - subtrahendDataSubValues[siIndex]);
                }

                ymin = diffValue < ymin ? diffValue : ymin;
                ymax = diffValue > ymax ? diffValue : ymax;
                sum += diffValue;
                count++;
            } else {
                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = null;
            }
        } else if ((!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) || (!minuendChanged && minuendIndex >= minuendData.length - 1)) {
            break;
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

const getDataForSeriesWithLevelsDiffCurve = function (params) {
    const dataset = params.dataset;  // existing dataset - should contain the difference curve and the base curve
    var ymin = params.ymin; // optional - current y axis minimum
    var ymax = params.ymax;  // optional - current yaxis minimum
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // time values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve

    var curvesLength = dataset.length;
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    // set up the indexes and determine the minimum time for the dataset
    for (var ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible. Just use interval from first curve
            break;
        }
        if (dataset[ci].data.length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci].data[di + 1][0] - dataset[ci].data[di][0];
                if (diff > dataMaxInterval) {
                    dataMaxInterval = diff;
                    largeIntervalCurveData = dataset[ci].data;
                }
            }
        }
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

        var minuendChanged = false;
        while (largeIntervalTime > minuendTime && minuendIndex < minuendData.length - 1) {
            minuendTime = minuendData[++minuendIndex][0];
            minuendChanged = true;
        }
        if (!minuendChanged && minuendIndex >= minuendData.length - 1) {
            ++minuendIndex;
        }

        var subtrahendChanged = false;
        while (largeIntervalTime > subtrahendTime && subtrahendIndex < subtrahendData.length - 1) {
            subtrahendTime = subtrahendData[++subtrahendIndex][0];
            subtrahendChanged = true;
        }
        if (!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) {
            ++subtrahendIndex;
        }

        var diffValue = null;
        if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // might be a fill value (null)
            if ((minuendData[minuendIndex][1] !== null && subtrahendData[subtrahendIndex][1] !== null) && minuendData[minuendIndex][0] === subtrahendData[subtrahendIndex][0]) {
                diffValue = minuendData[minuendIndex][1] - subtrahendData[subtrahendIndex][1];

                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][5] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = diffValue;

                var minuendDataSubValues = minuendData[minuendIndex][3];
                var minuendDataSubSeconds = minuendData[minuendIndex][4];
                var minuendDataSubLevels = minuendData[minuendIndex][5];
                var subtrahendDataSubValues = subtrahendData[subtrahendIndex][3];
                var subtrahendDataSubSeconds = subtrahendData[subtrahendIndex][4];
                var subtrahendDataSubLevels = subtrahendData[subtrahendIndex][5];

                for (var mvalIdx = 0; mvalIdx < minuendDataSubValues.length; mvalIdx++) {
                    for (var svalIdx = 0; svalIdx < subtrahendDataSubValues.length; svalIdx++) {
                        if (minuendDataSubSeconds[mvalIdx] === subtrahendDataSubSeconds[svalIdx] && minuendDataSubLevels[mvalIdx] === subtrahendDataSubLevels[svalIdx]) {

                            d[largeIntervalCurveIndex][5].push(minuendDataSubLevels[mvalIdx]);
                            d[largeIntervalCurveIndex][4].push(minuendDataSubSeconds[mvalIdx]);
                            d[largeIntervalCurveIndex][3].push(minuendDataSubValues[mvalIdx] - subtrahendDataSubValues[svalIdx]);

                        }
                    }
                }

                ymin = diffValue < ymin ? diffValue : ymin;
                ymax = diffValue > ymax ? diffValue : ymax;
                sum += diffValue;
                count++;
            } else {
                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][5] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = null;
            }
        } else if ((!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) || (!minuendChanged && minuendIndex >= minuendData.length - 1)) {
            break;
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

const getDataForProfileDiffCurve = function (params) {
    // derive the subset data for the difference
    const dataset = params.dataset; // existing dataset - should contain the difference curve and the base curve
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // time values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
    var curvesLength = dataset.length;
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    // set up the indexes and determine the minimum time for the dataset
    for (var ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible. Just use interval from first curve
            break;
        }
        if (dataset[ci].data.length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci].data[di + 1][1] - dataset[ci].data[di][1];
                if (diff > dataMaxInterval) {
                    dataMaxInterval = diff;
                    largeIntervalCurveData = dataset[ci].data;
                }
            }
        }
    }

    var minuendData = dataset[diffFrom[0]].data;
    var subtrahendData = dataset[diffFrom[1]].data;
    var subtrahendIndex = 0;
    var minuendIndex = 0;
    var d = [];

    for (var largeIntervalCurveIndex = 0; largeIntervalCurveIndex < largeIntervalCurveData.length; largeIntervalCurveIndex++) {
        var subtrahendLevel = subtrahendData[subtrahendIndex][1];
        var minuendLevel = minuendData[minuendIndex][1];
        var largeIntervalLevel = largeIntervalCurveData[largeIntervalCurveIndex][1];

        var minuendChanged = false;
        while (largeIntervalLevel > minuendLevel && minuendIndex < minuendData.length - 1) {
            minuendLevel = minuendData[++minuendIndex][1];
            minuendChanged = true;
        }
        if (!minuendChanged && minuendIndex >= minuendData.length - 1) {
            ++minuendIndex;
        }

        var subtrahendChanged = false;
        while (largeIntervalLevel > subtrahendLevel && subtrahendIndex < subtrahendData.length - 1) {
            subtrahendLevel = subtrahendData[++subtrahendIndex][1];
            subtrahendChanged = true;
        }
        if (!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) {
            ++subtrahendIndex;
        }

        var diffValue = null;
        if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // might be a fill value (null)
            if ((minuendData[minuendIndex][0] !== null && subtrahendData[subtrahendIndex][0] !== null) && minuendData[minuendIndex][1] === subtrahendData[subtrahendIndex][1]) {
                diffValue = minuendData[minuendIndex][0] - subtrahendData[subtrahendIndex][0];

                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][5] = [];
                d[largeIntervalCurveIndex][1] = largeIntervalLevel;
                d[largeIntervalCurveIndex][0] = diffValue;

                var minuendDataSubValues = minuendData[minuendIndex][3];
                var minuendDataSubSeconds = minuendData[minuendIndex][4];
                var minuendDataSubLevels = minuendData[minuendIndex][5];
                var subtrahendDataSubValues = subtrahendData[subtrahendIndex][3];
                var subtrahendDataSubSeconds = subtrahendData[subtrahendIndex][4];
                var subtrahendDataSubLevels = subtrahendData[subtrahendIndex][5];

                for (var mvalIdx = 0; mvalIdx < minuendDataSubValues.length; mvalIdx++) {
                    for (var svalIdx = 0; svalIdx < subtrahendDataSubValues.length; svalIdx++) {
                        if (minuendDataSubSeconds[mvalIdx] === subtrahendDataSubSeconds[svalIdx] && minuendDataSubLevels[mvalIdx] === subtrahendDataSubLevels[svalIdx]) {

                            d[largeIntervalCurveIndex][5].push(minuendDataSubLevels[mvalIdx]);
                            d[largeIntervalCurveIndex][4].push(minuendDataSubSeconds[mvalIdx]);
                            d[largeIntervalCurveIndex][3].push(minuendDataSubValues[mvalIdx] - subtrahendDataSubValues[svalIdx]);

                        }
                    }
                }
            } else {
                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][5] = [];
                d[largeIntervalCurveIndex][1] = largeIntervalLevel;
                d[largeIntervalCurveIndex][0] = null;
            }
        } else if ((!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) || (!minuendChanged && minuendIndex >= minuendData.length - 1)) {
            break;
        }
    }
    return {dataset: d};
};

const getDataForDieoffDiffCurve = function (params) {
    /*
     DATASET ELEMENTS:
     series: [data,data,data ...... ]   each data is itself an array
     data[0] - fhr (plotted against the x axis)
     data[1] - statValue (ploted against the y axis)
     data[2] - errorBar (stde_betsy * 1.96)
     data[3] - fhr values
     data[4] - fhr times
     data[5] - fhr stats
     data[6] - tooltip
     */

    const dataset = params.dataset;  // existing dataset - should contain the difference curve and the base curve
    var ymin = params.ymin; // optional - current y axis minimum
    var ymax = params.ymax;  // optional - current yaxis minimum
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // time values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
    var curvesLength = dataset.length;
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    // set up the indexes and determine the minimum time for the dataset
    for (var ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible. Just use interval from first curve
            break;
        }
        if (dataset[ci].data.length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci].data[di + 1][0] - dataset[ci].data[di][0];
                if (diff > dataMaxInterval) {
                    dataMaxInterval = diff;
                    largeIntervalCurveData = dataset[ci].data;
                }
            }
        }
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

        var minuendChanged = false;
        while (largeIntervalTime > minuendTime && minuendIndex < minuendData.length - 1) {
            minuendTime = minuendData[++minuendIndex][0];
            minuendChanged = true;
        }
        if (!minuendChanged && minuendIndex >= minuendData.length - 1) {
            ++minuendIndex;
        }

        var subtrahendChanged = false;
        while (largeIntervalTime > subtrahendTime && subtrahendIndex < subtrahendData.length - 1) {
            subtrahendTime = subtrahendData[++subtrahendIndex][0];
            subtrahendChanged = true;
        }
        if (!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) {
            ++subtrahendIndex;
        }

        var diffValue = null;
        if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // might be a fill value (null)
            if ((minuendData[minuendIndex][1] !== null && subtrahendData[subtrahendIndex][1] !== null) && minuendData[minuendIndex][0] === subtrahendData[subtrahendIndex][0]) {
                diffValue = minuendData[minuendIndex][1] - subtrahendData[subtrahendIndex][1];

                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = diffValue;

                var minuendDataSubValues = minuendData[minuendIndex][3];
                var minuendDataSubSeconds = minuendData[minuendIndex][4];
                var subtrahendDataSubValues = subtrahendData[subtrahendIndex][3];
                var subtrahendDataSubSeconds = subtrahendData[subtrahendIndex][4];

                const secondsIntersection = minuendDataSubSeconds.filter(function (n) {
                    return subtrahendDataSubSeconds.indexOf(n) !== -1;
                });
                for (var siIndex = 0; siIndex < secondsIntersection.length; siIndex++) {
                    d[largeIntervalCurveIndex][4].push(secondsIntersection[siIndex]);
                    d[largeIntervalCurveIndex][3].push(minuendDataSubValues[siIndex] - subtrahendDataSubValues[siIndex]);
                }

                ymin = diffValue < ymin ? diffValue : ymin;
                ymax = diffValue > ymax ? diffValue : ymax;
                sum += diffValue;
                count++;
            } else {
                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = null;
            }
        } else if ((!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) || (!minuendChanged && minuendIndex >= minuendData.length - 1)) {
            break;
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

const getDataForDieoffWithLevelsDiffCurve = function (params) {
    /*
     DATASET ELEMENTS:
     series: [data,data,data ...... ]   each data is itself an array
     data[0] - fhr (plotted against the x axis)
     data[1] - statValue (ploted against the y axis)
     data[2] - errorBar (stde_betsy * 1.96)
     data[3] - fhr values
     data[4] - fhr times
     data[5] - fhr stats
     data[6] - tooltip
     */

    const dataset = params.dataset;  // existing dataset - should contain the difference curve and the base curve
    var ymin = params.ymin; // optional - current y axis minimum
    var ymax = params.ymax;  // optional - current yaxis minimum
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // time values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
    var curvesLength = dataset.length;
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    // set up the indexes and determine the minimum time for the dataset
    for (var ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible. Just use interval from first curve
            break;
        }
        if (dataset[ci].data.length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci].data[di + 1][0] - dataset[ci].data[di][0];
                if (diff > dataMaxInterval) {
                    dataMaxInterval = diff;
                    largeIntervalCurveData = dataset[ci].data;
                }
            }
        }
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

        var minuendChanged = false;
        while (largeIntervalTime > minuendTime && minuendIndex < minuendData.length - 1) {
            minuendTime = minuendData[++minuendIndex][0];
            minuendChanged = true;
        }
        if (!minuendChanged && minuendIndex >= minuendData.length - 1) {
            ++minuendIndex;
        }

        var subtrahendChanged = false;
        while (largeIntervalTime > subtrahendTime && subtrahendIndex < subtrahendData.length - 1) {
            subtrahendTime = subtrahendData[++subtrahendIndex][0];
            subtrahendChanged = true;
        }
        if (!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) {
            ++subtrahendIndex;
        }

        var diffValue = null;
        if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // might be a fill value (null)
            if ((minuendData[minuendIndex][1] !== null && subtrahendData[subtrahendIndex][1] !== null) && minuendData[minuendIndex][0] === subtrahendData[subtrahendIndex][0]) {
                diffValue = minuendData[minuendIndex][1] - subtrahendData[subtrahendIndex][1];

                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][5] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = diffValue;

                var minuendDataSubValues = minuendData[minuendIndex][3];
                var minuendDataSubSeconds = minuendData[minuendIndex][4];
                var minuendDataSubLevels = minuendData[minuendIndex][5];
                var subtrahendDataSubValues = subtrahendData[subtrahendIndex][3];
                var subtrahendDataSubSeconds = subtrahendData[subtrahendIndex][4];
                var subtrahendDataSubLevels = subtrahendData[subtrahendIndex][5];

                for (var mvalIdx = 0; mvalIdx < minuendDataSubValues.length; mvalIdx++) {
                    for (var svalIdx = 0; svalIdx < subtrahendDataSubValues.length; svalIdx++) {
                        if (minuendDataSubSeconds[mvalIdx] === subtrahendDataSubSeconds[svalIdx] && minuendDataSubLevels[mvalIdx] === subtrahendDataSubLevels[svalIdx]) {

                            d[largeIntervalCurveIndex][5].push(minuendDataSubLevels[mvalIdx]);
                            d[largeIntervalCurveIndex][4].push(minuendDataSubSeconds[mvalIdx]);
                            d[largeIntervalCurveIndex][3].push(minuendDataSubValues[mvalIdx] - subtrahendDataSubValues[svalIdx]);

                        }
                    }
                }

                ymin = diffValue < ymin ? diffValue : ymin;
                ymax = diffValue > ymax ? diffValue : ymax;
                sum += diffValue;
                count++;
            } else {
                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][5] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = null;
            }
        } else if ((!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) || (!minuendChanged && minuendIndex >= minuendData.length - 1)) {
            break;
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

const getDataForThresholdDiffCurve = function (params) {
    /*
     DATASET ELEMENTS:
     series: [data,data,data ...... ]   each data is itself an array
     data[0] - trsh (plotted against the x axis)
     data[1] - statValue (ploted against the y axis)
     data[2] - errorBar (stde_betsy * 1.96)
     data[3] - trsh values
     data[4] - trsh times
     data[5] - trsh stats
     data[6] - tooltip
     */

    const dataset = params.dataset;  // existing dataset - should contain the difference curve and the base curve
    var ymin = params.ymin; // optional - current y axis minimum
    var ymax = params.ymax;  // optional - current yaxis minimum
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // time values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
    var curvesLength = dataset.length;
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    // set up the indexes and determine the minimum time for the dataset
    for (var ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible. Just use interval from first curve
            break;
        }
        if (dataset[ci].data.length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci].data[di + 1][0] - dataset[ci].data[di][0];
                if (diff > dataMaxInterval) {
                    dataMaxInterval = diff;
                    largeIntervalCurveData = dataset[ci].data;
                }
            }
        }
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

        var minuendChanged = false;
        while (largeIntervalTime > minuendTime && minuendIndex < minuendData.length - 1) {
            minuendTime = minuendData[++minuendIndex][0];
            minuendChanged = true;
        }
        if (!minuendChanged && minuendIndex >= minuendData.length - 1) {
            ++minuendIndex;
        }

        var subtrahendChanged = false;
        while (largeIntervalTime > subtrahendTime && subtrahendIndex < subtrahendData.length - 1) {
            subtrahendTime = subtrahendData[++subtrahendIndex][0];
            subtrahendChanged = true;
        }
        if (!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) {
            ++subtrahendIndex;
        }

        var diffValue = null;
        if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // might be a fill value (null)
            if ((minuendData[minuendIndex][1] !== null && subtrahendData[subtrahendIndex][1] !== null) && minuendData[minuendIndex][0] === subtrahendData[subtrahendIndex][0]) {
                diffValue = minuendData[minuendIndex][1] - subtrahendData[subtrahendIndex][1];

                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = diffValue;

                var minuendDataSubValues = minuendData[minuendIndex][3];
                var minuendDataSubSeconds = minuendData[minuendIndex][4];
                var subtrahendDataSubValues = subtrahendData[subtrahendIndex][3];
                var subtrahendDataSubSeconds = subtrahendData[subtrahendIndex][4];

                const secondsIntersection = minuendDataSubSeconds.filter(function (n) {
                    return subtrahendDataSubSeconds.indexOf(n) !== -1;
                });
                for (var siIndex = 0; siIndex < secondsIntersection.length; siIndex++) {
                    d[largeIntervalCurveIndex][4].push(secondsIntersection[siIndex]);
                    d[largeIntervalCurveIndex][3].push(minuendDataSubValues[siIndex] - subtrahendDataSubValues[siIndex]);
                }

                ymin = diffValue < ymin ? diffValue : ymin;
                ymax = diffValue > ymax ? diffValue : ymax;
                sum += diffValue;
                count++;
            } else {
                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = null;
            }
        } else if ((!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) || (!minuendChanged && minuendIndex >= minuendData.length - 1)) {
            break;
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

const getDataForValidTimeDiffCurve = function (params) {
    const dataset = params.dataset;  // existing dataset - should contain the difference curve and the base curve
    var ymin = params.ymin; // optional - current y axis minimum
    var ymax = params.ymax;  // optional - current yaxis minimum
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // time values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
    var curvesLength = dataset.length;
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    // set up the indexes and determine the minimum time for the dataset
    for (var ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible. Just use interval from first curve
            break;
        }
        if (dataset[ci].data.length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci].data[di + 1][0] - dataset[ci].data[di][0];
                if (diff > dataMaxInterval) {
                    dataMaxInterval = diff;
                    largeIntervalCurveData = dataset[ci].data;
                }
            }
        }
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

        var minuendChanged = false;
        while (largeIntervalTime > minuendTime && minuendIndex < minuendData.length - 1) {
            minuendTime = minuendData[++minuendIndex][0];
            minuendChanged = true;
        }
        if (!minuendChanged && minuendIndex >= minuendData.length - 1) {
            ++minuendIndex;
        }

        var subtrahendChanged = false;
        while (largeIntervalTime > subtrahendTime && subtrahendIndex < subtrahendData.length - 1) {
            subtrahendTime = subtrahendData[++subtrahendIndex][0];
            subtrahendChanged = true;
        }
        if (!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) {
            ++subtrahendIndex;
        }

        var diffValue = null;
        if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // might be a fill value (null)
            if ((minuendData[minuendIndex][1] !== null && subtrahendData[subtrahendIndex][1] !== null) && minuendData[minuendIndex][0] === subtrahendData[subtrahendIndex][0]) {
                diffValue = minuendData[minuendIndex][1] - subtrahendData[subtrahendIndex][1];

                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = diffValue;

                var minuendDataSubValues = minuendData[minuendIndex][3];
                var minuendDataSubSeconds = minuendData[minuendIndex][4];
                var subtrahendDataSubValues = subtrahendData[subtrahendIndex][3];
                var subtrahendDataSubSeconds = subtrahendData[subtrahendIndex][4];

                const secondsIntersection = minuendDataSubSeconds.filter(function (n) {
                    return subtrahendDataSubSeconds.indexOf(n) !== -1;
                });
                for (var siIndex = 0; siIndex < secondsIntersection.length; siIndex++) {
                    d[largeIntervalCurveIndex][4].push(secondsIntersection[siIndex]);
                    d[largeIntervalCurveIndex][3].push(minuendDataSubValues[siIndex] - subtrahendDataSubValues[siIndex]);
                }

                ymin = diffValue < ymin ? diffValue : ymin;
                ymax = diffValue > ymax ? diffValue : ymax;
                sum += diffValue;
                count++;
            } else {
                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                d[largeIntervalCurveIndex][0] = largeIntervalTime;
                d[largeIntervalCurveIndex][1] = null;
            }
        } else if ((!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) || (!minuendChanged && minuendIndex >= minuendData.length - 1)) {
            break;
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

export default matsDataDiffUtils = {

    getDataForSeriesDiffCurve: getDataForSeriesDiffCurve,
    getDataForSeriesWithLevelsDiffCurve: getDataForSeriesWithLevelsDiffCurve,
    getDataForProfileDiffCurve: getDataForProfileDiffCurve,
    getDataForDieoffDiffCurve: getDataForDieoffDiffCurve,
    getDataForDieoffWithLevelsDiffCurve: getDataForDieoffWithLevelsDiffCurve,
    getDataForThresholdDiffCurve: getDataForThresholdDiffCurve,
    getDataForValidTimeDiffCurve: getDataForValidTimeDiffCurve

}
