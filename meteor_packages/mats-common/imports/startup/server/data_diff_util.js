import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';

//returns the data for whichever curve has the larger interval in its independent variable
const getLargeIntervalCurveData = function (dataset, diffFrom, curvesLength, independentVarName) {
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]];
    // set up the indexes and determine the minimum independentVarName value for the dataset
    for (var ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci][independentVarName] === undefined || dataset[ci][independentVarName].length === 0) {
            // one of the curves has no data. No match possible. Just use interval from first curve
            break;
        }
        if (dataset[ci][independentVarName].length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci][independentVarName].length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci][independentVarName][di + 1] - dataset[ci][independentVarName][di];
                if (diff > dataMaxInterval) {
                    dataMaxInterval = diff;
                    largeIntervalCurveData = dataset[ci];
                }
            }
        }
    }
    return largeIntervalCurveData;
};

//generates diff curves for all plot types that have diff curves.
const getDataForDiffCurve = function (dataset, diffFrom, plotType, hasLevels) {
    /*
     DATASET ELEMENTS:
        series: [data,data,data ...... ]   each data is itself an object
        d = {
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

     NOTE -- for profiles, x is the statVarName and y is the independentVarName, because profiles plot the statVarName
        on the x axis and the independentVarName on the y axis.

    For histograms:
    DATASET ELEMENTS:
        series: [data,data,data ...... ]   each data is itself an array
        d = {
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
        };

     */

    //determine whether data[0] or data[1] is the independent variable, and which is the stat value
    var independentVarName;
    var statVarName;
    if (plotType !== matsTypes.PlotTypes.profile) {
        independentVarName = 'x';
        statVarName = 'y';
    } else {
        independentVarName = 'y';
        statVarName = 'x';
    }

    // initialize variables
    var minuendData = dataset[diffFrom[0]];
    var subtrahendData = dataset[diffFrom[1]];
    var subtrahendIndex = 0;
    var minuendIndex = 0;

    var d;
    if (plotType !== matsTypes.PlotTypes.histogram) {
        d = {
            x: [],
            y: [],
            error_x: [],   // curveTime
            error_y: [],   // values
            subVals: [],   //subVals
            subSecs: [],   //subSecs
            subLevs: [],   //subLevs
            glob_stats: [],
            stats: [],     //curveStats
            text: [],
            xmin: Number.MAX_VALUE,
            xmax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
            sum: 0
        };
    } else {
        d = {
            x: [],
            y: [],
            error_x: [],
            error_y: [],
            subVals: [],
            subSecs: [],
            subLevs: [],
            glob_stats: {
                'glob_mean': null,
                'glob_sd': null,
                'glob_n': null,
                'glob_max': null,
                'glob_min': null
            },
            bin_stats: [],
            text: [],
            xmin: Number.MAX_VALUE,
            xmax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
        };
    }

    // make sure neither curve is empty
    if (minuendData.x.length === 0 || subtrahendData.x.length === 0) {
        return {'dataset': d};
    }

    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // independentVarName values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
    var curvesLength = dataset.length;
    var largeIntervalCurveData = getLargeIntervalCurveData(dataset, diffFrom, curvesLength, independentVarName);

    // calculate the differences
    for (var largeIntervalCurveIndex = 0; largeIntervalCurveIndex < largeIntervalCurveData[independentVarName].length; largeIntervalCurveIndex++) {

        //make sure that we are actually on the same independentVarName value for each curve
        var subtrahendIndependentVar = subtrahendData[independentVarName][subtrahendIndex];
        var minuendIndependentVar = minuendData[independentVarName][minuendIndex];
        var largeIntervalIndependentVar = largeIntervalCurveData[independentVarName][largeIntervalCurveIndex];

        //increment the minuendIndex until it reaches this iteration's largeIntervalIndependentVar
        var minuendChanged = false;
        while (largeIntervalIndependentVar > minuendIndependentVar && minuendIndex < minuendData[independentVarName].length - 1) {
            minuendIndependentVar = minuendData[independentVarName][++minuendIndex];
            minuendChanged = true;
        }
        //if the end of the curve was reached without finding the largeIntervalIndependentVar, increase the minuendIndex to trigger the end conditions.
        if (!minuendChanged && minuendIndex >= minuendData[independentVarName].length - 1) {
            ++minuendIndex;
        }

        //increment the subtrahendIndex until it reaches this iteration's largeIntervalIndependentVar
        var subtrahendChanged = false;
        while (largeIntervalIndependentVar > subtrahendIndependentVar && subtrahendIndex < subtrahendData[independentVarName].length - 1) {
            subtrahendIndependentVar = subtrahendData[independentVarName][++subtrahendIndex];
            subtrahendChanged = true;
        }
        //if the end of the curve was reached without finding the largeIntervalIndependentVar, increase the subtrahendIndex to trigger the end conditions.
        if (!subtrahendChanged && subtrahendIndex >= subtrahendData[independentVarName].length - 1) {
            ++subtrahendIndex;
        }

        var diffValue = null;
        var tempSubValsArray;
        var tempSubSecsArray;
        var tempSubLevsArray;
        if (minuendData[independentVarName][minuendIndex] !== undefined && subtrahendData[independentVarName][subtrahendIndex] !== undefined) {  // make sure both curves actually have data at this index
            if ((minuendData[statVarName][minuendIndex] !== null && subtrahendData[statVarName][subtrahendIndex] !== null) && minuendData[independentVarName][minuendIndex] === subtrahendData[independentVarName][subtrahendIndex]) { // make sure data is not null at this point and the independentVars actually match

                diffValue = minuendData[statVarName][minuendIndex] - subtrahendData[statVarName][subtrahendIndex];
                d[independentVarName].push(largeIntervalIndependentVar);
                d[statVarName].push(diffValue);
                d.error_x.push(null);
                d.error_y.push(null);
                tempSubValsArray = [];
                tempSubSecsArray = [];
                if (hasLevels) {
                    tempSubLevsArray = [];
                }

                if (plotType !== matsTypes.PlotTypes.histogram) {
                    var minuendDataSubValues = minuendData.subVals[minuendIndex];
                    var minuendDataSubSeconds = minuendData.subSecs[minuendIndex];
                    if (hasLevels) {
                        var minuendDataSubLevels = minuendData.subLevs[minuendIndex];
                    }
                    var subtrahendDataSubValues = subtrahendData.subVals[subtrahendIndex];
                    var subtrahendDataSubSeconds = subtrahendData.subSecs[subtrahendIndex];
                    if (hasLevels) {
                        var subtrahendDataSubLevels = subtrahendData.subLevs[subtrahendIndex];
                    }

                    // find matching sub values and diff those
                    for (var mvalIdx = 0; mvalIdx < minuendDataSubValues.length; mvalIdx++) {
                        for (var svalIdx = 0; svalIdx < subtrahendDataSubValues.length; svalIdx++) {
                            if (hasLevels && minuendDataSubSeconds[mvalIdx] === subtrahendDataSubSeconds[svalIdx] && minuendDataSubLevels[mvalIdx] === subtrahendDataSubLevels[svalIdx]) {
                                tempSubValsArray.push(minuendDataSubValues[mvalIdx] - subtrahendDataSubValues[svalIdx]);
                                tempSubSecsArray.push(minuendDataSubSeconds[mvalIdx]);
                                tempSubLevsArray.push(minuendDataSubLevels[mvalIdx]);
                            } else if (!hasLevels && minuendDataSubSeconds[mvalIdx] === subtrahendDataSubSeconds[svalIdx]) {
                                tempSubValsArray.push(minuendDataSubValues[mvalIdx] - subtrahendDataSubValues[svalIdx]);
                                tempSubSecsArray.push(minuendDataSubSeconds[mvalIdx]);
                            }
                        }
                    }

                    d.subVals.push(tempSubValsArray);
                    d.subSecs.push(tempSubSecsArray);
                    if (hasLevels) {
                        d.subLevs.push(tempSubLevsArray);
                    }

                    d.sum = d.sum + d[independentVarName][largeIntervalCurveIndex];

                } else {
                    d.bin_stats.push({
                        'bin_mean': null,
                        'bin_sd': null,
                        'bin_n': diffValue,
                        'bin_rf': minuendData.bin_stats[minuendIndex].bin_rf - subtrahendData.bin_stats[subtrahendIndex].bin_rf,
                        'binLowBound': minuendData.bin_stats[minuendIndex].binLowBound,
                        'binUpBound': minuendData.bin_stats[minuendIndex].binUpBound,
                        'binLabel': minuendData.bin_stats[minuendIndex].binLabel
                    });
                }

            } else {
                //no match for this independentVarName
                d[independentVarName].push(largeIntervalIndependentVar);
                d[statVarName].push(null);
                d.error_x.push(null);
                d.error_y.push(null);
                d.subVals.push([]);
                d.subSecs.push([]);
                if (hasLevels) {
                    d.subLevs.push([]);
                }
                if (plotType === matsTypes.PlotTypes.histogram) {
                    d.bin_stats.push({
                        'bin_mean': null,
                        'bin_sd': null,
                        'bin_n': null,
                        'bin_rf': null,
                        'binLowBound': minuendData.bin_stats[minuendIndex].binLowBound,
                        'binUpBound': minuendData.bin_stats[minuendIndex].binUpBound,
                        'binLabel': minuendData.bin_stats[minuendIndex].binLabel
                    });
                }

            }
        } else if ((!subtrahendChanged && subtrahendIndex >= subtrahendData[independentVarName].length - 1) || (!minuendChanged && minuendIndex >= minuendData[independentVarName].length - 1)) {
            //we've reached the end of at least one curve, so end the diffing.
            break;
        }
    }

    const filteredx = d.x.filter(x => x);
    const filteredy = d.y.filter(y => y);
    d.xmin = Math.min(...filteredx);
    d.xmax = Math.max(...filteredx);
    d.ymin = Math.min(...filteredy);
    d.ymax = Math.max(...filteredy);

    return {'dataset': d};
};

export default matsDataDiffUtils = {

    getDataForDiffCurve: getDataForDiffCurve

}
