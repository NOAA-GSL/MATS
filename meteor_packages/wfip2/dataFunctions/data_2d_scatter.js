var bestFitSortFunction = function (a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
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


var queryWFIP2DB = function (statement, xmin, xmax, top, bottom, my_variable) {
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var ws_z_time = {};
    var site_z_time = {};
    var all_z = [];  // all the levels for all the times
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
            if (my_variable == 'ws') {
                ymin = Number(rows[0].stat);
                ymax = Number(rows[0].stat);
                var ws_time = {};
                // var time_interval = Number(rows[1].avtime) - Number(rows[0].avtime);  // the delta between adjacent times
                var ctime = [];
                for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    var avSeconds = Number(rows[rowIndex].avtime);
                    var siteid = rows[rowIndex].sites_siteid;
                    var sub_z = JSON.parse(rows[rowIndex].z);
                    var sub_ws = JSON.parse(rows[rowIndex].ws);
                    if (ctime.indexOf(avSeconds * 1000)<0){
                        ctime.push(avSeconds * 1000);
                    }
                    // if (rowIndex < rows.length - 1) {   // record the minimum time delta between adjacent times
                    //     var time_diff = Number(rows[rowIndex + 1].avtime) - Number(rows[rowIndex].avtime);
                    //     if (time_diff < time_interval) {
                    //         time_interval = time_diff;
                    //     }
                    // }
                    if (ws_time[avSeconds] === undefined) {  // wind speed for a given time - might be empty
                        ws_time[avSeconds] = [];
                    }
                    var this_mean_ws = 0;
                    var n_z = 0;
                    for (var j = 0; j < sub_ws.length; j++) {   //loop through all the windspeeds for this time
                        var this_ws = sub_ws[j];
                        var this_z = Math.floor(sub_z[j]); // jeff put float number for level - round down to an int
                        if (all_z.indexOf(this_z) == -1) {
                            all_z.push(this_z);
                        }
                        // ws_z_time is for matching levels for each timestamp
                        if (ws_z_time[avSeconds] === undefined) {
                            ws_z_time[avSeconds] = {};
                        }
                        if (ws_z_time[avSeconds][this_z] === undefined) {
                            ws_z_time[avSeconds][this_z] = [];
                        }
                        if (site_z_time[avSeconds] === undefined) {
                            site_z_time[avSeconds] = {};
                        }
                        if (site_z_time[avSeconds][this_z] === undefined) {
                            site_z_time[avSeconds][this_z] = [];
                        }
                        if (this_z >= bottom && this_z <= top) {
                            this_mean_ws = this_mean_ws + this_ws;
                            n_z = n_z + 1;
                            ws_z_time[avSeconds][this_z].push(this_ws);
                            site_z_time[avSeconds][this_z].push(siteid);
                        }
                    }
                    if (n_z > 0) {
                        this_mean_ws = this_mean_ws / n_z;
                        ws_time[avSeconds].push(this_mean_ws);
                    }
                }
                ctime.sort();
                var interval= ctime[0]*100000;
                var time_diff;

                for (var ii =0; ii<ctime.length-1;ii++){

                    time_diff = ctime[ii+1] - ctime[ii];
                    if ( time_diff< interval) {
                        interval = time_diff;
                    }

                }
                var max_sample_time = 0;
                var keys = Object.keys(ws_time);
                for (var jj = 0; jj < keys.length; jj++) {
                    var key = keys[jj];
                    if (ws_time[key].length > max_sample_time) {
                        max_sample_time = ws_time[key].length;
                    }
                }
                xmin = keys[0] * 1000;
                xmax = keys[keys.length - 1] * 1000;
                var loopTime = xmin;
                while (loopTime < xmax + 1) {
                    if (ctime.indexOf(loopTime) < 0) {
                        d.push([loopTime, null]);
                    } else {
                        this_key = loopTime / 1000;
                        var ws_array = ws_time[this_key];
                        if (ws_array.length > 0) {
                            var mean_ws;
                            var sum_ws = 0;
                            for (var jjj = 0; jjj < ws_array.length; jjj++) {
                                sum_ws = sum_ws + ws_array[jjj];
                            }
                            mean_ws = sum_ws / ws_array.length;
                            d.push([loopTime, mean_ws]);
                        }
                    }
                    loopTime = loopTime + interval;
                }
                dFuture['return']();
            } else {
                for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                    var avSeconds = Number(rows[rowIndex].avtime);
                    var my_value = Number(rows[rowIndex].dis);
                    d.push([avSeconds * 1000, my_value]);
                }
                dFuture['return']();
            }
        }
    });
    // wait for future to finish
    dFuture.wait();
    return {
        data: d,
        error: error,
        ws_z_time: ws_z_time,
        site_z_time: site_z_time,
        ymin: ymin,
        ymax: ymax,
        N0: 20,
        N_times: 20,
        all_z: all_z
    };
};

