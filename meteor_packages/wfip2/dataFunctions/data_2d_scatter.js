var sortFunction = function (a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
};

var add = function (a,b) {
    return a + b;
};

var max = function(vals) {
    var m = Number.MIN_SAFE_INTEGER;
    for (var i = 0; i < vals.length; i++) {
        m = m > vals[i] ? m : vals[i];
    }
    return m;
};

var min = function(vals) {
    var m = Number.MAX_SAFE_INTEGER;
    for (var i = 0; i < vals.length; i++) {
        m = m < vals[i] ? m : vals[i];
    }
    return m;
};

var dateConvert = function (dStr) {
    if (dStr === undefined || dStr === " ") {
        var now = new Date();
        var date = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        var yr = date.getFullYear();
        var day = date.getDate();
        var month = date.getMonth();
        var dstr = yr + "-" + month + '-' + day;
        return dstr;
    }
    var dateArray = dStr.split('/');
    var month = dateArray[0];
    var day = dateArray[1];
    var yr = dateArray[2];
    var dstr = yr + "-" + month + '-' + day;
    return dstr;
};

var secsConvert = function (dStr) {
    if (dStr === undefined || dStr === " ") {
        var now = new Date();
        var date = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        var date_in_secs = date.getTime();
        var yr = date.getFullYear();
        var day = date.getDate();
        var month = date.getMonth();
    }
    else {
        var dateArray = dStr.split('-');
        var month = dateArray[1];
        var day = dateArray[2];
        var yr = dateArray[0];
        var my_date = new Date(yr, month - 1, day, 0);
        // to UTC time, not local time
        var date_in_secs = my_date.getTime();
    }
    // to UTC time, not local time
    //return date_in_secs/1000 -3600*6;
    return date_in_secs / 1000;
};

var getDatum = function (rawAxisData, axisTime, levelCompletenessX, levelCompletenessY, siteCompletenessX, siteCompletenessY,
                         levelBasisX, levelBasisY, siteBasisX, siteBasisY) {
    // sum and average all of the means for all of the sites
    var datum = {};
    var commonSitesBasisLengthX = siteBasisX.length;
    var commonSitesBasisLengthY = siteBasisY.length;
    var tSitesX = rawAxisData['xaxis']['data'][axisTime];
    var tSitesY = rawAxisData['yaxis']['data'][axisTime];
    // Do we have enough sites (based on the quality) for this time to qualify the data for this time? We need to have enough for x AND y
    var sitesXQuality = (Object.keys(tSitesX).length / commonSitesBasisLengthX) * 100;
    if (sitesXQuality < siteCompletenessX) {
        return []; // reject this site (it does not qualify for x axis) for this time
    }
    var sitesYQuality = (Object.keys(tSitesY).length / commonSitesBasisLengthY) * 100;
    if (sitesYQuality < siteCompletenessY) {
        return []; // reject this site (it does not qualify for y axis) for this time
    }

    // still here? process the sites
    var axisArr = ['xaxis', 'yaxis'];
    for (var ai = 0; ai < axisArr.length; ai++) {
        var axisStr = axisArr[ai];
        var tSiteIds = Object.keys(tSitesX);
        var commonLevelsBasisLength = levelBasisX.length;
        var qualityLevels = levelCompletenessX;
        if (axisArr[ai] == 'yaxis') {
            tSiteIds = Object.keys(tSitesY);
            commonLevelsBasisLength = levelBasisY.length;
            qualityLevels = levelCompletenessY;
        }
        var siteSum = 0;
        var siteNum = 0;
        var filteredSites = [];   // used for the modal data view
        for (var si = 0; si < tSiteIds.length; si++) {
            var siteId = tSiteIds[si];
            var siteMean = 0;
            if (qualityLevels == 0) {  // no need to recalculate if everything is accepted i.e. quality = 0
                siteSum += rawAxisData[axisStr]['data'][axisTime][siteId]['mean'];
                siteNum +=  rawAxisData[axisStr]['data'][axisTime][siteId]['numLevels'];
                filteredSites = rawAxisData[axisStr]['data'][axisTime];
                //combine the levels and the values into single array (for using in the modal data view)
                filteredSites[siteId].levelsValues = filteredSites[siteId].levels.map(function(level, index) { return [level, filteredSites[siteId].values[index]] });
                rawAxisData[axisStr]['data'][axisTime][siteId].levelsValues = filteredSites[siteId].levelsValues;
            } else {
                // quality filter is required (>0)  so we have to recalculate the statistics for this site for qualified levels
                // recalculate sMean for filtered levels
                var sLevels = rawAxisData[axisStr]['data'][axisTime][siteId]['levels'];
                //combine the levels and the values into single array (for using in the modal data view) - raw values - unfiltered
                rawAxisData[axisStr]['data'][axisTime][siteId].levelsValues = rawAxisData[axisStr]['data'][axisTime][siteId].levels.map(function(level, index) { return [level, rawAxisData[axisStr]['data'][axisTime][siteId].values[index]] });

                // What we really want is to put in a quality control
                // that says "what percentage of the commonSitesBasis set of levels does the Levels for this site and time need to be
                // in order to qualify the data?" In other words, throw away any data that doesn't meet the quality criteria.
                var matchQuality = (sLevels.length / commonLevelsBasisLength) * 100;
                if (matchQuality < qualityLevels) {
                    continue;
                }
                var sValues = rawAxisData[axisStr]['data'][axisTime][siteId]['values'];
                filteredSites[siteId].levelsValues = filteredSites[siteId].levels.map(function(level, index) { return [level, filteredSites[siteId].values[index]] });
                for (var li = 0; li < sLevels.length; li++) {
                    siteSum += sValues[li];
                    siteNum++;
                }
            }
        }

        siteMean = siteSum / siteNum;
        datum[axisStr + '-mean'] = siteMean;
        datum[axisStr + '-sites'] = rawAxisData[axisStr]['data'][axisTime];  // used to get levelsValues from raw data for data modal
        datum[axisStr + '-filteredSites'] = filteredSites;
    }
    return datum;
};

