import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsWfipUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment';


dataProfile = function (plotParams, plotFunction) {
    console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {}; // used to store data queries
    var matching = plotParams.plotAction === matsTypes.PlotActions.matched;
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var max_verificationRunInterval = Number.MIN_VALUE;
    var maxValidInterval = Number.MIN_VALUE;
    var curveIndex;
    var curve;
    var time;
    var tooltip;
    var level;
    var t;
    var i;
    var n;
    var diffFrom;
    var statistic;
    var windVar;
    var partials;
    var timeObj;
    var sites;
    var matchTime = (plotParams['plotAction'] === matsTypes.PlotActions.matched) && (plotParams.matchFormat.indexOf(matsTypes.MatchFormats.time) !== -1);
    var matchLevel = (plotParams['plotAction'] === matsTypes.PlotActions.matched) && (plotParams.matchFormat.indexOf(matsTypes.MatchFormats.level) !== -1);
    var matchSite = (plotParams['plotAction'] === matsTypes.PlotActions.matched) && (plotParams.matchFormat.indexOf(matsTypes.MatchFormats.site) !== -1);

    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        curve = curves[curveIndex];
        const tmp = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0].split(',');
        curve.dataSource_is_instrument = parseInt(tmp[1]);
        curve.dataSource_tablename = tmp[2];
        curve.verificationRunInterval = tmp[4];
        curve.dataSource_is_json = parseInt(tmp[5]);
        max_verificationRunInterval = Number(curve.verificationRunInterval) > Number(max_verificationRunInterval) ? curve.verificationRunInterval : max_verificationRunInterval;
        if (curve['statistic'] != "mean") {
            // need a truth data source for statistic
            if (curve['truth-data-source'] === matsTypes.InputTypes.unused || curve['truth-data-source'] === undefined) {
                throw (new Error("INFO: You must define a truth data source"));
            }
            const tmp = matsCollections.CurveParams.findOne({name: 'truth-data-source'}).optionsMap[curve['truth-data-source']][0].split(',');
            curve.truthDataSource_is_instrument = parseInt(tmp[1]);
            curve.truthDataSource_tablename = tmp[2];
            curve.truthRunInterval = tmp[4];
            curve.truthDataSource_is_json = parseInt(tmp[5]);
            // might override the datasource assigned max_verificationRunInterval
            max_verificationRunInterval = Number(curve.truthRunInterval) > Number(max_verificationRunInterval) ? curve.truthRunInterval : max_verificationRunInterval;
        }

    }
    var errorMax = Number.MIN_VALUE;
    var maxValuesPerLevel = 0;
    var matchedValidTimes = [];
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // Determine all the plot params for this curve
        maxValuesPerLevel = 0;
        curve = curves[curveIndex];
        partials = {};   // recalculate for each curve
        diffFrom = curve.diffFrom;
        var label = curve['label'];
        var dataSource = curve['data-source'];
        var dataSource_is_instrument = curve.dataSource_is_instrument;
        var dataSource_tablename = curve.dataSource_tablename;
        var verificationRunInterval = curve.verificationRunInterval;
        var halfVerificationInterval = verificationRunInterval / 2;

        var truthRunInterval = curve.truthRunInterval;
        var halfTruthInterval = truthRunInterval / 2;

        var dataSource_is_json = curve.dataSource_is_json;
        var curveStatValues = [];
        var myVariable;
        // variables can be conventional or discriminators. Conventional variables are listed in the variableMap.
        // discriminators are not.
        // we are using existence in variableMap to decide if a variable is conventional or a discriminator.
        var variableMap = matsCollections.CurveParams.findOne({name: 'variable'}).variableMap;
        var myVariable_isDiscriminator = false;
        var variableStr = curve['variable'];
        myVariable = variableMap[variableStr];
        if (myVariable === undefined) {
            myVariable = curve['variable'];
            myVariable_isDiscriminator = true; // variable is mapped, discriminators are not, this is a discriminator
        }
        // need to know if it is a wind direction variable because we need to retrieve wind speed
        // and filter out any values that are coinciding with a wind speed less than 3mps
        windVar = myVariable.startsWith('wd');
        // stash this in the curve for post processing
        curve['windVar'] = windVar;
        var region = matsCollections.CurveParams.findOne({name: 'region'}).optionsMap[curve['region']][0];
        var siteNames = curve['sites'];
        var siteIds = [];
        for (i = 0; i < siteNames.length; i++) {
            var siteId = matsCollections.SiteMap.findOne({siteName: siteNames[i]}).siteId;
            siteIds.push(siteId);
        }
        var label = (curve['label']);
        var top = Number(curve['top']);
        var bottom = Number(curve['bottom']);
        var color = curve['color'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'][matsTypes.PlotTypes.timeSeries];
        var variable = variableOptionsMap[dataSource][variableStr];
        var discriminator = variableMap[curve['discriminator']] === undefined ? matsTypes.InputTypes.unused : variableMap[curve['discriminator']];
        var disc_upper = curve['upper'];
        var disc_lower = curve['lower'];
        var forecastLength = curve['forecast-length'] === undefined ? matsTypes.InputTypes.unused : curve['forecast-length'];
        if (forecastLength === matsTypes.InputTypes.forecastMultiCycle || forecastLength === matsTypes.InputTypes.forecastSingleCycle) {
            throw (new Error("INFO: You cannot use this forecast length for a profile: " + forecastLength));
        }
        forecastLength = forecastLength === matsTypes.InputTypes.unused ? Number(0) : Number(forecastLength);
        var curveDates = curve['curve-dates'];
        var curveDatesDateRangeFrom = matsDataUtils.dateConvert(curveDates.split(' - ')[0]); // get the from part
        var curveDatesDateRangeTo = matsDataUtils.dateConvert(curveDates.split(' - ')[1]); // get the to part
        statistic = curve['statistic'];
        // maxRunInterval is used for determining maxValidInterval which is used for differencing and matching
        var maxRunInterval = verificationRunInterval;
        maxValidInterval = maxValidInterval > maxRunInterval ? maxValidInterval : maxRunInterval;
        // create database query statements - wfip2 has source AND truth data for statistics other than mean
        var validTimeClause = " ";
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        if (validTimes.length > 0) {
            validTimeClause = "  and ((cycle_utc + " + 3600 * forecastLength + ") % 86400) /3600 in (" + validTimes + ")";
            matchedValidTimes = matchedValidTimes.length === 0 ? validTimes : _.intersection(matchedValidTimes,validTimes);
        }

        var statement;
        if (diffFrom === null || diffFrom === undefined) {
            // this is a database driven curve, not a difference curve - do those after Matching ..
            // wfip2 also has different queries for instruments verses model data
            const utcOffset = Number(forecastLength * 3600);
            if (dataSource_is_instrument) {
                /*
                this is the select format for averaging instrument data
                 select  O.valid_utc as valid_utc, (O.valid_utc - ((O.valid_utc - 450) % 900)) + 450 as avtime,
                 cast(data AS JSON) as data, sites_siteid from obs_recs as O , surfrad_radflux_recs
                 where  obs_recs_obsrecid = O.obsrecid
                 and valid_utc>=1491177600 - 450 and
                 valid_utc<=1491436800 - 450
                 and sites_siteid in (4)  order by avtime;
                 */
                if (dataSource_is_json) {
                    statement = "select  O.valid_utc as valid_utc, (O.valid_utc -  ((O.valid_utc - " + halfVerificationInterval / 1000 + ") % " + verificationRunInterval / 1000 + ")) + " + halfVerificationInterval / 1000 + " as avtime, " +
                        "cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom)) +
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo));
                } else {
                    var qVariable = myVariable;
                    if (windVar) {
                        qVariable = myVariable + ",ws";
                    }
                    statement = "select  O.valid_utc as valid_utc, (O.valid_utc -  ((O.valid_utc - " + halfVerificationInterval / 1000 + ") % " + verificationRunInterval / 1000 + ")) + " + halfVerificationInterval / 1000 + " as avtime, z," + qVariable + ", sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom))+
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo));
                }
                // data source is a model and its JSON format
            } else {
                statement = "select  cycle_utc as valid_utc, (cycle_utc + " + 3600 * forecastLength + ") as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + dataSource_tablename +
                    " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                    " and fcst_utc_offset =" + 3600 * forecastLength +
                    " and cycle_utc >=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom) - utcOffset) +
                    " and cycle_utc <=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo) - utcOffset);
            }
            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ")" + validTimeClause +  " order by avtime";
            //console.log("statement: " + statement);
            // save the query for the data lineage
            dataRequests[curve.label] = statement;
            // queryWFIP2DB has embedded quality control for windDir
            // if corresponding windSpeed < 3ms null the windDir
            var queryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, dataSource_is_json, discriminator, disc_lower, disc_upper, dataSource_is_instrument, verificationRunInterval);
            //if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND ) {
            //    continue;
            //}
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
                    if (truthDataSource_is_json) {
                        truthStatement = "select  O.valid_utc as valid_utc, (O.valid_utc -  ((O.valid_utc - " + halfTruthInterval / 1000 + ") % " + truthRunInterval / 1000 + ")) + " + halfTruthInterval / 1000 + " as avtime, " +
                            "cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                            " where  obs_recs_obsrecid = O.obsrecid" +
                            " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom)) +
                            " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo));
                    } else {
                        var qVariable = myVariable;
                        if (windVar) {
                            qVariable = myVariable + ",ws";
                        }
                        truthStatement = "select  O.valid_utc as valid_utc, (O.valid_utc -  ((O.valid_utc - " + halfTruthInterval / 1000 + ") % " + truthRunInterval / 1000 + ")) + " + halfTruthInterval / 1000 + " as avtime, z," + qVariable + ", sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                            " where  obs_recs_obsrecid = O.obsrecid" +
                            " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom)) +
                            " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo));
                    }
                } else {
                    truthStatement = "select  cycle_utc as valid_utc, (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + truthDataSource_tablename +
                        " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                        " and fcst_utc_offset =" + 3600 * forecastLength +
                        " and cycle_utc >=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom) - utcOffset) +
                        " and cycle_utc <=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo) - utcOffset);
                }
                truthStatement = truthStatement + " and sites_siteid in (" + siteIds.toString() + ")"  + validTimeClause +  " order by avtime";
                //console.log("statement: " + truthStatement);
                dataRequests['truth-' + curve.label] = truthStatement;
                try {
                    truthQueryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, truthStatement, top, bottom, myVariable, truthDataSource_is_json, discriminator, disc_lower, disc_upper, truthDataSource_is_instrument, truthRunInterval);
                    //if (truthQueryResult.error === matsTypes.Messages.NO_DATA_FOUND ) {
                    //    continue;
                    //}
                } catch (e) {
                    e.message = "Error in queryWIFP2DB: " + e.message + " for statement: " + truthStatement;
                    throw e;
                }
                if (truthQueryResult.error !== undefined && truthQueryResult.error !== "") {
                    //error += "Error from truth query: <br>" + truthQueryResult.error + " <br>" + " query: <br>" + truthStatement + " <br>";
                    throw ( new Error(truthQueryResult.error) );
                }
            }  // if statistic is not mean

            /*
             CONSIDER.... WHERE PS IS PARTIAL SUM i.e V(value) or V-T (value - truth) or VSQR(sqr(value-truth))
             curve 0             t1      t2      t3  ...     tn
             S1   S1  L1      PS111   PS112   PS113       PS11n
             S1  L2      PS121   PS122   PS123       PS12n
             S1  L3      PS131   PS132   PS133       PS13n
             S1  Ln      PS1n1   PS1n2   PS1n3       PS1nn

             S2   S2  L1      PS211   PS212   PS213       PS21n
             S2  L2      PS221   PS222   PS223       PS22n
             S2  L3      PS231   PS232   PS233       PS23n
             S2  Ln      PS2n1   PS2n2   PS2n3       PS2nn

             SN   SN  L1      PSN11   PSN12   PSN13       PSN1n
             SN  L2      PSN21   PSN22   PSN23       PSN2n
             SN  L3      PSN31   PSN32   PSN33       PSN3n
             SN  Ln      PSNn1   PSNn2   PSNn3       PSNnn

             curve1             t1      t2      t3  ...     tn
             S1   S1  L1      PS111   PS112   PS113       PS11n
             S1  Ln      PS1n1   PS1n2   PS1n3       PS1nn

             S2   S2  L1      PS211   PS212   PS213       PS21n
             S2  Ln      PS2n1   PS2n2   PS2n3       PS2nn

             SN   SN  L1      PSN11   PSN12   PSN13       PSN1n
             SN  Ln      PSNn1   PSNn2   PSNn3       PSNnn

             From these partials we can calculate statistics mean, bias, MAE, and RMSE
             The first pass data that we need for each curve is an array of arrays where each element has a time and a partial of the corresponding value and truth.
             data = [ [time, partial] .... [time, partial] ]. The value is a partial based on the requested statistic.
             Filtering:
             Filtering is by time boundaries, by which sites have been requested, what are the level boundaries (top/bottom),
             and what are the level and site completeness values.
             times are always effectively filtered. Filtering means that we exclude any data that is not within
             the compleness value. Level completeness means that if a site does not have a minimum percentage of the possible levels it must be left out. Site
             completeness means that if a time does not have a minimum percentage of the possible sites it must be left out.

             From this data we can calculate the requested statistic i.e. mean, bias, mae, rmse by using the partial sums.

             Matching:
             For matching we need ...
             1) match by time - requires the subset(intersection) of all the times for each curve - timesBasis
             2) match by site - requires the subset of all the sites for each curve - sitesBasis
             3) match by level - requires the subset of all the levels that are present for all the sites for each curve - levelsBasis
             These subsets should be created on the fly in the query for each curve.
             The overall subsets can be calculated by intersecting the curve subsets after the first pass and only if matching is requested.
             Matching should occur in this order
             if match by time requested do that first. Toss out any times that are not present in all the curves
             if match by site requested do that second. Toss out any sites that are not present in all the curves
             if match by level is requested do that last. Toss out any levels that are not present in each site for each curve

             For example if level matching is requested we need to use intersection of all the levelsBasis (allLevelsBasis) for all the curves
             and only include data that has levels that are in allLevelsBasis. It is the same for times and siteids.
             The data from the query is of the form
             result =  {
             error: error,
             data: resultData,
             levelsBasis: levelsBasis,
             sitesBasis: sitesBasis,
             timesBasis: timesBasis,
             allTimes: allTimes,
             minInterval: minInterval,
             mean:cumulativeMovingAverage
             }
             where ....
             resultData = {
             time0: {
             sites: {
             site0: {
             levels:[],  // inclusive levels
             values:[],  // partials for the inclusive levels
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
            var levelBasis = queryResult.levelsBasis;
            var siteBasis = queryResult.sitesBasis;
            if (statistic != "mean") {
                // have to consider the truth curve when determining the basis if we are doing stats other than mean
                var truthLevelBasis = truthQueryResult.levelsBasis;
                var truthSiteBasis = truthQueryResult.sitesBasis;
                levelBasis = _.union(levelBasis, truthLevelBasis);
                siteBasis = _.union(siteBasis, truthSiteBasis);
            }
            var verificationLevelValues = {};
            var truthLevelValues = {};
            var allTimes;
            var timeSubset = [];
            var siteSubset = [];
            var levelSubset = [];
            if (statistic == "mean") {
                allTimes = queryResult.allTimes;
            } else {
                allTimes = _.intersection(queryResult.allTimes, truthQueryResult.allTimes)
            }
            // filter for sites and levels and calculate partial sums
            for (t = 0; t < allTimes.length; t++) {
                /*
                 If statistic is not "mean" then we need a set of truth values to diff from the verification values.
                 The sites and levels have to match for the truth to make any sense.
                 */
                    time = allTimes[t];
                    timeObj = queryResult.data[time];
                    var verificationSites = Object.keys(timeObj.sites).map(Number);
                    var truthSites = [];
                    var truthTimeObj;
                    if (statistic != "mean") {
                        truthTimeObj = truthQueryResult.data[time];
                        truthSites = Object.keys(truthTimeObj.sites).map(Number);
                    }
                    sites = statistic != "mean" ? _.intersection(verificationSites, truthSites) : verificationSites;
                    var sitesLength = sites.length;
                    var includedSites = _.intersection(sites, siteBasis);
                    var sitesQuality = (includedSites.length / siteBasis.length) * 100;
                    if (sitesQuality > siteCompleteness) {
                        // time is qualified for sites, count the qualified levels
                        for (var si = 0; si < sitesLength; si++) {
                            site = sites[si];
                            var sLevels;
                            var verificationValues = {};
                            for (var l = 0; l < timeObj.sites[site].levels.length; l++) {
                                verificationValues[timeObj.sites[site].levels[l]] = timeObj.sites[site].values[l];
                            }
                            var truthValues;
                            if (statistic != "mean") {
                                sLevels = _.intersection(timeObj.sites[site].levels, truthTimeObj.sites[site].levels);
                                var truthValues = {};
                                for (var l = 0; l < sLevels.length; l++) {
                                    truthValues[truthTimeObj.sites[site].levels[l]] = truthTimeObj.sites[site].values[l];
                                }
                            } else {
                                sLevels = timeObj.sites[site].levels;
                            }
                            var includedLevels = _.intersection(sLevels, levelBasis);
                            var levelsQuality = (includedLevels.length / levelBasis.length) * 100;
                            if (levelsQuality > levelCompleteness) {
                                for (var l = 0; l < sLevels.length; l++) {
                                    level = sLevels[l];
                                    if (timeSubset[timeSubset.length - 1] !== time) {
                                        timeSubset.push(time);
                                    }
                                    if (siteSubset[siteSubset.length - 1] !== site) {
                                        siteSubset.push(site);
                                    }
                                    if (levelSubset[levelSubset.length - 1] !== level) {
                                        levelSubset.push(level);
                                    }
                                    if (partials[time] === undefined) {
                                        partials[time] = {};
                                    }
                                    if (partials[time][site] === undefined) {
                                        partials[time][site] = {};
                                    }
                                    switch (statistic) {
                                        case "bias":
                                            partials[time][site][level] = verificationValues[level] - truthValues[level];
                                            break;
                                        case "mae":
                                            // bias and mae are almost the same.... mae just absolutes the difference
                                            partials[time][site][level] = Math.abs(verificationValues[level] - truthValues[level]);
                                            break;
                                        case "rmse":
                                            partials[time][site][level] = Math.pow(verificationValues[level] - truthValues[level], 2);  // square the difference
                                            break;
                                        case "mean":
                                            partials[time][site][level] = verificationValues[level]; // just the verification value - no truth
                                        default:
                                    }
                                }
                            } // else don't count it in - skip over it, it isn't complete enough
                        }
                    }
                }
                curves[curveIndex]['partials'] = partials;
                curves[curveIndex]['timeSubset'] = timeSubset;
                curves[curveIndex]['siteSubset'] = siteSubset;
                curves[curveIndex]['levelSubset'] = levelSubset;
            // now we have partial sums that are qualified by site and level completeness
            // we also have time subset, site subset and level subset to be used in matching
        } else { // end if not diff curve//
            // difference curve
            // difference curves always come after data derived curves so we know that we are done with calculating partials after the first diff curve
            break; // stop for curves
        }
    } // end for curves

    // matching goes here
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched) && (matchLevel || matchSite || matchTime)) {
/*
        For matching we need ...
        1) match by time - requires the subset(intersection) of all the times for all curves
        2) match by site - requires the subset of all the sites for all curves
        3) match by level - requires the subset of all the levels that are present for all the sites for all curves
*/
        // intersect the subsets for all the curves depending on which matching criteria
        var allTimeSubset = [];
        var allSiteSubset = [];
        var allLevelSubset = [];
        var tmp;
        if (matchTime) {
            tmp =[];
            try {
                for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
                    const dataCurve = (curves[curveIndex]['diffFrom'] === null || curves[curveIndex]['diffFrom'] === undefined);
                    // only subset real data curves - not diff curves
                    if (dataCurve) {
                        tmp.push(curves[curveIndex]['timeSubset']);
                    }
                }
                allTimeSubset = _.intersection.apply(_, tmp);
            } catch(e) {
                console.log("matchTime",e);
            }
        }
        if (matchSite) {
            try {
                tmp = [];
                for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
                    const dataCurve = (curves[curveIndex]['diffFrom'] === null || curves[curveIndex]['diffFrom'] === undefined);
                    // only subset real data curves - not diff curves
                    if (dataCurve) {
                        tmp.push(curves[curveIndex]['siteSubset']);
                    }
                }
                allSiteSubset = _.intersection.apply(_, tmp);
            } catch(e) {
                console.log("matchSite",e);
            }
        }
        if (matchLevel) {
            try {
                tmp = [];
                for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
                    const dataCurve = (curves[curveIndex]['diffFrom'] === null || curves[curveIndex]['diffFrom'] === undefined);
                    // only subset real data curves - not diff curves
                    if (dataCurve) {
                        tmp.push(curves[curveIndex]['levelSubset']);
                    }
                }
                allLevelSubset = _.intersection.apply(_, tmp);
            } catch(e) {
                console.log("matchLevel", e);
            }
        }
        var pci = 0;
        var time =0;
        var site = 0;
        var level = 0;
        var curvePartials = null;
        var matchedTimesByLevel = [];
        var ci;
        var timeLevelExists;
        for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
            curve = curves[curveIndex];
            var partials = curve['partials'];
            var filteredPartials = {};
            //filter the partials by time, site, and level as requested
            try {
                for (time in partials) {
                    if (matchTime && (allTimeSubset.indexOf(time) === -1)) {
                        continue;  // skip this time, it doesn't match
                    }
                    for (site in partials[time]) {
                        if (matchSite && (allSiteSubset.indexOf(Number(site)) === -1)) {
                            continue;  // skip this site, it doesn't match
                        }
                        var levelTimes = {};
                        for (level in partials[time][site]) {
                            // does this time exist in all the curves at this level? If not throw it away
                            timeLevelExists = true;
                            for (ci = 0; ci < curvesLength; ci++) {
                                if (curves[ci].diffFrom === undefined && (!curves[ci].partials[time][site][level])) {
                                    timeLevelExists = false;
                                }
                            }
                                // timeLevelExists - throw away this time because it doesn't exist at all the levels
                            if (!timeLevelExists || (matchLevel && (allLevelSubset.indexOf(Number(level)) === -1))) {
                                continue;  // skip this level, it doesn't match
                            }
                            if (filteredPartials[time] === undefined) {
                                filteredPartials[time] = {};
                            }
                            if (filteredPartials[time][site] === undefined) {
                                filteredPartials[time][site] = {};
                            }
                            if (filteredPartials[time][site][level] === undefined) {
                                filteredPartials[time][site][level] = partials[time][site][level];
                            }
                        }
                    }
                }
                delete curve.partials;
                curve['partials'] = filteredPartials;
            } catch(e) {
                console.log("for time in partials", e);
            }
        }
    }  // end if matching

    // calculate statistic from the partial sums for each level
    var diffResult = null;
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymax = Number.MIN_VALUE;
    var ymin = Number.MAX_VALUE;
    var axisMap = {};
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        curve = curves[curveIndex];
        var partials = curve['partials'];
        var diffFrom = curve.diffFrom;
        var statistic = curve['statistic'];
        var windVar = curve['windVar'];
        var label = curve.label;
        // axisKey is used to determine which axis a curve should use.
        // This axisMap object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisMap value, which is the axisKey.
        var axisKey = variableStr + ":" + statistic;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var levelSums = {};
        var curveStats = {d_mean: 0, stde_betsy: 0, sd: 0, n_good: 0, lag1: 0, min: 0, max: 0, sum: 0};
        if (diffFrom === null || diffFrom === undefined) {  // don't calculate differences.
            // create a summary list of the partials ordered by level
            for (var time in partials) {
                for (var site in partials[time]) {
                    for (var level in partials[time][site]) {
                        if (partials[time][site][level] !== undefined && partials[time][site][level] !== null) {
                            if (levelSums[level] === undefined) {
                                levelSums[level] = {sum:0,count:0,statistic:statistic,level:level,values:[],times:[]};
                            }
                            levelSums[level]['sum'] += partials[time][site][level];
                            levelSums[level]['count']++;
                            levelSums[level]['values'].push(partials[time][site][level]);
                            levelSums[level]['times'].push(time);
                        }
                    }
                }
            }
            var d = [];
            var values = [];
            var levels = [];
            for (var level in levelSums ) {
                var value;
                switch (statistic) {
                    case "bias":
                    case "mae":
                    case "mean":
                        // mean, bias and mae are the same, we divide sum by n
                        value = Number(levelSums[level].sum / levelSums[level].count);
                        break;
                    case "rmse":
                        // take the square root of the sum divided by n
                        value = Math.sqrt(levelSums[level].sum / levelSums[level].count);
                        break;
                    default:
                }
                levelSums[level]['value'] = value;
                levels.push(level);
                values.push(value);
                xmin = xmin < value ? xmin : value;
                xmax = xmax > value ? xmax : value;
                ymin = Number(ymin) < Number(level) ? Number(ymin) : Number(level);
                ymax = Number(ymax) > Number(level) ? Number(ymax) : Number(level);
                /*
                DATASET ELEMENTS:
                    series: [data,data,data ...... ]   each data is itself an array
                data[0] - statValue (ploted against the x axis)
                data[1] - level (plotted against the y axis)
                data[2] - errorBar (stde_betsy * 1.96)
                data[3] - level values  [v0,v1 ..., vn]
                data[4] - level times   [t0,t1 ....,tn]
                data[5] - level stats]
                      like   {
                             d_mean: errorResult.d_mean,
                             sd: errorResult.sd,
                             n_good: errorResult.n_good,
                             lag1: errorResult.lag1,
                             stde_betsy: errorResult.stde_betsy
                             }
                data[6] - tooltip
                */
                const errorResult = matsWfipUtils.get_err(levelSums[level]['values'], levelSums[level]['times']);
                const errorBar = errorResult.stde_betsy * 1.96;
                errorMax = errorMax > errorBar ? errorMax : errorBar;

                var stats = {
                    d_mean: errorResult.d_mean,
                    sd: errorResult.sd,
                    n_good: errorResult.n_good,
                    lag1: errorResult.lag1,
                    stde_betsy: errorResult.stde_betsy,
                }
                // const corrected  = errorResult.qaCorrected.length > 0 ? "<font style='color: red'>: QA corrected! (see data lineage)</font>" : "";
                // if (corrected) {
                //     qaCorrections[curve.label] = qaCorrections[curve.label] === undefined ? {} : qaCorrections[curve.label];
                //     qaCorrections[curve.label][level] = qaCorrections[curve.label][level] === undefined ? [] : qaCorrections[curve.label][level];
                //     qaCorrections[curve.label][level].push(errorResult.qaCorrected);
                // }
                tooltip = label +
                    "<br>" + level + "m" +
                    "<br> " + statistic + ":" + value.toPrecision(4) +
                    "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                    "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                    "<br>  n: " + errorResult.n_good + //corrected +
                    "<br>  lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                    "<br>  stde: " + errorResult.stde_betsy +
                    "<br>  errorbars: " + Number(value - (errorResult.stde_betsy * 1.96)).toPrecision(4) + " to " + Number(value + (errorResult.stde_betsy * 1.96)).toPrecision(4);
                 if (matching) {
                     d.push([value, level, errorBar, levelSums[level]['values'], levelSums[level]['times'], stats, tooltip]);
                 } else {
                    // no error bars if unmatched
                    d.push([value, level, 0, levelSums[level]['values'], levelSums[level]['times'], stats, tooltip]);
                }
            }
            // get the overall stats for the text output
            curveStats = matsWfipUtils.get_err(values, levels);
            const minx = Math.min.apply(null, values);
            const maxx = Math.max.apply(null, values);
            curveStats.minx = minx;
            curveStats.maxx = maxx;
            // end  if diffFrom == null
        } else {
            // this is a difference curve
            // calculate the data based on matching or unmatched
            var diffResult;
            if (matching) {
                //console.log("curve: " + curveIndex + " getDataForProfileMatchingDiffCurve");
                //diffResult = matsDataUtils.getDataForProfileMatchingDiffCurve({
                diffResult = matsDataUtils.getDataForProfileUnMatchedDiffCurve({
                    dataset: dataset,
                    diffFrom: diffFrom
                });
            } else {
                // an unmatched difference curve. In this case we just difference the plot points, we don't calculate stats
                //console.log ("curve: " + curveIndex + " getDataForProfileUnMatchedDiffCurve");
                diffResult = matsDataUtils.getDataForProfileUnMatchedDiffCurve({
                    dataset:dataset,
                    diffFrom:diffFrom
                });
            }
            d = diffResult.dataset;
            // recalculate the x min and max after difference
            for (var di = 0; di < d.length; di++) {
                xmax = xmax > d[di][0] ? xmax : d[di][0];
                xmin = xmin < d[di][0] ? xmin : d[di][0];
                ymax = Number(ymax) > Number(d[di][1]) ? Number(ymax) : Number(d[di][1]);
                ymin = Number(ymin) < Number(d[di][1]) ? Number(ymin) : Number(d[di][1]);
            }

        } // end difference curve

        // specify these so that the curve options generator has them available
        curve['annotation'] = "";
        curve['ymin'] = ymin;
        curve['ymax'] = ymax;
        curve['xmin'] = xmin;
        curve['xmax'] = xmax;
        const cOptions = matsDataUtils.generateProfileCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        dataset[curveIndex]['stats'] = curveStats;
    }  // end for curves

    const resultOptions = matsWfipUtils.generateProfilePlotOptions( dataset, curves, axisMap, errorMax );
    var result = {
        error: error,
        data: dataset,
        options: resultOptions,
        basis: {
            plotParams: plotParams,
            queries: dataRequests,
            //qaCorrections: qaCorrections
        }
    };
    plotFunction(result);
};
