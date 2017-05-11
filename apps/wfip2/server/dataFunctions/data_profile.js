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
    var axisMap = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymax = Number.MIN_VALUE;
    var ymin = Number.MAX_VALUE;
    // used to find the max and minimum for the y axis
    // used in yaxisOptions for scaling the graph
    // var xAxisMax = -1 * Number.MAX_VALUE;
    // var xAxisMin = Number.MAX_VALUE;
    // var yAxisMax = Number.MIN_VALUE;
    // var yAxisMin = Number.MAX_VALUE;
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
    var d = [];
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
        if (curveIndex == 0) {
            xAxisLabel += variableStr;
            xAxisLabels.push(variableStr);
        } else {
            if (xAxisLabels.indexOf(variableStr) == -1) {
                xAxisLabels.push(variableStr);
                xAxisLabel += " | " + variableStr;
            }
        }
        if (myVariable === undefined) {
            myVariable = curve['variable'];
            myVariable_isDiscriminator = true; // variable is mapped, discriminators are not, this is a discriminator
        }
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
        // axisKey is used to determine which axis a curve should use.
        // This axisMap object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisMap value, which is the axisKey.
        var axisKey = variableStr + ":" + statistic;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
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
                    statement = "select  O.valid_utc as valid_utc, (O.valid_utc - (O.valid_utc %  " + verificationRunInterval / 1000 + ")) as avtime, z," + myVariable + ", sites_siteid from obs_recs as O , " + dataSource_tablename +
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
                        truthStatement = "select  O.valid_utc as valid_utc, (O.valid_utc - (O.valid_utc %  " + truthRunInterval / 1000 + ")) as avtime, z," + myVariable + ", sites_siteid from obs_recs as O , " + truthDataSource_tablename +
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
            /* What we need for each curve is an array of arrays where each element has a time and an average of the corresponding values.
             data = [ [time, value] .... [time, value] ] // where value is a statistic based on criterion, such as which sites have been requested?,
             and what are the level boundaries?, and what are the time boundaries?. Levels and times have been built into the query but sites still
             need to be accounted for here. Also there can be missing times so we need to iterate through each set of times,
             based on the minimum interval for the data set, and fill in missing times with null values.

             We also have filtering... if levels or sites are filtered, each axis must have the same intersection for the filtered attribute.

             For each valid time, and each valid level for that time we also need partial sums for all of the valid sites.

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

            // post process
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
            const windVar = myVariable.startsWith('wd');
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
                // xAxisMin = xAxisMin < value ? xAxisMin : value;
                // xAxisMax = xAxisMax > value ? xAxisMax : value;
                // yAxisMin = yAxisMin < level ? yAxisMin : level;
                // yAxisMax = yAxisMax > level ? yAxisMax : level;
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



    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        var position = dsi === 0 ? "left" : "right";
        var yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: 'level above ground in meters',
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 16,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1
        };
        var yaxisOptions = {
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }
    var pOptions = {
        axisLabels: {
            show: true
        },
        xaxes: [{
            axisLabel: xAxisLabel,
            color: 'grey'
        }],
        xaxis: {
            zoomRange: [0.1, 10],
            max: xAxisMax > 0 ? xAxisMax * 1.6 : xAxisMax * 0.6,
            min: xAxisMin < 0 ? xAxisMin * 1.6 : xAxisMin * 0.6
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
            clickable: true,
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        /* tooltips NOTE:
         There are two kinds of tooltips...
         1) content: "<span style='font-size:150%'><strong>%s<br>%x:<br>value %y</strong></span>",
         xDateFormat: "%Y-%m-%d:%H",
         onHover: function (flotItem, $tooltipEl) {
         which will cause the y value to be presented with the text "<br>%x:<br>value %y where %y is the y value"
         and ...
         content: "<span style='font-size:150%'><strong>%ct</strong></span>"
         which will present the text defined by a string in the last data position of the dataset array i.e.
         [[x1,y1,"tooltiptext1"],[x2,y3,"tooltiptext2"]....[xn,yn,"tooltiptextn"]]
         The tooltip text is expected to be an html snippet.
         */

        tooltip: true,
        tooltipOpts: {
            // the ct value is the third [2] element of the data series. This is the tooltip content.
            content: "<span style='font-size:150%'><strong>%ct</strong></span>"
        }
    };
    //const resultOptions = matsDataUtils.generateProfilePlotOptions( dataset, curves, axisMap, errorMax );

    // add black 0 line curve
    dataset.push({
        "yaxis": 1,
        "label": "zero",
        "color": "rgb(0,0,0)",
        "data": [
            [0, -1000, 0, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, "zero"],
            [0, -50, 0, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, "zero"]
        ],
        "points": {
            "show": false,
            "errorbars": "x",
            "xerr": {
                "show": false,
                "asymmetric": false,
                "upperCap": "squareCap",
                "lowerCap": "squareCap",
                "color": "rgb(0,0,255)",
                "radius": 5
            }
        },
        "lines": {
            "show": true,
            "fill": false
        },
        "stats": {
            "d_mean": 0,
            "stde_betsy": 0,
            "sd": 0,
            "n_good": 0,
            "lag1": 0,
            "min": 50,
            "max": 1000,
            "sum": 0,
            "minx": 0,
            "maxx": 0
        }
    });
    var result = {
        error: error,
        data: dataset,
        options: pOptions,
        //options: resultOptions,
        basis: {
            plotParams: plotParams,
            queries: dataRequests
        }
    };
    plotFunction(result);
};
