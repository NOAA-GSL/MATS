import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsWfipUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment';


dataProfile = function (plotParams, plotFunction) {
    console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {}; // used to store data queries 
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    // used to find the max and minimum for the y axis
    // used in yaxisOptions for scaling the graph
    var xAxisMax = -1 * Number.MAX_VALUE;
    var xAxisMin = Number.MAX_VALUE;
    var yAxisMax = Number.MIN_VALUE;
    var yAxisMin = Number.MAX_VALUE;
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
    //iterate all the curves
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        curve = curves[curveIndex];
        const tmp = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0].split(',');
        curve.dataSource_is_instrument = parseInt(tmp[1]);
        curve.dataSource_tablename = tmp[2];
        curve.verificationRunInterval = tmp[4];
        curve.dataSource_is_json = parseInt(tmp[5]);
        max_verificationRunInterval = Number(curve.verificationRunInterval) > Number(max_verificationRunInterval) ? curve.verificationRunInterval : max_verificationRunInterval;
        if (curve['statistic'] != "mean") {
            // need a truth data source for statistic calculations other than mean
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
    var xAxisLabel = "";
    var xAxisLabels = [];
    var errorMax = Number.MIN_VALUE;
    var d = [];

    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
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
        var statement;
        //if (diffFrom === null || diffFrom === undefined) {
            // this is a database driven curve, not a difference curve - do those after Matching ..
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
                // data source is a model and its JSON
            } else {
                statement = "select  cycle_utc as valid_utc, (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + dataSource_tablename +
                    " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                    " and fcst_utc_offset =" + 3600 * forecastLength +
                    " and cycle_utc >=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                    " and cycle_utc <=" + matsDataUtils.secsConvert(curveDatesDateRangeTo);
            }
            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ")  order by avtime";
            //console.log("statement: " + statement);
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
            /* What we really want to end up with for each curve is an array of arrays where each element has a time and an average of the corresponding values.
             data = [ [time, value] .... [time, value] ] // where value is an average based on criterion, such as which sites have been requested?,
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
            var allTimes;
            if (statistic == "mean") {
                allTimes = queryResult.allTimes;
            } else {
                allTimes = _.intersection(queryResult.allTimes, truthQueryResult.allTimes)
            }
            n = 0;
            const windDirVar = myVariable.startsWith('wd');

            const sumObject = matsWfipUtils.sumsSquaresByTimeLevel({levelCompleteness:levelCompleteness,siteCompleteness:siteCompleteness,siteBasis:siteBasis,truthSiteBasis:truthSiteBasis,levelBasis:levelBasis,allTimes:allTimes,windDirVar:windDirVar,statistic:statistic,queryResult:queryResult,truthQueryResult:truthQueryResult});
            const validLevels = sumObject.validLevels;
            const sumsSquaresByTimeLevel = sumObject.sumsSquaresByTimeLevel;
            const timesByLevel = sumObject.timesByLevel;
            const statsByLevel = matsWfipUtils.getStatValuesByLevel({sumsSquaresByTimeLevel:sumsSquaresByTimeLevel, validLevels:validLevels, timesByLevel:timesByLevel, windDirVar:windDirVar});

            // calculate the whole curve stats from all the levelStats
            var uSum;
            var vSum;
            var uStatValue;
            var vStatValue;
            var statValue;

            for (l = 0; l < validLevels.length; l++) {  // over all the levels
                const lStat = statsByLevel(validLevels[l]);
                const statTimes = lStat.statTimes;
                const statValues = lStat.statValues;
                const sumsForLevel = lStat.sumsForLevel;
                const lvlStats = matsDataUtils.get_err(statValues,statTimes);
                means.push(lvlStats.d_mean);
                n = sumsForLevel.length;
                if (windDirVar) {
                    values = sumsForLevel;
                    // for windDirVar this is an array of u,v vectors
                    uSum = 0;
                    vSum = 0;
                    for (v = 0; v < n; v++) {
                        uSum += sumsForLevel[v].uSum;
                        vSum += sumsForLevel[v].vSum;
                    }
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
                } else {
                    sum = sumsForLevel.reduce((a, b) => a + b, 0);
                    if (statistic === "rmse") {
                        // for rmse the values are sqr(data - truth) - must be square rooted
                        statValue = Math.sqrt(sum / n);
                    } else {
                        statValue = sum / n;
                    }
                }

                xAxisMin = xAxisMin < statValue ? xAxisMin : statValue;
                xAxisMax = xAxisMax > statValue ? xAxisMax : statValue;
                yAxisMin = yAxisMin < level ? yAxisMin : level;
                yAxisMax = yAxisMax > level ? yAxisMax : level;
                tooltip = label +
                    "<br>level: " + level +
                    "<br>statistic: " + statistic +
                    "<br> value: " + statValue +
                    "<br> sd: " + lvlStats.sd +
                    "<br> stde: " + lvlStats.stde_betsy +
                    "<br> lag1:" + lvlStats.lag1 +
                    "<br> mean:" + lvlStats.d_mean;
                var errorBar = 1.96 * lvlStats.stde_betsy
                errorMax = errorMax > errorBar ? errorMax : errorBar;
                /*
                 DATASET ELEMENTS:
                 series: [data,data,data ...... ]   each data is itself an array
                 data[0] - statValue (ploted against the x axis)
                 data[1] - level (plotted against the y axis)
                 data[2] - errorBar  (stde_betsy * 1.96)
                 data[3] - level values (statValues)
                 data[4] - level times (statTimes)
                 data[5] - level stats
                 data[6] - tooltip
                 */
                d.push([statValue, level, errorBar, statValues, statTimes, lvlStats, tooltip]);
            }
        //} else { // difference curve
            //d = matsDataUtils.getDataForProfileMatchingDiffCurve({dataset:dataset,diffFrom:diffFrom}).dataset;
            // var minuendIndex = diffFrom[0];
            // var subtrahendIndex = diffFrom[1]; // base curve
            // var minuendData = dataset[minuendIndex].data;
            // var subtrahendData = dataset[subtrahendIndex].data;
            // var minuendLevelValues = {};
            // var minuendLevels = [];
            // var minuendStatistic = null;
            // var subtrahendStatistic = null;
            // var value;
            // for (i = 0; i < minuendData.length; i++) {
            //     level = minuendData[i][1];
            //     value = minuendData[i][0];
            //     if (!minuendStatistic) {
            //         minuendStatistic = minuendData[i][3].statistic;
            //     }
            //     minuendLevels.push(level);
            //     minuendLevelValues[level] = value;
            // }
            // var subtrahendLevels = [];
            // var subtrahendLevelValues = {};
            // for (i = 0; i < subtrahendData.length; i++) {
            //     level = subtrahendData[i][1];
            //     value = subtrahendData[i][0];
            //     if (!subtrahendStatistic) {
            //         subtrahendStatistic = subtrahendData[i][3].statistic;
            //     }
            //     subtrahendLevels.push(level);
            //     subtrahendLevelValues[level] = value;
            // }
            // d = [];
            // var commonLevels = _.intersection(subtrahendLevels, minuendLevels);
            // for (i = 0; i < commonLevels.length; i++) {
            //     level = commonLevels[i];
            //     value = minuendLevelValues[level] - subtrahendLevelValues[level];
            //     xAxisMin = xAxisMin < value ? xAxisMin : value;
            //     xAxisMax = xAxisMax > value ? xAxisMax : value;
            //     yAxisMin = yAxisMin < level ? yAxisMin : level;
            //     yAxisMax = yAxisMax > level ? yAxisMax : level;
            //     tooltip = label +
            //         "<br>level: " + level +
            //         "<br>minuend statistic: " + minuendStatistic +
            //         "<br>subtrahend statistic: " + subtrahendStatistic +
            //         "<br> diff value: " + value;
            //     /*
            //      DATASET ELEMENTS:
            //      series: [data,data,data ...... ]   each data is itself an array
            //      data[0] - statValue (ploted against the x axis)
            //      data[1] - level (plotted against the y axis)
            //      data[2] - errorBar  (stde_betsy * 1.96)
            //      data[3] - level values (statValues)
            //      data[4] - level times (statTimes)
            //      data[5] - level stats
            //      data[6] - tooltip
            //      */
            //     d.push([value, level * -1, -1, [], [], {
            //          level: level,
            //          values: {minuend: minuendLevelValues[level], subtrahend: subtrahendLevelValues[level]},
            //          levelStats: {minuend: minuendStatistic, subtrahend: subtrahendStatistic}
            //          }, tooltip]);
            // }
        //} // difference curve

        var pointSymbol = matsDataUtils.getPointSymbol(curveIndex);
        var options = {
            //yaxis:curveIndex,
            label: label,
            color: color,
            data: d,
            points: {
                symbol: pointSymbol,
                fillColor: color,
                show: true,
                errorbars: "x",
                xerr: {
                    show: true,
                    asymmetric: false,
                    upperCap: "squareCap",
                    lowerCap: "squareCap",
                    color: color,
                    radius: 10
                }
            },
            lines: {
                show: true,
                fill: false
            }
        };
        dataset.push(options);
        const crvStats = matsDataUtils.get_err(means, levels); // have to reverse because of data inversion
        const minx = Math.min.apply(null, means);
        const maxx = Math.max.apply(null, means);
        crvStats.minx = minx;
        crvStats.maxx = maxx;
        dataset[curveIndex]['stats'] = crvStats;
    }   // for curves

    // account for error bars on xaxis
    var xmax = xAxisMax + errorMax;
    var xmin = xAxisMin - errorMax;
    const xpad = (xmax - xmin) * 0.2;
    var minx = xmin - xpad;
    var maxx = xmax + xpad;
    var ypad = (yAxisMax - yAxisMin) * 0.2;
    var maxy = yAxisMax + ypad;
    var miny = yAxisMin - ypad;
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
            axisLabelFontSizePixels: 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            min: miny,
            max: maxy
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
            color: 'grey',
            min: minx,
            max: maxx,
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: xAxisLabel.length > 40 ? 16 : 26,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 20,
        }],
        xaxis: {
            zoomRange: [0.1, 10],
            //max: xAxisMax > 0 ? xAxisMax * 1.6 : xAxisMax * 0.6,
            max: maxx,
            //min: xAxisMin < 0 ? xAxisMin * 1.6 : xAxisMin * 0.6
            min: minx
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
    //dataset.push({color: 'black', points: {show: false}, data: [[0, yAxisMin, "zero"], [0, yAxisMax, "zero"]]});
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
