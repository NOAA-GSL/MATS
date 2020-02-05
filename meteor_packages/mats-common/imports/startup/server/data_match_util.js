/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';

// function for removing unmatched data from a dataset containing multiple curves
const getMatchedDataSet = function (dataset, curvesLength, appParams) {

    var subSecs = [];
    var subLevs = [];
    var subValues = [];
    var newSubSecs = [];
    var newSubLevs = [];
    var newSubValues = [];
    var independentVarGroups = [];
    var independentVarHasPoint = [];
    var currIndependentVar;
    var curveIndex;
    var data;
    var di;
    var fi;
    var si;

    const plotType = appParams.plotType;
    const hasLevels = appParams.hasLevels;

    // matching in this function is based on a curve's independent variable. For a timeseries, the independentVar is epoch,
    // for a profile, it's level, for a dieoff, it's forecast hour, for a threshold plot, it's threshold, and for a
    // valid time plot, it's hour of day. This function identifies the the independentVar values common across all of
    // the curves, and then the common sub times/levels/values for those independentVar values.

    //determine whether data.x or data.y is the independent variable, and which is the stat value
    var independentVarName;
    var statVarName;
    if (plotType !== matsTypes.PlotTypes.profile) {
        independentVarName = 'x';
        statVarName = 'y';
    } else {
        independentVarName = 'y';
        statVarName = 'x';
    }

    // find the matching independentVars shared across all curves
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        independentVarGroups[curveIndex] = [];  // store the independentVars for each curve that are not null
        independentVarHasPoint[curveIndex] = [];   // store the *all* of the independentVars for each curve
        subSecs[curveIndex] = {};  // store the individual record times (subSecs) going into each independentVar for each curve
        if (hasLevels) {
            subLevs[curveIndex] = {};  // store the individual record levels (subLevs) going into each independentVar for each curve
        }
        data = dataset[curveIndex];
        for (di = 0; di < data[independentVarName].length; di++) { // loop over every independentVar value in this curve
            currIndependentVar = data[independentVarName][di];
            if (data[statVarName][di] !== null) {
                subSecs[curveIndex][currIndependentVar] = data.subSecs[di];   // store raw secs for this independentVar value, since it's not a null point
                if (hasLevels) {
                    subLevs[curveIndex][currIndependentVar] = data.subLevs[di];   // store raw levs for this independentVar value, since it's not a null point
                }
                independentVarGroups[curveIndex].push(currIndependentVar);   // store this independentVar value, since it's not a null point
            }
            independentVarHasPoint[curveIndex].push(currIndependentVar);    // store all the independentVar values, regardless of whether they're null
        }
    }

    var matchingIndependentVars = _.intersection.apply(_, independentVarGroups);    // find all of the non-null independentVar values common across all the curves
    var matchingIndependentHasPoint = _.intersection.apply(_, independentVarHasPoint);    // find all of the independentVar values common across all the curves, regardless of whether or not they're null
    if (hasLevels) {
        var subIntersections = [];       // eventually find the intersecting subSecs and subLevs for each common non-null independentVar value
        for (fi = 0; fi < matchingIndependentVars.length; fi++) { // loop over each common non-null independentVar value
            currIndependentVar = matchingIndependentVars[fi];
            subIntersections[currIndependentVar] = [];
            var currSubIntersections = [];
            for (si = 0; si < subSecs[0][currIndependentVar].length; si++) {   // fill current intersection array with sec-lev pairs from the first curve
                currSubIntersections.push([subSecs[0][currIndependentVar][si], subLevs[0][currIndependentVar][si]]);
            }
            for (curveIndex = 1; curveIndex < curvesLength; curveIndex++) { // loop over every curve after the first
                var tempSubIntersections = [];
                var tempPair;
                for (si = 0; si < subSecs[curveIndex][currIndependentVar].length; si++) { // loop over every subSecs value
                    tempPair = [subSecs[curveIndex][currIndependentVar][si], subLevs[curveIndex][currIndependentVar][si]];    // create an individual sec-lev pair for each index in the subSecs and subLevs arrays
                    if (matsDataUtils.arrayContainsSubArray(currSubIntersections, tempPair)) {   // see if the individual sec-lev pair matches a pair from the current intersection array
                        tempSubIntersections.push(tempPair);    // store matching pairs
                    }
                }
                currSubIntersections = tempSubIntersections;    // replace current intersection array with array of only pairs that matched from this loop through.
            }
            subIntersections[currIndependentVar] = currSubIntersections;   // store the final intersecting subSecs array for this common non-null independentVar value
        }
    } else {
        var subSecIntersection = {};       // eventually find the intersecting subSecs for each common non-null independentVar value
        for (fi = 0; fi < matchingIndependentVars.length; fi++) { // loop over each common non-null independentVar value
            currIndependentVar = matchingIndependentVars[fi];
            var currSubSecIntersection = subSecs[0][currIndependentVar];   // fill current subSecs intersection array with subSecs from the first curve
            for (curveIndex = 1; curveIndex < curvesLength; curveIndex++) { // loop over every curve
                currSubSecIntersection = _.intersection(currSubSecIntersection, subSecs[curveIndex][currIndependentVar]);   // keep taking the intersection of the current subSecs intersection array with each curve's subSecs array for this independentVar value
            }
            subSecIntersection[currIndependentVar] = currSubSecIntersection;   // store the final intersecting subSecs array for this common non-null independentVar value
        }
    }

    // remove non-matching independentVars and subSecs
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // loop over every curve
        data = dataset[curveIndex];

        // need to loop backwards through the data array so that we can splice non-matching indices
        // while still having the remaining indices in the correct order
        var dataLength = data[independentVarName].length;
        for (di = dataLength - 1; di >= 0; di--) {

            if (matchingIndependentVars.indexOf(data[independentVarName][di]) === -1) {  // if this is not a common non-null independentVar value, we'll have to remove some data
                if (matchingIndependentHasPoint.indexOf(data[independentVarName][di]) === -1) {   // if at least one curve doesn't even have a null here, much less a matching value (beacause of the cadence), just drop this independentVar
                    data.x.splice(di, 1);
                    data.y.splice(di, 1);
                    if (data[('error_' + statVarName)].array !== undefined) {
                        data[('error_' + statVarName)].array.splice(di, 1);
                    }
                    data.subVals.splice(di, 1);
                    data.subSecs.splice(di, 1);
                    if (hasLevels) {
                        data.subLevs.splice(di, 1);
                    }
                    data.stats.splice(di, 1);
                    data.text.splice(di, 1);
                } else {    // if all of the curves have either data or nulls at this independentVar, and there is at least one null, ensure all of the curves are null
                    data[statVarName][di] = null;
                    data.subVals[di] = NaN;
                    data.subSecs[di] = NaN;
                    if (hasLevels) {
                        data.subLevs[di] = NaN;
                    }
                }
                continue;   // then move on to the next independentVar. There's no need to mess with the subSecs or subLevs
            }
            subSecs = data.subSecs[di];
            subValues = data.subVals[di];
            if (hasLevels) {
                subLevs = data.subLevs[di];
            }

            if ((!hasLevels && subSecs.length > 0) || (hasLevels && subSecs.length > 0 && subLevs.length > 0)) {
                currIndependentVar = data[independentVarName][di];
                newSubValues = [];
                newSubSecs = [];
                if (hasLevels) {
                    newSubLevs = [];
                }
                for (si = 0; si < subSecs.length; si++) {  // loop over all subSecs for this independentVar
                    if (hasLevels) {
                        tempPair = [subSecs[si], subLevs[si]]; //create sec-lev pair for each sub value
                    }
                    if ((!hasLevels && subSecIntersection[currIndependentVar].indexOf(subSecs[si]) !== -1) || (hasLevels && matsDataUtils.arrayContainsSubArray(subIntersections[currIndependentVar], tempPair))) { // keep the subValue only if its associated subSec/subLev is common to all curves for this independentVar
                        var newVal = subValues[si];
                        var newSec = subSecs[si];
                        if (hasLevels) {
                            var newLev = subLevs[si];
                        }
                        if (newVal !== undefined) {
                            newSubValues.push(newVal);
                            newSubSecs.push(newSec);
                            if (hasLevels) {
                                newSubLevs.push(newLev);
                            }
                        }
                    }
                }
                // store the filtered data
                data.subVals[di] = newSubValues;
                data.subSecs[di] = newSubSecs;
                if (hasLevels) {
                    data.subLevs[di] = newSubLevs;
                }
            }
        }
        dataset[curveIndex] = data;
    }

    return dataset;
};

