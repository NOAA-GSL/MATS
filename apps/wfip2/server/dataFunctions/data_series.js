import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsWfipUtils} from 'meteor/randyp:mats-common';

dataSeries = function (plotParams, plotFunction) {
    console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {}; // used to store data queries
    var wfip2Settings = matsCollections.Databases.findOne({role: "wfip2_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    var wfip2Pool = mysql.createPool(wfip2Settings);
    wfip2Pool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });
    var curveDates = plotParams.dates.split(' - ');
    var fromDateStr = curveDates[0];
    var fromDate = matsDataUtils.dateConvert(fromDateStr);
    var toDateStr = curveDates[1];
    var toDate = matsDataUtils.dateConvert(toDateStr);
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    // used to find the max and minimum for the y axis
    // used in yaxisOptions for scaling the graph
    var xAxisMax = Number.MIN_VALUE;
    var xAxisMin = Number.MAX_VALUE;
    var yAxisMax = Number.MIN_VALUE;
    var yAxisMin = Number.MAX_VALUE;
    var matchTime = plotParams.matchFormat.indexOf(matsTypes.MatchFormats.time) !== -1;
    var matchLevel = plotParams.matchFormat.indexOf(matsTypes.MatchFormats.level) !== -1;
    var matchSite = plotParams.matchFormat.indexOf(matsTypes.MatchFormats.site) !== -1;
    var baseCurveIndex = 0;
    var options;
    var curveQueryResults = {};
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var dataSource = (curve['data-source']);
        var tmp = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0].split(',');
        var table = tmp[0];
        var this_id = tmp[1];
        var myVariable;
        var statistic = curve['statistic'];
        var truthDataSource = curve['truth-data-source'];
        var tmp = matsCollections.CurveParams.findOne({name: 'truth-data-source'}).optionsMap[curve['truth-data-source']][0].split(',');
        var truthModel = tmp[0];
        var truthInstrument_id = tmp[1];
        // variables can be conventional or discriminators. Conventional variables are listed in the variableMap.
        // discriminators are not.
        // we are using existence in variableMap to decide if a variable is conventional or a discriminator.
        var variableMap = matsCollections.CurveParams.findOne({name: 'variable'}).variableMap;
        var isDiscriminator = false;
        myVariable = variableMap[curve['variable']];
        if (myVariable === undefined) {
            myVariable = curve['variable'];
            isDiscriminator = true; // variable is mapped, discriminators are not, this is a discriminator
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
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'][matsTypes.PlotTypes.timeSeries];
        var variable = variableOptionsMap[dataSource][variableStr];
        var discriminator = curve['discriminator'];
        var disc_upper = curve['upper'];
        var disc_lower = curve['lower'];
        var forecastLength = curve['forecast-length'];
        var statement = "";
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve - do those after Matching
            if (table.includes("recs")) {
                statement = "select valid_utc as avtime,z," + myVariable + ",sites_siteid " +
                    "from obs_recs as o , " + table +
                    " where  observationid = o.obsrecid " +
                    " and instruments_instrid = this_id " +
                    " and valid_utc >= " + matsDataUtils.secsConvert(fromDate) +
                    " and valid_utc <= " + matsDataUtils.secsConvert(toDate);
            } else if (table.includes("hrrr_wfip")) {
                if (isDiscriminator) {
                    statement = "select valid_utc as avtime ,z ," + myVariable + ",sites_siteid" +
                        " from " + table + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where discriminator_record_id = this_id " +
                        " and valid_utc >= " + matsDataUtils.secsConvert(fromDate) +
                        " and valid_utc <= " + matsDataUtils.secsConvert(toDate) +
                        " and fcst_end_utc = " + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper
                } else {
                    statement = "select valid_utc as avtime ,z ," + myVariable + ",sites_siteid  " +
                        " from " + table + ", nwp_recs,  " +
                        " where nwp_record_id = this_id" +
                        " and valid_utc >= " + matsDataUtils.secsConvert(fromDate) +
                        " and valid_utc <= " + matsDataUtils.secsConvert(toDate) +
                        " and fcst_end_utc = " + 3600 * forecastLength +
                        " and " + discriminator + " >= " + disc_lower +
                        " and " + discriminator + " <= " + disc_upper
                }
            } else {
                statement = "select valid_utc as avtime ,z ," + myVariable + ",sites_siteid  " +
                    " from " + table + ", nwp_recs  " +
                    " where nwp_record_id = this_id " +
                    " where valid_utc >= " + matsDataUtils.secsConvert(fromDate) +
                    " and valid_utc <= " + matsDataUtils.secsConvert(toDate) +
                    " and fcst_end_utc = " + 3600 * forecastLength;
            }
            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ") order by avtime";
            console.log("statement: " + statement);
            dataRequests[curve.label] = statement;
            var queryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, isDiscriminator);
            if (queryResult.error !== undefined && queryResult.error !== "") {
                error += queryResult.error + "\n";
            }

            // for mean calulations we do not have a truth curve.
            if (statistic != "mean") {
                // need a truth data source for statistic
                if (truthModel.includes("recs")) {
                    statement = "select valid_utc as avtime,z," + myVariable + ",sites_siteid " +
                        "from obs_recs as o , " + truthModel +
                        " where  obs_recs_obsrecid = o.obsrecid" +
                        " and instruments_instrid=" + truthInstrument_id +
                        " and valid_utc>=" + matsDataUtils.secsConvert(fromDate) +
                        " and valid_utc<=" + matsDataUtils.secsConvert(toDate);
                } else if (truthModel.includes("hrrr_wfip")) {
                    if (isDiscriminator) {
                        statement = "select valid_utc as avtime ,z ," + myVariable + ",sites_siteid" +
                            " from " + truthModel + ", nwp_recs,  " + truthDataSource + "_discriminator" +
                            " where nwps_nwpid=" + truthInstrument_id +
                            " and modelid= modelid_rec" +
                            " and nwp_recs_nwprecid=nwprecid" +
                            " and valid_utc >=" + matsDataUtils.secsConvert(fromDate) +
                            " and valid_utc<=" + matsDataUtils.secsConvert(toDate) +
                            " and fcst_end_utc=" + 3600 * forecastLength +
                            " and " + discriminator + " >=" + disc_lower +
                            " and " + discriminator + " <=" + disc_upper
                    } else {
                        statement = "select valid_utc as avtime ,z ," + myVariable + ",sites_siteid  " +
                            "from " + truthModel + ", nwp_recs,  " + truthDataSource + "_discriminator" +
                            " where nwps_nwpid=" + truthInstrument_id +
                            " and modelid= modelid_rec" +
                            " and nwp_recs_nwprecid=nwprecid" +
                            " and valid_utc >=" + matsDataUtils.secsConvert(fromDate) +
                            " and valid_utc<=" + matsDataUtils.secsConvert(toDate) +
                            " and fcst_end_utc=" + 3600 * forecastLength +
                            " and " + discriminator + " >=" + disc_lower +
                            " and " + discriminator + " <=" + disc_upper
                    }
                } else {
                    statement = "select valid_utc as avtime ,z ," + myVariable + ",sites_siteid  " +
                        "from " + truthModel + ", nwp_recs  " +
                        " where nwps_nwpid=" + truthInstrument_id +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and valid_utc >=" + matsDataUtils.secsConvert(fromDate) +
                        " and valid_utc<=" + matsDataUtils.secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength;
                }
                statement = statement + "  and sites_siteid in (" + siteIds.toString() + ") order by avtime";
                console.log("statement: " + statement);
                dataRequests[curve.label] = statement;
                var truthQueryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, isDiscriminator);
                if (truthQueryResult.error !== undefined && truthQueryResult.error !== "") {
                    error += truthQueryResult.error + "\n";
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
             allLevels: allLevels,
             allSites: allSiteIds,
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

            curveQueryResults[curveIndex] = queryResult; // save raw data for matching
            var levelCompleteness = curve['level-completeness'];
            var siteCompleteness = curve['site-completeness'];
            var levelBasis;
            var siteBasis;
            levelBasis = _.union.apply(_, queryResult.allLevels);
            siteBasis = _.union.apply(_, queryResult.allSites);
            if (statistic != "mean") {
                // have to consider the truth curve when determining the basis if we are doing stats other than mean
                var truthLevelBasis = _.union.apply(_, truthQueryResult.allLevels);
                var truthSiteBasis = _.union.apply(_,  truthQueryResult.allSites);
                levelBasis = _.union(levelBasis,truthLevelBasis);
                siteBasis = _.union(siteBasis,truthSiteBasis);
            }
            /*
             pairs_.pairs(object)
             Convert an object into a list of [key, value] pairs.
             _.pairs({one: 1, two: 2, three: 3});
             => [["one", 1], ["two", 2], ["three", 3]]
             */
            var pairData = _.pairs(queryResult.data).sort(function (a, b) {
                return a[0] - b[0]
            });
            // for mean calulations we do not have a truth curve.
            var truthData = [];
            if (statistic == "mean") {
                truthData = pairData;
            } else {
                truthData = _.pairs(truthQueryResult.data).sort(function (a, b) {
                    return a[0] - b[0]
                });
            }
            //var normalizedData = pairData.map(function (timeObjPair) {
            // we need to go through all the time objects of both the actual and the truth data series
            // and skip any where there isn't a corresponding time.
            // we make our calculations where there are corresponding times.
            var truthMaxIndex = truthData.length - 1;
            var valMaxIndex = pairData.length - 1;
            var truthIndex = 0;
            var valIndex = 0;
            var valTime = pairData[0][0];
            var truthTime = pairData[0][0];
            var normalizedData = [];
            while (truthIndex < truthMaxIndex && valIndex < valMaxIndex) {
                // each timeObj is of the form [time,{sites:{...},timeMean:mean,timeLevels:[],....]
                valTime = pairData[valIndex][0];
                truthTime = truthData[truthIndex][0];
                if (valTime < truthTime) {
                    valIndex++;
                    continue;
                } else if (truthTime < valTime) {
                    truthIndex++;
                    continue;
                } else {
                    //times are equal
                    value = null;
                    var time = pairData[valIndex][0];
                    var timeObj = pairData[valIndex][1];
                    var truthTimeObj = truthData[truthIndex][1];
                    var tooltip = label +
                        "<br>seconds" + time +
                        "<br>time:" + new Date(Number(valTime)).toUTCString() +
                        "<br> value:" + value;
                    xAxisMin = time < xAxisMin ? time : xAxisMin;
                    xAxisMax = time > xAxisMax ? time : xAxisMax;
                    if (timeObj == null) {
                        valIndex++;
                        continue;
                    }
                    if (truthTimeObj == null) {
                        truthIndex++;
                        continue;
                    }

                    // yAxisMin = timeObj.timeMean < yAxisMin ? timeObj.timeMean : yAxisMin;
                    // yAxisMax = timeObj.timeMean > yAxisMax ? timeObj.timeMean : yAxisMax;

                    var valSites = Object.keys(timeObj.sites).map(Number);
                    var truthSites = Object.keys(truthTimeObj.sites).map(Number);
                    var sites = _.intersection(valSites, truthSites);
                    var sitesLength = sites.length;
                    var includedSites = _.intersection(sites, siteBasis);
                    var sitesQuality = (includedSites.length / siteBasis.length) * 100;
                    if (sitesQuality < siteCompleteness) {
                        //return [time, null, null, tooltip];   //throw this time away, it doesn't have enough sites
                        valIndex++;
                        truthIndex++;
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
                        var truthSLevels = truthTimeObj.sites[[sites[si]]].levels;
                        var sLevels = _.intersection(valSLevels,truthSLevels);
                        var truthSValues = truthTimeObj.sites[[sites[si]]].values;
                        var includedLevels = _.intersection(sLevels, levelBasis);
                        var levelsQuality = (includedLevels.length / levelBasis.length) * 100;
                        if (levelsQuality > levelCompleteness) {
                            // here we make the various calculations
                            for (var li = 0; li < sLevels.length; li++) {
                                var siteLevelValue = sValues[li];
                                var truthSiteLevelValue = truthSValues[li];
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
                                            biasValue = Math.pow(biasValue,2);  // square the difference
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
                    // we set bad numbers to null so that they can be squeezed out upstream
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
                    yAxisMin = value < yAxisMin ? value : yAxisMin;
                    yAxisMax = value > yAxisMax ? value : yAxisMax;

                    var seconds = time / 1000;
                    tooltip = label +
                        "<br>seconds: " + seconds +
                        "<br>time: " + new Date(Number(valTime)).toUTCString() +
                        "<br> statistic: " + statistic +
                        "<br> value:" + value;
                    normalizedData.push( [time, value, timeObj, tooltip]);   // recalculated statistic
                }
                truthIndex++;
                valIndex++;
            }
        } else {
            //skip difference curves - do them after matching
            var baseCurve = 0;  // eventually this will com from plotParams
            var fromStartTime = dataset[diffFrom][0];
            var baseStartTime = dataset[baseCurveIndex][0];
            var fromEndTime = dataset[diffFrom][dataset[diffFrom].length - 1];
            var baseEndTime = dataset[baseCurveIndex][dataset[baseCurveIndex].length - 1];
            var time = fromStartTime > baseStartTime ? fromStartTime : baseStartTime;
            var endTime = fromEndTime < baseEndTime ? fromEndTime : baseEndTime;
            var fromIndex = 0;
            var baseIndex = 0;
            normalizedData = [];
            while (time < endTime) {
                while (dataset[baseCurve][baseIndex][0] < dataset[diffFrom][fromIndex][0]) {
                    // increment the base index until it catches up
                    baseIndex++;
                }
                while (dataset[diffFrom][fromIndex][0] < dataset[baseCurve][baseIndex][0]) {
                    // increment the from index until it catches up
                    fromIndex++;
                }
                // now they should both be pointing at the same time

                var fromValue = dataset[diffFrom][fromIndex];
                var baseValue = dataset[0][baseIndex];
                var diffValue;
                if (fromValue == null || baseValue == null) {
                    diffValue = null;
                } else {
                    diffValue = fromValue - baseValue;
                }
                var seconds = time / 1000;
                var tooltip = label + v;
                "<br>seconds" + seconds +
                "<br>time:" + new Date(Number(time)).toUTCString() +

                "<br> diffValue:" + diffValue;

                normalizedData.push([seconds, diffValue, {}, tooltip]);
            }
        }
        var pointSymbol = matsWfipUtils.getPointSymbol(curveIndex);
        var mean = queryResult.mean;
        options = {
            yaxis: curveIndex + 1,  // the y axis position to the right of the graph
            label: label,
            color: color,
            data: normalizedData,
            points: {symbol: pointSymbol, fillColor: color, show: true, radius: 1},
            lines: {show: true, fill: false},
            annotation: label + "- mean = " + mean.toPrecision(4)
        };
        dataset.push(options);
    }  // end for curves

    // matching
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched) && (matchLevel || matchSite || matchTime)) {
        /*
         Have to go through all the times,
         for all the curves,
         iterating at the minimum interval for all the curves
         and setting to null all the y-values for which
         any curve has a y-value that is null,
         or fails to meet the other matching criteria.
         */

        // find the earliest and latest time and minimumInterval from all the curves
        var earliestTime = Number.MAX_VALUE;
        var latestTime = 0;
        var minimumInterval = Number.MAX_VALUE;
        // don't do any diff curves here, they are covered by the base curve anyway
        for (var ci = 0; ci < curvesLength; ci++) {
            if (curves[ci].diffFrom) {
                break;
            }
        }
        for (var rci = 0; rci < ci; rci++) {
            //earliestTime = Number((curves[rci].queryResult.allTimes[0] < earliestTime) ? curves[rci].queryResult.allTimes[0] : earliestTime);
            earliestTime = Number((curveQueryResults[rci].allTimes[0] < earliestTime) ? curveQueryResults[rci].allTimes[0] : earliestTime);
            latestTime = Number((curveQueryResults[rci].allTimes[curveQueryResults[rci].allTimes.length - 1] >
            latestTime) ? curveQueryResults[rci].allTimes[curveQueryResults[rci].allTimes.length - 1] : latestTime);
            minimumInterval = Number((curveQueryResults[rci].minInterval < minimumInterval) ? (curveQueryResults[rci].minInterval) : minimumInterval);
        }

        /* need a moving pointer for each curve data set.
         The data arrays for the curves may not all start at the same time for each curve
         so we skip incrementing the data index for any curve that has
         not yet had any time element defined for this time.
         The indexes are initialized to -1 so that the first time in a curve data array will cause the index to be 0.
         There shouldn't be any holes because the QueryDB should have filled them in.
         */
        var dataIndexes = {};
        for (ci = 0; ci < curvesLength; ci++) {
            dataIndexes[ci] = -1;
        }
        time = earliestTime;
        while (time < latestTime) {
            var timeMatches = true;
            var levelsMatches = true;
            var sitesMatches = true;
            var levelsToMatch = [];
            var sitesToMatch = [];
            for (ci = 0; ci < curvesLength; ci++) {
                // the dataset data arrays may not always start with the same time
                if (dataIndexes[ci] == -1 && dataset[ci].data[0][0] === undefined) {
                    timeMatches = false;
                    levelsMatches = false;
                    sitesMatches = false;
                } else {
                    dataIndexes[ci]++;
                    if (curves[ci].diffFrom === null || curves[ci].diffFrom === undefined) {
                        //var queryResultDataTime = curves[ci].queryResult.data[time];
                        var queryResultDataTime = curveQueryResults[ci].data[time];
                        if (matchTime) {
                            if (queryResultDataTime == null || (queryResultDataTime.timeMean == null)) {
                                timeMatches = false;
                            }
                        }
                        if (matchLevel) {
                            if (queryResultDataTime == null || _.isEqual(levelsToMatch, queryResultDataTime.timeLevels) === false) {
                                levelsMatches = false;
                            }
                        }
                        if (matchSite) {
                            if (queryResultDataTime == null || _.isEqual(sitesToMatch, queryResultDataTime.timeSites) === false) {
                                sitesMatches = false;
                            }
                        }
                    }
                }
            }
            if ((timeMatches === false) ||
                (levelsMatches === false) ||
                (sitesMatches === false)) {
                for (var sci = 0; sci < curvesLength; sci++) {
                    // have to null this value out for all the curves because it does not match (either time was null or levels or sites did not match)
                    if (dataset[sci].data[dataIndexes[sci]] !== undefined) {
                        dataset[sci].data[dataIndexes[sci]][1] = null;
                    }
                }

            }
            time = time + minimumInterval;
        } // end of while time
    } // end of if matching

    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (dsi = 0; dsi < dataset.length; dsi++) {
        var position = dsi === 0 ? "left" : "right";
        var yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: curve['label'] + ":" + curve['variable'] + ":" + curve['data-source'],
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 16,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            min: yAxisMin * 0.9,
            max: yAxisMax * 0.9
        };
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
    //console.log("result", JSON.stringify(result,null,2));
    plotFunction(result);
};