import { matsCollections } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsDataUtils } from 'meteor/randyp:mats-common';
import { matsWfipUtils } from 'meteor/randyp:mats-common';
import { mysql } from 'meteor/pcel:mysql';
import { moment } from 'meteor/momentjs:moment';
const Future = require('fibers/future');


dataProfile = function (plotParams, plotFunction) {
    console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {}; // used to store data queries 
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
    var max_verificationRunInterval = Number.MIN_VALUE;
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        const tmp = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0].split(',');
        curve.dataSource_is_instrument = parseInt(tmp[1]);
        curve.dataSource_tablename = tmp[2];
        curve.verificationRunInterval = tmp[4];
        curve.dataSource_is_json = parseInt(tmp[5]);
        max_verificationRunInterval = Number(curve.verificationRunInterval) > Number(max_verificationRunInterval) ? curve.verificationRunInterval : max_verificationRunInterval;
    }

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var dataSource = curve['data-source'];
        var dataSource_is_instrument = curve.dataSource_is_instrument;
        var dataSource_tablename = curve.dataSource_tablename;
        var verificationRunInterval = curve.verificationRunInterval;
        var dataSource_is_json = curve.dataSource_is_json;

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
        var forecastLength = curve['forecast-length'] === undefined ? matsTypes.InputTypes.unused : curve['forecast-length'];
        forecastLength = forecastLength === matsTypes.InputTypes.unused ? Number(0) : Number(forecastLength);
        var curveDates = curve['curve-dates'];
        var curveDatesDateRangeFrom = curveDates.split(' - ')[0]; // get the from part
        var curveDatesDateRangeTo = curveDates.split(' - ')[1]; // get the to part
        var statistic = curve['statistic'];
        var statement;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve - do those after Matching ..
            if ( dataSource_is_instrument ) {
                const utcOffset = Number(forecastLength * 3600);
                if (dataSource_is_json) {
                    statement = "select (O.valid_utc - (O.valid_utc %  " + verificationRunInterval / 1000 + ")) as avtime, cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom)  + utcOffset) +
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo) + utcOffset) ;
                } else {
                    statement = "select (O.valid_utc - (O.valid_utc %  " + verificationRunInterval / 1000+ ")) as avtime, z," + myVariable + ", sites_siteid from obs_recs as O , " + dataSource_tablename +
                        " where  obs_recs_obsrecid = O.obsrecid" +
                        " and valid_utc>=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeFrom)  + utcOffset) +
                        " and valid_utc<=" + Number(matsDataUtils.secsConvert(curveDatesDateRangeTo) + utcOffset)
                }
                // data source is a model and its JSON
            } else {
                if (dataSource_is_json) {
                    statement = "select (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + dataSource_tablename +
                        " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                        " and fcst_utc_offset =" + 3600 * forecastLength +
                        " and (cycle_utc + fcst_utc_offset) >=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                        " and (cycle_utc + fcst_utc_offset) <=" + matsDataUtils.secsConvert(curveDatesDateRangeTo);
                } else {
                    statement = "select (cycle_utc + fcst_utc_offset) as avtime ,z ," + myVariable + ", sites_siteid  " +
                        "from " + dataSource_tablename + " as D, nwp_recs as N" +
                        " where D.nwp_recs_nwprecid=N.nwprecid" +
                        " and fcst_utc_offset =" + 3600 * forecastLength +
                        " and (cycle_utc + fcst_utc_offset) >=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                        " and (cycle_utc + fcst_utc_offset) <=" + matsDataUtils.secsConvert(curveDatesDateRangeTo);
                }
            }


            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ")  order by avtime";
            //console.log("statement: " + statement);
            dataRequests[curve.label] = statement;
            var queryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, dataSource_is_json, discriminator, disc_lower, disc_upper );
            if (queryResult.error !== undefined && queryResult.error !== "") {
                error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>" ;
                throw (new Error(error));
            }
            var truthQueryResult = queryResult;

            // for mean calulations we do not have a truth curve.
            if (statistic != "mean") {
                // need a truth data source for statistic
                var truthDataSource = curve['truth-data-source'];
                var tmp = matsCollections.CurveParams.findOne({name: 'truth-data-source'}).optionsMap[curve['truth-data-source']][0].split(',');
                var truthDataSource_is_instrument = tmp[1];
                var truthDataSource_tablename = tmp[2];
                var truthRunInterval = tmp[4];
                var truthDataSource_is_json = tmp[5];
                maxRunInterval = truthRunInterval > verificationRunInterval ? truthRunInterval : verificationRunInterval;
                maxValidInterval = maxValidInterval > maxRunInterval ? maxValidInterval : maxRunInterval;

                statement = "select has_discriminator('" + truthDataSource.toString() + "') as hd";
                //console.log("statement: " + statement);
                dFuture = new Future();
                dFuture['hd'] = 0;
                wfip2Pool.query(statement, function (err, rows) {
                    if (err != undefined) {
                        throw( new Error("data series error = has_discriminator error: " + err.message) );
                    } else {
                        dFuture['hd'] = rows[0]['hd'];
                    }
                    dFuture['return']();
                });
                dFuture.wait();
                if (truthDataSource_is_instrument) {
                    if (truthDataSource_is_json) {
                        statement = "select (O.valid_utc - (O.valid_utc %  " + verificationRunInterval / 1000 + ")) as avtime, cast(data AS JSON) as data, sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                            " where  obs_recs_obsrecid = O.obsrecid" +
                            " and valid_utc>=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                            " and valid_utc<=" + matsDataUtils.secsConvert(curveDatesDateRangeTo);
                    } else {
                        statement = "select (O.valid_utc - (O.valid_utc %  " + verificationRunInterval / 1000 + ")) as avtime, z," + myVariable + ", sites_siteid from obs_recs as O , " + truthDataSource_tablename +
                            " where  obs_recs_obsrecid = O.obsrecid" +
                            " and valid_utc>=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                            " and valid_utc<=" + matsDataUtils.secsConvert(curveDatesDateRangeTo);
                    }
                } else {
                    if (dataSource_is_json) {
                        statement = "select (cycle_utc + fcst_utc_offset) as avtime, cast(data AS JSON) as data, sites_siteid from nwp_recs as N , " + truthDataSource_tablename +
                            " as D where D.nwp_recs_nwprecid = N.nwprecid" +
                            " and (cycle_utc + fcst_utc_offset) >=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                            " and (cycle_utc + fcst_utc_offset) <=" + matsDataUtils.secsConvert(curveDatesDateRangeTo) +
                            " and fcst_utc_offset =" + 3600 * forecastLength;
                    } else {
                        statement = "select (cycle_utc + fcst_utc_offset) as avtime ,z ," + myVariable + ", sites_siteid  " +
                            "from " + truthDataSource_tablename + " as D, nwp_recs as N" +
                            " where D.nwp_recs_nwprecid=N.nwprecid" +
                            " and (cycle_utc + fcst_utc_offset) >=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                            " and (cycle_utc + fcst_utc_offset) <=" + matsDataUtils.secsConvert(curveDatesDateRangeTo);
                    }


                    statement = statement + " and sites_siteid in (" + siteIds.toString() + ") order by avtime";
                    //console.log("statement: " + statement);
                    dataRequests[curve.label] = statement;
                    truthQueryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool, statement, top, bottom, myVariable, truthDataSource_is_json, discriminator, disc_lower, disc_upper);
                    if (truthQueryResult.error !== undefined && truthQueryResult.error !== "") {
                        throw ( new Error(truthQueryResult.error) );
                    }
                }
            }            /*
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

             we need this structure where the values are qualified by site and level completeness.
             levelValues: {
                 l1: [val1, val2, val3, .... valn],
                 l2: [val1, val2, val3, .....valn],
                 .
                 .
                 .
                 ln: [val1,val2,val3, ..... valn
             }

             from this we derive ....
             levelStats : {
                 20: {
                     mean: m,
                     bias: b,
                     rmse : r,
                     mae: ma
                 },
                 40: {...},
                 60: {...},
                 .
                 .
                 .
                 ln: {...}
             }

             */

            var levelCompleteness = curve['level-completeness'];
            var siteCompleteness = curve['site-completeness'];
            var levelBasis = queryResult.levelsBasis;
            var siteBasis = queryResult.sitesBasis;
            if (statistic != "mean") {
                // have to consider the truth curve when determining the basis if we are doing stats other than mean
                var truthLevelBasis = truthQueryResult.levelsBasis;
                var truthSiteBasis = truthQueryResult.sitesBasis;
                levelBasis = _.union(levelBasis,truthLevelBasis);
                siteBasis = _.union(siteBasis,truthSiteBasis);
            }
            var verificationLevelValues = {};
            var truthLevelValues = {};
            var allTimes;
            if (statistic == "mean") {
                allTimes = queryResult.allTimes;
            } else {
                allTimes = _.intersection(queryResult.allTimes,truthQueryResult.allTimes)
            }
            for (var t=0; t < allTimes.length; t++) {
                /*
                If statistic is not "mean" then we need a set of truth values to diff from the verification values.
                The sites and levels have to match for the truth to make any sense.
                 */
                var time = allTimes[t];
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
            switch (statistic) {
                case "bias":
                case "mae":
                    // bias and mae are almost the same.... mae just absolutes the difference
                    // find siteLevelBias and sum it in
                    try {
                        for (l = 0; l < qualifiedLevels.length; l++) {
                            statNum = 0;
                            statSum =0;
                            values = verificationLevelValues[qualifiedLevels[l]];
                            truthValues = truthLevelValues[qualifiedLevels[l]];
                            for (vIndex = 0; vIndex < values.length; vIndex++) {
                                if (statistic == "mae") {
                                    statValue = Math.abs(values[vIndex] - truthValues[vIndex]);
                                } else {
                                    statValue = values[vIndex] - truthValues[vIndex];
                                }
                                statSum += statValue;
                                statNum++;
                            }
                            if (levelStats[qualifiedLevels[l]] === undefined) {
                                levelStats[qualifiedLevels[l]] = {};
                            }
                            levelStats[qualifiedLevels[l]][statistic] = statSum/statNum;
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
                            statSum =0;
                            values = verificationLevelValues[qualifiedLevels[l]];
                            truthValues = truthLevelValues[qualifiedLevels[l]];
                            for (vIndex = 0; vIndex < values.length;vIndex++) {
                                statValue = values[vIndex] - truthValues[vIndex];
                                statValue = Math.pow((values[vIndex] - truthValues[vIndex]),2);  // square the difference
                                statSum += statValue;
                                statNum++;
                            }
                            if (levelStats[qualifiedLevels[l]] === undefined) {
                                levelStats[qualifiedLevels[l]] = {};
                            }
                            levelStats[qualifiedLevels[l]][statistic] = Math.sqrt(statSum/statNum);
                        }
                    } catch (ignore) {
                        statValue = null;
                    }
                    break;
                case "mean":
                default:
                    try {
                        statNum = 0;
                        statSum =0;
                        for (l = 0; l < qualifiedLevels.length; l++) {
                            statSum = _.reduce(verificationLevelValues[qualifiedLevels[l]], function(a,b){ return a + b; }, 0);
                            statNum = verificationLevelValues[qualifiedLevels[l]].length;
                            if (levelStats[qualifiedLevels[l]] === undefined) {
                                levelStats[qualifiedLevels[l]] = {};
                            }
                            levelStats[qualifiedLevels[l]][statistic] = statSum/statNum;
                        }
                    } catch (ignore) {
                    }
                    break;
            }
            var d = [];
            var levels = Object.keys(levelStats);
            for (l =0; l < levels.length; l++) {
                var level = levels[l];
                var value = levelStats[level][statistic];
                xAxisMin = xAxisMin < value ? xAxisMin : value;
                xAxisMax = xAxisMax > value ? xAxisMax : value;
                yAxisMin = yAxisMin < level ? yAxisMin : level;
                yAxisMax = yAxisMax > level ? yAxisMax : level;
                var tooltip = label  +
                    "<br>level: " + level +
                    "<br>statistic: " +  statistic +
                    "<br> value: " + value;
                d.push([value,level,-1,{level:level, statistic:statistic, values:{verification:verificationLevelValues[level], truth:truthLevelValues[level]}, levelStats:levelStats[level]},tooltip]);
            } // end  if diffFrom == null
        }  else { // difference curve
            var minuendIndex = diffFrom[0];
            var subtrahendIndex = diffFrom[1]; // base curve
            var minuendData = dataset[minuendIndex].data;
            var subtrahendData = dataset[subtrahendIndex].data;
            var minuendLevelValues = {};
            var minuendLevels = [];
            var minuendStatistic = null;
            var subtrahendStatistic = null;
            var i;
            var level;
            var value;
            for (i = 0; i < minuendData.length; i ++) {
                level = minuendData[i][1];
                value = minuendData[i][0];
                if (!minuendStatistic) {
                    minuendStatistic =  minuendData[i][3].statistic;
                }
                minuendLevels.push(level);
                minuendLevelValues[level] = value;
            }
            var subtrahendLevels = [];
            var subtrahendLevelValues = {};
            for (i = 0; i < subtrahendData.length; i ++) {
                level = subtrahendData[i][1];
                value = subtrahendData[i][0];
                if (!subtrahendStatistic) {
                    subtrahendStatistic = subtrahendData[i][3].statistic;
                }
                subtrahendLevels.push(level);
                subtrahendLevelValues[level] = value;
            }
            var d = [];
            var commonLevels = _.intersection(subtrahendLevels,minuendLevels);
            for (i = 0; i < commonLevels.length; i++){
                level = commonLevels[i];
                value = minuendLevelValues[level] - subtrahendLevelValues[level];
                xAxisMin = xAxisMin < value ? xAxisMin : value;
                xAxisMax = xAxisMax > value ? xAxisMax : value;
                yAxisMin = yAxisMin < level ? yAxisMin : level;
                yAxisMax = yAxisMax > level ? yAxisMax : level;
                var tooltip = label  +
                    "<br>level: " + level +
                    "<br>minuend statistic: " + minuendStatistic +
                    "<br>subtrahend statistic: " + subtrahendStatistic +
                    "<br> diff value: " + value;
                d.push([value,level,-1,{level:level, values:{minuend:minuendLevelValues[level], subtrahend:subtrahendLevelValues[level]}, levelStats:{minuend:minuendStatistic,subtrahend:subtrahendStatistic}},tooltip]);
            }
        }

        var pointSymbol = matsWfipUtils.getPointSymbol (curveIndex);
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
                    upperCap: "-",
                    lowerCap: "-",
                    color: color,
                    radius: 1
                }
            },
            lines: {
                show: true,
                fill: false
            }
        };
        dataset.push(options);
    }   // for curves


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
            axisLabel: variableStr,
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
    // add black 0 line curve
    dataset.push( {color:'black',points:{show:false},data:[[0,yAxisMin,"zero"],[0,yAxisMax,"zero"]]});
    var result = {
        error: error,
        data: dataset,
        options: pOptions,
        basis:{
            plotParams:plotParams,
            queries:dataRequests
        }
    };
    plotFunction(result);
};