// function for removing unmatched data from a dataset containing multiple curves for a histogram.
// separate matching functions are needed for histograms because you have to take all of the data out of the bins, then
// match it, then recalculate the bins. For other plot types, you can just leave the data in its already-sorted fhr, level, etc.
const getMatchedDataSetHistogram = function (dataset, curvesLength, binStats, appParams) {

    var subStatsRaw = {};
    var subSecsRaw = {};
    var subLevsRaw = {};
    var subStats = {};
    var subSecs = {};
    var subLevs = {};
    var newSubStats = {};
    var newSubSecs = {};
    var newSubLevs = {};
    var newCurveData = {};
    var curveIndex;
    var data;
    var di;
    var si;

    const hasLevels = appParams.hasLevels;

    // pull all subSecs and subStats out of their bins, and back into one master array
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        data = dataset[curveIndex];
        subStatsRaw[curveIndex] = [];
        subSecsRaw[curveIndex] = [];
        subLevsRaw[curveIndex] = [];
        subStats[curveIndex] = [];
        subSecs[curveIndex] = [];
        subLevs[curveIndex] = [];
        for (di = 0; di < data.x.length; di++) {
            subStatsRaw[curveIndex].push(data.subVals[di]);
            subSecsRaw[curveIndex].push(data.subSecs[di]);
            if (hasLevels) {
                subLevsRaw[curveIndex].push(data.subLevs[di]);
            }
        }
        subStats[curveIndex] = [].concat.apply([], subStatsRaw[curveIndex]);
        subSecs[curveIndex] = [].concat.apply([], subSecsRaw[curveIndex]);
        if (hasLevels) {
            subLevs[curveIndex] = [].concat.apply([], subLevsRaw[curveIndex]);
        }
    }

    if (hasLevels) {
        // determine which seconds and levels are present in all curves
        var subIntersections = [];       // eventually find the intersecting subSecs and subLevs across all curves
        for (si = 0; si < subSecs[0].length; si++) {   // fill current intersection array with sec-lev pairs from the first curve
            subIntersections.push([subSecs[0][si], subLevs[0][si]]);
        }
        for (curveIndex = 1; curveIndex < curvesLength; curveIndex++) { // loop over every curve after the first
            var tempSubIntersections = [];
            var tempPair;
            for (si = 0; si < subSecs[curveIndex].length; si++) { // loop over every subSecs value
                tempPair = [subSecs[curveIndex][si], subLevs[curveIndex][si]];    // create an individual sec-lev pair for each index in the subSecs and subLevs arrays
                if (matsDataUtils.arrayContainsSubArray(subIntersections, tempPair)) {   // see if the individual sec-lev pair matches a pair from the current intersection array
                    tempSubIntersections.push(tempPair);    // store matching pairs
                }
            }
            subIntersections = tempSubIntersections;    //replace current intersection array with array of only pairs that matched from this loop through.
        }
    } else {
        // determine which seconds are present in all curves
        var subSecIntersection = subSecs[0];   // fill current subSecs intersection array with subSecs from the first curve
        for (curveIndex = 1; curveIndex < curvesLength; curveIndex++) { // loop over every curve
            subSecIntersection = _.intersection(subSecIntersection, subSecs[curveIndex]);   // keep taking the intersection of the current subSecs intersection array with each curve's subSecs array
        }
    }

    // remove non-matching subSecs, subLevs, and subStats
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // loop over every curve
        data = dataset[curveIndex];
        if ((!hasLevels && subSecIntersection.length > 0) || (hasLevels && subIntersections.length > 0)) {
            newSubStats[curveIndex] = [];
            newSubSecs[curveIndex] = [];
            newSubLevs[curveIndex] = [];

            for (si = 0; si < subSecs[curveIndex].length; si++) {  // loop over all subSecs for this curve
                if (hasLevels) {
                    tempPair = [subSecs[curveIndex][si], subLevs[curveIndex][si]]; //create sec-lev pair for each subStat
                }
                if ((!hasLevels && subSecIntersection.indexOf(subSecs[curveIndex][si]) !== -1) || (hasLevels && matsDataUtils.arrayContainsSubArray(subIntersections, tempPair))) {  // keep the subStat only if its its sec-lev pair is common to all curves
                    var newStat = subStats[curveIndex][si];
                    var newSec = subSecs[curveIndex][si];
                    if (hasLevels) {
                        var newLev = subLevs[curveIndex][si];
                    }
                    if (newStat !== undefined) {
                        newSubStats[curveIndex].push(newStat);
                        newSubSecs[curveIndex].push(newSec);
                        if (hasLevels) {
                            newSubLevs[curveIndex].push(newLev);
                        }
                    }
                }
            }
            // re-sort all of the data into histogram bins
            var d = {// d will contain the curve data
                x: [], //placeholder
                y: [], //placeholder
                subVals: [],
                subSecs: [],
                subLevs: [],
                glob_stats: {}, // placeholder
                bin_stats: [], // placeholder
                text: [], //placeholder
                xmin: Number.MAX_VALUE,
                xmax: Number.MIN_VALUE,
                ymin: Number.MAX_VALUE,
                ymax: Number.MIN_VALUE,
            };
            newCurveData = matsDataUtils.sortHistogramBins(newSubStats[curveIndex], newSubSecs[curveIndex], newSubLevs[curveIndex], data.x.length, binStats, appParams, d);
        } else {
            // if there are no matching values, set data to an empty dataset
            newCurveData["d"] = {
                x: [],
                y: [],
                subVals: [],
                subSecs: [],
                subLevs: [],
                glob_stats: {},
                bin_stats: [],
                text: [],
                xmin: Number.MAX_VALUE,
                xmax: Number.MIN_VALUE,
                ymin: Number.MAX_VALUE,
                ymax: Number.MIN_VALUE,
            };
        }
        var newCurveDataKeys = Object.keys(newCurveData.d);
        for (var didx = 0; didx < newCurveDataKeys.length; didx++) {
            dataset[curveIndex][newCurveDataKeys[didx]] = newCurveData.d[newCurveDataKeys[didx]];
        }
    }
    return dataset;
};

export default matsDataMatchUtils = {

    getMatchedDataSet: getMatchedDataSet,
    getMatchedDataSetHistogram: getMatchedDataSetHistogram

}