var queryWFIP2DB = function (statement, top, bottom, myVariable, isDiscriminator) {
    var dFuture = new Future();
    var error = "";
    var resultData = {};
    var minInterval = Number.MAX_VALUE;
    var allSiteIds = [];
    var allLevels = [];
    var allTimes = [];
    wfip2Pool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = 'No data to plot: ' + err;
            // done waiting - error condition
            dFuture['return']();
        } else {
                /*
                 We must map the query result to a data structure like this...
                 var resultData = {
                         time0: {
                             site0: {  // times are in seconds and are unique - they are huge though so we use a map, instead of an array
                                 levels: [],
                                 values: [],
                                 sum: 0;
                                 mean: 0;
                                 numLevels: numLevels;
                                 max: max;
                                 min: min
                             },
                             site1: {
                                 .
                                 .
                             },
                             .
                             .
                             site2: {
                                 .
                                 .
                             }
                             },
                        time1:{
                            ....
                        },
                             .
                             .
                        timen:{
                              ...
                             },
                 };
            */
                var time = 0;
                var lastTime = 0;
                var rowIndex;
                var allSitesSet = new Set();

                for (rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    time = Number(rows[rowIndex].avtime) * 1000;  // convert milli to second
                    var interval = time - lastTime;
                    if (interval !== 0 && interval < minInterval) {  // account for the same times in a row
                        minInterval = interval;
                    }
                    lastTime = time;
                    var siteid = rows[rowIndex].sites_siteid;
                    allSitesSet.add(siteid);
                    var values = [];
                    var levels = [];
                    if (isDiscriminator)  {
                        // discriminators do not return arrays of values
                        levels = JSON.parse(rows[rowIndex].z);
                        values = [Number(rows[rowIndex][myVariable])];
                    } else {
                        // conventional variable
                        levels = JSON.parse(rows[rowIndex].z);
                        values = JSON.parse(rows[rowIndex][myVariable]);
                    }
                    // apply level filter, remove any levels and corresponding values that are not within the boundary.
                    // there are always the same number of levels as values, they correspond one to one (in database).
                    // filter backwards so the the level array is safely modified.
                    for (var l = levels.length - 1; l >= 0; l--) {
                        var lvl = levels[l];
                        if (lvl < bottom || lvl > top) {
                            levels.splice(l,1);
                            values.splice(l,1);
                        }
                    }
                    allLevels.push(levels);  // array of level arrays - two dimensional
                    var sum = values.reduce(add,0);
                    var numLevels = levels.length;
                    var mean = sum / numLevels;
                    if(resultData[time] === undefined) {
                        resultData[time] = {};
                    }
                    if (resultData[time][siteid] === undefined) {
                        resultData[time][siteid] = {};
                    }
                    resultData[time][siteid].levels = levels;
                    resultData[time][siteid].values = values;
                    resultData[time][siteid].sum = sum;
                    resultData[time][siteid].numLevels = numLevels;
                    resultData[time][siteid].mean = mean;
                    resultData[time][siteid].max = max(values);
                    resultData[time][siteid].min = min(values);
                }
                // fill in missing times - there must be an entry at each minInterval
                // if there are multiple entries for a given time average them into one time entry
                // get an array of all the times for every site
                allSiteIds = Array.from(allSitesSet);
                allTimes = Object.keys(resultData);

                for (var k = 0; k < allTimes.length -1; k++) {
                    time = Number(allTimes[k]);
                    var nextTime = allTimes[k+1];
                    while ((nextTime - time) > minInterval) {
                        time = time + minInterval;
                        resultData[time] = null;
                    }
                }
                dFuture['return']();
            }
    });

    // wait for future to finish
    dFuture.wait();
    return {
        error: error,
        data: resultData,
        allLevels: allLevels,
        allSites: allSiteIds,
        allTimes: allTimes,
        minInterval: minInterval
    };
};

