import {matsCollections} from 'meteor/randyp:mats-common';
const Future = require('fibers/future');

var getDatum = function (rawAxisData, axisTime, levelCompletenessX, levelCompletenessY, siteCompletenessX, siteCompletenessY,
                         levelBasisX, levelBasisY, siteBasisX, siteBasisY, xStatistic, yStatistic) {
    // sum and average all of the means for all of the sites
    var datum = {};
    var commonSitesBasisLengthX = siteBasisX.length;
    var commonSitesBasisLengthY = siteBasisY.length;
    var tSitesX = rawAxisData['xaxis']['data'][axisTime].sites;
    var tSitesY = rawAxisData['yaxis']['data'][axisTime].sites;
    // Do we have enough sites (based on the quality) for this time to qualify the data for this time? We need to have enough for x AND y
    var sitesXQuality = (Object.keys(tSitesX).length / commonSitesBasisLengthX) * 100;
    if (sitesXQuality < siteCompletenessX) {
        return []; // reject this site (it does not qualify for x axis) for this time
    }
    var sitesYQuality = (Object.keys(tSitesY).length / commonSitesBasisLengthY) * 100;
    if (sitesYQuality < siteCompletenessY) {
        return []; // reject this site (it does not qualify for y axis) for this time
    }

    //      calculate level statistics
    //      save recalculated levels
    var axisArr = ['xaxis', 'yaxis'];
    for (var ai = 0; ai < axisArr.length; ai++) {   //iterate axis
        var axisStr = axisArr[ai];
        var tSiteIds;
        var commonLevelsBasisLength;
        var qualityLevels;
        var statistic;
        if (axisArr[ai] == 'xaxis') {
            statistic = xStatistic;
            tSiteIds = Object.keys(tSitesX);
            commonLevelsBasisLength = levelBasisX.length;
            qualityLevels = levelCompletenessX;
        } else if (axisArr[ai] == 'yaxis') {
            statistic = yStatistic;
            tSiteIds = Object.keys(tSitesY);
            commonLevelsBasisLength = levelBasisY.length;
            qualityLevels = levelCompletenessY;
        }
        var siteLevelNum = 0; // the total number of entries, values for all the qualified levels, for all the qualified sites
        var siteLevelSum = 0; // the total sum of all the entries (values) for all the  qualified levels for all the qualified sites
        var siteLevelBiasSum = 0; //  the total sum of all the bias's for all the qualified levels for all the qualified sites
        var siteLevelBiasNum = 0; // the total number of bias values for all the qualified levels in all the qualified sites
                                  // (some experiment entries may not have had a corresponding truth entry so the  siteLevelBiasNum
                                  // might not be the same as the siteLevelNum)

        for (var si = 0; si < tSiteIds.length; si++) {    //iterate sites
            var siteId = tSiteIds[si];
            // quality filter is required (>0)  so we have to recalculate the statistics for this site for qualified levels
            // recalculate sMean for filtered levels
            var siteLevels = rawAxisData[axisStr]['data'][axisTime].sites[siteId]['levels'];
            //combine the levels and the values into single array (for using in the modal data view) - raw values - unfiltered
            if (rawAxisData[axisStr]['data'][axisTime].sites[siteId].levels) {
                rawAxisData[axisStr]['data'][axisTime].sites[siteId].levelsValues =
                    rawAxisData[axisStr]['data'][axisTime].sites[siteId].levels.map(function (level, index) {
                        return [level, rawAxisData[axisStr]['data'][axisTime].sites[siteId].values[index]];
                    });
            } else {
                rawAxisData[axisStr]['data'][axisTime].sites[siteId].levelsValues = [];
            }

            // What we really want is to put in a quality control
            // that says "what percentage of the commonSitesBasis set of levels does the Levels for this site and time need to be
            // in order to qualify the data?" In other words, throw away any data that doesn't meet the completeness criteria.
            var matchQuality = (siteLevels.length / commonLevelsBasisLength) * 100;
            if (matchQuality < qualityLevels) {
                continue;  // throw this site away - it does not qualify because it does not have enough levels
            }
            var filteredSites = rawAxisData[axisStr]['data'][axisTime].sites;
            filteredSites[siteId].levelsValues =
                filteredSites[siteId].levels.map(function (level, index) {
                    return [level, filteredSites[siteId].values[index]];
                });
            var siteValues = rawAxisData[axisStr]['data'][axisTime].sites[siteId]['values'];
            var truthValue;
            var biasValue;
            for (var li = 0; li < siteLevels.length; li++) {
                var siteLevelValue = siteValues[li];

                switch (statistic) {
                    case "bias":
                    case "mae":
                        // find siteLevelBias and sum it in
                        truthValue = null;
                        biasValue = null;
                        try {
                            if (rawAxisData[axisStr + '-truth']['data'][axisTime].sites[siteId].values[li]) {
                                truthValue = rawAxisData[axisStr + '-truth']['data'][axisTime].sites[siteId].values[li];
                                if (statistic == "mae") {
                                    biasValue = Math.abs(siteLevelValue - truthValue);
                                } else {
                                    biasValue = siteLevelValue - truthValue;
                                }
                                siteLevelBiasSum += biasValue;
                                siteLevelBiasNum++;
                            } else {
                                continue; // this level did not exist for this site
                            }
                        } catch (nodata) {
                            // apparently there is no data in the truth curve that matches this time
                            truthValue = null;
                        }
                        break;
                    case "rmse":
                        truthValue = null;
                        biasValue = null;
                        try {
                            if (rawAxisData[axisStr + '-truth']['data'][axisTime].sites[siteId].values[li]) {
                                truthValue = rawAxisData[axisStr + '-truth']['data'][axisTime].sites[siteId].values[li];
                                biasValue = siteLevelValue - truthValue;
                                biasValue = biasValue * biasValue;  // square the difference
                                siteLevelBiasSum += biasValue;
                                siteLevelBiasNum++;
                            } else {
                                continue; // this level did not exist for this site
                            }
                        } catch (nodata) {
                            // apparently there is no data in the truth curve that matches this time
                            truthValue = null;
                        }
                        break;
                    case "mean":
                    default:
                        try {
                            siteLevelSum += siteLevelValue;
                            siteLevelNum++;
                        } catch (ignore) {
                        }
                        break;
                }
            }
        }
        // we set bad numbers to null so that they can be squeezed out upstream
        switch (statistic) {
            case "bias":
            case "mae":
                var siteBias = null;
                try {
                    siteBias = siteLevelBiasSum / siteLevelBiasNum;
                    if (isNaN(siteBias)) {
                        siteBias = null;
                    }
                } catch (bad) {
                    siteBias = null;
                }
                datum[axisStr + '-value'] = siteBias;
                break;
            case "rmse":
                var siteMse = null;
                try {
                    siteMse = Math.sqrt(siteLevelBiasSum / siteLevelBiasNum);
                    if (isNaN(siteMse)) {
                        siteMse = null;
                    }
                } catch (bad) {
                    siteMse = null;
                }
                datum[axisStr + '-value'] = siteMse;
                break;
            case "mean":
            default:
                try {
                    var siteMean = siteLevelSum / siteLevelNum;
                    if (isNaN(siteMean)) {
                        siteMean = null;
                    }
                } catch (bad) {
                    siteMean = null;
                }
                datum[axisStr + '-value'] = siteMean;
                break;
        }
        datum[axisStr + '-sites'] = rawAxisData[axisStr]['data'][axisTime].sites;  // used to get level siteValues from raw data for data modal
        datum[axisStr + '-filteredSites'] = filteredSites;
    }
    // returns {xaxis-value:avalue,yaxis-value:avalue,xaxis-sites:[some sites],yaxis-sites:[some sites],xaxis-filteredsites:[some sites],yaxis-filteredsites:[some sites]}
    return datum;
};

