import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';

//returns the data for whichever curve has the larger interval in its independent variable
const getLargeIntervalCurveData = function (dataset, diffFrom, curvesLength, independentVarIndex) {
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]].data;
    // set up the indexes and determine the minimum independentVar value for the dataset
    for (var ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible. Just use interval from first curve
            break;
        }
        if (dataset[ci].data.length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci].data[di + 1][independentVarIndex] - dataset[ci].data[di][independentVarIndex];
                if (diff > dataMaxInterval) {
                    dataMaxInterval = diff;
                    largeIntervalCurveData = dataset[ci].data;
                }
            }
        }
    }
    return largeIntervalCurveData;
};

//generates diff curves for all plot types that have diff curves.
const getDataForDiffCurve = function (params, plotType, hasLevels) {
    /*
     DATASET ELEMENTS:
        series: [data,data,data ...... ]   each data is itself an array
        data[0] - independentVar (plotted against the x axis)
        data[1] - statValue (plotted against the y axis)
        data[2] - errorBar (sd * 1.96)
        data[3] - sub statValues
        data[4] - sub times
        data[5] - sub levels (later replaced by statistics object)
        data[6] - tooltip

     NOTE -- for profiles, data[0] is the statValue and data[1] is the independentVar, because profiles plot the statValue
        on the x axis and the independentVar on the y axis.

     For histograms:
     DATASET ELEMENTS:
         series: [data,data,data ...... ]   each data is itself an array
         data[0] - bin number (plotted against the x axis)
         data[1] - number in bin (ploted against the y axis)
         data[2] - -1 (no error bars for histograms)
         data[3] - bin values -- not calculated for histogram diffs, as it doesn't make sense to diff individual values sorted into bins
         data[4] - bin times -- not calculated for histogram diffs, as it doesn't make sense to diff individual values sorted into bins
         data[5] - reserved for if there are bin levels -- not calculated for histogram diffs, as it doesn't make sense to diff individual values sorted into bins
         data[6] - bin stats
         data[7] - global stats
         data[8] - tooltip

     */

    //determine whether data[0] or data[1] is the independent variable, and which is the stat value
    var independentVarIndex;
    var statValueIndex;
    if (plotType !== matsTypes.PlotTypes.profile) {
        independentVarIndex = 0;
        statValueIndex = 1;
    } else {
        independentVarIndex = 1;
        statValueIndex = 0;
    }

    const dataset = params.dataset;  // existing dataset - should contain the difference curve and the base curve
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset

    //profile diff curves don't bother recalculating the ymax and ymin
    if (plotType !== matsTypes.PlotTypes.profile) {
        var ymin = params.ymin; // optional - current y axis minimum
        var ymax = params.ymax;  // optional - current y axis maximum
    }

    // initialize variables
    var minuendData = dataset[diffFrom[0]].data;
    var subtrahendData = dataset[diffFrom[1]].data;
    var subtrahendIndex = 0;
    var minuendIndex = 0;
    var d = [];
    var count = 0;
    var sum = 0;

    // make sure neither curve is empty
    if (minuendData.length === 0 || subtrahendData.length === 0) {
        if (plotType !== matsTypes.PlotTypes.profile) {
            return {
                sum: sum,
                count: count,
                dataset: d,
                ymin: ymin,
                ymax: ymax
            };
        } else {
            return {dataset: d};
        }
    }

    // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
    // independentVar values of whichever has the largest interval
    // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
    var curvesLength = dataset.length;
    var largeIntervalCurveData = getLargeIntervalCurveData(dataset, diffFrom, curvesLength, independentVarIndex);

    // calculate the differences
    for (var largeIntervalCurveIndex = 0; largeIntervalCurveIndex < largeIntervalCurveData.length; largeIntervalCurveIndex++) {

        //make sure that we are actually on the same independentVar value for each curve
        var subtrahendIndependentVar = subtrahendData[subtrahendIndex][independentVarIndex];
        var minuendIndependentVar = minuendData[minuendIndex][independentVarIndex];
        var largeIntervalIndependentVar = largeIntervalCurveData[largeIntervalCurveIndex][independentVarIndex];

        //increment the minuendIndex until it reaches this iteration's largeIntervalIndependentVar
        var minuendChanged = false;
        while (largeIntervalIndependentVar > minuendIndependentVar && minuendIndex < minuendData.length - 1) {
            minuendIndependentVar = minuendData[++minuendIndex][independentVarIndex];
            minuendChanged = true;
        }
        //if the end of the curve was reached without finding the largeIntervalIndependentVar, increase the minuendIndex to trigger the end conditions.
        if (!minuendChanged && minuendIndex >= minuendData.length - 1) {
            ++minuendIndex;
        }

        //increment the subtrahendIndex until it reaches this iteration's largeIntervalIndependentVar
        var subtrahendChanged = false;
        while (largeIntervalIndependentVar > subtrahendIndependentVar && subtrahendIndex < subtrahendData.length - 1) {
            subtrahendIndependentVar = subtrahendData[++subtrahendIndex][independentVarIndex];
            subtrahendChanged = true;
        }
        //if the end of the curve was reached without finding the largeIntervalIndependentVar, increase the subtrahendIndex to trigger the end conditions.
        if (!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) {
            ++subtrahendIndex;
        }

        var diffValue = null;
        if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // make sure both curves actually have data at this index
            if ((minuendData[minuendIndex][statValueIndex] !== null && subtrahendData[subtrahendIndex][statValueIndex] !== null) && minuendData[minuendIndex][independentVarIndex] === subtrahendData[subtrahendIndex][independentVarIndex]) { // make sure data is not null at this point and the independentVars actually match

                diffValue = minuendData[minuendIndex][statValueIndex] - subtrahendData[subtrahendIndex][statValueIndex];
                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][independentVarIndex] = largeIntervalIndependentVar;
                d[largeIntervalCurveIndex][statValueIndex] = diffValue;
                d[largeIntervalCurveIndex][2] = -1;
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                if (hasLevels) {
                    d[largeIntervalCurveIndex][5] = [];
                }

                if (plotType !== matsTypes.PlotTypes.histogram) {
                    var minuendDataSubValues = minuendData[minuendIndex][3];
                    var minuendDataSubSeconds = minuendData[minuendIndex][4];
                    if (hasLevels) {
                        var minuendDataSubLevels = minuendData[minuendIndex][5];
                    }
                    var subtrahendDataSubValues = subtrahendData[subtrahendIndex][3];
                    var subtrahendDataSubSeconds = subtrahendData[subtrahendIndex][4];
                    if (hasLevels) {
                        var subtrahendDataSubLevels = subtrahendData[subtrahendIndex][5];
                    }

                    // find matching sub values and diff those
                    for (var mvalIdx = 0; mvalIdx < minuendDataSubValues.length; mvalIdx++) {
                        for (var svalIdx = 0; svalIdx < subtrahendDataSubValues.length; svalIdx++) {
                            if (hasLevels && minuendDataSubSeconds[mvalIdx] === subtrahendDataSubSeconds[svalIdx] && minuendDataSubLevels[mvalIdx] === subtrahendDataSubLevels[svalIdx]) {
                                d[largeIntervalCurveIndex][5].push(minuendDataSubLevels[mvalIdx]);
                                d[largeIntervalCurveIndex][4].push(minuendDataSubSeconds[mvalIdx]);
                                d[largeIntervalCurveIndex][3].push(minuendDataSubValues[mvalIdx] - subtrahendDataSubValues[svalIdx]);
                            } else if (!hasLevels && minuendDataSubSeconds[mvalIdx] === subtrahendDataSubSeconds[svalIdx]) {
                                d[largeIntervalCurveIndex][4].push(minuendDataSubSeconds[mvalIdx]);
                                d[largeIntervalCurveIndex][3].push(minuendDataSubValues[mvalIdx] - subtrahendDataSubValues[svalIdx]);
                            }
                        }
                    }
                } else {
                    d[largeIntervalCurveIndex][6] = {
                        'bin_mean': null,
                        'bin_sd': null,
                        'bin_n': diffValue,
                        'bin_rf': minuendData[minuendIndex][6].bin_rf - subtrahendData[subtrahendIndex][6].bin_rf,
                        'binLowBound': minuendData[minuendIndex][6].binLowBound,
                        'binUpBound': minuendData[minuendIndex][6].binUpBound,
                        'binLabel': minuendData[minuendIndex][6].binLabel
                    };
                    d[largeIntervalCurveIndex][7] = {
                        'glob_mean': null,
                        'glob_sd': null,
                        'glob_n': null,
                        'glob_max': null,
                        'glob_min': null
                    };
                }

                if (plotType !== matsTypes.PlotTypes.profile) {
                    ymin = diffValue < ymin ? diffValue : ymin;
                    ymax = diffValue > ymax ? diffValue : ymax;
                    sum += diffValue;
                    count++;
                }

            } else {
                //no match for this independentVar
                d[largeIntervalCurveIndex] = [];
                d[largeIntervalCurveIndex][independentVarIndex] = largeIntervalIndependentVar;
                d[largeIntervalCurveIndex][statValueIndex] = null;
                d[largeIntervalCurveIndex][2] = -1;
                d[largeIntervalCurveIndex][3] = [];
                d[largeIntervalCurveIndex][4] = [];
                if (hasLevels) {
                    d[largeIntervalCurveIndex][5] = [];
                }
                if (plotType === matsTypes.PlotTypes.histogram) {
                    d[largeIntervalCurveIndex][6] = {
                        'bin_mean': null,
                        'bin_sd': null,
                        'bin_n': null,
                        'bin_rf': null,
                        'binLowBound': minuendData[minuendIndex][6].binLowBound,
                        'binUpBound': minuendData[minuendIndex][6].binUpBound,
                        'binLabel': minuendData[minuendIndex][6].binLabel
                    };
                    d[largeIntervalCurveIndex][7] = {
                        'glob_mean': null,
                        'glob_sd': null,
                        'glob_n': null,
                        'glob_max': null,
                        'glob_min': null
                    };
                }

            }
        } else if ((!subtrahendChanged && subtrahendIndex >= subtrahendData.length - 1) || (!minuendChanged && minuendIndex >= minuendData.length - 1)) {
            //we've reached the end of at least one curve, so end the diffing.
            break;
        }
    }
    if (plotType !== matsTypes.PlotTypes.profile) {
        return {
            sum: sum,
            count: count,
            dataset: d,
            ymin: ymin,
            ymax: ymax
        };
    } else {
        return {dataset: d};
    }
};

export default matsDataDiffUtils = {

    getDataForDiffCurve: getDataForDiffCurve

}
