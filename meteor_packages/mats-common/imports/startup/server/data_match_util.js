import {matsDataUtils} from 'meteor/randyp:mats-common';

const getMatchedDataSet = function (dataset, curvesLength) {

    var subSecs = [];
    var subValues = [];
    var newSubSecs = [];
    var newSubValues = [];
    var independentVarGroups = [];
    var currIndependentVar;
    var curveIndex;
    var data;
    var di;
    var fi;
    var si;

    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        independentVarGroups[curveIndex] = [];
        subSecs[curveIndex] = {};
        data = dataset[curveIndex].data;
        for (di = 0; di < data.length; di++) { // every independentVar
            currIndependentVar = data[di][0];
            subSecs[curveIndex][currIndependentVar] = data[di][4]; //store raw secs for each valid time
            independentVarGroups[curveIndex].push(currIndependentVar);
        }
    }

    var matchingIndependentVars = _.intersection.apply(_, independentVarGroups);
    var subSecIntersection = {};

    for (fi = 0; fi < matchingIndependentVars.length; fi++) { // every independentVar
        currIndependentVar = matchingIndependentVars[fi];
        var currSubSecIntersection = subSecs[0][currIndependentVar];   //fill current intersection array with secs from the first curve
        for (curveIndex = 1; curveIndex < curvesLength; curveIndex++) { // every curve
            currSubSecIntersection = _.intersection(currSubSecIntersection, subSecs[curveIndex][currIndependentVar]);   //take intersection of current secs and previously matched secs
        }
        subSecIntersection[currIndependentVar] = currSubSecIntersection;   //store final current intersection array for each independentVar
    }

    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        data = dataset[curveIndex].data;

        // need to loop backwards through the data array so that we can splice indices
        // while still having the remaining indices in the correct order
        for (di = data.length - 1; di >= 0; di--) {
            if (matchingIndependentVars.indexOf(data[di][0]) === -1) {
                data.splice(di, 1);
                continue;   // not a matching independentVar - skip it
            }

            subSecs = data[di][4];
            subValues = data[di][3];

            if (subSecs.length > 0) {
                currIndependentVar = data[di][0];
                newSubValues = [];
                newSubSecs = [];

                for (si = 0; si < subSecs.length; si++) {  //loop over all sub values for this independentVar
                    if (subSecIntersection[currIndependentVar].indexOf(subSecs[si]) !== -1) { //store the sub-value only if its associated sec is in the matching array for this independentVar
                        var newVal = subValues[si];
                        var newSec = subSecs[si];
                        if (newVal === undefined || newVal === 0) {
                            //console.log ("found undefined at level: " + di + " curveIndex:" + curveIndex + " and secsIndex:" + subSecIntersection[subSecIntersectionIndex] + " subSecIntersectionIndex:" + subSecIntersectionIndex );
                        } else {
                            newSubValues.push(newVal);
                            newSubSecs.push(newSec);
                        }
                    }
                }

                data[di][3] = newSubValues;
                data[di][4] = newSubSecs;
            }
        }

        dataset[curveIndex].data = data;
    }

    return dataset;
};

const getMatchedDataSetWithLevels = function (dataset, curvesLength, plotType) {

    var subSecs = [];
    var subLevs = [];
    var subValues = [];
    var newSubSecs = [];
    var newSubLevs = [];
    var newSubValues = [];
    var independentVarGroups = [];
    var currIndependentVar;
    var curveIndex;
    var data;
    var di;
    var fi;
    var si;

    //determine whether data[0] or data[1] is the independent variable, and which is the stat value
    var independentVarIndex;
    if (plotType !== 'profile') {
        independentVarIndex = 0;
    } else {
        independentVarIndex = 1;
    }

    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        independentVarGroups[curveIndex] = [];
        subSecs[curveIndex] = {};
        subLevs[curveIndex] = {};
        data = dataset[curveIndex].data;
        for (di = 0; di < data.length; di++) { // every independentVar
            currIndependentVar = data[di][independentVarIndex];
            subSecs[curveIndex][currIndependentVar] = data[di][4]; //store raw secs for each valid time
            subLevs[curveIndex][currIndependentVar] = data[di][5];  //store raw levs for each valid time
            independentVarGroups[curveIndex].push(currIndependentVar);
        }
    }

    var matchingIndependentVars = _.intersection.apply(_, independentVarGroups);
    var subIntersections = [];

        for (fi = 0; fi < matchingIndependentVars.length; fi++) { // every independentVar
            currIndependentVar = matchingIndependentVars[fi];
            subIntersections[currIndependentVar] = [];
            var currSubIntersections = [];
            for (si = 0; si < subSecs[0][currIndependentVar].length; si++) {
                currSubIntersections.push([subSecs[0][currIndependentVar][si],subLevs[0][currIndependentVar][si]]);   //fill current intersection array with sec-lev pairs from the first curve
            }
            for (curveIndex = 1; curveIndex < curvesLength; curveIndex++) { // every curve after the first
                var tempSubIntersections = [];
                var tempPair;
                for (si = 0; si < subSecs[curveIndex][currIndependentVar].length; si++) { // every sub value
                    tempPair = [subSecs[curveIndex][currIndependentVar][si], subLevs[curveIndex][currIndependentVar][si]];    //create an individual sec-lev pair for each index in the subsec and sublev arrays
                    if (matsDataUtils.arrayContainsSubArray(currSubIntersections,tempPair)) {   //see if the individual sec-lev pair matches a pair from the current intersection array
                        tempSubIntersections.push(tempPair);    //store matching pairs
                    }
                }
                currSubIntersections = tempSubIntersections;    //replace current intersection array with array of only pairs that matched from this loop through.
            }
            subIntersections[currIndependentVar] = currSubIntersections;   //store final current intersection array for each forecast hour
        }

    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        data = dataset[curveIndex].data;

        // need to loop backwards through the data array so that we can splice indices
        // while still having the remaining indices in the correct order
        for (di = data.length - 1; di >= 0; di--) {
            if (matchingIndependentVars.indexOf(data[di][independentVarIndex]) === -1) {
                data.splice(di, 1);
                continue;   // not a matching independentVar - skip it
            }

            subSecs = data[di][4];
            subLevs = data[di][5];
            subValues = data[di][3];

            if (subSecs.length > 0 && subLevs.length > 0) {
                currIndependentVar = data[di][independentVarIndex];
                newSubValues = [];
                newSubSecs = [];
                newSubLevs = [];

                for (si = 0; si < subSecs.length; si++) {  //loop over all sub values for this independentVar
                    tempPair = [subSecs[si],subLevs[si]]; //create sec-lev pair for each sub value
                    if (matsDataUtils.arrayContainsSubArray(subIntersections[currIndependentVar],tempPair)) {  //store the sub-value only if its sec-lev pair is in the matching array for this independentVar
                        var newVal = subValues[si];
                        var newSec = subSecs[si];
                        var newLev = subLevs[si];
                        if (newVal === undefined || newVal === 0) {
                            //console.log ("found undefined at level: " + di + " curveIndex:" + curveIndex + " and secsIndex:" + subSecIntersection[subSecIntersectionIndex] + " subSecIntersectionIndex:" + subSecIntersectionIndex );
                        } else {
                            newSubValues.push(newVal);
                            newSubSecs.push(newSec);
                            newSubLevs.push(newLev);
                        }
                    }
                }

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