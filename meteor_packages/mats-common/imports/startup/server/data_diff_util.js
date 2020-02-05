/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';

// returns the data for whichever curve has the larger interval in its independent variable
const getLargeIntervalCurveData = function (dataset, diffFrom, independentVarName) {
    var dataMaxInterval = Number.MIN_VALUE;
    var largeIntervalCurveData = dataset[diffFrom[0]];
    // set up the indexes and determine the minimum independentVarName value for the dataset
    for (var ci = 0; ci < dataset.length; ci++) {
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

// generates diff curves for all plot types that have diff curves.
const getDataForDiffCurve = function (dataset, diffFrom, appParams) {
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

    const plotType = appParams.plotType;
    const hasLevels = appParams.hasLevels;

    // determine whether data[0] or data[1] is the independent variable, and which is the stat value
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
            bin_stats: [],
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
    var largeIntervalCurveData = getLargeIntervalCurveData(dataset, diffFrom, independentVarName);

    // calculate the differences
    for (var largeIntervalCurveIndex = 0; largeIntervalCurveIndex < largeIntervalCurveData[independentVarName].length; largeIntervalCurveIndex++) {

        // make sure that we are actually on the same independentVarName value for each curve
        var subtrahendIndependentVar = subtrahendData[independentVarName][subtrahendIndex];
        var minuendIndependentVar = minuendData[independentVarName][minuendIndex];
        var largeIntervalIndependentVar = largeIntervalCurveData[independentVarName][largeIntervalCurveIndex];

        // increment the minuendIndex until it reaches this iteration's largeIntervalIndependentVar
        var minuendChanged = false;
        while (largeIntervalIndependentVar > minuendIndependentVar && minuendIndex < minuendData[independentVarName].length - 1) {
            minuendIndependentVar = minuendData[independentVarName][++minuendIndex];
            minuendChanged = true;
        }
        // if the end of the curve was reached without finding the largeIntervalIndependentVar, increase the minuendIndex to trigger the end conditions.
        if (!minuendChanged && minuendIndex >= minuendData[independentVarName].length - 1) {
            ++minuendIndex;
        }

        // increment the subtrahendIndex until it reaches this iteration's largeIntervalIndependentVar
        var subtrahendChanged = false;
        while (largeIntervalIndependentVar > subtrahendIndependentVar && subtrahendIndex < subtrahendData[independentVarName].length - 1) {
            subtrahendIndependentVar = subtrahendData[independentVarName][++subtrahendIndex];
            subtrahendChanged = true;
        }
        // if the end of the curve was reached without finding the largeIntervalIndependentVar, increase the subtrahendIndex to trigger the end conditions.
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
                // no match for this independentVarName
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
            // we've reached the end of at least one curve, so end the diffing.
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

// generates diff of two contours.
const getDataForDiffContour = function (dataset, showSignificance, sigType) {
    /*
     DATASET ELEMENTS:
        d[i] = {
            label: string,
            curveId: string,
            name: string,
            annotateColor: string,
            annotation: string,             -----
            x: [],                          *****
            y: [],                          *****
            z: [[]],                        *****
            n: [[]],                        *****
            text: [],
            stdev: [[]],                    *****
            stats: [],
            glob_stats: object,             -----
            type: string,
            autocontour: boolean,
            ncontours: number,
            colorbar: object,
            colorscale: string,
            reversescale: boolean,
            connectgaps: connectgaps,
            contours: object,
            marker: object,
            xAxisKey: [],
            yAxisKey: [],
            visible: boolean,
            showlegend: boolean,
            xTextOutput: [],                *****
            yTextOutput: [],                *****
            zTextOutput: [],                *****
            nTextOutput: [],                *****
            maxDateTextOutput: [],          *****
            minDateTextOutput: [],          *****
            xmax: number,                   -----
            xmin: number,                   -----
            ymax: number,                   -----
            ymin: number,                   -----
            zmax: number,                   -----
            zmin: number,                   -----
            sum: number                     *****
        };

        ***** indicates calculation in loops
        ----- indicates calculation after loops
     */

    // initialize output object
    var diffDataset = {};
    diffDataset['label'] = dataset[1].label + '-' + dataset[0].label;
    diffDataset['curveId'] = dataset[1].curveId + '-' + dataset[0].curveId;
    diffDataset['name'] = dataset[1].label + '-' + dataset[0].label;
    diffDataset['annotateColor'] = "rgb(255,165,0)";
    diffDataset['annotation'] = "";
    diffDataset['text'] = [];
    diffDataset['type'] = dataset[0].type;
    diffDataset['marker'] = dataset[0].marker;
    diffDataset['xAxisKey'] = dataset[0].xAxisKey;
    diffDataset['yAxisKey'] = dataset[0].yAxisKey;
    diffDataset['visible'] = dataset[0].visible;
    diffDataset['showlegend'] = dataset[0].showlegend;
    diffDataset['x'] = [];
    diffDataset['y'] = [];
    diffDataset['z'] = [];
    diffDataset['n'] = [];
    diffDataset['xTextOutput'] = [];
    diffDataset['yTextOutput'] = [];
    diffDataset['zTextOutput'] = [];
    diffDataset['nTextOutput'] = [];
    diffDataset['maxDateTextOutput'] = [];
    diffDataset['minDateTextOutput'] = [];
    diffDataset['stats'] = [];
    diffDataset['stdev'] = [];
    diffDataset['glob_stats'] = {};
    diffDataset['xmax'] = -1 * Number.MAX_VALUE;
    diffDataset['xmin'] = Number.MAX_VALUE;
    diffDataset['ymax'] = -1 * Number.MAX_VALUE;
    diffDataset['ymin'] = Number.MAX_VALUE;
    diffDataset['zmax'] = -1 * Number.MAX_VALUE;
    diffDataset['zmin'] = Number.MAX_VALUE;
    diffDataset['sum'] = 0;

    // initialize local variables
    var minuendData = dataset[1];
    var subtrahendData = dataset[0];

    // get common x and y
    diffDataset.x = _.intersection(minuendData.x, subtrahendData.x).sort(function (a, b) {
        return a - b
    });
    diffDataset.y = _.intersection(minuendData.y, subtrahendData.y).sort(function (a, b) {
        return a - b
    });

    // make we actually have matches
    if (diffDataset.x.length === 0 || diffDataset.y.length === 0) {
        diffDataset.x = [];
        diffDataset.y = [];
        return [diffDataset];
    }

    // make sure neither dataset is empty
    if (minuendData.x.length === 0 || subtrahendData.x.length === 0 || minuendData.y.length === 0 || subtrahendData.y.length === 0) {
        return [diffDataset];
    }

    var minuendYIndex = 0;
    var subtrahendYIndex = 0;
    var nPoints = 0;

    // loop through common Ys
    for (var diffDataYIndex = 0; diffDataYIndex < diffDataset.y.length; diffDataYIndex++) {
        //make sure that we are actually on the same y value for each curve
        var diffDataY = diffDataset.y[diffDataYIndex];
        var minuendY = minuendData.y[minuendYIndex];
        var subtrahendY = subtrahendData.y[subtrahendYIndex];

        //increment the minuendYIndex until it reaches this iteration's diffDataY
        while (diffDataY > minuendY && minuendYIndex < minuendData.y.length - 1) {
            minuendY = minuendData.y[++minuendYIndex];
        }

        //increment the subtrahendYIndex until it reaches this iteration's diffDataY
        while (diffDataY > subtrahendY && subtrahendYIndex < subtrahendData.y.length - 1) {
            subtrahendY = subtrahendData.y[++subtrahendYIndex];
        }

        // initialize n and z arrays for this Y
        diffDataset.z[diffDataYIndex] = [];
        diffDataset.stdev[diffDataYIndex] = [];
        diffDataset.n[diffDataYIndex] = [];

        var minuendXIndex = 0;
        var subtrahendXIndex = 0;
        for (var diffDataXIndex = 0; diffDataXIndex < diffDataset.x.length; diffDataXIndex++) {
            //make sure that we are actually on the same x value for each curve
            var diffDataX = diffDataset.x[diffDataXIndex];
            var minuendX = minuendData.x[minuendXIndex];
            var subtrahendX = subtrahendData.x[subtrahendXIndex];

            //increment the minuendXIndex until it reaches this iteration's diffDataX
            while (diffDataX > minuendX && minuendXIndex < minuendData.x.length - 1) {
                minuendX = minuendData.x[++minuendXIndex];
            }

            //increment the subtrahendXIndex until it reaches this iteration's diffDataX
            while (diffDataX > subtrahendX && subtrahendXIndex < subtrahendData.x.length - 1) {
                subtrahendX = subtrahendData.x[++subtrahendXIndex];
            }

            var diffValue = null;
            var diffNumber = 0;
            var diffMinDate = null;
            var diffMaxDate = null;
            var isDiffSignificant = null;
            if ((minuendData.z[minuendYIndex][minuendXIndex] !== undefined && subtrahendData.z[subtrahendYIndex][subtrahendXIndex] !== undefined)
                && (minuendData.z[minuendYIndex][minuendXIndex] !== null && subtrahendData.z[subtrahendYIndex][subtrahendXIndex] !== null)
                && minuendX === subtrahendX && minuendY === subtrahendY) { // make sure both contours actually have data at these indices, data is not null at this point, and the x and y actually match
                // calculate the difference values
                diffValue = minuendData.z[minuendYIndex][minuendXIndex] - subtrahendData.z[subtrahendYIndex][subtrahendXIndex];
                diffNumber = minuendData.n[minuendYIndex][minuendXIndex] <= subtrahendData.n[subtrahendYIndex][subtrahendXIndex] ? minuendData.n[minuendYIndex][minuendXIndex] : subtrahendData.n[subtrahendYIndex][subtrahendXIndex];
                if (showSignificance && diffNumber > 1 && minuendData.stdev[minuendYIndex][minuendXIndex] !== null && subtrahendData.stdev[subtrahendYIndex][subtrahendXIndex] !== null) {
                    isDiffSignificant = matsDataUtils.checkDiffContourSignificance(minuendData.z[minuendYIndex][minuendXIndex], subtrahendData.z[subtrahendYIndex][subtrahendXIndex], minuendData.stdev[minuendYIndex][minuendXIndex], subtrahendData.stdev[subtrahendYIndex][subtrahendXIndex], minuendData.n[minuendYIndex][minuendXIndex], subtrahendData.n[subtrahendYIndex][subtrahendXIndex], sigType) ? 1 : null;
                }
                diffMinDate = minuendData.minDateTextOutput[minuendYIndex * minuendData.x.length + minuendXIndex] <= subtrahendData.minDateTextOutput[subtrahendYIndex * subtrahendData.x.length + subtrahendXIndex] ? minuendData.minDateTextOutput[minuendYIndex * minuendData.x.length + minuendXIndex] : subtrahendData.minDateTextOutput[subtrahendYIndex * subtrahendData.x.length + subtrahendXIndex];
                diffMaxDate = minuendData.maxDateTextOutput[minuendYIndex * minuendData.x.length + minuendXIndex] >= subtrahendData.maxDateTextOutput[subtrahendYIndex * subtrahendData.x.length + subtrahendXIndex] ? minuendData.maxDateTextOutput[minuendYIndex * minuendData.x.length + minuendXIndex] : subtrahendData.maxDateTextOutput[subtrahendYIndex * subtrahendData.x.length + subtrahendXIndex];
                diffDataset['sum'] += diffValue;
                nPoints = nPoints + 1;
            }
            diffDataset.z[diffDataYIndex].push(diffValue);
            diffDataset.stdev[diffDataYIndex].push(isDiffSignificant);
            diffDataset.n[diffDataYIndex].push(diffNumber);
            diffDataset.xTextOutput.push(diffDataX);
            diffDataset.yTextOutput.push(diffDataY);
            diffDataset.zTextOutput.push(diffValue);
            diffDataset.nTextOutput.push(diffNumber);
            diffDataset.minDateTextOutput.push(diffMinDate);
            diffDataset.maxDateTextOutput.push(diffMaxDate);
        }
    }

    // calculate statistics
    const filteredx = diffDataset.x.filter(x => x);
    const filteredy = diffDataset.y.filter(y => y);
    const filteredz = diffDataset.zTextOutput.filter(z => z);
    diffDataset.xmin = Math.min(...filteredx);
    diffDataset.xmax = Math.max(...filteredx);
    diffDataset.ymin = Math.min(...filteredy);
    diffDataset.ymax = Math.max(...filteredy);
    diffDataset.zmin = Math.min(...filteredz);
    diffDataset.zmax = Math.max(...filteredz);

    if (diffDataset.xmin == "-Infinity" || (diffDataset.x.indexOf(0) !== -1 && 0 < diffDataset.xmin)) {
        diffDataset.xmin = 0;
    }
    if (diffDataset.ymin == "-Infinity" || (diffDataset.y.indexOf(0) !== -1 && 0 < diffDataset.ymin)) {
        diffDataset.ymin = 0;
    }
    if (diffDataset.zmin == "-Infinity" || (diffDataset.zTextOutput.indexOf(0) !== -1 && 0 < diffDataset.zmin)) {
        diffDataset.zmin = 0;
    }

    if (diffDataset.xmax == "-Infinity") {
        diffDataset.xmax = 0;
    }
    if (diffDataset.ymax == "-Infinity") {
        diffDataset.ymax = 0;
    }
    if (diffDataset.zmax == "-Infinity") {
        diffDataset.zmax = 0;
    }

    const filteredMinDate = diffDataset.minDateTextOutput.filter(t => t);
    const filteredMaxDate = diffDataset.maxDateTextOutput.filter(t => t);
    diffDataset.glob_stats['mean'] = diffDataset.sum / nPoints;
    diffDataset.glob_stats['minDate'] = Math.min(...filteredMinDate);
    diffDataset.glob_stats['maxDate'] = Math.max(...filteredMaxDate);
    diffDataset.glob_stats['n'] = nPoints;
    diffDataset['annotation'] = diffDataset.glob_stats.mean === undefined ? diffDataset.label + "- mean = NaN" : diffDataset.label + "- mean = " + diffDataset.glob_stats.mean.toPrecision(4);

    // make contours symmetrical around 0
    diffDataset['autocontour'] = false;
    diffDataset['ncontours'] = 15;
    diffDataset['colorbar'] = dataset[0].colorbar;
    diffDataset['colorbar']['title'] = dataset[0].colorbar.title === dataset[1].colorbar.title ? dataset[0].colorbar.title : dataset[1].colorbar.title + " - " + dataset[0].colorbar.title;
    diffDataset['colorscale'] = dataset[0].colorscale;
    diffDataset['reversescale'] = dataset[0].reversescale;
    diffDataset['connectgaps'] = dataset[0].connectgaps;
    diffDataset['contours'] = dataset[0].contours;
    const maxZ = Math.abs(diffDataset.zmax) > Math.abs(diffDataset.zmin) ? Math.abs(diffDataset.zmax) : Math.abs(diffDataset.zmin);
    diffDataset['contours']['start'] = -1 * maxZ + (2 * maxZ) / 16;
    diffDataset['contours']['end'] = maxZ - (2 * maxZ) / 16;
    diffDataset['contours']['size'] = (2 * maxZ) / 16;

    return [diffDataset];
};

export default matsDataDiffUtils = {

    getDataForDiffCurve: getDataForDiffCurve,
    getDataForDiffContour: getDataForDiffContour

}
