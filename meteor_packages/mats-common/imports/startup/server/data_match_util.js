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

const getDieOffMatchedDataSet = function (dataset) {
    var curvesLength = dataset.length;
    var dataIndexes = {};
    var ci;
    var sci;
    var hour = 0;
    var hourMax = Number.MIN_VALUE;
    var dataMinInterval = Number.MAX_VALUE;
    // set up the indexes and determine the minimum hour for the dataset
    if (curvesLength == 1) {
        return dataset;
    }
    for (ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible
            for (sci = 0; sci < curvesLength; sci++) {
                dataset[sci].data = [];
            }
            return dataset;
        }
        dataIndexes[ci] = 0;
        if (dataset[ci].data.length > 1) {
            var diff;
            for (var di = 0; di < dataset[ci].data.length - 1; di++) {  // don't go all the way to the end - one shy
                diff = dataset[ci].data[di + 1][0] - dataset[ci].data[di][0];
                dataMinInterval = dataMinInterval < diff ? dataMinInterval : diff;
            }
        }
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
    while (hour <= hourMax) {
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
                if (!(dataset[ci].data[dataIndexes[ci]] !== undefined && dataset[ci].data[dataIndexes[ci]][0] !== undefined && dataset[ci].data[dataIndexes[ci]][1] !== undefined )) {
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
        hour = hour + dataMinInterval;
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

const getThresholdMatchedDataSet = function (dataset) {
    var curvesLength = dataset.length;
    var dataIndexes = {};
    var ci;
    var sci;
    var trsh_vals = [3.00, 2.00, 1.50, 1.00, 0.50, 0.25, 0.10, 0.01];
    var trsh = trsh_vals.pop();
    var trshMax = Number.MIN_VALUE;
    // set up the indexes and determine the minimum hour for the dataset
    if (curvesLength == 1) {
        return dataset;
    }
    for (ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible
            for (sci = 0; sci < curvesLength; sci++) {
                dataset[sci].data = [];
            }
            return dataset;
        }
        dataIndexes[ci] = 0;
        trshMax = trshMax > dataset[ci].data[dataset[ci].data.length - 1][0] ? trshMax : dataset[ci].data[dataset[ci].data.length - 1][0];
    }
    var done = false;
    // find the first common start point (by trsh).
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
            // since they are the same just use the trsh
            // belonging to the current dataindex of the 0th curve
            // that will be our common start trsh
            trsh = dataset[0].data[dataIndexes[0]][0];
        }
    }
    var trshMatches;
    var newDataSet = [];
    while (trsh <= trshMax) {
        trshMatches = true;
        for (ci = 0; ci < curvesLength; ci++) {
            // move this curves index to equal or exceed the new trsh
            while (dataset[ci].data[dataIndexes[ci]] && dataset[ci].data[dataIndexes[ci]][0] < trsh) {
                dataIndexes[ci]++;
            }
            // if the trsh isn't right or the data is null it doesn't match
            if (dataset[ci].data[dataIndexes[ci]] == undefined || dataset[ci].data[dataIndexes[ci]][0] != trsh) {
                trshMatches = false;
                break;
            } else {
                // if there is no data entry here at this trsh it doesn't match
                if (!(dataset[ci].data[dataIndexes[ci]] !== undefined && dataset[ci].data[dataIndexes[ci]][0] !== undefined && dataset[ci].data[dataIndexes[ci]][1] !== undefined )) {
                    trshMatches = false;
                }
            }
        }   // for all the curves
        if (trshMatches) {
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
        trsh = trsh_vals.pop();
    }// while trsh
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

const getValidTimeMatchedDataSet = function (dataset) {
    var curvesLength = dataset.length;
    var dataIndexes = {};
    var ci;
    var sci;
    var vt_vals = [23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    var vt = vt_vals.pop();
    var vtMax = Number.MIN_VALUE;
    // set up the indexes and determine the minimum hour for the dataset
    if (curvesLength == 1) {
        return dataset;
    }
    for (ci = 0; ci < curvesLength; ci++) {
        if (dataset[ci].data === undefined || dataset[ci].data.length === 0) {
            // one of the curves has no data. No match possible
            for (sci = 0; sci < curvesLength; sci++) {
                dataset[sci].data = [];
            }
            return dataset;
        }
        dataIndexes[ci] = 0;
        vtMax = vtMax > dataset[ci].data[dataset[ci].data.length - 1][0] ? vtMax : dataset[ci].data[dataset[ci].data.length - 1][0];
    }
    var done = false;
    // find the first common start point (by vt).
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
            // since they are the same just use the vt
            // belonging to the current dataindex of the 0th curve
            // that will be our common start vt
            vt = dataset[0].data[dataIndexes[0]][0];
        }
    }
    var vtMatches;
    var newDataSet = [];
    while (vt <= vtMax) {
        vtMatches = true;
        for (ci = 0; ci < curvesLength; ci++) {
            // move this curves index to equal or exceed the new trsh
            while (dataset[ci].data[dataIndexes[ci]] && dataset[ci].data[dataIndexes[ci]][0] < vt) {
                dataIndexes[ci]++;
            }
            // if the vt isn't right or the data is null it doesn't match
            if (dataset[ci].data[dataIndexes[ci]] == undefined || dataset[ci].data[dataIndexes[ci]][0] != vt) {
                vtMatches = false;
                break;
            } else {
                // if there is no data entry here at this vt it doesn't match
                if (!(dataset[ci].data[dataIndexes[ci]] !== undefined && dataset[ci].data[dataIndexes[ci]][0] !== undefined && dataset[ci].data[dataIndexes[ci]][1] !== undefined )) {
                    vtMatches = false;
                }
            }
        }   // for all the curves
        if (vtMatches) {
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
        vt = vt_vals.pop();
    }// while vt
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

export default matsDataMatchUtils = {

    getSeriesMatchedDataSet: getSeriesMatchedDataSet,
    getDieOffMatchedDataSet: getDieOffMatchedDataSet,
    getThresholdMatchedDataSet: getThresholdMatchedDataSet,
    getValidTimeMatchedDataSet: getValidTimeMatchedDataSet,

}