//}

data2dScatter = function (plotParams, plotFunction) {
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
    console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var fromDateStr = plotParams.fromDate;
    var fromDate = dateConvert(fromDateStr);
    var toDateStr = plotParams.toDate;
    var toDate = dateConvert(toDateStr);
    var weitemp = fromDate.split("-");
    var qxmin = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    weitemp = toDate.split("-");
    var qxmax = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    var mxmax = qxmax;// used to draw zero line
    var mxmin = qxmin; // used to draw zero line
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var variableStatSet = Object.create(null);
    var curveKeys = Object.keys(curves[0]);
    var axisLabelList = curveKeys.filter(function (key) {
        return key.indexOf('axis-label') === 1;
    });
    var bf = [];
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var axisData = {};
        for (var axisIndex = 0; axisIndex < axisLabelList.length; axisIndex++) {
            var curve = curves[curveIndex];

            var axis = axisLabelList[axisIndex].split('-')[0];
            var tmp = CurveParams.findOne({name: 'data source'}).optionsMap[curve[axis + '-' + 'data source']][0].split(',');
            var model = tmp[0];
            var instrument_id = tmp[1];
            var dataSource = (curve[axis + '-' + 'data source']);
            var my_variable;
            if (curve[axis + '-variable'] == 'wind_speed' || curve[axis + '-variable'] == 'wind_direction') {
                my_variable = CurveParams.findOne({name: 'variable'}).variableMap[curve[axis + '-variable']];
            } else {
                my_variable = curve[axis + '-variable'];
            }
            var region = CurveParams.findOne({name: 'region'}).optionsMap[curve[axis + '-' + 'region']][0];
            var siteNames = curve[axis + '-' + 'sites'];
            var siteIds = [];
            var siteMap = CurveParams.findOne({name: 'sites'}).optionsMap[dataSource];
            for (var i = 0; i < siteNames.length; i++) {
                var siteIndex = siteMap.indexOf(siteNames[i]) + 1;
                if (siteIndex !== -1) {
                    siteIds.push(siteIndex);
                } else {
                    console.log("error: site: " + siteNames[i] + " is not in the site options: " + JSON.stringify(siteNames));
                }
            }
            var label = (curve['label']);    // label should be same for all the axis
            var top = Number(curve[axis + '-' + 'top']);
            var bottom = Number(curve[axis + '-' + 'bottom']);
            var color = curve['color'];  // color should be same for all axis
            var variableStr = curve[axis + '-' + 'variable'];
            var variableOptionsMap = CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
            var variable = variableOptionsMap[variableStr];
            if (curve['variable'] == 'wind_speed' || curve['variable'] == 'wind_direction') {
                variable = CurveParams.findOne({name: 'variable'}).variableMap[curve['variable']];
            } else {
                variable = curve['variable'];
            }
            var discriminator = curve[axis + '-' + 'discriminator'];
            var disc_upper = curve[axis + '-' + 'upper'];
            var disc_lower = curve[axis + '-' + 'lower'];
            var forecastLength = curve[axis + '-' + 'forecast length'];
            var variableStat = variableStr + ":";
            curves[curveIndex].variableStat = variableStat; // stash the variableStat to use it later for axis options
            var xmax;
            var xmin;
            var d = [];
            var statement = '';
            if (model.includes("recs")) {
                statement = "select valid_utc as avtime,z,ws,sites_siteid " +
                    "from obs_recs as o , " + model +
                    " where  obs_recs_obsrecid = o.obsrecid" +
                    " and instruments_instrid=" + instrument_id +
                    " and valid_utc>=" + secsConvert(fromDate) +
                    " and valid_utc<=" + secsConvert(toDate);
            } else if (model.includes("hrrr_wfip")) {
                if (my_variable != 'ws') {
                    statement = "select valid_utc as avtime ,z ,ws,sites_siteid, " + my_variable + " as dis " +
                        " from " + model + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where nwps_nwpid=" + instrument_id +
                        " and modelid= modelid_rec" +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and valid_utc >=" + secsConvert(fromDate) +
                        " and valid_utc<=" + secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper
                } else {
                    statement = "select valid_utc as avtime ,z ,ws,sites_siteid  " +
                        "from " + model + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where nwps_nwpid=" + instrument_id +
                        " and modelid= modelid_rec" +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and valid_utc >=" + secsConvert(fromDate) +
                        " and valid_utc<=" + secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper
                }
            } else {
                statement = "select valid_utc as avtime ,z ,ws,sites_siteid  " +
                    "from " + model + ", nwp_recs  " +
                    " where nwps_nwpid=" + instrument_id +
                    " and nwp_recs_nwprecid=nwprecid" +
                    " and valid_utc >=" + secsConvert(fromDate) +
                    " and valid_utc<=" + secsConvert(toDate) +
                    " and fcst_end_utc=" + 3600 * forecastLength;
            }
            statement = statement + "  and sites_siteid in (" + siteIds.toString() + ")";
            console.log("statement: " + statement);
            var ws_z_time;
            var site_z_time;
            var queryResult = queryWFIP2DB(statement, qxmin, qxmax, top, bottom, my_variable);
            axisData[axis] = queryResult.data;
            ws_z_time = queryResult.ws_z_time;
            if (axisData[axis][0] === undefined) {
                //    no data set empty array
                axisData[axis][0] = [];
            } else {
                xmin = axisData[axis][0][0];
                xmax = axisData[axis][axisData[axis].length - 1][0];
                mxmax = mxmax > xmax ? xmax : mxmax;
                mxmin = mxmin < xmin ? mxmin : xmin;
                error = queryResult.error;
                ws_z_time = queryResult.ws_z_time;
                site_z_time = queryResult.site_z_time;
            }
        }
        // should now have two data sets, one for x and one for y
        // need to make sure the x components match (normalize data) and then use the y
        // components to create the dataset i.e. axisData['xaxis'][*][0] should equal axisData['yaxis'][*][0] and
        // axisData['xaxis'][*][1] becomes the x values while axisData['yaxis'][*][1] becomes the corresponding y axis

        // normalize data
        var normalizedAxisData = [];
        var xaxisIndex = 0;
        var yaxisIndex = 0;
        // synchronize datasets
        if (axisData['xaxis'][xaxisIndex][0] <= axisData['yaxis'][yaxisIndex][0]) {
            while (axisData['xaxis'][xaxisIndex][0] < axisData['yaxis'][yaxisIndex][0]) {
                xaxisIndex++;
            }
        } else {
            while (axisData['xaxis'][xaxisIndex][0] > axisData['yaxis'][yaxisIndex][0]) {
                yaxisIndex++;
            }
        }
        while (xaxisIndex < axisData['xaxis'].length && yaxisIndex < axisData['yaxis'].length) {
            if (axisData['xaxis'][xaxisIndex][0] === axisData['yaxis'][yaxisIndex][0]) {
                normalizedAxisData.push([axisData['xaxis'][xaxisIndex][1], axisData['yaxis'][yaxisIndex][1]]);
            } else {
                if (axisData['xaxis'][xaxisIndex][0] < axisData['yaxis'][yaxisIndex][0]) {
                    while (axisData['xaxis'][xaxisIndex] && axisData['yaxis'][yaxisIndex] && axisData['xaxis'][xaxisIndex][0] <= axisData['yaxis'][yaxisIndex][0]) {
                        xaxisIndex++;
                    }
                } else {
                    while (axisData['xaxis'][xaxisIndex] && axisData['yaxis'][yaxisIndex] && axisData['xaxis'][xaxisIndex][0] >= axisData['yaxis'][yaxisIndex][0]) {
                        yaxisIndex++;
                    }
                }
            }
            if (axisData['xaxis'][xaxisIndex] && axisData['yaxis'][yaxisIndex]) {
                normalizedAxisData.push([axisData['xaxis'][xaxisIndex][1], axisData['yaxis'][yaxisIndex][1]]);
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
        var yAxisIndex = 1;
        if (variableStat in variableStatSet) {
            yAxisIndex = variableStatSet[variableStat].index;
            variableStatSet[variableStat].label = variableStatSet[variableStat].label + " | " + label;
        } else {
            variableStatSet[variableStat] = {index: curveIndex + 1, label: label};
        }
        // sort these by x axis
        normalizedAxisData.sort(function (a, b) {
            if (a[0] == b[0]) {
                return 0;
            } else {
                return (a[0] < b[0]) ? -1 : 1;
            }
        });
        var options = {
            yaxis: variableStatSet[variableStat].index,
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
            regressionData.sort(bestFitSortFunction);

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
        var variableStat = curves[dsi].variableStat;
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
        var variableStat = curves[dsi].variableStat;
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