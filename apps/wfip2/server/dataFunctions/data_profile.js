import { matsCollections } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsDataUtils } from 'meteor/randyp:mats-common';
import { matsWfipUtils } from 'meteor/randyp:mats-common';
import { mysql } from 'meteor/pcel:mysql';
import { moment } from 'meteor/momentjs:moment';


dataProfile = function (plotParams, plotFunction) {
    console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {}; // used to store data queries 
    var wfip2Settings = matsCollections.Databases.findOne({role:"wfip2_data",status:"active"},{host:1,user:1,password:1,database:1,connectionLimit:1});
    var wfip2Pool = mysql.createPool(wfip2Settings);
    wfip2Pool.on('connection', function (connection) {
        connection.query('set group_concat_max_len = 4294967295')
    });
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
    // var matchTime = plotParams.matchFormat.indexOf(matsTypes.MatchFormats.time) !== -1;
    // var matchLevel = plotParams.matchFormat.indexOf(matsTypes.MatchFormats.level) !== -1;
    // var matchSite = plotParams.matchFormat.indexOf(matsTypes.MatchFormats.site) !== -1;
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var dataSource = (curve['data-source']);
        var tmp = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0].split(',');
        var model = tmp[0];
        var instrument_id = tmp[1];
        var myVariable;
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
        var forecastLength = curve['forecast-length'];
        var curveDates = curve['curve-dates'];
        var curveDatesDateRangeFrom = curveDates.split(' - ')[0]; // get the from part
        var curveDatesDateRangeTo = curveDates.split(' - ')[1]; // get the to part
        var statistic = curve['statistic'];
        var statement;
        if (diffFrom == null) {
            if (model.includes("recs")) {  //obs
                statement = "select valid_utc as avtime,z," + myVariable + ",sites_siteid"  +
                    " from obs_recs as o ," + model + "   as s " +
                    //" where valid_utc=1454526000 " +
                    " where valid_utc >= " + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                    " and valid_utc <= " + matsDataUtils.secsConvert(curveDatesDateRangeTo) +
                    " and obs_recs_obsrecid = o.obsrecid " +
                    " and instruments_instrid=" + instrument_id;
            } else {//model
                statement = "select valid_utc as avtime,z," + myVariable + ",sites_siteid" +
                    " from " + model + ", nwp_recs  " +
                    "where valid_utc>= " + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                    " and analysis_utc+fcst_end_utc>=" + matsDataUtils.secsConvert(curveDatesDateRangeFrom) +
                    "  and valid_utc<= " + matsDataUtils.secsConvert(curveDatesDateRangeTo) +
                    " and analysis_utc+fcst_end_utc <=" + matsDataUtils.secsConvert(curveDatesDateRangeTo) +
                    " and nwps_nwpid= " + instrument_id +
                    " and nwp_recs_nwprecid=nwprecid " +
                    " and fcst_end_utc=" + 3600 * forecastLength;
            }
            statement = statement + "  and sites_siteid in (" + siteIds[curveIndex].toString() + ")";
            console.log("query=" + statement);
            dataRequests[curve.label] = statement;
            var queryResult = matsWfipUtils.queryWFIP2DB(wfip2Pool,statement, top, bottom, myVariable, isDiscriminator);
            /*
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
            curves[curveIndex]['queryResult'] = queryResult; // save raw data for matching
            var levelCompleteness = curve['level-completeness'];
            var siteCompleteness = curve['site-completeness'];
            var levelBasis = _.union.apply(_, queryResult.allLevels);
            var siteBasis = _.union.apply(_, queryResult.allSites);
            var levelValues = {};
            var allTimes = queryResult.allTimes;
            for (var t=0; t < allTimes.length; t++) {
                var time = allTimes[t];
                var timeObj = queryResult.data[time];
                var sites = Object.keys(timeObj.sites).map(Number);
                var sitesLength = sites.length;
                var includedSites = _.intersection(sites,siteBasis);
                var sitesQuality = (includedSites.length / siteBasis.length) * 100;
                if (sitesQuality > siteCompleteness) {
                    // time is qualified for sites, count the qualified levels
                    for (var si = 0; si < sitesLength; si++) {
                        var sLevels = timeObj.sites[[sites[si]]].levels;
                        var sValues = timeObj.sites[[sites[si]]].values;
                        var includedLevels = _.intersection(sLevels, levelBasis);
                        var levelsQuality = (includedLevels.length / levelBasis.length) * 100;
                        if (levelsQuality > levelCompleteness) {
                            for (var l = 0; l < sLevels.length; l++) {
                                if (levelValues[sLevels[l]] === undefined) {
                                    levelValues[sLevels[l]] = [];
                                }
                                levelValues[sLevels[l]].push(sValues[l]);
                            }
                        } // else don't count it in - skip over it, it isn't complete enough
                    }
                }
            }
            // now we have levelValues qualified by site and level completeness
            // now get levelStats

            var levelStats = {};
            var qualifiedLevels = Object.keys(levelValues);
            for (l = 0; l < qualifiedLevels.length; l++) {
                var sum = _.reduce(levelValues[qualifiedLevels[l]], function(a,b){ return a + b; }, 0);
                var num = levelValues[qualifiedLevels[l]].length;
                var mean = sum / num;
                if (levelStats[qualifiedLevels[l]] === undefined) {
                    levelStats[qualifiedLevels[l]] = {};
                }

                levelStats[qualifiedLevels[l]][statistic] = mean;
            }
        }  // if diffFrom == null

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

            d.push([value,level,-1,{level:level, values:levelValues[level], levelStats:levelStats[level]},tooltip]);
            //d.push([value,level,-1]);
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
