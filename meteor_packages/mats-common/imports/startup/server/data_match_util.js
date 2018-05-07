import {matsDataUtils} from 'meteor/randyp:mats-common';

// function for removing unmatched data from a dataset containing multiple curves *without* levels
const getMatchedDataSet = function (dataset, curvesLength) {

    var subSecs = [];
    var subValues = [];
    var newSubSecs = [];
    var newSubValues = [];
    var independentVarGroups = [];
    var independentVarHasPoint = [];
    var currIndependentVar;
    var curveIndex;
    var data;
    var di;
    var fi;
    var si;

    // matching in this function is based on a curve's independent variable. For a timeseries, the independentVar is epoch,
    // for a profile, it's level, for a dieoff, it's forecast hour, for a threshold plot, it's threshold, and for a
    // valid time plot, it's hour of day. This function identifies the the independentVar values common across all of
    // the curves, and then the common sub times/levels/values for those independentVar values.

    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        independentVarGroups[curveIndex] = [];  // store the independentVars for each curve that are not null
        independentVarHasPoint[curveIndex] = [];   // store the *all* of the independentVars for each curve
        subSecs[curveIndex] = {};  // store the individual record times (subSecs) going into each independentVar for each curve
        data = dataset[curveIndex].data;
        for (di = 0; di < data.length; di++) { // loop over every independentVar value in this curve
            currIndependentVar = data[di][0];
            if (data[di][1] !== null) {
                subSecs[curveIndex][currIndependentVar] = data[di][4];   // store raw secs for this independentVar value, since it's not a null point
                independentVarGroups[curveIndex].push(currIndependentVar);   // store this independentVar value, since it's not a null point
            }
            independentVarHasPoint[curveIndex].push(currIndependentVar);    // store all the independentVar values, regardless of whether they're null
        }
    }

    var matchingIndependentVars = _.intersection.apply(_, independentVarGroups);    // find all of the non-null independentVar values common across all the curves
    var matchingIndependentHasPoint = _.intersection.apply(_, independentVarHasPoint);    // find all of the independentVar values common across all the curves, regardless of whether or not they're null
    var subSecIntersection = {};       // eventually find the intersecting subSecs for each common non-null independentVar value

    for (fi = 0; fi < matchingIndependentVars.length; fi++) { // loop over each common non-null independentVar value
        currIndependentVar = matchingIndependentVars[fi];
        var currSubSecIntersection = subSecs[0][currIndependentVar];   // fill current subSecs intersection array with subSecs from the first curve
        for (curveIndex = 1; curveIndex < curvesLength; curveIndex++) { // loop over every curve
            currSubSecIntersection = _.intersection(currSubSecIntersection, subSecs[curveIndex][currIndependentVar]);   // keep taking the intersection of the current subSecs intersection array with each curve's subSecs array for this independentVar value
        }
        subSecIntersection[currIndependentVar] = currSubSecIntersection;   // store the final intersecting subSecs array for this common non-null independentVar value
    }

    // remove non-matching independentVars and subSecs
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // loop over every curve
        data = dataset[curveIndex].data;

        // need to loop backwards through the data array so that we can splice non-matching indices
        // while still having the remaining indices in the correct order
        for (di = data.length - 1; di >= 0; di--) {

            if (matchingIndependentVars.indexOf(data[di][0]) === -1) {  // if this is not a common non-null independentVar value, we'll have to remove some data
                if (matchingIndependentHasPoint.indexOf(data[di][0]) === -1) {   // if at least one curve doesn't even have a null here, much less a matching value, just drop this independentVar
                    data.splice(di, 1);
                } else {    // if all of the curves have either data or nulls at this independentVar, and there is at least one null, ensure all of the curves are null
                    data[di][1] = null;
                    data[di][3] = NaN;
                    data[di][4] = NaN;
                }
                continue;   // then move on to the next independentVar. There's no need to mess with the subSecs
            }

            subSecs = data[di][4];
            subValues = data[di][3];

            if (subSecs.length > 0) {
                currIndependentVar = data[di][0];
                newSubValues = [];
                newSubSecs = [];

                for (si = 0; si < subSecs.length; si++) {  // loop over all subSecs for this independentVar
                    if (subSecIntersection[currIndependentVar].indexOf(subSecs[si]) !== -1) { // keep the subValue only if its associated subSec is common to all curves for this independentVar
                        var newVal = subValues[si];
                        var newSec = subSecs[si];
                        if (newVal !== undefined) {
                            newSubValues.push(newVal);
                            newSubSecs.push(newSec);
                        }
                    }
                }

                // store the filtered data
                data[di][3] = newSubValues;
                data[di][4] = newSubSecs;
            }
        }

        dataset[curveIndex].data = data;
    }

    return dataset;
};

