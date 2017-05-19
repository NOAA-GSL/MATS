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
    //var xAxisLabel = "";
    //var xAxisLabels = [];
    var errorMax = Number.MIN_VALUE;
    var maxValuesPerLevel = 0;
    var partials = {};
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // Determine all the plot params for this curve
        maxValuesPerLevel = 0;
        curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var label = curve['label'];
        var dataSource = curve['data-source'];
        var dataSource_is_instrument = curve.dataSource_is_instrument;
        var dataSource_tablename = curve.dataSource_tablename;
        var verificationRunInterval = curve.verificationRunInterval;
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
        const windVar = myVariable.startsWith('wd');
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
        var statistic = curve['statistic'];
        // maxRunInterval is used for determining maxValidInterval which is used for differencing and matching
        var maxRunInterval = verificationRunInterval;
        maxValidInterval = maxValidInterval > maxRunInterval ? maxValidInterval : maxRunInterval;
        // create database query statements - wfip2 has source AND truth data for statistics other than mean
        var statement;
        if (diffFrom === null || diffFrom === undefined) {
            // this is a database driven curve, not a difference curve - do those after Matching ..
            // wfip2 also has different queries for instruments verses model data
            if (dataSource_is_instrument) {
                const utcOffset = Number(forecastLength * 3600);
                if (dataSource_is_json) {
                    statement = "select  O.valid_utc as valid_utc, (O.valid_utc - (O.valid_utc %  " + verificationRunInterval / 1000 + ")) as avtime, cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom) + utcOffset) +
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo) + utcOffset);
                } else {
                    var qVariable = myVariable;
                    if (windVar) {
                        qVariable = myVariable + ",ws";
                    }
                    statement = "select  O.valid_utc as valid_utc, (O.valid_utc - (O.valid_utc %  " + verificationRunInterval / 1000 + ")) as avtime, z," + qVariable + ", sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom) + utcOffset) +
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo) + utcOffset)
                }
                // data source is a model and its JSON format
            } else {
                statement = "select  cycle_utc as valid_utc, (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + dataSource_tablename +
                    " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                    " and fcst_utc_offset =" + 3600 * forecastLength +
                    " and cycle_utc >=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                    " and cycle_utc <=" + matsDataUtils.secsConvert(curveDatesDateRangeTo);
            }
            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ")  order by avtime";
            //console.log("statement: " + statement);
            // save the query for the data lineage
            dataRequests[curve.label] = statement;
            var queryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, dataSource_is_json, discriminator, disc_lower, disc_upper);
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
                            " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom) + utcOffset) +
                            " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo) + utcOffset);
                    } else {
                        var qVariable = myVariable;
                        if (windVar) {
                            qVariable = myVariable + ",ws";
                        }
                        truthStatement = "select  O.valid_utc as valid_utc, (O.valid_utc - (O.valid_utc %  " + truthRunInterval / 1000 + ")) as avtime, z," + qVariable + ", sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                            " where  obs_recs_obsrecid = O.obsrecid" +
                            " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom) + utcOffset) +
                            " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo) + utcOffset);
                    }
                } else {
                    truthStatement = "select  cycle_utc as valid_utc, (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + truthDataSource_tablename +
                        " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                        " and fcst_utc_offset =" + 3600 * forecastLength +
                        " and cycle_utc >=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                        " and cycle_utc <=" + matsDataUtils.secsConvert(curveDatesDateRangeTo);
                }
                truthStatement = truthStatement + " and sites_siteid in (" + siteIds.toString() + ") order by avtime";
                //console.log("statement: " + truthStatement);
                dataRequests[curve.label] = truthStatement;
                try {
                    truthQueryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, truthStatement, top, bottom, myVariable, truthDataSource_is_json, discriminator, disc_lower, disc_upper);
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
            if (statistic == "mean") {
                allTimes = queryResult.allTimes;
            } else {
                allTimes = _.intersection(queryResult.allTimes, truthQueryResult.allTimes)
            }
            for (t = 0; t < allTimes.length; t++) {
                /*
                 If statistic is not "mean" then we need a set of truth values to diff from the verification values.
                 The sites and levels have to match for the truth to make any sense.
                 */
                time = allTimes[t];
                var timeObj = queryResult.data[time];
                var verificationSites = Object.keys(timeObj.sites).map(Number);
                var truthSites = [];
                var truthTimeObj;
                if (statistic != "mean") {
                    truthTimeObj = truthQueryResult.data[time];
                    truthSites = Object.keys(truthTimeObj.sites).map(Number);
                }
                var sites = statistic != "mean" ? _.intersection(verificationSites, truthSites) : verificationSites;
                var sitesLength = sites.length;
                var includedSites = _.intersection(sites, siteBasis);
                var sitesQuality = (includedSites.length / siteBasis.length) * 100;
                if (sitesQuality > siteCompleteness) {
                    // time is qualified for sites, count the qualified levels
                    for (var si = 0; si < sitesLength; si++) {
                        var sLevels;
                        var verificationValues = timeObj.sites[[sites[si]]].values;
                        var truthValues;
                        if (statistic != "mean") {
                            sLevels = _.intersection(timeObj.sites[[sites[si]]].levels, truthTimeObj.sites[[sites[si]]].levels);
                            truthValues = truthTimeObj.sites[[sites[si]]].values;
                        } else {
                            sLevels = timeObj.sites[[sites[si]]].levels;
                        }
                        var includedLevels = _.intersection(sLevels, levelBasis);
                        var levelsQuality = (includedLevels.length / levelBasis.length) * 100;
                        if (levelsQuality > levelCompleteness) {
                            for (var l = 0; l < sLevels.length; l++) {
                                if (verificationLevelValues[sLevels[l]] === undefined) {
                                    verificationLevelValues[sLevels[l]] = [];
                                }
                                verificationLevelValues[sLevels[l]].push(verificationValues[l]);
                                if (statistic != "mean") {
                                    if (truthLevelValues[sLevels[l]] === undefined) {
                                        truthLevelValues[sLevels[l]] = [];
                                    }
                                    truthLevelValues[sLevels[l]].push(truthValues[l]);
                                }
                            }
                        } // else don't count it in - skip over it, it isn't complete enough
                    }
                }
            }
            partials[curveIndex] = {verificationLevelValues:verificationLevelValues,truthLevelValues:truthLevelValues};
        }
    }


    // now we have verificationLevelValues and truthLevelValues that are qualified by site and level completeness
    // now get levelStats
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var d = [];
        const curve = curves[curveIndex];
        const diffFrom = curve.diffFrom;
        const windVar = curve['windVar'];
        // axisKey is used to determine which axis a curve should use.
        // This axisMap object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisMap value, which is the axisKey.
        var axisKey = variableStr + ":" + statistic;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var axisMap = Object.create(null);
        var xmax = Number.MIN_VALUE;
        var xmin = Number.MAX_VALUE;
        var ymax = Number.MIN_VALUE;
        var ymin = Number.MAX_VALUE;
        var statistic = curve['statistic'];

        var verificationLevelValues = partials[curveIndex].verificationLevelValues;
        var truthLevelValues = partials[curveIndex].truthLevelValues;
        if (diffFrom === null || diffFrom === undefined) {
            // now we have verificationLevelValues and truthLevelValues that are qualified by site and level completeness
            // now get levelStats

            var levelStats = {};
            var qualifiedLevels;
            if (statistic == "mean") {
                qualifiedLevels = Object.keys(verificationLevelValues);
            } else {
                qualifiedLevels = _.intersection(Object.keys(verificationLevelValues), Object.keys(truthLevelValues));
            }
            var statValue;
            var statSum;
            var statNum;
            var values;
            var vIndex;
            switch (statistic) {
                case "bias":
                case "mae":
                    // bias and mae are almost the same.... mae just absolutes the difference
                    // find siteLevelBias and sum it in
                    try {
                        for (l = 0; l < qualifiedLevels.length; l++) {
                            statNum = 0;
                            statSum = 0;
                            values = verificationLevelValues[qualifiedLevels[l]];
                            truthValues = truthLevelValues[qualifiedLevels[l]];
                            for (vIndex = 0; vIndex < values.length; vIndex++) {
                                statValue = Math.abs(values[vIndex] - truthValues[vIndex]);
                                if (windVar) {
                                    if (statValue > 180) {
                                        statValue = statValue - 360;
                                    } else if (statValue < -180) {
                                        statValue = statValue + 360;
                                    }
                                }
                                if (statistic == "mae") {
                                    statValue = Math.abs(values[vIndex] - truthValues[vIndex]);
                                }
                                statSum += statValue;
                                statNum++;
                            }
                            if (levelStats[qualifiedLevels[l]] === undefined) {
                                levelStats[qualifiedLevels[l]] = {};
                            }
                            levelStats[qualifiedLevels[l]][statistic] = statSum / statNum;
                        }
                    } catch (ignore) {
                        // apparently there is no data in the truth curve that matches this time
                        statValue = null;
                    }
                    break;
                case "rmse":
                    try {
                        for (l = 0; l < qualifiedLevels.length; l++) {
                            statNum = 0;
                            statSum = 0;
                            values = verificationLevelValues[qualifiedLevels[l]];
                            truthValues = truthLevelValues[qualifiedLevels[l]];
                            for (vIndex = 0; vIndex < values.length; vIndex++) {
                                statValue = Math.abs(values[vIndex] - truthValues[vIndex]);
                                if (windVar) {
                                    if (statValue > 180) {
                                        statValue = statValue - 360;
                                    } else if (statValue < -180) {
                                        statValue = statValue + 360;
                                    }
                                }
                                statValue = Math.pow(statValue, 2);  // square the difference
                                statSum += statValue;
                                statNum++;
                            }
                            if (levelStats[qualifiedLevels[l]] === undefined) {
                                levelStats[qualifiedLevels[l]] = {};
                            }
                            levelStats[qualifiedLevels[l]][statistic] = Math.sqrt(statSum / statNum);
                        }
                    } catch (ignore) {
                        statValue = null;
                    }
                    break;
                case "mean":
                default:
                    try {
                        statNum = 0;
                        statSum = 0;
                        for (l = 0; l < qualifiedLevels.length; l++) {
                            statSum = _.reduce(verificationLevelValues[qualifiedLevels[l]], function (a, b) {
                                return a + b;
                            }, 0);
                            statNum = verificationLevelValues[qualifiedLevels[l]].length;
                            if (levelStats[qualifiedLevels[l]] === undefined) {
                                levelStats[qualifiedLevels[l]] = {};
                            }
                            levelStats[qualifiedLevels[l]][statistic] = statSum / statNum;
                        }
                    } catch (ignore) {
                    }
                    break;
            }
            d = [];
            var levels = Object.keys(levelStats);
            for (l = 0; l < levels.length; l++) {
                level = levels[l];
                var value = levelStats[level][statistic];
                var value = levelStats[level][statistic];
                xmin = xmin < value ? xmin : value;
                xmax = xmax > value ? xmax : value;
                ymin = ymin < level ? ymin : level;
                ymax = ymax > level ? ymax : level;
                tooltip = label +
                    "<br>level: " + level +
                    "<br>statistic: " + statistic +
                    "<br> value: " + value;
                d.push([value, level, -1, {
                    level: level,
                    statistic: statistic,
                    values: {verification: verificationLevelValues[level], truth: truthLevelValues[level]},
                    levelStats: levelStats[level]
                }, tooltip]);
            }
            // end  if diffFrom == null
        } else {
            var diffResult;
            //console.log ("curve: " + curveIndex + " getDataForProfileUnMatchedDiffCurve");
            diffResult = matsDataUtils.getDataForProfileDiffCurve({
                dataset:dataset,
                diffFrom:diffFrom
            });
            d = diffResult.dataset;
        } // end difference curve
        // get the x min and max
        for (var di = 0; di < d.length; di++) {
            xmax = xmax > d[di][0] ? xmax : d[di][0];
            xmin = xmin < d[di][0] ? xmin : d[di][0];
            maxValuesPerLevel = maxValuesPerLevel > d[di][3].length ? maxValuesPerLevel : d[di][3].length;
        }
        // specify these so that the curve options generator has them available
        curve['annotation'] = "";
        curve['ymin'] = ymin;
        curve['ymax'] = ymax;
        curve['xmin'] = xmin;
        curve['xmax'] = xmax;
        const cOptions = matsDataUtils.generateProfileCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
    }  // end for curves

    const resultOptions = matsWfipUtils.generateProfilePlotOptions( dataset, curves, axisMap, errorMax );
    var result = {
        error: error,
        data: dataset,
        options: resultOptions,
        basis: {
            plotParams: plotParams,
            queries: dataRequests
        }
    };
    plotFunction(result);
};
