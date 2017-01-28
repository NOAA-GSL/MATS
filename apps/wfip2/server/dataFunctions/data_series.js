import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsWfipUtils} from 'meteor/randyp:mats-common';

const Future = require('fibers/future');

dataSeries = function (plotParams, plotFunction) {
    //console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {}; // used to store data queries
    var curveDates = plotParams.dates.split(' - ');
    var fromDateStr = curveDates[0];
    var fromDate = matsDataUtils.dateConvert(fromDateStr);
    var toDateStr = curveDates[1];
    var toDate = matsDataUtils.dateConvert(toDateStr);
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var yAxisBoundaries = {};
    /* axis boundaries is an object keyed by variable.
     Later on we might want to make the key complex i.e. 'variable + stat' or 'variable category' or something
     each curve will add its yaxisMax and yaxisMin to the object, keyed by variable
     the yaxisoptions can derive the ymax and ymin from this object.
     */
    var xAxisMax = Number.MIN_VALUE;
    var xAxisMin = Number.MAX_VALUE;
    var yAxisMaxes = [];
    var yAxisMins = [];
    var maxValidInterval = Number.MIN_VALUE;    //used for differencing and matching
    var matchTime = (plotParams['plotAction'] === matsTypes.PlotActions.matched) && (plotParams.matchFormat.indexOf(matsTypes.MatchFormats.time) !== -1);
    var matchLevel = (plotParams['plotAction'] === matsTypes.PlotActions.matched) && (plotParams.matchFormat.indexOf(matsTypes.MatchFormats.level) !== -1);
    var matchSite = (plotParams['plotAction'] === matsTypes.PlotActions.matched) && (plotParams.matchFormat.indexOf(matsTypes.MatchFormats.site) !== -1);
    var options;
    var max_verificationRunInterval = Number.MIN_VALUE;
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        const tmp = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0].split(',');
        curve.dataSource_is_instrument = parseInt(tmp[1]);
        curve.dataSource_tablename = tmp[2];
        curve.verificationRunInterval = tmp[4];
        curve.dataSource_is_json = parseInt(tmp[5]);
        max_verificationRunInterval = Number(curve.verificationRunInterval) > Number(max_verificationRunInterval) ? curve.verificationRunInterval : max_verificationRunInterval;
        if (curve['statistic'] != "mean") {
            if ((curve['truth-data-source'] === matsTypes.InputTypes.unused || curve['truth-data-source'] === undefined)) {
                throw new Error("INFO: You are trying to calculate a statistic that requires a truth data source while setting the truth data source to " + matsTypes.InputTypes.unused + ". This is not going to work.");
            }
            // need a truth data source for statistic
            const tmp = matsCollections.CurveParams.findOne({name: 'truth-data-source'}).optionsMap[curve['truth-data-source']][0].split(',');
            curve.truthDataSource_is_instrument = parseInt(tmp[1]);
            curve.truthDataSource_tablename = tmp[2];
            curve.truthRunInterval = tmp[4];
            curve.truthDataSource_is_json = parseInt(tmp[5]);
            // might override the datasource assigned max_verificationRunInterval
            max_verificationRunInterval = Number(curve.truthRunInterval) > Number(max_verificationRunInterval) ? curve.truthRunInterval : max_verificationRunInterval;
        }
    }

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        yAxisMaxes[curveIndex] = Number.MIN_VALUE;
        yAxisMins[curveIndex] = Number.MAX_VALUE;
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var dataSource_is_instrument = curve.dataSource_is_instrument;
        var dataSource_tablename = curve.dataSource_tablename;
        var verificationRunInterval = curve.verificationRunInterval;
        var dataSource_is_json = curve.dataSource_is_json;
        var statistic = curve['statistic'];
        // maxRunInterval is used for determining maxValidInterval which is used for differencing and matching
        var maxRunInterval = verificationRunInterval;
        maxValidInterval = maxValidInterval > maxRunInterval ? maxValidInterval : maxRunInterval;

        // variables can be conventional or discriminators. Conventional variables are listed in the variableMap.
        // discriminators are not.
        // we are using existence in variableMap to decide if a variable is conventional or a discriminator.
        var variableMap = matsCollections.CurveParams.findOne({name: 'variable'}).variableMap;
        var variableStr = curve['variable'];
        var myVariable = variableMap[variableStr];
        if (myVariable === undefined) {
            throw new Error("variable " + variableStr + " is not in variableMap");
        }

        var region = matsCollections.CurveParams.findOne({name: 'region'}).optionsMap[curve['region']][0];
        var siteNames = curve['sites'];
        var siteIds = [];
        for (var i = 0; i < siteNames.length; i++) {
            var siteId = matsCollections.SiteMap.findOne({siteName: siteNames[i]}).siteId;
            siteIds.push(siteId);
        }
        var label = (curve['label']);
        var top = Number(curve['top']);
        var bottom = Number(curve['bottom']);
        var color = curve['color'];

        //var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'][matsTypes.PlotTypes.timeSeries];
        //var variable = variableOptionsMap[dataSource][variableStr];
        var discriminator = variableMap[curve['discriminator']] === undefined ? matsTypes.InputTypes.unused : variableMap[curve['discriminator']];
        var disc_upper = Number(curve['upper']);
        var disc_lower = Number(curve['lower']);
        var forecastLength = curve['forecast-length'] === undefined ? matsTypes.InputTypes.unused : curve['forecast-length'];
        forecastLength = forecastLength === matsTypes.InputTypes.unused ? Number(0) : Number(forecastLength);
        var statement = "";
        var count = 0;
        var sum = 0;
        var average = 0;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve - do those after Matching ..
            if (dataSource_is_instrument) {
                const utcOffset = Number(forecastLength * 3600);
                if (dataSource_is_json) {
                    // verificationRunInterval is in milliseconds
                    statement = "select O.valid_utc as valid_utc, (O.valid_utc - (O.valid_utc %  " + verificationRunInterval / 1000 + ")) as avtime, cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(fromDate) + utcOffset) +
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(toDate) + utcOffset);
                } else {
                    statement = "select O.valid_utc as valid_utc, (O.valid_utc - (O.valid_utc %  " + verificationRunInterval / 1000 + ")) as avtime, z," + myVariable + ", sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(fromDate) + utcOffset) +
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(toDate) + utcOffset);
                }
                // data source is a model and its JSON
            } else {
                statement = "select cycle_utc as valid_utc, (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + dataSource_tablename +
                    " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                    " and fcst_utc_offset =" + 3600 * forecastLength +
                    " and cycle_utc >=" + matsDataUtils.secsConvert(fromDate) +
                    " and cycle_utc <=" + matsDataUtils.secsConvert(toDate);
            }

            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ")";
            //console.log("statement: " + statement);
            dataRequests[curve.label] = statement;
            var queryResult;
            try {
                queryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, dataSource_is_json, discriminator, disc_lower, disc_upper);
            } catch (e) {
                e.message = "Error in queryWIFP2DB: " + e.message + " for statement: " + statement;
                throw e;
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                throw (new Error(error));
            }
            var truthQueryResult = queryResult;
            // for mean calulations we do not have a truth curve.
            if (statistic != "mean") {
                // need a truth data source for statistic
                var truthDataSource_is_instrument = curve.truthDataSource_is_instrument;
                var truthDataSource_tablename = curve.truthDataSource_tablename;
                var truthRunInterval = curve.truthRunInterval;
                var truthDataSource_is_json = curve.truthDataSource_is_json;
                maxRunInterval = truthRunInterval > verificationRunInterval ? truthRunInterval : verificationRunInterval;
                maxValidInterval = maxValidInterval > maxRunInterval ? maxValidInterval : maxRunInterval;
                var truthStatement = '';
                if (truthDataSource_is_instrument) {
                    const utcOffset = Number(forecastLength * 3600);
                    if (truthDataSource_is_json) {
                        truthStatement = "select  O.valid_utc as valid_utc, (O.valid_utc - (O.valid_utc %  " + truthRunInterval / 1000 + ")) as avtime, cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                            " where  obs_recs_obsrecid = O.obsrecid" +
                            " and valid_utc>=" + Number(matsDataUtils.secsConvert(fromDate) + utcOffset) +
                            " and valid_utc<=" + Number(matsDataUtils.secsConvert(toDate) + utcOffset);
                    } else {
                        truthStatement = "select  O.valid_utc as valid_utc, (O.valid_utc - (O.valid_utc %  " + truthRunInterval / 1000 + ")) as avtime, z," + myVariable + ", sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                            " where  obs_recs_obsrecid = O.obsrecid" +
                            " and valid_utc>=" + Number(matsDataUtils.secsConvert(fromDate) + utcOffset) +
                            " and valid_utc<=" + Number(matsDataUtils.secsConvert(toDate) + utcOffset);
                    }
                } else {
                    truthStatement = "select  cycle_utc as valid_utc, (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + truthDataSource_tablename +
                        " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                        " and fcst_utc_offset =" + 3600 * forecastLength +
                        " and cycle_utc >=" + matsDataUtils.secsConvert(fromDate) +
                        " and cycle_utc <=" + matsDataUtils.secsConvert(toDate);
                }
                truthStatement = truthStatement + " and sites_siteid in (" + siteIds.toString() + ")";
                //console.log("statement: " + truthStatement);
                dataRequests[curve.label] = truthStatement;
                try {
                    truthQueryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, truthStatement, top, bottom, myVariable, truthDataSource_is_json, matsTypes.InputTypes.unused, disc_lower, disc_upper);
                } catch (e) {
                    e.message = "Error in queryWIFP2DB: " + e.message + " for statement: " + truthStatement;
                    throw e;
                }
                if (truthQueryResult.error !== undefined && truthQueryResult.error !== "") {
                    //error += "Error from truth query: <br>" + truthQueryResult.error + " <br>" + " query: <br>" + truthStatement + " <br>";
                    throw ( new Error(truthQueryResult.error) );
                }
            }

            /* What we really want to end up with for each curve is an array of arrays where each element has a time and an average of the corresponding values.
             data = [ [time, value] .... [time, value] ] // where value is an average based on criterion, such as which sites have been requested?,
             and what are the level boundaries?, and what are the time boundaries?. Levels and times have been built into the query but sites still
             need to be accounted for here. Also there can be missing times so we need to iterate through each set of times,
             based on the minimum interval for the data set, and fill in missing times with null values.

             We also have filtering... if levels or sites are filtered, each axis must have the same intersection for the filtered attribute.

             We can be requested to filter by siteids or levels, times are always effectively filtered. Filtering means that we exclude any data that is not consistent with
             the intersection of the filter values. For example if level matching is requested we need to find the intersection of all the level arrays for the given
             criteria and only include data that has levels that are in that intersection. It is the same for times and siteids.
             The data from the query is of the form
             result =  {
             error: error,
             data: resultData,
             levelsBasis: levelsBasis,
             sitesBasis: sitesBasis,
             allTimes: allTimes,
             minInterval: minInterval,
             mean:cumulativeMovingAverage
             }
             where ....
             resultData = {
             time0: {
             sites: {
             site0: {
             levels:[],
             values:[],
             sum: Number,
             mean: Number,
             numLevels: Number,
             max: Number,
             min: Number
             },
             site1: {...},
             .
             .
             siten:{...},
             }
             timeMean: Number   // cumulativeMovingMean for this time
             timeLevels: [],
             timeSites:[]
             },
             time1:{....},
             .
             .
             timen:{....}
             }
             where each site has been filled (nulls where missing) with all the times available for the data set, based on the minimum time interval.
             There is at least one real (non null) value for each site.
             */

            var levelCompleteness = curve['level-completeness'];
            var siteCompleteness = curve['site-completeness'];
            const levelBasis = queryResult.levelsBasis;
            const siteBasis = queryResult.sitesBasis;
            var verificationData = _.pairs(queryResult.data).sort(function (a, b) {
                return a[0] - b[0]
            });
            //var normalizedData = verificationData.map(function (timeObjPair) {
            // we need to go through all the time objects of both the actual and the truth data series
            // and skip any where there isn't a corresponding time.
            // we make our calculations where there are corresponding times.
            var valMaxIndex = verificationData.length;
            var valIndex = 0;
            var valTime = verificationData[0][0];
            var normalizedData = [];
            // deal with the truth - you can't handle the truth! (if statistic is mean)
            var truthData = [];
            var truthMaxIndex = valMaxIndex;
            var truthTime = valTime;
            var truthIndex = 0; // just make the truth indexing not matter - if statistic is mean
            if (statistic != "mean") {
                truthData = _.pairs(truthQueryResult.data).sort(function (a, b) {
                    return a[0] - b[0]
                });
                truthMaxIndex = truthData.length - 1;
                truthTime = verificationData[0][0];
            }
            while (truthIndex < truthMaxIndex && valIndex < valMaxIndex) {
                // each timeObj is of the form [time,{sites:{...},timeMean:mean,timeLevels:[],....]
                if (statistic != "mean") {
                    truthTime = truthData[truthIndex][0];
                }
                valTime = verificationData[valIndex][0];
                if (valTime < truthTime) {
                    valIndex++;
                    continue;
                } else if (statistic != "mean" && truthTime < valTime) {
                    truthIndex++;
                    continue;
                } else {
                    //times are now equal we can calculate the value for this time
                    value = null;
                    var time = verificationData[valIndex][0];
                    var timeObj = verificationData[valIndex][1];
                    var truthTimeObj = statistic == "mean" ? null : truthData[truthIndex][1];
                    xAxisMin = time < xAxisMin ? time : xAxisMin;
                    xAxisMax = time > xAxisMax ? time : xAxisMax;
                    if (!timeObj) {
                        var seconds = time / 1000;
                        tooltip = label +
                            "<br>seconds: " + seconds +
                            "<br>time: " + new Date(Number(valTime)).toUTCString() +
                            "<br> statistic: " + statistic +
                            "<br> value:" + null;
                        normalizedData.push([time, value, timeObj, tooltip]);   // recalculated statistic
                        valIndex++;
                        continue;
                    }
                    if (statistic != "mean" && !truthTimeObj) {
                        var seconds = time / 1000;
                        tooltip = label +
                            "<br>seconds: " + seconds +
                            "<br>time: " + new Date(Number(valTime)).toUTCString() +
                            "<br> statistic: " + statistic +
                            "<br> value:" + null;
                        normalizedData.push([time, value, timeObj, tooltip]);   // recalculated statistic
                        if (statistic != "mean") {
                            truthIndex++;
                        }
                        continue;
                    }
                    var valSites = Object.keys(timeObj.sites).map(Number).sort();
                    var truthSites = statistic == "mean" ? [] : Object.keys(truthTimeObj.sites).map(Number).sort();
                    var sites = statistic == "mean" ? valSites : _.intersection(valSites, truthSites);
                    var sitesLength = sites.length;
                    var includedSites = _.intersection(sites, siteBasis);
                    var sitesQuality = (includedSites.length / siteBasis.length) * 100;
                    if (sitesQuality < siteCompleteness) {
                        //throw this time away, it doesn't have enough sites
                        var seconds = time / 1000;
                        tooltip = label +
                            "<br>seconds: " + seconds +
                            "<br>time: " + new Date(Number(valTime)).toUTCString() +
                            "<br> statistic: " + statistic +
                            "<br> value:" + null;
                        normalizedData.push([time, value, timeObj, tooltip]);   // recalculated statistic
                        valIndex++;
                        if (statistic != "mean") {
                            truthIndex++;
                        }
                        continue;
                    }

                    var siteLevelNum = 0; // the total number of entries, values for all the qualified levels, for all the qualified sites
                    var siteLevelSum = 0; // the total sum of all the entries (values) for all the  qualified levels for all the qualified sites
                    var siteLevelBiasSum = 0; //  the total sum of all the bias's for all the qualified levels for all the qualified sites
                    var siteLevelBiasNum = 0; // the total number of bias values for all the qualified levels in all the qualified sites
                                              // (some experiment entries may not have had a corresponding truth entry so the  siteLevelBiasNum
                                              // might not be the same as the siteLevelNum)

                    for (var si = 0; si < sitesLength; si++) {
                        var valSLevels = timeObj.sites[[sites[si]]].levels;
                        var sValues = timeObj.sites[[sites[si]]].values;
                        var truthSLevels = statistic == "mean" ? [] : truthTimeObj.sites[[sites[si]]].levels;
                        var sLevels = statistic == "mean" ? valSLevels : _.intersection(valSLevels, truthSLevels);
                        var truthSValues = statistic == "mean" ? [] : truthTimeObj.sites[[sites[si]]].values;
                        var includedLevels = _.intersection(sLevels, levelBasis);
                        var levelsQuality = (includedLevels.length / levelBasis.length) * 100;
                        if (levelsQuality > levelCompleteness) {
                            // here we make the various calculations
                            for (var li = 0; li < sLevels.length; li++) {
                                var siteLevelValue = sValues[li];
                                var truthSiteLevelValue = statistic == "mean" ? null : truthSValues[li];
                                var biasValue;
                                switch (statistic) {
                                    case "bias":
                                    case "mae":
                                        // bias and mae are almost the same.... mae just absolutes the difference
                                        // find siteLevelBias and sum it in
                                        biasValue = null;
                                        try {
                                            if (statistic == "mae") {
                                                biasValue = Math.abs(siteLevelValue - truthSiteLevelValue);
                                            } else {
                                                biasValue = siteLevelValue - truthSiteLevelValue;
                                            }
                                            siteLevelBiasSum += biasValue;
                                            siteLevelBiasNum++;
                                        } catch (nodata) {
                                            // apparently there is no data in the truth curve that matches this time
                                            biasValue = null;
                                        }
                                        break;
                                    case "rmse":
                                        biasValue = null;
                                        try {
                                            biasValue = siteLevelValue - truthSiteLevelValue;
                                            biasValue = Math.pow(biasValue, 2);  // square the difference
                                            siteLevelBiasSum += biasValue;
                                            siteLevelBiasNum++;
                                        } catch (nodata) {
                                            // apparently there is no data in the truth curve that matches this time
                                            biasValue = null;
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
                        } // else don't count it in - skip over it, it isn't complete enough
                    }
                    // we set bad numbers to null
                    var value;
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
                            value = siteBias;
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
                            value = siteMse;
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
                            value = siteMean;
                            break;
                    }
                    yAxisMins[curveIndex] = value < yAxisMins[curveIndex] ? value : yAxisMins[curveIndex];
                    yAxisMaxes[curveIndex] = value > yAxisMaxes[curveIndex] ? value : yAxisMaxes[curveIndex];
                    var seconds = time / 1000;
                    tooltip = label +
                        "<br>seconds: " + seconds +
                        "<br>time: " + new Date(Number(valTime)).toUTCString() +
                        "<br> statistic: " + statistic +
                        "<br> value:" + value;
                    count++;
                    sum += value;
                    normalizedData.push([time, value, timeObj, tooltip]);   // recalculated statistic
                }
                if (statistic != "mean") {
                    truthIndex++;
                }
                valIndex++;
            }
            average = sum / count;
        } else {   // this is a difference curve... we have to use the maximum valid interval
            var minuendIndex = 0;
            var subtrahendIndex = 0; // base curve
            var minuendData = dataset[diffFrom[0]].data;
            var subtrahendData = dataset[diffFrom[1]].data;
            var minuendEndTime = minuendData[minuendData.length - 1][0];
            var subtrahendEndTime = subtrahendData[subtrahendData.length - 1][0];
            var diffEndTime = minuendEndTime < subtrahendEndTime ? minuendEndTime : subtrahendEndTime;
            normalizedData = [];
            // calculate difference curve values
            // minuend - subtrahend = difference.
            // the minuend is the curve from which the base curve values will be subtracted
            while (subtrahendData[subtrahendIndex] < minuendData[minuendIndex]) {
                // if necessary, increment the base index until it catches up
                subtrahendIndex++;
            }
            while (minuendData[minuendIndex][0] < subtrahendData[subtrahendIndex][0]) {
                // if necessary, increment the from index until it catches up
                minuendIndex++;
            }
            // now the times should be equal
            count = 0;
            sum = 0;
            try {
                var diffTime = (minuendData[minuendIndex])[0];
                while ((diffTime < diffEndTime) && (subtrahendIndex < subtrahendData.length - 1) && (minuendIndex < minuendData.length - 1)) {
                    while ((subtrahendData[subtrahendIndex])[0] < (minuendData[minuendIndex])[0]) {
                        // if necessary, increment the base index until it catches up
                        subtrahendIndex++;
                    }
                    while ((minuendData[minuendIndex])[0] < (subtrahendData[subtrahendIndex])[0]) {
                        // if necessary, increment the from index until it catches up
                        minuendIndex++;
                    }
                    var fromValue = minuendData[minuendIndex][1] == undefined ? null : minuendData[minuendIndex][1];
                    var baseValue = subtrahendData[subtrahendIndex][1] == undefined ? null : subtrahendData[subtrahendIndex][1];
                    var diffValue = (fromValue == null || baseValue == null) ? null : fromValue - baseValue;
                    var diffSeconds = diffTime / 1000;
                    var d = new Date(Number(diffTime)).toUTCString();
                    var tooltip = label +
                        "<br>seconds:" + diffSeconds +
                        "<br>time:" + d +
                        "<br> diffValue:" + diffValue;
                    yAxisMins[curveIndex] = diffValue < yAxisMins[curveIndex] ? diffValue : yAxisMins[curveIndex];
                    yAxisMaxes[curveIndex] = diffValue > yAxisMaxes[curveIndex] ? diffValue : yAxisMaxes[curveIndex];
                    normalizedData.push([diffTime, diffValue, {
                        seconds: diffSeconds,
                        date: d,
                        minuend: fromValue,
                        subtrahend: baseValue
                    }, tooltip]);
                    diffTime = Number(diffTime) + Number(maxValidInterval);
                    subtrahendIndex++;
                    minuendIndex++;
                    count++;
                    sum += diffValue;
                }
                average = sum / count;
            } catch (err) {
                console.log("caught error");
                throw( new Error("caught " + err.message));
            }
        }

        var pointSymbol = matsDataUtils.getPointSymbol(curveIndex);
        //var mean = queryResult.mean;
        options = {
            yaxis: curveIndex + 1,  // the y axis position to the right of the graph
            label: label,
            color: color,
            data: normalizedData,
            points: {symbol: pointSymbol, fillColor: color, show: true, radius: 1},
            lines: {show: true, fill: false},
            annotation: label + "- mean = " + average.toPrecision(4)
        };
        dataset.push(options);
    }  // end for curves

    // matching
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched) && (matchLevel || matchSite || matchTime)) {
        /*
         Have to go through all the dataset times,
         for all the curves,
         iterating at the maximum valid interval for all the curves
         and setting to null all the y-values for which
         any curve has a y-value that is null,
         or fails to meet the other matching criteria.
         Have to recalculate the axis max and mins.
         */
        var dataIndexes = {};
        var ci;
        var sci;
        for (ci = 0; ci < curvesLength; ci++) {
            dataIndexes[ci] = 0;
            yAxisMins[ci] = Number.MAX_VALUE;
            yAxisMaxes[ci] = Number.MIN_VALUE;

        }
        // for matching - the begin time must be the first coinciding time for all the curves.
        // Once we know at which index the curves coincide we can increment by the maxValidInterval.
        //xAxisMin and xAxisMax are the earliest and latest times, maxValidInterval is the maximum valid time interval
        time = Number(xAxisMin);
        var done = false;
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
                time = dataset[0].data[dataIndexes[0]][0];
            }
        }

        var timeMatches;
        var levelsMatches;
        var sitesMatches;
        var levelsToMatch;
        var sitesToMatch;
        var mySites;
        var myLevels;
        var newDataSet = [];

        while (time < xAxisMax) {
            timeMatches = true;
            levelsMatches = true;
            sitesMatches = true;
            levelsToMatch = [];
            sitesToMatch = [];
            for (ci = 0; ci < curvesLength; ci++) {
                // move this curves index to equal or exceed the new time
                while (dataset[ci].data[dataIndexes[ci]] && dataset[ci].data[dataIndexes[ci]][0] < time) {
                    dataIndexes[ci]++;
                }
                // if the time isn't right or the data is null it doesn't match
                if (dataset[ci].data[dataIndexes[ci]] == undefined || dataset[ci].data[dataIndexes[ci]][0] != time) {
                    timeMatches = false;
                    levelsMatches = false;
                    sitesMatches = false;
                    break;
                } else {
                    if (matchTime) {
                        // if there is no data entry here at this time it doesn't match
                        if (!(dataset[ci].data[dataIndexes[ci]] && dataset[ci].data[dataIndexes[ci]][0] && dataset[ci].data[dataIndexes[ci]][1])) {
                            timeMatches = false;
                        }
                    }
                    if (matchLevel) {
                        if (levelsToMatch.length == 0) {
                            levelsToMatch = dataset[ci].data[dataIndexes[ci]][2] ? dataset[ci].data[dataIndexes[ci]][2].timeLevels : [];
                        }
                        myLevels = dataset[ci].data[dataIndexes[ci]][2] ? dataset[ci].data[dataIndexes[ci]][2].timeLevels : [];
                        if (matsDataUtils.arraysEqual(myLevels, levelsToMatch) == false) {
                            levelsMatches = false;
                        }
                    }
                    if (matchSite) {
                        if (sitesToMatch.length == 0) {
                            sitesToMatch = dataset[ci].data[dataIndexes[ci]][2] ? dataset[ci].data[dataIndexes[ci]][2].timeSites : [];
                        }
                        mySites = dataset[ci].data[dataIndexes[ci]][2] ? dataset[ci].data[dataIndexes[ci]][2].timeSites : [];
                        if (matsDataUtils.arraysEqual(mySites, sitesToMatch) == false) {
                            sitesMatches = false;
                        }
                    }
                }
            }   // for all the curves
            if (timeMatches && levelsMatches && sitesMatches) {
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
                    const valData = valueObject[1];
                    // have to recalculate mins and maxes - might be throwing away outlier data
                    yAxisMins[sci] = (valData < yAxisMins[sci]) ? valData : yAxisMins[sci];
                    yAxisMaxes[sci] = (valData > yAxisMaxes[sci]) ? valData : yAxisMaxes[sci];
                    // push the data
                    newDataSet[sci].data.push(valueObject);
                }
            } else {
                for (sci = 0; sci < curvesLength; sci++) {
                    newDataSet[sci] = newDataSet[sci] === undefined ? {} : newDataSet[sci];
                    newDataSet[sci].data = newDataSet[sci].data === undefined ? [] : newDataSet[sci].data;
                    newDataSet[sci].data.push([time, null]);
                }
            }
            time = Number(time) + Number(maxValidInterval);
        } // while time
        dataset = newDataSet;
    } // end of if matching
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    var yLabels = {};
    for (dsi = 0; dsi < dataset.length; dsi++) {

        var position = dsi === 0 ? "left" : "right";
        var vStr = curves[dsi].variable;
        if (yAxisBoundaries[vStr] === undefined) {
            yAxisBoundaries[vStr] = {
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE
            }
        }
        yAxisBoundaries[vStr] = {
            min: yAxisBoundaries[vStr].min < yAxisMins[dsi] ? yAxisBoundaries[vStr].min : yAxisMins[dsi],
            max: yAxisBoundaries[vStr].max > yAxisMaxes[dsi] ? yAxisBoundaries[vStr].max : yAxisMaxes[dsi]
        };
        var yAxisPad = (yAxisBoundaries[vStr].max - yAxisBoundaries[vStr].min) * .05;
        if (yLabels[vStr] == undefined) {
            yLabels[vStr] = {
                label: curves[dsi]['label'] + ":" + vStr + ":" + curves[dsi]['data-source'],
                curveNumber: dsi
            };
            yaxesOptions = {
                position: position,
                color: 'grey',
                axisLabel: yLabels[vStr].label,
                axisLabelColour: "black",
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 16,
                axisLabelFontFamily: 'Verdana, Arial',
                axisLabelPadding: 3,
                alignTicksWithAxis: 1,
                min: yAxisBoundaries[vStr].min - yAxisPad,
                max: yAxisBoundaries[vStr].max + yAxisPad
            };
        } else {
            yLabels[vStr].label = curves[dsi]['label'] + " | " + yLabels[vStr].label;
            // set the yAxesOption that has this key to this new label
            // find the yaxes element that has this labelKey]
            var curveNum = yLabels[vStr].curveNumber;
            yaxes[curveNum].axisLabel = yLabels[vStr].label;
            var yaxesOptions = {
                show: false,
                min: yAxisBoundaries[vStr].min - yAxisPad,
                max: yAxisBoundaries[vStr].max + yAxisPad,
                grid: {show: false}
            };
        }
        var yaxisOptions = {
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }

    options = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: 'time',
            color: 'grey'
        }],
        xaxis: {
            zoomRange: [0.1, 3600000000],
            mode: 'time'
        },
        yaxes: yaxes,
        yaxis: yaxis,

        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0
        },
        series: {
            lines: {
                show: true,
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
            points: {
                show: true,
                radius: 1
            },
            shadowSize: 0
        },
        zoom: {
            interactive: true
        },
        pan: {
            interactive: false
        },
        selection: {
            mode: "xy"
        },
        grid: {
            hoverable: true,
            clickable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            content: "<span style='font-size:150%'><strong>%ct</strong></span>",
            xDateFormat: "%Y-%m-%d:%H",
            onHover: function (flotItem, $tooltipEl) {
            }
        }
    };

    // add black 0 line curve
    // need to find the minimum and maximum x value for making the zero curve

    dataset.push({
        annotation: "",
        color: 'black',
        points: {show: false},
        data: [[xAxisMin, 0, "zero"], [xAxisMax, 0, "zero"]]
    });

    var result = {
        error: error,
        data: dataset,
        options: options,
        basis: {
            plotParams: plotParams,
            queries: dataRequests
        }
    };
    try {
        plotFunction(result);
    } catch (e) {
        console.log("plotting graph result is", JSON.stringify(result, null, 2));
        e.message = "Error plotting graph with function: " + plotFunction.name + " error:" + e.message;
        throw e;
    }
};