// function for removing unmatched data from a dataset containing multiple curves *with* levels
const getMatchedDataSetWithLevels = function (dataset, curvesLength, plotType) {

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

    // matching in this function is based on a curve's independent variable. For a timeseries, the independentVar is epoch,
    // for a profile, it's level, for a dieoff, it's forecast hour, for a threshold plot, it's threshold, and for a
    // valid time plot, it's hour of day. This function identifies the the independentVar values common across all of
    // the curves, and then the common sub times/levels/values for those independentVar values.

    //determine whether data[0] or data[1] is the independent variable, and which is the stat value
    var independentVarIndex;
    var statValueIndex;
    if (plotType !== 'profile') {
        independentVarIndex = 0;
        statValueIndex = 1;
    } else {
        independentVarIndex = 1;
        statValueIndex = 0;
    }

    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        independentVarGroups[curveIndex] = [];  // store the independentVars for each curve that are not null
        independentVarHasPoint[curveIndex] = [];   // store the *all* of the independentVars for each curve
        subSecs[curveIndex] = {};  // store the individual record times (subSecs) going into each independentVar for each curve
        subLevs[curveIndex] = {};  // store the individual record levels (subLevs) going into each independentVar for each curve
        data = dataset[curveIndex].data;
        for (di = 0; di < data.length; di++) { // loop over every independentVar value in this curve
            currIndependentVar = data[di][independentVarIndex];
            if (data[di][statValueIndex] !== null) {
                subSecs[curveIndex][currIndependentVar] = data[di][4];   // store raw secs for this independentVar value, since it's not a null point
                subLevs[curveIndex][currIndependentVar] = data[di][5];   // store raw levs for this independentVar value, since it's not a null point
                independentVarGroups[curveIndex].push(currIndependentVar);   // store this independentVar value, since it's not a null point
            }
            independentVarHasPoint[curveIndex].push(currIndependentVar);    // store all the independentVar values, regardless of whether they're null
        }
    }

    var matchingIndependentVars = _.intersection.apply(_, independentVarGroups);    // find all of the non-null independentVar values common across all the curves
    var matchingIndependentHasPoint = _.intersection.apply(_, independentVarHasPoint);    // find all of the independentVar values common across all the curves, regardless of whether or not they're null
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
            currSubIntersections = tempSubIntersections;    //replace current intersection array with array of only pairs that matched from this loop through.
        }
        subIntersections[currIndependentVar] = currSubIntersections;   // store the final intersecting subSecs array for this common non-null independentVar value
    }

    // remove non-matching independentVars and subSecs
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // loop over every curve
        data = dataset[curveIndex].data;

        // need to loop backwards through the data array so that we can splice non-matching indices
        // while still having the remaining indices in the correct order
        for (di = data.length - 1; di >= 0; di--) {

            if (matchingIndependentVars.indexOf(data[di][independentVarIndex]) === -1) {  // if this is not a common non-null independentVar value, we'll have to remove some data
                if (matchingIndependentHasPoint.indexOf(data[di][independentVarIndex]) === -1) {   // if at least one curve doesn't even have a null here, much less a matching value, just drop this independentVar
                    data.splice(di, 1);
                } else {    // if all of the curves have either data or nulls at this independentVar, and there is at least one null, ensure all of the curves are null
                    data[di][statValueIndex] = null;
                    data[di][3] = NaN;
                    data[di][4] = NaN;
                    data[di][5] = NaN;
                }
                continue;   // then move on to the next independentVar. There's no need to mess with the subSecs or subLevs
            }

            subSecs = data[di][4];
            subLevs = data[di][5];
            subValues = data[di][3];

            if (subSecs.length > 0 && subLevs.length > 0) {
                currIndependentVar = data[di][independentVarIndex];
                newSubValues = [];
                newSubSecs = [];
                newSubLevs = [];

                for (si = 0; si < subSecs.length; si++) {  // loop over all subSecs for this independentVar
                    tempPair = [subSecs[si], subLevs[si]]; //create sec-lev pair for each sub value
                    if (matsDataUtils.arrayContainsSubArray(subIntersections[currIndependentVar], tempPair)) {  // keep the subValue only if its sec-lev pair is common to all curves for this independentVar
                        var newVal = subValues[si];
                        var newSec = subSecs[si];
                        var newLev = subLevs[si];
                        if (newVal !== undefined) {
                            newSubValues.push(newVal);
                            newSubSecs.push(newSec);
                            newSubLevs.push(newLev);
                        }
                    }
                }

                // store the filtered data
                data[di][3] = newSubValues;
                data[di][4] = newSubSecs;
                data[di][5] = newSubLevs;
            }
        }

        dataset[curveIndex].data = data;
    }

    return dataset;
};

export default matsDataMatchUtils = {

    getMatchedDataSet: getMatchedDataSet,
    getMatchedDataSetWithLevels: getMatchedDataSetWithLevels

}