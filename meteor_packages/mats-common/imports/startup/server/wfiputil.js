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
        //console.log('statement: ' + statement );

        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = 'rows undefined error';
            if (rows.length === 0) {
                error = 'INFO:0 data records found';
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
                var avinterval = Math.abs(time - lastavTime);
                if (avinterval !== 0 && avinterval < minInterval) {  // account for the same times in a row
                    minInterval = avinterval;
                }
                lastavTime = time;
                var siteid = rows[rowIndex].sites_siteid;
                allSitesSet.add(siteid);
                if (timeSites.indexOf(siteid) === -1) {
                    timeSites.push(siteid);
                }
                var values = [];
                var levels = [];
                var windSpeeds = []; // used for ws quality control toss wd when ws < 3ms
                if (isJSON) {
                    // JSON variable -- stored as JSON structure 'data' in the DB
                    if (myDiscriminator !== matsTypes.InputTypes.unused) {
                        var discriminator = Number(JSON.parse(rows[rowIndex].data)[myDiscriminator]);
                        if (discriminator < disc_lower || discriminator > disc_upper) {
                            continue;
                        }
                    }
                    // if wind direction have to filter for ws < 3ms
                    if (myVariable === "wd") {
                        // have to capture wind speed to filter for ws < 3 mps
                        windSpeeds = JSON.parse(rows[rowIndex].data)['ws'];
                        // if ((JSON.parse(rows[rowIndex].data)['ws']) < 3.0) {
                        //     continue;
                        // }
                    }
                    values = JSON.parse(rows[rowIndex].data)[myVariable];
                    if (values === undefined) {
                        // no data found in this record
                        continue;
                    } else {
                        const missing_value = JSON.parse(rows[rowIndex].data)['missing_value'];
                        if ( !(missing_value === undefined) ){
                            if ( values === missing_value ) {
                                values = undefined;
                                continue;
                            }
                        }
                        levels = JSON.parse(rows[rowIndex].data)['z'];
                        if ( !(Array.isArray(levels))) {
                            levels = [Number(levels)];
                        }
                    }
                } else {
                    // conventional variable -- stored as text in the DB
                    values = JSON.parse(rows[rowIndex][myVariable]);
                    if (myVariable === "wd") {
                        windSpeeds = JSON.parse(rows[rowIndex]['ws']);
                    }
                    if (values === undefined) {
                        // no data found in this record
                        continue;
                    }  else {
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
                    windSpeeds = [Number(windSpeeds)];
                } else {
                    values = values.map(function (a) {
                        return Number(a);
                    });
                    windSpeeds = windSpeeds.map(function (a) {
                        return Number(a);
                    });
                }
                // quality control for windDir
                // if corresponding windSpeed < 3ms null the windDir
                if (myVariable === "wd") {
                    for (var i = 0; i < values.length; i++) {
                        if (windSpeeds[i] < 3.0) {
                            values[i] = null;
                        }
                    }
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

const sumsSquaresByTimeLevel = function (params) {
/*
    // a dataVal is a value for non WindVars mean
    // a dataVal is data - truth for non windvars !mean
    // a dataVal is [u,v] for windVars mean
    // a dataVal is [du-tu,dv-tv] for windVars !mean

 sumsSquaresByTimeLevel = {
    time0:{level0:[dataVal0,dataVal1 ... ], level1:[dataVal0,dataVal1 ... ] .... leveln:[dataVal0,dataVal1 ... ] },
    time1:{level0:[dataVal0,dataVal1 ... ], level1:[dataVal0,dataVal1 ... ] .... leveln:[dataVal0,dataVal1 ... ] },
    .
    .
    .
    timet:{level0:[dataVal0,dataVal1 ... ], level1:[dataVal0,dataVal1 ... ] .... leveln:[dataVal0,dataVal1 ... ] }
 }
 */
    const allTimes = params.allTimes;
    const statType = params.statType;
    const queryResult = params.queryResult;
    const truthQueryResult = params.truthQueryResult;
    const windDirVar = params.windDirVar;
    const levelBasis = params.levelBasis;
    const siteBasis = params.siteBasis;
    const truthSiteBasis = params.truthSiteBasis;
    const siteCompleteness = params.siteCompleteness;
    const levelCompleteness = params.levelCompleteness;
    var validLevels = new Set();
    var sumsSquaresByTimeLevel = {};  // will hold all the valid values and times in time order by level
    var timesByLevel = {}; // will hold all the valid times by level
    var t;
    for (t = 0; t < allTimes.length; t++) {
        /*
         The sums array will retain the means, sums, bias, mae, or the squares of the qualified sites and
         levels for each valid time and level depending on the statType
         mean - [d1, d2, ... dn]
         bias - [(Data1 - truth1), (data2 - truth2), .... (datan - truthn)]
         mae - [|(Data1 - truth1)|, |(data2 - truth2)|, .... |(datan - truthn)|]
         mse - [sqr(Data1 - truth1), sqr(Data2 - truth2), .... (sqrDatan - truthn)]

         If statType is not "mean" then we need a set of truth values to diff from the verification values.
         The sites and levels have to match for the truth to make any sense.
         */
        var n = 0;
        var l = 0;
        var si = 0;
        var time = allTimes[t];
        var timeObj = queryResult.data[time];
        var verificationSites = Object.keys(timeObj.sites).map(Number);
        var truthSites = [];
        sumsSquaresByTimeLevel[time] = sumsSquaresByTimeLevel[time] === undefined ? [] : sumsSquaresByTimeLevel[time];
        var truthTimeObj;
        if (statType !== "mean") {
            truthTimeObj = truthQueryResult.data[time];
            truthSites = Object.keys(truthTimeObj.sites).map(Number);
        }
        var sites = statType !== "mean" ? _.intersection(verificationSites, truthSites) : verificationSites;
        var sitesLength = sites.length;
        var includedSites = _.intersection(sites, siteBasis);
        var sitesQuality = (includedSites.length / siteBasis.length) * 100;
        if (
            sitesQuality > siteCompleteness) {
            // this time is qualified for sites, count the qualified levels
            for (si = 0; si < sitesLength; si++) {
                var sLevels;
                var verificationValues = timeObj.sites[[sites[si]]].values;
                var truthValues;
                if (statType !== "mean") {
                    sLevels = _.intersection(timeObj.sites[[sites[si]]].levels, truthTimeObj.sites[[sites[si]]].levels);
                    truthValues = truthTimeObj.sites[[sites[si]]].values;
                } else {
                    sLevels = timeObj.sites[[sites[si]]].levels;
                }
                var includedLevels = _.intersection(sLevels, levelBasis);
                var levelsQuality = (includedLevels.length / levelBasis.length) * 100;
                if (levelsQuality > levelCompleteness) {
                    // this site has enough levels to qualify so process and capture its sums
                    // and add the time to the timesByLevel array if it isn't there already
                    for (l = 0; l < sLevels.length; l++) {
                        level = sLevels[l];
                        timesByLevel[level] = timesByLevel[level] === undefined ? [] : timesByLevel[level];
                        if (timesByLevel[level].indexOf(time) === -1)
                        {
                            timesByLevel[level].push(time)
                        }
                        var dataVal = verificationValues[l];
                        var truthVal;
                        if (statType !== "mean") {
                            truthVal = truthValues[l];
                        }
                        var windU;
                        var windV;
                        var tWindV;
                        var tWindU;
                        validLevels.add(level);
                        // wind has to be adjusted for direction (rose graph) and use vectors
                        if (windDirVar) {
                            if
                            (dataVal > 180) {
                                dataVal = dataVal - 360;
                            } else if (dataVal < -180) {
                                dataVal = dataVal + 360;
                            }
                            windV = Math.sin(dataVal);
                            windU = Math.cos(dataVal);
                            if (statType !== "mean") {
                                if (truthVal > 180) {
                                    truthVal = truthVal - 360;
                                } else if (
                                    truthVal < -180) {
                                    truthVal = truthVal + 360;
                                }
                                tWindV =
                                    Math.sin(truthVal);
                                tWindU = Math.cos(truthVal);
                            }
                        }
                        // sums for level
                        sumsSquaresByTimeLevel[time][level] = sumsSquaresByTimeLevel[time][level] === undefined ? [] : sumsSquaresByTimeLevel[time][level];
                        switch (statType) {
                            case "mae":
                                if (windDirVar) {
                                    const uVal = Math.abs(windU - tWindU);
                                    const vVal = Math.abs(windV - tWindV);
                                    sumsSquaresByTimeLevel[time][level].push({uVal:uVal,vVal:vVal});
                                    // [|(Data1 - truth1)|, |(data2 - truth2)|, .... |(datan - truthn)|]
                                } else {
                                    sumsSquaresByTimeLevel[time][level].push(Math.abs(dataVal - truthVal));  // [|(Data1 - truth1)|, |(data2 - truth2)|, .... |(datan - truthn)|]
                                }
                                break;
                            case "bias":
                                if (windDirVar) {
                                    const uVal = windU - tWindU;
                                    const vVal = windV - tWindV;
                                    sumsSquaresByTimeLevel[time][level].push({uVal:uVal,vVal:vVal});
                                    // [(Data1 - truth1), (data2 - truth2), .... (datan - truthn)]
                                } else {
                                    sumsSquaresByTimeLevel[time][level].push(dataVal - truthVal);
                                    // [(Data1 - truth1), (data2 - truth2), .... (datan - truthn)]
                                }
                                break;
                            case "rmse":
                                if (windDirVar) {
                                    const uVal = Math.pow((windU - tWindU),2);
                                    const vVal = Math.pow((windV - tWindV),2);
                                    sumsSquaresByTimeLevel[time][level].push({uVal:uVal,vVal:vVal}); //[sqr(Data1 - truth1), sqr(Data2 - truth2), .... sqr(Datan - truthn)]
                                } else {
                                    sumsSquaresByTimeLevel[time][level].push(Math.pow((dataVal - truthVal), 2)); //[sqr(Data1 - truth1), sqr(Data2 - truth2), .... sqr(Datan - truthn)]
                                }
                                break;
                            case "mean":
                            default:
                                if (windDirVar) {
                                    sumsSquaresByTimeLevel[time][level].push({uVal:windU,vVal:windV});
                                } else {
                                    sumsSquaresByTimeLevel[time][level].push(dataVal);
                                }
                        }
                    }   // end for levels
                } // end if level qualifies
            }
            // end for sites
        } //  end if site qualifies
    } // for all times
    return {
        validLevels:validLevels,
        sumsSquaresByTimeLevel:sumsSquaresByTimeLevel
    };
};

const getStatValuesByLevel = function (params) {
    const sumsSquaresByTimeLevel = params.sumsSquaresByTimeLevel;
    const validLevels = params.validLevels;
    var statValuesByLevel = {};
    // now we have to calculate the sums and squares (depending on the statistic type)
    // for each level use the data in sumsSquaresByTimeLevel to do the math on the partialSums. i.e. for mean add them and divide by n
    // for rmse add the squares then divide by n then take sqrt  etc.
    var statValue;
    var uStatValue;
    var vStatValue;
    var s;
    var statValues = [];
    var statTimesSet = new Set();
    var sumsForLevel = [];
    d = [];  // holds the flot dataset
    /*
     DATASET ELEMENTS:
     series: [data,data,data ...... ]   each data is itself an array
     data[0] - statValue (ploted against the x axis)
     data[1] - level (plotted against the y axis)
     data[2] - errorBar - stde_betsy * 1.96
     data[3] - level values
     data[4] - level times
     data[5] - level stats
     data[6] - tooltip
     */
    var means = [];
    var levels = Array.from(validLevels);
    var values;
    var uSum;
    var vSum;
    var v;
    var time;
    for (l = 0; l < levels.length; l++) {  // over all the levels
        var level = levels[l];
        var times = timesByLevel[level];
        for (t = 0; t < times.length; t++) {
            time = times[t];
            if (windDirVar) {
                values = sumsSquaresByTimeLevel[time][level];
                // for windDirVar this is an array of u,v vectors
                n = values.length;
                uSum = 0;
                vSum = 0;
                for (v = 0; v < n; v++) {
                    uSum += values[v].uVal;
                    vSum += values[v].vVal;
                }
                sumsForLevel.push({uSum: uSum, vSum: vSum});
                if (statistic === "rmse") {
                    // for rmse the values are sqr(data - truth) - must be square rooted
                    uStatValue = Math.sqrt(uSum / n);
                    vStatValue = Math.sqrt(vSum / n);
                } else {
                    uStatValue = uSum / n;
                    vStatValue = vSum / n;
                }
                // convert it back to direction
                statValue = Math.atan2(vStatValue, uStatValue) * 180 / Math.PI;
                //console.log ('statValue is ' + statValue);
            } else {
                values = sumsSquaresByTimeLevel[time][level];
                n = values.length;
                var sum = values.reduce((a, b) => a + b, 0);
                sumsForLevel.push(sum);
                if (statistic === "rmse") {
                    // for rmse the values are sqr(data - truth) - must be square rooted
                    statValue = Math.sqrt(sum / n);
                } else {
                    statValue = sum / n;
                }
            }
            statValues.push(statValue);
            statTimesSet.add(time);
        }
        statValuesByLevel[level] = {statTimes: Array.from(statTimes), statValues: statValues, sumsForLevel: sumsForLevel};
    }
    return statValuesByLevel;
};

const getDataForProfileDiffCurve = function(params) {
    /*
     DATASET ELEMENTS:
     series: [data,data,data ...... ]   each data is itself an array
     data[0] - statValue (ploted against the x axis)
     data[1] - level (plotted against the y axis)
     data[2] - errorBar (stde_betsy * 1.96)
     data[3] - level values
     data[4] - level times
     data[5] - level stats
     data[6] - tooltip

     This is returning a differenced curve dataset that is derived from two
     existing curve datasets. By virtue of being a difference profile curve we
     have to match levels.

     It is interesting to note that for wfip2 any profile matching has already
     been done prior to doing any differencing.
     A profile point value is a statistical deriviation of a collection of data. In
     the case of wfip2 that subset collection of data at any given level may
     have been collected from different time ranges, and different sites.
     The job of matching had to happen before differencing. That job was to filter away
     any and all data that did NOT match by either, time, site, or level. In the case
     of wfip2 we have level and site completeness as well. This means matching data
     may be filtered away because one curve did not have the 'complete enough'
     levels, and or sites to meet the completeness criteria and so get included.
     Matching would cause all the data in all the subsets to be tossed if it is
     tossed from any subset.
     */

    const dataset = params.dataset; // existing dataset - should contain the difference curve and the base curve
    const diffFrom = params.diffFrom; // array - [minuend_curve_index, subtrahend_curve_index] indexes are with respect to dataset
    var d = [];
    var minuendIndex = diffFrom[1];
    var subtrahendIndex = diffFrom[0]; // base curve
    var minuendData = dataset[minuendIndex].data;
    var subtrahendData = dataset[subtrahendIndex].data;
    var minuendLevelValues = {};
    var minuendLevels = [];
    var minuendStatistic = null;
    var subtrahendStatistic = null;
    var level;
    var value;
    for (i = 0; i < minuendData.length; i++) {
        level = minuendData[i][1];
        value = minuendData[i][0];
        if (!minuendStatistic) {
            minuendStatistic = minuendData[i][3].statistic;
        }
        minuendLevels.push(level);
        minuendLevelValues[level] = value;
    }
    var subtrahendLevels = [];
    var subtrahendLevelValues = {};
    for (i = 0; i < subtrahendData.length; i++) {
        level = subtrahendData[i][1];
        value = subtrahendData[i][0];
        if (!subtrahendStatistic) {
            subtrahendStatistic = subtrahendData[i][3].statistic;
        }
        subtrahendLevels.push(level);
        subtrahendLevelValues[level] = value;
    }
    var d = [];
    // get the intersection of the levels
    const commonLevels = minuendLevels.filter(function(n) {
        return subtrahendLevels.indexOf(n) !== -1;
    });
    // itterate all the common levels
    for (i = 0; i < commonLevels.length; i++) {
        level = commonLevels[i];
        value = minuendLevelValues[level] - subtrahendLevelValues[level];
        tooltip = "<br>" + label +
            "<br>level: " + level +
            "<br>minuend statistic: " + minuendStatistic +
            "<br>subtrahend statistic: " + subtrahendStatistic +
            "<br> diff value: " + (value === null ? null : value.toPrecision(4));
        d[i] = [];
        d[i][0] = value;
        d[i][1] = level;
        d[i][2] = -1;
        d[i][3] = [];
        d[i][4] = [];
        d[i][5] = [];
        d[i][6] = tooltip;
    }
    return {dataset:d};
}

const generateProfilePlotOptions = function ( dataset, curves, axisMap, errorMax) {
// generate y-axis
    var xmin = Number.MAX_VALUE;
    var xmax = Number.MIN_VALUE;
    var ymin = Number.MAX_VALUE;
    var ymax = Number.MIN_VALUE;
    var xAxislabel = "";
    var axisVariables = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        if (curves[dsi] === undefined ) {   // might be a zero curve or something so skip it
            continue;
        }
        const axisKey = curves[dsi].axisKey;
        // only need one xaxisLable (they should all be the same anyway for profiles)
        const thisVar = axisKey.split(':')[0];
        if (xAxislabel == "") {
            axisVariables.push(thisVar);
            xAxislabel = axisMap[axisKey].axisLabel;
        }
        else {
            if (axisVariables.indexOf(thisVar) === -1) {
                axisVariables.push(thisVar);
                if (xAxislabel.length > 30) {
                    xAxislabel += "\n";  // wrap long labels
                }
                xAxislabel = xAxislabel + '|' + axisMap[axisKey].axisLabel;
            }
        }
        xmin = xmin < axisMap[axisKey].xmin ? xmin : axisMap[axisKey].xmin;
        xmax = xmax > axisMap[axisKey].xmax ? xmax : axisMap[axisKey].xmax;
        ymin = ymin < axisMap[axisKey].ymin ? ymin : axisMap[axisKey].ymin;
        ymax = ymax > axisMap[axisKey].xmax ? ymax : axisMap[axisKey].ymax;
    }

    // account for error bars on xaxis
    xmax = xmax + errorMax;
    xmin = xmin - errorMax;
    const xpad = (xmax - xmin) * 0.05;
    const options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: xAxislabel,
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: xAxislabel.length > 40 ? 16 : 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
            alignTicksWithAxis: 1,
            color: 'grey',
            min:xmin - xpad,
            max:xmax + xpad,
            font: {
                size: 20,
                lineHeight: 23,
                style: "italic",
                weight: "bold",
                family: "sans-serif",
                variant: "small-caps",
                color: "#545454"
            }
        }],
        xaxis: {
            zoomRange: [0.1, null]
        },
        yaxes: [{
            position:"left",
            color: 'grey',
            axisLabel: ' Pressure (hPa)',
            axisLabelColour: "black",
            font: {
                size: 20,
                lineHeight: 23,
                style: "italic",
                weight: "bold",
                family: "sans-serif",
                variant: "small-caps",
                color: "#545454"
            },
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            min: 40,
            max: 180
        }],
        yaxis: [{
            zoomRange: [0.1, null]
        }],
        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0,
            position: 'ne'
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true
            },
            shadowSize: 0
        },
        zoom: {
            interactive: false
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            // the ct value is the last element of the data series for profiles. This is the tooltip content.
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };
    return options;
};

export default matsWfipUtils = {
    getDatum: getDatum,
    queryWFIP2DB: queryWFIP2DB,
    sumsSquaresByTimeLevel:sumsSquaresByTimeLevel,
    getStatValuesByLevel:getStatValuesByLevel,
    getDataForProfileDiffCurve:getDataForProfileDiffCurve,
    generateProfilePlotOptions:generateProfilePlotOptions
}