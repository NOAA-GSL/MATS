dataSeriesZoom = function (plotParams, plotFunction) {
    console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var curveDates =  plotParams.dates.split(' - ');
    var fromDateStr = curveDates[0];
    var fromDate = Modules.server.util.dateConvert(fromDateStr);
    var toDateStr = curveDates[1];
    var toDate = Modules.server.util.dateConvert(toDateStr);    var weitemp = fromDate.split("-");
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
    var matchTime = plotParams.matchFormat.indexOf(MatchFormats.time) !== -1;
    var matchLevel = plotParams.matchFormat.indexOf(MatchFormats.level) !== -1;
    var matchSite = plotParams.matchFormat.indexOf(MatchFormats.site) !== -1;
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var dataSource = (curve['data-source']);
        var tmp = CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0].split(',');
        var model = tmp[0];
        var instrument_id = tmp[1];
        var myVariable;
        // variables can be conventional or discriminators. Conventional variables are listed in the variableMap.
        // discriminators are not.
        // we are using existence in variableMap to decide if a variable is conventional or a discriminator.
        var variableMap = CurveParams.findOne({name: 'variable'}).variableMap;
        var isDiscriminator = false;
        myVariable = variableMap[curve['variable']];
        if (myVariable === undefined) {
            myVariable = curve['variable'];
            isDiscriminator = true; // variable is mapped, discriminators are not, this is a discriminator
        }

        var region = CurveParams.findOne({name: 'region'}).optionsMap[curve['region']][0];
        var siteNames = curve['sites'];
        var siteIds = [];
        for (var i = 0; i < siteNames.length; i++) {
            var siteId = SiteMap.findOne({siteName: siteNames[i]}).siteId;
            siteIds.push(siteId);
        }
        var label = (curve['label']);
        var top = Number(curve['top']);
        var bottom = Number(curve['bottom']);
        var color = curve['color'];
        var variableStr = curve['variable'];
        var variableOptionsMap = CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'][PlotTypes.timeSeries];
        var variable = variableOptionsMap[dataSource][variableStr];
        var discriminator = curve['discriminator'];
        var disc_upper = curve['upper'];
        var disc_lower = curve['lower'];
        var forecastLength = curve['forecast-length'];
        var statement = "";
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve - do those after Matching
            if (model.includes("recs")) {
                statement = "select valid_utc as avtime,z," + myVariable + ",sites_siteid " +
                    "from obs_recs as o , " + model +
                    " where  obs_recs_obsrecid = o.obsrecid" +
                    " and instruments_instrid=" + instrument_id +
                    " and valid_utc>=" + Modules.server.util.secsConvert(fromDate) +
                    " and valid_utc<=" + Modules.server.util.secsConvert(toDate);
            } else if (model.includes("hrrr_wfip")) {
                if (isDiscriminator) {
                    statement = "select valid_utc as avtime ,z ," + myVariable + ",sites_siteid" +
                        " from " + model + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where nwps_nwpid=" + instrument_id +
                        " and modelid= modelid_rec" +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and valid_utc >=" + Modules.server.util.secsConvert(fromDate) +
                        " and valid_utc<=" + Modules.server.util.secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper
                } else {
                    statement = "select valid_utc as avtime ,z ," + myVariable + ",sites_siteid  " +
                        "from " + model + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where nwps_nwpid=" + instrument_id +
                        " and modelid= modelid_rec" +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and valid_utc >=" + Modules.server.util.secsConvert(fromDate) +
                        " and valid_utc<=" + Modules.server.util.secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper
                }
            } else {
                statement = "select valid_utc as avtime ,z ," + myVariable + ",sites_siteid  " +
                    "from " + model + ", nwp_recs  " +
                    " where nwps_nwpid=" + instrument_id +
                    " and nwp_recs_nwprecid=nwprecid" +
                    " and valid_utc >=" + Modules.server.util.secsConvert(fromDate) +
                    " and valid_utc<=" + Modules.server.util.secsConvert(toDate) +
                    " and fcst_end_utc=" + 3600 * forecastLength;
            }
            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ") order by avtime";
            console.log("statement: " + statement);
            var queryResult = Modules.server.wfip2.queryWFIP2DB(wfip2Pool,statement, top, bottom, myVariable, isDiscriminator);

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
            
            curves[curveIndex]['queryResult'] = queryResult; // save raw data for matching
            var levelCompleteness = curve['level-completeness'];
            var siteCompleteness = curve['site-completeness'];
            var levelBasis = _.union.apply(_, queryResult.allLevels);
            var siteBasis = _.union.apply(_, queryResult.allSites);

            var pairData = _.pairs(queryResult.data).sort(function(a,b){ return a[0] - b[0]});
            var normalizedData = pairData.map(function (timeObjPair, index) {   // each timeObj is of the form [time,{sites:{...},timeMean:mean,timeLevels:[],....]
                var value = null;
                var time = Number(timeObjPair[0]);
                var timeObj  = timeObjPair[1];
                var tooltip = label  +
                    "<br>seconds" + time +
                    "<br>time:" +  new Date(Number(time)).toUTCString() +
                    "<br> value:" + value;
                xAxisMin = time < xAxisMin ? time : xAxisMin;
                xAxisMax = time > xAxisMax ? time : xAxisMax;
                if (timeObj == null) {
                    return [time, null, null, tooltip];
                }
                yAxisMin = timeObj.timeMean < yAxisMin ? timeObj.timeMean : yAxisMin;
                yAxisMax = timeObj.timeMean > yAxisMax ? timeObj.timeMean : yAxisMax;

                var sites = Object.keys(timeObj.sites).map(Number);
                var sitesLength = sites.length;
                var includedSites = _.intersection(sites,siteBasis);
                var sitesQuality = (includedSites.length / siteBasis.length) * 100;
                if (sitesQuality < siteCompleteness) {
                    return [time, null, null, tooltip];   //throw this time away, it doesn't have enough sites
                }
                if (levelCompleteness == 0) {
                    value  = timeObj.timeMean.toPrecision(4);
                    tooltip = label  +
                        "<br>seconds" + time +
                        "<br>time:" +  new Date(Number(time)).toUTCString() +
                        "<br> value:" + value;
                    return [time, value, timeObj, tooltip]; // any level count is good
                }
                // still here - have to recalculate mean based on level completeness
                var sum = 0;
                var n = 0;
                for (var si = 0; si < sitesLength; si++) {
                    var sLevels = timeObj.sites[[sites[si]]].levels;
                    var includedLevels = _.intersection(sLevels,levelBasis);
                    var levelsQuality = (includedLevels.length / levelBasis.length) * 100;
                    if (levelsQuality > levelCompleteness) {
                        sum += timeObj.sites[[sites[si]]].sum;
                        n += timeObj.sites[[sites[si]]].numLevels;
                    } // else don't count it in - skip over it, it isn't complete enough
                }
                value = (sum / n).toPrecision(4);
                tooltip = label  +
                    "<br>seconds" + time +
                    "<br>time:" +  new Date(Number(time)).toUTCString() +
                    "<br> value:" + value;
                return [time, value, timeObj, tooltip];   // recalculated mean
            });
        } else {
            //skip difference curves - do them after matching
            var baseCurve = 0;  // eventually this will com from plotParams
            var fromStartTime = dataset[diffFrom][0];
            var baseStartTime = dataset[baseCurveIndex][0];
            var fromEndTime = dataset[diffFrom][dataset[diffFrom].length-1];
            var baseEndTime = dataset[baseCurveIndex][dataset[baseCurveIndex].length-1];
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
                var tooltip = label  +
                    "<br>seconds" + time +
                    "<br>time:" +  new Date(Number(time)).toUTCString() +

                    "<br> diffValue:" + diffValue;

                normalizedData.push([time, diffValue, {}, tooltip]);
            }
        }
        var pointSymbol = Modules.server.wfip2.getPointSymbol (curveIndex);
        var mean = queryResult.mean;
        var options = {
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
    if (curvesLength > 1 && (plotParams['plotAction'] === PlotActions.matched) && (matchLevel || matchSite || matchTime)) {
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
        for (var ci = 0; ci < curvesLength; ci ++) {
            if (curves[ci].diffFrom) {
                break;
            }
        }
        var realCurvesLength = ci;
        for (var rci = 0; rci < realCurvesLength; rci ++) {
            earliestTime = Number((curves[rci].queryResult.allTimes[0] < earliestTime) ? curves[rci].queryResult.allTimes[0] : earliestTime);
            latestTime = Number((curves[rci].queryResult.allTimes[curves[rci].queryResult.allTimes.length -1] >
                latestTime) ? curves[rci].queryResult.allTimes[curves[rci].queryResult.allTimes.length -1] : latestTime);
            minimumInterval = Number((curves[rci].queryResult.minInterval < minimumInterval) ? (curves[rci].queryResult.minInterval) : minimumInterval);
        }

        /* need a moving pointer for each curve data set.
            The data arrays for the curves may not all start at the same time for each curve
            so we skip incrementing the data index for any curve that has
            not yet had any time element defined for this time.
            The indexes are initialized to -1 so that the first time in a curve data array will cause the index to be 0.
            There shouldn't be any holes because the QueryDB should have filled them in.
         */
        var dataIndexes = {};
        for (ci = 0; ci < curvesLength; ci ++) {
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
                        var queryResultDataTime = curves[ci].queryResult.data[time];
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

   // squeeze out surplus nulls.
    var squeezedData = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) { //iterate the curves in the dataset
        squeezedData = [];
        var value = dataset[dsi].data[0][1];
        var previousValue = value;
        for (var dsci = 0; dsci < dataset[dsi].data.length; dsci++) { //iterate the times in the curve dataset
            value = dataset[dsi].data[dsci][1];
            if (previousValue == null && value == null) {
                continue;
            }
            squeezedData.push(dataset[dsi].data[dsci]);
            previousValue = value;
        }
        dataset[dsi].data = squeezedData;
    }


    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
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
            min: yAxisMin * 0.95,
            max: yAxisMax * 0.95
        };
        var yaxisOptions = {
            zoomRange: [0.1, 10]
        };
        yaxes.push(yaxesOptions);
        yaxis.push(yaxisOptions);
    }

    var options = {
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
                lineWidth: Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
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

    dataset.push(dataZero = {
        annotation: "",
        color: 'black',
        points: {show: false},
        data: [[xAxisMin, 0, "zero"], [xAxisMax, 0, "zero"]]
    });

    var result = {
        error: error,
        data: dataset,
        options: options
    };
    //console.log("result", JSON.stringify(result,null,2));
    plotFunction(result);
};