var queryWFIP2DB = function (wfip2Pool, statement, top, bottom, myVariable, isJSON, myDiscriminator, disc_lower, disc_upper) {
    var dFuture = new Future();
    var error = "";
    var resultData = {};
    var minInterval = Number.MAX_VALUE;
    var sitesBasis = [];
    var levelsBasis = [];
    var allTimes = [];
    var cumulativeMovingAverage = 0;
    var timeCount = 0;
    var cumulativeMovingMeanForTime = 0;
    var siteCount = 0;
    var timeSites = [];
    const variableInfoMap = matsCollections.CurveParams.findOne({ name: 'variable' });
    const variableIsDiscriminator = variableInfoMap.infoMap[ myVariable ].type == 2;
    wfip2Pool.query(statement, function (err, rows) {
        // every row is a time and a site with a level array and a values array
        // the time and site combination form a unique pair but there
        // can certainly be multiple times that are the same
        // or multiple sites that are the same.
        // query callback - build the curve data from the results - or set an error
        // Levels are rounded to the nearest integer and bin'd.
        // Missing levels are added and corresponding missing values are set to null.
        // values are set to precision(4).

        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = 'rows undefined error';
            if (rows.length === 0) {
                error = '0 data records found';
            }
            // done waiting - error condition
            dFuture['return']();
        } else {
            /*
             We must map the query row result to a data structure like this...
             var resultData = {
             time0: {
             sites{
             site0: {  // times are in seconds and are unique - they are huge though so we use a map, instead of an array
             levels: [],
             values: [],
             sum: 0;
             mean: 0;
             numLevels: numLevels;
             max: max;
             min: min
             },
             site1: {..},
             .
             .
             site2: {...},
             .
             .
             siten: {...}
             }
             timeMean: Number,   // cumulativeMovingMean for this time
             timeLevels: [],
             timeSites:[]
             },
             time1:{ .... },
             .
             .
             timen:{ ... },
             };
             */
            var utctime = 0;
            var time = 0;
            var lastavTime = 0;
            var prevdiff = Number.MAX_VALUE;

            var rowIndex;
            var allSitesSet = new Set();
            var allLevelsSet = new Set();

            for (rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                utctime = Number(rows[rowIndex].valid_utc) * 1000;  // convert milli to second
                time = Number(rows[rowIndex].avtime) * 1000;  // convert milli to second

                // keep track of the minimum interval for the data set
                // it is necessary later when we fill in missing times
                var avinterval = time - lastavTime;
                if (avinterval !== 0 && avinterval < minInterval) {  // account for the same times in a row
                    minInterval = avinterval;
                }

                // const thisdiff = utctime - time;
                // if ( thisdiff > prevdiff ) {
                //     continue;
                // } else {
                //     prevdiff = thisdiff;
                // }


                lastavTime = time;
                var siteid = rows[rowIndex].sites_siteid;
                allSitesSet.add(siteid);
                if (timeSites.indexOf(siteid) === -1) {
                    timeSites.push(siteid);
                }

                var values = [];
                var levels = [];

                if (isJSON) {
                    // JSON variable -- stored as JSON structure 'data' in the DB
                    if (myDiscriminator !== matsTypes.InputTypes.unused) {
                        var discriminator = Number(JSON.parse(rows[rowIndex].data)[myDiscriminator]);
                        if (discriminator < disc_lower || discriminator > disc_upper) {
                            continue;
                        }
                    }
                    values = JSON.parse(rows[rowIndex].data)[myVariable];
                    if (values === undefined) {
                        // no data found in this record
                        continue;
                    } else {
                        levels = JSON.parse(rows[rowIndex].data)['z'];
                        if ( !(Array.isArray(levels))) {
                            levels = [Number(levels)];
                        }
                    }
                } else {
                    // conventional variable -- stored as text in the DB
                    values = JSON.parse(rows[rowIndex][myVariable]);
                    if (values === undefined) {
                        // no data found in this record
                        continue;
                    } else {
                        levels = JSON.parse(rows[rowIndex].z);
                    }
                }

                // surface values and discriminators are scalars and are returned by the DB a as string
                if (values === undefined) {
                    // no data found in this record
                    continue;
                }

                if (!(Array.isArray(values))) {
                    // disciminators are always on the surface
                    if (variableIsDiscriminator) {
                        levels = [0];
                    } else {
                        levels = [Number(levels[0])];
                    }
                    values = [Number(values)];
                } else {
                    values = values.map(function (a) {
                        return Number(a);
                    });
                }

                // set value precision
                try {
                    for (var valIndex = 0; valIndex < values.length; valIndex++) {
                        values[valIndex] = Number(values[valIndex].toPrecision(4));
                    }
                } catch (e) {
                    console.log(e);
                }
                for (var lvlIndex = 0; lvlIndex < levels.length; lvlIndex++) {
                    levels[lvlIndex] = Math.round(levels[lvlIndex]);
                }
                // round levels
                var numLevels = levels.length;
                if (numLevels === 0) {
                    // no data found in this record
                    continue;
                }

                // apply level filter, remove any levels and corresponding values that are not within the boundary.
                // there are always the same number of levels as values, they correspond one to one (in database).
                // filter backwards so the the level array is safely modified.
                // always accept levels that are Number.MIN_VALUE - they are special discriminators{
                for (var l = levels.length - 1; l >= 0; l--) {
                    var lvl = levels[l];
                    if (lvl != Number.MIN_VALUE && (lvl < bottom || lvl > top)) {
                        // remove this level - filter it out
                        levels.splice(l, 1);
                        values.splice(l, 1);
                    } else {
                        allLevelsSet.add(lvl);
                    }
                }

                // may have dropped sample in above if
                numLevels = levels.length;


                if (numLevels > 1) {
                    var sum = values.reduce(function (a, b) {
                        return a + b;
                    }, 0);
                } else {
                    var sum = values[0];
                }

                var mean = sum / numLevels;
                if (resultData[time] === undefined) {
                    resultData[time] = {sites: {}};
                    cumulativeMovingMeanForTime = 0;
                    siteCount = 0;
                    resultData[time].timeLevels = [];
                    timeSites = [];
                }
                if (resultData[time].sites[siteid] === undefined) {
                    resultData[time].sites[siteid] = {};
                }
                resultData[time].sites[siteid].levels = levels;
                resultData[time].sites[siteid].values = values;
                resultData[time].sites[siteid].sum = sum;
                resultData[time].sites[siteid].numLevels = numLevels;
                resultData[time].sites[siteid].mean = mean;
                resultData[time].sites[siteid].max = Math.max.apply(null, values);
                resultData[time].sites[siteid].min = Math.min.apply(null, values);
                cumulativeMovingAverage = (mean + timeCount * cumulativeMovingAverage) / (timeCount + 1);
                timeCount++;
                cumulativeMovingMeanForTime = (mean + siteCount * cumulativeMovingMeanForTime) / (siteCount + 1);
                siteCount++;
                // store timeMean each row because we don't know how many times there are
                // the last one will be the one returned
                resultData[time].timeMean = cumulativeMovingMeanForTime;
                resultData[time].timeLevels = _.union(resultData[time].timeLevels, levels);
                resultData[time].timeSites = timeSites;
            }
            // fill in missing times - there must be an entry at each minInterval
            // if there are multiple entries for a given time average them into one time entry
            // get an array of all the times for every site
            sitesBasis = Array.from(allSitesSet);
            levelsBasis = Array.from(allLevelsSet);
            allTimes = Object.keys(resultData).sort(function (a, b) {
                if (Number(a) > Number(b)) {
                    return 1;
                }
                if (Number(a) < Number(b)) {
                    return -1;
                }
                return 0;
            }); //Very important to sort the keys!
            time = allTimes[0];
            for (var k = 0; k < allTimes.length - 1; k++) {
                time = Number(allTimes[k]);
                var nextTime = allTimes[k + 1];
                var realInterval = nextTime - time;
                while (realInterval > minInterval) {
                    time = time + minInterval;
                    resultData[time] = null;
                    realInterval = nextTime - time;
                }
            }
            dFuture['return']();
        }
    });

    // wait for d future to finish - don't ya love it...
    dFuture.wait();

    return {
        error: error,
        data: resultData,
        levelsBasis: levelsBasis,
        sitesBasis: sitesBasis,
        allTimes: allTimes,
        minInterval: minInterval,
        cumulativeMovingAverage: cumulativeMovingAverage
    };
};

var getPointSymbol = function (curveIndex) {
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

export default matsWfipUtils = {
    getDatum: getDatum,
    queryWFIP2DB: queryWFIP2DB,
    getPointSymbol: getPointSymbol
}