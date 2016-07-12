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


var queryWFIP2DB = function (statement, xmin, xmax, top, bottom) {
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var value_z_time = {};
    var site_z_time = {};
    var all_z = [];
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
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var val_time = {};
            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var avSeconds = Number(rows[rowIndex].avtime);
                var siteid = rows[rowIndex].sites_siteid;
                var z = (rows[rowIndex].z);
                var avVal = z.substring(1, z.length - 1);
                var value = rows[rowIndex].value;
                var stat = value.substring(1, value.length - 1);
                var sub_z = avVal.split(',');
                var sub_value = stat.split(',').map(Number);
                if (val_time[avSeconds] === undefined) {
                    val_time[avSeconds] = [];
                }
                var this_mean_value = 0;
                var n_z = 0;
                for (var j = 0; j < sub_value.length; j++) {
                    var this_value = sub_value[j];
                    var this_z = Math.floor(sub_z[j]); // jeff put float number for level
                    if (all_z.indexOf(this_z) == -1) {
                        all_z.push(this_z);
                    }
                    if (value_z_time[avSeconds] === undefined) {
                        value_z_time[avSeconds] = {};
                    }
                    if (value_z_time[avSeconds][this_z] === undefined) {
                        value_z_time[avSeconds][this_z] = [];
                    }
                    if (site_z_time[avSeconds] === undefined) {
                        site_z_time[avSeconds] = {};
                    }
                    if (site_z_time[avSeconds][this_z] === undefined) {
                        site_z_time[avSeconds][this_z] = [];
                    }
                    if (this_z >= bottom && this_z <= top) {
                        this_mean_value = this_mean_value + this_value;
                        n_z = n_z + 1;
                        value_z_time[avSeconds][this_z].push(this_value);
                        site_z_time[avSeconds][this_z].push(siteid);
                    }
                }
                if (n_z > 0) {
                    this_mean_value = this_mean_value / n_z;
                    val_time[avSeconds].push(this_mean_value);
                }
            }
            var max_sample_time = 0;
            var keys = Object.keys(val_time);
            for (var jj = 0; jj < keys.length; jj++) {
                var key = keys[jj];
                if (val_time[key].length > max_sample_time) {
                    max_sample_time = val_time[key].length;
                }
            }

            // multiple stations, get average values for one time stampe for some certain veritcal levels
            for (var jj = 0; jj < keys.length; jj++) {
                var key = keys[jj];
                var value_array = val_time[key];

                if (value_array.length > 0) {
                    var mean_value;
                    var sum_value = 0;
                    for (var jjj = 0; jjj < value_array.length; jjj++) {
                        sum_value = sum_value + value_array[jjj];
                    }
                    mean_value = sum_value / value_array.length;
                    d.push([key * 1000, mean_value]);
                }
            }
            // done waiting - have results
            dFuture['return']();
        }
    });
    // wait for future to finish
    dFuture.wait();
    return {
        data: d,
        error: error,
        value_z_time: value_z_time,
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
console.log ("plotParams: ", JSON.stringify(plotParams,null,2));
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
            var axis = axisLabelList[axisIndex].split('-')[0];
            var curve = curves[curveIndex];
            var diffFrom = curve.diffFrom;
            var tmp = CurveParams.findOne({name: 'data source'}).optionsMap[curve[axis + '-' + 'data source']][0].split(',');
            var model = tmp[0];
            var instrument_id = tmp[1];
            var dataSource = (curve[axis + '-' + 'data source']);
            var region = CurveParams.findOne({name: 'region'}).optionsMap[curve[axis + '-' + 'region']][0];
            var siteNames = curve[axis + '-' + 'sites'];
            var siteIds = [];
            var siteMap = CurveParams.findOne({name: 'sites'}).optionsMap[dataSource];
            for (var i = 0; i < siteNames.length; i++){
                var siteIndex = siteMap.indexOf(siteNames[i]) +1;
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
                // this is a database driven curve, not a difference curve
                if (model.includes("recs")) {
                    statement = "select valid_utc as avtime,z," + variable + " as value, sites_siteid " +
                        "from obs_recs as o , " + model +
                        " where  obs_recs_obsrecid = o.obsrecid" +
                        " and instruments_instrid=" + instrument_id +
                        " and valid_utc>=" + secsConvert(fromDate) +
                        " and valid_utc<=" + secsConvert(toDate);
                } else if (model.includes("hrrr_wfip")) {
                    statement = "select valid_utc as avtime ,z ," + variable + " as value, sites_siteid  " +
                        "from " + model + ", nwp_recs,  " + dataSource + "_discriminator" +
                        " where nwps_nwpid=" + instrument_id +
                        " and modelid= modelid_rec" +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and valid_utc >=" + secsConvert(fromDate) +
                        " and valid_utc<=" + secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength +
                        " and " + discriminator + " >=" + disc_lower +
                        " and " + discriminator + " <=" + disc_upper
                } else {
                    statement = "select valid_utc as avtime ,z ," + variable + " as value, sites_siteid  " +
                        "from " + model + ", nwp_recs  " +
                        " where nwps_nwpid=" + instrument_id +
                        " and nwp_recs_nwprecid=nwprecid" +
                        " and valid_utc >=" + secsConvert(fromDate) +
                        " and valid_utc<=" + secsConvert(toDate) +
                        " and fcst_end_utc=" + 3600 * forecastLength;
                }
                statement = statement + "  and sites_siteid in (" + siteIds.toString() + ")";
                var z_time;
                var site_z_time;
                var queryResult = queryWFIP2DB(statement, qxmin, qxmax, top, bottom);
                axisData[axis]= queryResult.data;
                z_time = queryResult.value_z_time;
                if (axisData[axis][0] === undefined) {
                    //    no data set empty array
                    axisData[axis][0] = [];
                } else {
                    xmin = axisData[axis][0][0];
                    xmax = axisData[axis][axisData[axis].length - 1][0];
                    mxmax = mxmax > xmax ? xmax : mxmax;
                    mxmin = mxmin < xmin ? mxmin : xmin;
                    error = queryResult.error;
                    z_time = queryResult.value_z_time;
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
            if (axisData['xaxis'][xaxisIndex][0] === axisData['yaxis'][yaxisIndex][0]){
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
        normalizedAxisData.sort(function(a,b){
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
            points: {symbol: pointSymbol, fillColor: color, show: true, radius:1},
            annotation: ""
        };
        dataset.push(options);

        if (curve['scatter2d-best-fit'] && curve['scatter2d-best-fit'] !== BestFits.none) {
            var  regressionResult =  regression(curve['scatter2d-best-fit'], normalizedAxisData);
            console.log("regressionResult is: ", regressionResult);
            var  regressionData =  regressionResult.points;
            regressionData.sort(bestFitSortFunction);

            var  regressionEquation =  regressionResult.string;
            var bfOptions = {
                yaxis: options.yaxis,
                label: options.label + "-best fit " + curve['scatter2d-best-fit'] ,
                //color: "rgb(0,0,0)",
                color: options.color,
                data: regressionData,
                points: {symbol: options.points.symbol, fillColor: color, show: false, radius:1},
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
            axisLabel: variableStatSet[variableStat].label + " : " + variableStat,
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
            axisLabel: variableStatSet[variableStat].label + " : " + variableStat,
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