data2dScatter = function (plotParams, plotFunction) {
    console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var fromDate = dateConvert(plotParams.fromDate);
    var toDate = dateConvert(plotParams.toDate);
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var curveKeys = Object.keys(curves[0]);
    var axisLabelList = curveKeys.filter(function (key) {
        return key.indexOf('axis-label') === 1;
    });

    // used to find the max and minimum for the axis
    var xAxisMax = Number.MIN_VALUE;
    var xAxisMin = Number.MAX_VALUE;
    var yAxisMax = Number.MIN_VALUE;
    var yAxisMin = Number.MAX_VALUE;

    var bf = [];   // used for bestFit data

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var rawAxisData = {};
        var curve = curves[curveIndex];

        for (var axisIndex = 0; axisIndex < axisLabelList.length; axisIndex++) {
            var axis = axisLabelList[axisIndex].split('-')[0];
            var dataSource = (curve[axis + '-' + 'data source']);
            // each axis has a data source - get the right data source and derive the model
            var tmp = CurveParams.findOne({name: 'data source'}).optionsMap[dataSource][0].split(','); 
            var model = tmp[0];
            var instrument_id = tmp[1];
            var myVariable;
            // variables can be conventional or discriminators. Conventional variables are listed in the variableMap.
            // discriminators are not.
            // we are using existence in variableMap to decide if a variable is conventional or a discriminator.
            var variableMap = CurveParams.findOne({name: 'variable'}).variableMap;
            var isDiscriminator = false;
            myVariable = variableMap[curve[axis + '-variable']];
            if (myVariable === undefined) {
                myVariable = curve[axis + '-variable'];
                isDiscriminator = true; // variable is mapped, discriminators are not, this is a discriminator
            }
            var region = CurveParams.findOne({name: 'region'}).optionsMap[curve[axis + '-' + 'region']][0];
            var siteNames = curve[axis + '-' + 'sites'];
            var siteIds = [];
            for (var i = 0; i < siteNames.length; i++) {
                var siteId = SiteMap.findOne({siteName: siteNames[i]}).siteId;
                    siteIds.push(siteId);
            }
            var label = (curve['label']);    // label should be same for all the axis
            var top = Number(curve[axis + '-' + 'top']);
            var bottom = Number(curve[axis + '-' + 'bottom']);
            var color = curve['color'];  // color should be same for all axis
            var variableStr = curve[axis + '-' + 'variable'];
            var variableOptionsMap = CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'][PlotTypes.scatter2d];
            var variable = variableOptionsMap[dataSource][variableStr];
            var discriminator = curve[axis + '-' + 'discriminator'];
            var disc_upper = curve[axis + '-' + 'upper'];
            var disc_lower = curve[axis + '-' + 'lower'];
            var forecastLength = curve[axis + '-' + 'forecast length'];
            curves[curveIndex].variableStat = variableStr + ":"; // stash the variableStat to use it later for axis options
            var d = [];
            var statement = '';
            if (model.includes("recs")) {
                statement = "select valid_utc as avtime,z, " + myVariable + " ,sites_siteid " +
                    "from obs_recs as o , " + model +
                    " where  obs_recs_obsrecid = o.obsrecid" +
                    " and instruments_instrid=" + instrument_id +
                    " and valid_utc>=" + secsConvert(fromDate) +
                    " and valid_utc<=" + secsConvert(toDate);
            } else if (model.includes("hrrr_wfip")) {
                if (isDiscriminator) {
                    statement = "select valid_utc as avtime ,z , " + myVariable + " ,sites_siteid"  +
                        " from " + model + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where nwps_nwpid=" + instrument_id +
                        " and modelid= modelid_rec" +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and valid_utc >=" + secsConvert(fromDate) +
                        " and valid_utc<=" + secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper;
                } else {
                    statement = "select valid_utc as avtime ,z , " + myVariable + " ,sites_siteid  " +
                        "from " + model + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where nwps_nwpid=" + instrument_id +
                        " and modelid= modelid_rec" +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and valid_utc >=" + secsConvert(fromDate) +
                        " and valid_utc<=" + secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper;
                }
            } else {
                statement = "select valid_utc as avtime ,z , " + myVariable + " ,sites_siteid  " +
                    "from " + model + ", nwp_recs  " +
                    " where nwps_nwpid=" + instrument_id +
                    " and nwp_recs_nwprecid=nwprecid" +
                    " and valid_utc >=" + secsConvert(fromDate) +
                    " and valid_utc<=" + secsConvert(toDate) +
                    " and fcst_end_utc=" + 3600 * forecastLength;
            }
            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ") order by avtime";
            console.log("statement: " + statement);
            var queryResult = queryWFIP2DB(statement, top, bottom, myVariable, isDiscriminator);
            rawAxisData[axis] = queryResult;
        }   // for axis loop



        /* What we really want to end up with for each curve is an array of arrays where each element has a time and an average of the corresponding values.
         data = [ [time, value] .... [time, value] ] // where value is an average based on criterion, such as which sites have been requested?,
         and what are the level boundaries?, and what are the time boundaries?. Levels and times have been built into the query but sites still
         need to be accounted for here. Also there can be missing times so we need to iterate through each set of times and fill in missing ones
         based on the minimum interval for the data set.

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
             minInterval: minInterval
         }
          where ....
         resultData = {
                time0: {
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
                        siten:{...}
                },
                time1:{....},
                .
                .
                timen:{....}
         }
         where each site has been filled (nulls where missing) with all the times available for the data set, based on the minimum time interval.
         There is at least one real (non null) value for each site.
         */



        // used for getDatum
        var levelCompletenessX = curve['xaxis-level completeness'];
        var levelCompletenessY = curve['xaxis-level completeness'];
        var siteCompletenessX = curve['xaxis-site completeness'];
        var siteCompletenessY = curve['yaxis-site completeness'];
        var levelBasisX = _.union.apply(_,rawAxisData['xaxis'].allLevels);
        var levelBasisY = _.union.apply(_,rawAxisData['yaxis'].allLevels);
        var siteBasisX = _.union.apply(_,rawAxisData['xaxis'].allSites);
        var siteBasisY = _.union.apply(_,rawAxisData['yaxis'].allSites);

        // normalize data

        var normalizedAxisData = [];
        var xaxisIndex = 0;
        var yaxisIndex = 0;
        var xaxisTimes = rawAxisData['xaxis']['allTimes'];
        var yaxisTimes = rawAxisData['yaxis']['allTimes'];
        var xaxisLength = xaxisTimes.length;
        var yaxisLength = yaxisTimes.length;
        // synchronize datasets:
        // Only push to normalized data if there exists a time for both axis. Skip up until that happens.
        var yaxisTime;
        var xaxisTime;
        var datum = {};
        while (xaxisIndex < xaxisLength  && yaxisIndex < yaxisLength) {
            xaxisTime = xaxisTimes[xaxisIndex];
            yaxisTime = yaxisTimes[yaxisIndex];
            var tooltipText;
            var rawXSites;
            var filteredXSites;
            var rawYSites;
            var filteredYSites;
            var time;
            var seconds;
            var xValue;
            var yValue;
            if (xaxisTime === yaxisTime) {
                if (rawAxisData['xaxis']['data'][xaxisTime] !== null && rawAxisData['yaxis']['data'][yaxisTime] !== null) {
                    datum = getDatum(rawAxisData, xaxisTime, levelCompletenessX, levelCompletenessY, siteCompletenessX, siteCompletenessY,
                                             levelBasisX, levelBasisY, siteBasisX, siteBasisY);
                    xAxisMax = datum['xaxis-mean'] > xAxisMax ? datum['xaxis-mean'] : xAxisMax;
                    xAxisMin = datum['xaxis-mean'] < xAxisMin ? datum['xaxis-mean'] : xAxisMin;
                    yAxisMax = datum['yaxis-mean'] > yAxisMax ? datum['yaxis-mean'] : yAxisMax;
                    yAxisMin = datum['yaxis-mean'] < yAxisMin ? datum['yaxis-mean'] : yAxisMin;
                    rawXSites = datum['xaxis-sites'];
                    filteredXSites = datum['xaxis-filteredSites'];
                    rawYSites = datum['yaxis-sites'];
                    filteredYSites = datum['yaxis-filteredSites'];
                    time = new Date(Number(xaxisTime)).toUTCString();
                    seconds = xaxisTime/1000;
                    xValue = datum['xaxis-mean'];
                    yValue = datum['yaxis-mean'];
                    tooltipText = label  +
                        "<br>seconds" + seconds +
                        "<br>time:" + time +
                        "<br> xvalue:" + xValue +
                        "<br> yvalue:" + yValue;
                    normalizedAxisData.push([xValue, yValue, {'time-utc':time, seconds:seconds, rawXSites:rawXSites, filteredXSites: filteredXSites, rawYSites: rawYSites, filteredYSites:filteredYSites}, tooltipText]);
                }
            } else {
                // skip up x if necessary
                while (xaxisTime < yaxisTime && xaxisIndex < xaxisLength) {
                    xaxisIndex++;
                    xaxisTime = xaxisTimes[xaxisIndex];
                }
                // skip up y if necessary
                while (xaxisTime > yaxisTime && yaxisIndex < yaxisLength) {
                    yaxisIndex++;
                    yaxisTime = yaxisTimes[yaxisIndex];
                }
                // push if equal
                if (xaxisTime === yaxisTime && xaxisTime) {
                    if (rawAxisData['xaxis']['data'][xaxisTime] !== null && rawAxisData['yaxis']['data'][yaxisTime] !== null) {
                        datum = getDatum(rawAxisData, xaxisTime, levelCompletenessX, levelCompletenessY, siteCompletenessX, siteCompletenessY,
                        levelBasisX, levelBasisY, siteBasisX, siteBasisY);
                        xAxisMax = datum['xaxis-mean'] > xAxisMax ? datum['xaxis-mean'] : xAxisMax;
                        xAxisMin = datum['xaxis-mean'] < xAxisMin ? datum['xaxis-mean'] : xAxisMin;
                        yAxisMax = datum['yaxis-mean'] > yAxisMax ? datum['yaxis-mean'] : yAxisMax;
                        yAxisMin = datum['yaxis-mean'] < yAxisMin ? datum['yaxis-mean'] : yAxisMin;
                        rawXSites = datum['xaxis-sites'];
                        filteredXSites = datum['xaxis-filteredSites'];
                        rawYSites = datum['yaxis-sites'];
                        filteredYSites = datum['yaxis-filteredSites'];
                        time = new Date(Number(xaxisTime)).toUTCString();
                        seconds = xaxisTime/1000;
                        xValue = datum['xaxis-mean'];
                        yValue = datum['yaxis-mean'];
                        tooltipText = label  +
                            "<br>seconds" + seconds +
                            "<br>time:" + time +
                            "<br> xvalue:" + xValue +
                            "<br> yvalue:" + yValue;
                        normalizedAxisData.push([xValue, yValue, {'time-utc':time, seconds:seconds, xValue:xValue, yValue:yValue, rawXSites:rawXSites, filteredXSites: filteredXSites, rawYSites: rawYSites, filteredYSites:filteredYSites}, tooltipText]);
                    }
                }
            }
            xaxisIndex++;
            yaxisIndex++;
        }

        var pointSymbol = "circle";
        switch (curveIndex % 5) {
            case 0:
                pointSymbol = "circle";
                break;
            case 1:
                pointSymbol = "square";
                break;
            case 2:
                pointSymbol = "diamond";
                break;
            case 3:
                pointSymbol = "triangle";
                break;
            case 4:
                pointSymbol = "cross";
                break;
        }
        // sort these by x axis
        var options = {
            yaxis: curveIndex + 1,
            label: label,
            color: color,
            data: normalizedAxisData,
            points: {symbol: pointSymbol, fillColor: color, show: true, radius: 1},
            //necessary to make the 'hide points' button work properly
            lines: {show: false},
            annotation: ""
        };
        dataset.push(options);

        if (curve['scatter2d-best-fit'] && curve['scatter2d-best-fit'] !== BestFits.none) {
            var regressionResult = regression(curve['scatter2d-best-fit'], normalizedAxisData);
            var regressionData = regressionResult.points;
            regressionData.sort(sortFunction);

            var regressionEquation = regressionResult.string;
            var bfOptions = {
                yaxis: options.yaxis,
                label: options.label + "-best fit " + curve['scatter2d-best-fit'],
                color: options.color,
                data: regressionData,
                points: {symbol: options.points.symbol, fillColor: color, show: false, radius: 1},
                lines: {
                    show: true,
                    fill: false
                },
                annotation: options.label + " - Best Fit: " + curve['scatter2d-best-fit'] + " fn: " + regressionEquation
            };
            bf.push(bfOptions);
        }
    }

    // generate x-axis
    var xaxes = [];
    var xaxis = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        var curve = curves[dsi];
        var position = dsi === 0 ? "bottom" : "top";
        var xaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: curve['xaxis-label'] + ":" + curve['xaxis-variable'] + ":" + curve['xaxis-data source'],
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 16,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            min:xAxisMin * 0.95,
            max:xAxisMax * 1.05
        };
        var xaxisOptions = {
            zoomRange: [0.1, 10]
        };
        xaxes.push(xaxesOptions);
        xaxis.push(xaxisOptions);
    }

    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        var curve = curves[dsi];
        var position = dsi === 0 ? "left" : "right";
        var yaxesOptions = {
            position: position,
            color: 'grey',
            axisLabel: curve['yaxis-label'] + ":" + curve['yaxis-variable'] + ":" + curve['yaxis-data source'],
            axisLabelColour: "black",
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 16,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            alignTicksWithAxis: 1,
            min:yAxisMin * 0.95,
            max:yAxisMax * 1.05
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
        xaxes: xaxes,
        xaxis: xaxis,
        yaxes: yaxes,
        yaxis: yaxis,

        legend: {
            show: false,
            container: "#legendContainer",
            noColumns: 0
        },
        series: {
            points: {
                show: true
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

    dataset = dataset.concat(bf);
    var result = {
        error: error,
        data: dataset,
        options: options
    };
    plotFunction(result);
};