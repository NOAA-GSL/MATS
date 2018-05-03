import {matsDataUtils} from 'meteor/randyp:mats-common';

const getSeriesMatchedDataSet = function (dataset, cycles, fhrs, levelMatching) {
    // for matching - the begin time must be the first coinciding time for all the curves.
    // Once we know at which index the curves coincide we can increment by the interval.
    // time iterator is set to the earliest and timeMax is set to the latest time,
    // interval for a set of regular curves - or a set of curves that has at least one regular curve - is the maximum regular valid time interval,
    // interval for a set of all irregular curves is the intersection of the cadences
    // we shouldn't need to redetermine the cadences by querying the db because the data has already had all of its missing data handled and represented by nulls.
    // So we just need to see if the diff between points on the curve is constant.

    var curvesLength = dataset.length;
    var dataIndexes = {};
    var ci;
    var sci;
    var time = Number.MAX_VALUE;
    var timeMax = Number.MIN_VALUE;
    var dataMaxInterval = Number.MIN_VALUE;
    var dataMinInterval = Number.MAX_VALUE;
    var regular = true;
    // set up the indexes and determine the minimum time for the dataset
    if (curvesLength == 1) {
        return dataset;
    }
    for (ci = 0; ci < curvesLength; ci++) {
        try {
            if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
                // one of the curves has no data. No match possible
                for (sci = 0; sci < curvesLength; sci++) {
                    dataset[sci].data = [];
                }
                return dataset;
            }
            dataIndexes[ci] = 0;
            time = time < dataset[ci].data[0][0] ? time : dataset[ci].data[0][0];
            if (dataset[ci].data.length > 1) {
                var prevDiff = -1;
                for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                    diff = dataset[ci].data[di + 1][0] - dataset[ci].data[di][0];
                    prevDiff = prevDiff === -1 ? diff : prevDiff;
                    regular = (prevDiff !== diff || !regular) ? false : true;
                    dataMaxInterval = dataMaxInterval > diff ? dataMaxInterval : diff;
                    dataMinInterval = dataMinInterval < diff ? dataMinInterval : diff;
                    prevDiff = diff;
                    if (!regular) {
                        break;
                    }
                }
            }
            timeMax = timeMax > dataset[ci].data[dataset[ci].data.length - 1][0] ? timeMax : dataset[ci].data[dataset[ci].data.length - 1][0];
        } catch (e) {
            console.log(e)
        }
    }
    if (dataMaxInterval === Number.MIN_VALUE) {
        // we can't get an interval, give up
        for (sci = 0; sci < curvesLength; sci++) {
            dataset[sci].data = [];
        }
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
    var interval = regular ? dataMaxInterval : dataMinInterval;
    while (time <= timeMax) {
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
                    // create a new data set if we do not already have one
                    newDataSet[sci] = {};
                    // copy the extraneous data for the new dataset over from the old dataset
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
            }
            var needNullPoint = [];
            for (sci = 0; sci < curvesLength; sci++) {
                if (regular) {
                    if (!levelMatching) {
                        newDataSet[sci].data.push([time, null, -1, NaN, NaN]);
                    } else {
                        newDataSet[sci].data.push([time, null, -1, NaN, NaN, NaN]);
                    }
                } else {
                    var timeInterval = (time % (24 * 3600 * 1000));
                    if (Number(timeInterval) - (Number(fhrs[sci]) * 3600 * 1000) < 0) {
                        timeInterval = (Number(timeInterval) - (Number(fhrs[sci]) * 3600 * 1000) + (24 * 3600 * 1000));
                    } else {
                        timeInterval = (Number(timeInterval) - (Number(fhrs[sci]) * 3600 * 1000));
                    }
                    if (cycles[sci].length === 1 && (timeInterval % cycles[sci][0]) === 0) {
                        needNullPoint.push(true);
                    } else if (cycles[sci].length > 1 && cycles[sci].indexOf(timeInterval) !== -1) {
                        needNullPoint.push(true);
                    } else {
                        needNullPoint.push(false);
                    }
                }
            }
            if (!regular && needNullPoint.indexOf(false) === -1) {
                for (sci = 0; sci < curvesLength; sci++) {
                    if (!levelMatching) {
                        newDataSet[sci].data.push([time, null, -1, NaN, NaN]);
                    } else {
                        newDataSet[sci].data.push([time, null, -1, NaN, NaN, NaN]);
                    }
                }
            }
        }
        if (regular) {
            time = Number(time) + Number(interval);
        } else {
            var minFhr = Math.min(...fhrs);
            timeInterval = (time % (24 * 3600 * 1000));
            if (Number(timeInterval) - (Number(minFhr) * 3600 * 1000) < 0) {
                timeInterval = (Number(timeInterval) - (Number(minFhr) * 3600 * 1000) + (24 * 3600 * 1000));
            } else {
                timeInterval = (Number(timeInterval) - (Number(minFhr) * 3600 * 1000));
            }
            if (Number(timeInterval) + Number(interval) <= ((24 * 3600 * 1000))) {
                time = Number(time) + Number(interval);
            } else {
                var minCycleTime = 0;
                for (sci = 0; sci < curvesLength; sci++) {
                    var currentMinCycleTime = Math.min(cycles[sci]);
                    minCycleTime = minCycleTime > currentMinCycleTime ? currentMinCycleTime : minCycleTime;
                }
                time = Number(time) - timeInterval + (24 * 3600 * 1000) + minCycleTime;
            }
        }
    }// while time
    // have to fix options - specifically annotations because the mean may have changed due to dropping unmatched data
    for (ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].annotation === undefined || dataset[ci].annotation == null || dataset[ci].annotation == "") {
            continue;   // don't do it if there isn't an annotation
        }

        var sum = 0;
        var count = 0;
        var mean = null;
        var d = newDataSet[ci].data;
        if (d.length > 0) {
            mean = d[0][1];
            for (var i = 0; i < d.length; i++) {
                if (d[i][1] !== null) {
                    sum = sum + d[i][1];
                    count++
                }
            }
            if (count > 1) {
                mean = sum / count;
            }
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

const getSpecialtyCurveMatchedDataSet = function (dataset, curvesLength) {

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

const getSpecialtyCurveMatchedDataSetWithLevels = function (dataset, curvesLength, plotType) {

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

    getSeriesMatchedDataSet: getSeriesMatchedDataSet,
    getSpecialtyCurveMatchedDataSet: getSpecialtyCurveMatchedDataSet,
    getSpecialtyCurveMatchedDataSetWithLevels: getSpecialtyCurveMatchedDataSetWithLevels

}