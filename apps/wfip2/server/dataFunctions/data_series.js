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
    var matchTime = plotParams.matchFormat.indexOf(matsTypes.MatchFormats.time) !== -1;
    var matchLevel = plotParams.matchFormat.indexOf(matsTypes.MatchFormats.level) !== -1;
    var matchSite = plotParams.matchFormat.indexOf(matsTypes.MatchFormats.site) !== -1;
    var options;
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        yAxisMaxes[curveIndex] = Number.MIN_VALUE;
        yAxisMins[curveIndex] = Number.MAX_VALUE;
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var dataSource = (curve['data-source']);
        var tmp = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0].split(',');
        var model = tmp[0];
        var instrument_id = tmp[1];
        var verificationRunInterval = tmp[2];
        var myVariable;
        var statistic = curve['statistic'];
        var truthDataSource = curve['truth-data-source'];
        tmp = matsCollections.CurveParams.findOne({name: 'truth-data-source'}).optionsMap[curve['truth-data-source']][0].split(',');
        var truthModel = tmp[0];
        var truthInstrument_id = tmp[1];
        var truthRunInterval = tmp[2];
        // maxRunInterval is used for determining maxValidInterval which is used for differencing and matching
        var maxRunInterval;
            if (statistic == "mean") {
                maxRunInterval = verificationRunInterval;
            } else {
                maxRunInterval = truthRunInterval > verificationRunInterval ? truthRunInterval : verificationRunInterval;
            }
        maxValidInterval = maxValidInterval > maxRunInterval ? maxValidInterval : maxRunInterval;
        // variables can be conventional or discriminators. Conventional variables are listed in the variableMap.
        // discriminators are not.
        // we are using existence in variableMap to decide if a variable is conventional or a discriminator.
        var variableMap = matsCollections.CurveParams.findOne({name: 'variable'}).variableMap;
        var isDiscriminator = false;
        var variableStr = curve['variable'];
        myVariable = variableMap[variableStr];
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

        //var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'][matsTypes.PlotTypes.timeSeries];
        //var variable = variableOptionsMap[dataSource][variableStr];
        var discriminator = curve['discriminator'];
        var disc_upper = curve['upper'];
        var disc_lower = curve['lower'];
        var forecastLength = curve['forecast-length'];
        var statement = "";
        var count = 0;
        var sum = 0;
        var average = 0;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve - do those after Matching ..
            if (model.includes("recs")) {
                statement = "select valid_utc as avtime,z," + myVariable + ",sites_siteid " +
                    "from obs_recs as o , " + model +
                    " where  obs_recs_obsrecid = o.obsrecid" +
                    " and instruments_instrid=" + instrument_id +
                    " and valid_utc>=" + matsDataUtils.secsConvert(fromDate) +
                    " and valid_utc<=" + matsDataUtils.secsConvert(toDate);
            } else if (model.includes("hrrr_wfip")) {
                if (isDiscriminator) {
                    statement = "select (analysis_utc + fcst_end_utc) as avtime ,z ," + myVariable + ",sites_siteid" +
                        " from " + model + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where nwps_nwpid=" + instrument_id +
                        " and modelid= modelid_rec" +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and (analysis_utc + fcst_end_utc) >=" + matsDataUtils.secsConvert(fromDate) +
                        " and (analysis_utc + fcst_end_utc)<=" + matsDataUtils.secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper
                } else {
                    statement = "select (analysis_utc + fcst_end_utc) as avtime ,z ," + myVariable + ",sites_siteid  " +
                        "from " + model + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where nwps_nwpid=" + instrument_id +
                        " and modelid= modelid_rec" +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and (analysis_utc + fcst_end_utc) >=" + matsDataUtils.secsConvert(fromDate) +
                        " and (analysis_utc + fcst_end_utc)<=" + matsDataUtils.secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper
                }
            } else {
                statement = "select (analysis_utc + fcst_end_utc) as avtime ,z ," + myVariable + ",sites_siteid  " +
                    "from " + model + ", nwp_recs  " +
                    " where nwps_nwpid=" + instrument_id +
                    " and nwp_recs_nwprecid=nwprecid" +
                    " and (analysis_utc + fcst_end_utc) >=" + matsDataUtils.secsConvert(fromDate) +
                    " and (analysis_utc + fcst_end_utc)<=" + matsDataUtils.secsConvert(toDate) +
                    " and fcst_end_utc=" + 3600 * forecastLength;
            }
            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ") order by avtime";
            console.log("statement: " + statement);
            dataRequests[curve.label] = statement;
            var queryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, isDiscriminator);
            if (queryResult.error !== undefined && queryResult.error !== "") {
                error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>" ;
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
                        statement = "select (analysis_utc + fcst_end_utc) as avtime ,z ," + myVariable + ",sites_siteid" +
                            " from " + truthModel + ", nwp_recs,  " + truthDataSource + "_discriminator" +
                            " where nwps_nwpid=" + truthInstrument_id +
                            " and modelid= modelid_rec" +
                            " and nwp_recs_nwprecid=nwprecid" +
                            " and (analysis_utc + fcst_end_utc) >=" + matsDataUtils.secsConvert(fromDate) +
                            " and (analysis_utc + fcst_end_utc)<=" + matsDataUtils.secsConvert(toDate) +
                            " and fcst_end_utc=" + 3600 * forecastLength +
                            " and " + discriminator + " >=" + disc_lower +
                            " and " + discriminator + " <=" + disc_upper
                    } else {
                        statement = "select (analysis_utc + fcst_end_utc) as avtime ,z ," + myVariable + ",sites_siteid  " +
                            "from " + truthModel + ", nwp_recs,  " + truthDataSource + "_discriminator" +
                            " where nwps_nwpid=" + truthInstrument_id +
                            " and modelid= modelid_rec" +
                            " and nwp_recs_nwprecid=nwprecid" +
                            " and (analysis_utc + fcst_end_utc) >=" + matsDataUtils.secsConvert(fromDate) +
                            " and (analysis_utc + fcst_end_utc)<=" + matsDataUtils.secsConvert(toDate) +
                            " and fcst_end_utc=" + 3600 * forecastLength +
                            " and " + discriminator + " >=" + disc_lower +
                            " and " + discriminator + " <=" + disc_upper
                    }
                } else {
                    statement = "select (analysis_utc + fcst_end_utc) as avtime ,z ," + myVariable + ",sites_siteid  " +
                        "from " + truthModel + ", nwp_recs  " +
                        " where nwps_nwpid=" + truthInstrument_id +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and (analysis_utc + fcst_end_utc) >=" + matsDataUtils.secsConvert(fromDate) +
                        " and (analysis_utc + fcst_end_utc)<=" + matsDataUtils.secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength;
                }
                statement = statement + "  and sites_siteid in (" + siteIds.toString() + ") order by avtime";
                console.log("statement: " + statement);
                dataRequests[curve.label] = statement;
                var truthQueryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, isDiscriminator);
                if (truthQueryResult.error !== undefined && truthQueryResult.error !== "") {
                    error += "Error from truth query: <br>" + truthQueryResult.error + " <br>" + " query: <br>" + statement + " <br>";
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

            var levelCompleteness = curve['level-completeness'];
            var siteCompleteness = curve['site-completeness'];
            var levelBasis;
            var siteBasis;
            levelBasis = _.union.apply(_, queryResult.allLevels);
            siteBasis = _.union.apply(_, queryResult.allSites);
            var truthLevelBasis;
            var truthSiteBasis;
            if (statistic != "mean") {
                // have to consider the truth curve when determining the basis if we are doing stats other than mean
                truthLevelBasis = _.union.apply(_, truthQueryResult.allLevels);
                truthSiteBasis = _.union.apply(_,  truthQueryResult.allSites);
                levelBasis = _.union(levelBasis,truthLevelBasis);
                siteBasis = _.union(siteBasis,truthSiteBasis);
            }
            /*
             pairs_.pairs(object)
             Convert an object into a list of [key, value] pairs.
             _.pairs({one: 1, two: 2, three: 3});
             => [["one", 1], ["two", 2], ["three", 3]]
             we want [[time0,obj],[time1,obj],....[timen,obj]]
             */
            var verificationData = _.pairs(queryResult.data).sort(function (a, b) {
                return a[0] - b[0]
            });


            //var normalizedData = verificationData.map(function (timeObjPair) {
            // we need to go through all the time objects of both the actual and the truth data series
            // and skip any where there isn't a corresponding time.
            // we make our calculations where there are corresponding times.
            var valMaxIndex = verificationData.length - 1;
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
                } else if ( statistic != "mean" && truthTime < valTime) {
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
                        normalizedData.push( [time, value, timeObj, tooltip]);   // recalculated statistic
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
                        normalizedData.push( [time, value, timeObj, tooltip]);   // recalculated statistic
                        if (statistic != "mean") {
                            truthIndex++;
                        }
                        continue;
                    }
                    var valSites = Object.keys(timeObj.sites).map(Number).sort();
                    var truthSites = statistic == "mean" ? [] : Object.keys(truthTimeObj.sites).map(Number).sort();
                    var sites = statistic == "mean" ?  valSites : _.intersection(valSites, truthSites);
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
                        normalizedData.push( [time, value, timeObj, tooltip]);   // recalculated statistic
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
                        var sLevels = statistic == "mean" ? valSLevels : _.intersection(valSLevels,truthSLevels);
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
                    count ++;
                    sum += value;
                    normalizedData.push( [time, value, timeObj, tooltip]);   // recalculated statistic
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
            var minuendEndTime = (minuendData[minuendData.length - 1])[0];
            var subtrahendEndTime = (subtrahendData[subtrahendData.length - 1])[0];
            var diffEndTime = minuendEndTime < subtrahendEndTime ? minuendEndTime : subtrahendEndTime;
            normalizedData = [];
            // calculate difference curve values
            // minuend - subtrahend = difference.
            // the minuend is the curve from which the base curve values will be subtracted
            while ((subtrahendData[subtrahendIndex])[0] < (minuendData[minuendIndex])[0]) {
                // if necessary, increment the base index until it catches up
                subtrahendIndex++;
            }
            while ((minuendData[minuendIndex])[0] < (subtrahendData[subtrahendIndex])[0]) {
                // if necessary, increment the from index until it catches up
                minuendIndex++;
            }
            // now the times should be equal
            count = 0;
            sum = 0;
            var diffTime = (minuendData[minuendIndex])[0];
            while (diffTime < diffEndTime) {
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
                var diffValue = (fromValue == null || baseValue == null) ?  null : fromValue - baseValue;
                var diffSeconds = diffTime / 1000;
                var d = new Date(Number(diffTime)).toUTCString();
                var tooltip = label +
                "<br>seconds:" + diffSeconds +
                "<br>time:" + d +
                "<br> diffValue:" + diffValue;
                yAxisMins[curveIndex] = diffValue < yAxisMins[curveIndex] ? diffValue : yAxisMins[curveIndex];
                yAxisMaxes[curveIndex] = diffValue > yAxisMaxes[curveIndex] ? diffValue : yAxisMaxes[curveIndex];
                normalizedData.push([diffTime, diffValue, {seconds:diffSeconds,date:d,minuend:fromValue,subtrahend:baseValue}, tooltip]);
                diffTime = Number(diffTime) + Number(maxValidInterval);
                subtrahendIndex++;
                minuendIndex++;
                count++;
                sum += diffValue;
            }
            average = sum / count;
        }
        if (yAxisBoundaries[variableStr] === undefined) {
            yAxisBoundaries[variableStr] = {
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE
            }
        }
        yAxisBoundaries[variableStr] = {
            min: yAxisBoundaries[variableStr].min < yAxisMins[curveIndex] ? yAxisBoundaries[variableStr].min : yAxisMins[curveIndex],
            max: yAxisBoundaries[variableStr].max > yAxisMaxes[curveIndex] ? yAxisBoundaries[variableStr].max : yAxisMaxes[curveIndex]
        };

        var pointSymbol = matsWfipUtils.getPointSymbol(curveIndex);
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
         */
        var dataIndexes = {};
        var ci;
        var sci;
        for (ci = 0; ci < curvesLength; ci++) {
            dataIndexes[ci] = 0;
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
                if (ci == curvesLength -1)  {
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
                    if (matchLevel){
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
                        newDataSet[sci]={};
                        var keys = Object.keys(dataset[sci]);
                        for (var k =0; k < keys.length; k++) {
                            var key = keys[k];
                            if (key == "data") {
                                newDataSet[sci][key] = [];
                            } else {
                                newDataSet[sci][key] = dataset[sci][key];
                            }
                        }
                    }
                    newDataSet[sci].data.push(dataset[sci].data[dataIndexes[sci]]);
                }
            } else {
                for (sci = 0; sci < curvesLength; sci++) {
                    newDataSet[sci].data.push([time,null]);
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
        var yAxisPad = (yAxisBoundaries[vStr].max - yAxisBoundaries[vStr].min) * .05;
        if (yLabels[vStr] == undefined) {
            yLabels[vStr] = {label:curves[dsi]['label'] + ":" + vStr + ":" + curves[dsi]['data-source'], curveNumber:dsi};
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
                grid:{show:false}
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
    //console.log("result", JSON.stringify(result,null,2));
    plotFunction(result);
};