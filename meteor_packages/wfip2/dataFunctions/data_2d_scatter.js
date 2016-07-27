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


var queryWFIP2DB = function (statement, top, bottom, myVariable, isDiscriminator) {
    var dFuture = new Future();
    var error = "";
    var resultData = {};
    var minInterval = Number.MAX_VALUE;
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
                         siteid0: {
                             time1: {  // times are in seconds and are unique - they are huge though so we use a map, instead of an array
                                 levels: [],
                                 values: [],
                                 sum: 0;
                                 mean: 0;
                                 count: count;
                                 max: max;
                                 min: min
                             },
                             time2: {
                                 .
                                 .
                             },
                             .
                             .
                             timeN: {
                                 .
                                 .
                             }
                             },
                        siteid2:{
                            ....
                        },
                             .
                             .
                        siteidn:{
                              ...
                             },
                 };
            */
                var time = 0;
                var lastTime = 0;
                var rowIndex;
                for (rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    time = Number(rows[rowIndex].avtime) * 1000;  // convert milli to second
                    var interval = time - lastTime;
                    if (interval !== 0 && interval < minInterval) {  // account for the same times in a row
                        minInterval = interval;
                    }
                    lastTime = time;
                    var siteid = rows[rowIndex].sites_siteid;
                    var values = [];
                    var levels = [];
                    if (isDiscriminator)  {
                        // discriminator
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
                    var sum = values.reduce(add,0);
                    var numLevels = levels.length;
                    var mean = sum / numLevels;
                    if(resultData[siteid] === undefined) {
                        resultData[siteid] = {};
                    }
                    if (resultData[siteid][time] === undefined) {
                        resultData[siteid][time] = {};
                    }
                    resultData[siteid][time].levels = levels;
                    resultData[siteid][time].values = values;
                    resultData[siteid][time].sum = sum;
                    resultData[siteid][time].numLevels = numLevels;
                    resultData[siteid][time].mean = mean;
                    resultData[siteid][time].max = max(values);
                    resultData[siteid][time].min = min(values);
                }
                // fill in missing times - there must be an entry at each minInterval
                // if there are multiple entries for a given time average them into one time entry
                // get an array of all the times for every site

                var allSites = Object.keys(resultData).map(function(siteKey){
                    return resultData[siteKey];
                });
                var allTimes = allSites.map(function(site) {
                    return Object.keys(site);
                });
                var times = _.union(allTimes).sort() ; // get all the times, sorted
                var siteids = Object.keys(resultData);
                for (siteid in siteids) {
                    for (var k = 0; k < times.length -1; k++) {
                        var time = Number(times[k]);
                        var nextTime = times[k+1];
                        while ((nextTime - time) > minInterval) {
                            time = time + minInterval;
                            resultData[siteids[siteid]][time] = null;
                        }
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
    var bf = [];   // used for bestFit data
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var axisData = {};
        for (var axisIndex = 0; axisIndex < axisLabelList.length; axisIndex++) {
            var curve = curves[curveIndex];
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

            /* What we really want to end up with for each curve is an array of arrays where each element has a time and an average of the corresponding values.
             data = [ [time, value] .... [time, value] ] // where value is an average based on criterion, such as which sites have been requested?,
             and what are the level boundaries?, and what are the time boundaries?. Levels and times have been built into the query but sites still
             need to be accounted for here. Also there can be missing times so we need to iterate through each set of times and fill in missing ones
             based on the minimum interval for the data set.

             We also have matching...
             We can be requested to match by any combination of siteids, levels, or times. Matching means that we exclude any data that is not consistent with
             the intersection of the match request. For example if level matching is requested we need to find the intersection of all the level arrays for the given
             criteria and only include data that has levels that are in that intersection. It is the same for times and siteids.
             The data from the query is of the form
             resultData = {
                    siteid: {
                            time1: {
                                levels:[],
                                values:[],
                                sum: Number,
                                mean: Number,
                                count: Number,
                                max: Number,
                                min: Number
                            },
                            time2: {...},
                            .
                            .
                            timen:{...}
                    },
                    site2:{....},
                    .
                    .
                    siten:{....}
             }
             where each site has been filled (nulls where missing) with all the times available for the data set, based on the minimum time interval.
             */
            var data = queryResult.data;
             if (plotParams['matchFormat'].length > 0) {
                 // filter the queryResult by matching criteria
             }

             var d = {};
             // summarize the mean values of the data results
             var sites =  Object.keys(data);
             var sitesLength = sites.length;
             var sitesIndex = 0;
             var times = Object.keys(data[sites[0]]).sort();
             var timesLength = times.length;
             var timesIndex = 0;
             var sum = 0;
             var numLevels =0;
             for (timesIndex; timesIndex < timesLength; timesIndex++) {
                 var time = times[timesIndex];
                 for (sitesIndex = 0; sitesIndex < sitesLength; sitesIndex++) {
                     var site = sites[sitesIndex];
                     if (data[site][time] !== undefined && data[site][time] !== null ) {
                         try {
                             sum += data[site][time].sum;
                             numLevels += data[site][time].numLevels;
                         } catch (error) {
                             console.log ("error - data[site][time] is " + data[site][time]);
                         }

                     }
                 }
                 d[time] = sum / numLevels;
             }
            axisData[axis] = d;
        }   // for axis loop


        // should now have two data sets, one for x and one for y, each a summed value against time. There should
        // not be any duplicate times.
        // need to make sure the x (time) components of each curve match (normalize data) and then use the y
        // components to create the dataset i.e. axisData['xaxis'][*][0] should equal axisData['yaxis'][*][0] and
        // axisData['xaxis'][*][1] becomes the x values while axisData['yaxis'][*][1] becomes the corresponding y axis

        // normalize data
        var normalizedAxisData = [];
        var xaxisIndex = 0;
        var yaxisIndex = 0;
        var xaxisTimes = Object.keys(axisData['xaxis']);
        var yaxisTimes = Object.keys(axisData['yaxis']);
        var xaxisLength = xaxisTimes.length;
        var yaxisLength = yaxisTimes.length;

        // synchronize datasets:
        // Only push to normalized data if there exists a time for both axis. Skip up until that happens.
        var yaxisTime;
        var xaxisTime;
        while (xaxisIndex < xaxisLength - 1 && yaxisIndex < yaxisLength - 1) {
            xaxisTime = xaxisTimes[xaxisIndex];
            yaxisTime = yaxisTimes[yaxisIndex];
            if (xaxisTime === yaxisTime) {
                normalizedAxisData.push([axisData['xaxis'][xaxisTime], axisData['yaxis'][yaxisTime]]);
            } else {
                // skip up x
                while (xaxisTime < yaxisTime && xaxisIndex < xaxisLength) {
                    xaxisIndex++;
                    xaxisTime = xaxisTimes[xaxisIndex];
                }
                // skip up y
                while (xaxisTime > yaxisTime && yaxisIndex < yaxisLength) {
                    yaxisIndex++;
                    yaxisTime = yaxisTimes[yaxisIndex];
                }
                // push if equal
                if (xaxisTime === yaxisTime) {
                    normalizedAxisData.push([axisData['xaxis'][xaxisTime], axisData['yaxis'][yaxisTime]]);
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
                //color: "rgb(0,0,0)",
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
            alignTicksWithAxis: 1
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
            alignTicksWithAxis: 1
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
            borderWidth: 3,
            mouseActiveRadius: 50,
            backgroundColor: "white",
            axisMargin: 20
        },
        tooltip: true,
        tooltipOpts: {
            content: "<span style='font-size:150%'><strong>%s<br>%x:<br>value %y</strong></span>",
            xDateFormat: "%Y-%m-%d:%H",
            onHover: function (flotItem, $tooltipEl) {
            }
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