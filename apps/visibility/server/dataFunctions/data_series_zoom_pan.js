import {matsCollections, matsTypes, matsDataUtils} from "meteor/randyp:mats-common";
import {mysql} from "meteor/pcel:mysql";
import {moment} from "meteor/momentjs:moment";
const Future = require('fibers/future');

// use future to wait for the query callback to complete
var queryDB = function (statement, validTimeStr, xmin, xmax, interval, averageStr) {
    var sumSettings = matsCollections.Databases.findOne({role: "sum_data", status: "active"}, {
        host: 1,
        user: 1,
        password: 1,
        database: 1,
        connectionLimit: 1
    });
    var sumPool = mysql.createPool(sumSettings);    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ctime=[] ;
    var ymin;
    var ymax;

    sumPool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
            dFuture['return']();
        } else if (rows === undefined || rows.length === 0) {
            error = 'No data to plot: ' + err;
            // done waiting - error condition
            dFuture['return']();
        } else {
            ymin = Number(rows[0].avtime);
            ymax = Number(rows[0].avtime);
            var curveTime=[] ;
            var curveStat =[];
            var N0_max=0;
            var N_times_max;
//            var time_interval = Number(rows[1].avtime) - Number(rows[0].avtime);
            var time_interval = Number(rows[1].avtime) - Number(rows[0].avtime);
            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var avSeconds = Number(rows[rowIndex].avtime);
                var stat = rows[rowIndex].stat0;
                var N0_loop = rows[rowIndex].N0;
                var N_times_loop = rows[rowIndex].N_times;
                if (rowIndex < rows.length - 1) {
                    var time_diff = Number(rows[rowIndex + 1].avtime) - Number(rows[rowIndex].avtime);
                    if (time_diff < time_interval) {
                        time_interval = time_diff;
                    }
                }


                if (N0_loop > N0) N0_max = N0_loop;
                if (N_times_loop > N_times) {
                    N_times_max = N_times_loop;
                }

                curveTime.push(avSeconds * 1000);
                curveStat.push(stat);
                N0.push(N0_loop);
                N_times.push(N_times_loop);
            }

            interval = time_interval * 1000;
            xmin = Number(rows[0].avtime)*1000;
            var loopTime =xmin;
            while (loopTime < xmax + 1) {

                if (curveTime.indexOf(loopTime) < 0) {
                    d.push([loopTime, null]);
                    ctime.push(loopTime);
                } else{
                    var d_idx = curveTime.indexOf(loopTime);
                    var this_N0 = N0[d_idx];
                    var this_N_times = N_times[d_idx];
                    if (this_N0 < 0.1 * N0_max || this_N_times < 0.75 * N_times_max) {
                        d.push([loopTime, null]);
                        ctime.push(loopTime);

                    }else{
                        d.push([loopTime, curveStat[d_idx]]);
                        ctime.push(loopTime);
                    }
                }
                loopTime = loopTime + interval;
            }
            // done waiting - have results
            dFuture['return']();
        }
    });
    // wait for future to finish
    dFuture.wait();
    return {data:d,
        error:error,
        ymin:ymin,
        ymax:ymax,
        N0:N0,
        N_times:N_times,
        averageStr:averageStr,
        interval:interval,
        ctime:ctime};
};

dataSeriesZoom = function (plotParams, plotFunction) {
    console.log(JSON.stringify(plotParams,null,2));
    var dataRequests = {}; // used to store data queries
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromDate = dateRange.fromDate;
    var toDate = dateRange.toDate;
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    // convert dates for sql
    fromDate = moment(fromDate, "MM-DD-YYYY").format('YYYY-M-D');
    toDate = moment(toDate, "MM-DD-YYYY").format('YYYY-M-D');

    var weitemp = fromDate.split("-");
    var qxmin = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    weitemp = toDate.split("-");
    var qxmax = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    var mxmax = qxmax;// used to draw zero line
    var mxmin = qxmin; // used to draw zero line

    var matching = plotParams.plotAction === matsTypes.PlotActions.matched;

    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var variableStatSet = Object.create(null);
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var data_source = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var region = curve['region'];
        var label = curve['label'];
        var top = curve['top'];
        var bottom = curve['bottom'];
        var color = curve['color'];
        var thresholdSelect = curve['threshold'];
        var thresholdOptionsMap = matsCollections.CurveParams.findOne({name: 'threshold'}, {optionsMap: 1})['optionsMap'];
        var threshold = thresholdOptionsMap[thresholdSelect][0];
        var thresholdStr = curve['threshold'];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic = statisticOptionsMap[statisticSelect][0];
        var validTimeStr = curve['valid-time'];

        var averageStr = curve['average'];
        var averageOptionsMap = matsCollections.CurveParams.findOne({name: 'average'}, {optionsMap: 1})['optionsMap'];
        var average = averageOptionsMap[averageStr][0];
        var forecastLength = curve['forecast-length'];
        // variableStat is used to determine which axis a curve should use.
        // This variableStatSet object is used like a set and if a curve has the same
        // variable and statistic (variableStat) it will use the same axis,
        // The axis number is assigned to the variableStatSet value, which is the variableStat.
        var variableStat = thresholdStr + ":" + statisticSelect;
        curves[curveIndex].variableStat = variableStat; // stash the variableStat to use it later for axis options
        var xmax;
        var ymax;
        var xmin;
        var ymin;
        var interval;

        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            var statement = "select {{average}} as avtime, " +
                "{{statistic}} " +
                " from {{data_source}} as m0 " +
                "  where 1=1 " +
                "{{validTime}} " +
                "and m0.yy+m0.ny+m0.yn+m0.nn > 0 " +
                "and m0.time >= '{{fromSecs}}' " +
                "and m0.time <= '{{toSecs}}' " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{average}}', average);
            statement = statement.replace('{{fromSecs}}', fromSecs);
            statement = statement.replace('{{toSecs}}', toSecs);
            statement = statement.replace('{{data_source}}', data_source + threshold + forecastLength + '_' + region);
            statement = statement.replace('{{statistic}}', statistic);
            validTime =" ";
            if (validTimeStr != "All"){
                validTime =" and floor((m0.time)%(24*3600)/3600) IN("+validTimeStr+")"
            }
            statement = statement.replace('{{validTime}}', validTime);
            console.log("query=" + statement);
            dataRequests[curve.label] = statement;
            var queryResult = queryDB(statement, validTimeStr, qxmin, qxmax, interval, averageStr);
            d = queryResult.data;
            ctime = queryResult.ctime;
            interval=queryResult.interval;
            if (d[0] === undefined) {
                error = "No data returned";
            } else {
                xmin = d[0][0];
                xmax = d[d.length - 1][0];
                mxmax = mxmax > xmax ? xmax : mxmax;
                mxmin = mxmin < xmin ? mxmin : xmin;
                error = queryResult.error;
            }

        } else {
            // this is a difference curve - we are differencing diffFrom[0] - diffFrom[1] based on the
            // time values of whichever has the largest interval
            // find the largest interval between diffFrom[0] curve and diffFrom[1] curve
            var maxInterval = dataset[diffFrom[0]].interval;
            var largeIntervalCurveData = dataset[diffFrom[0]].data;
            if (dataset[diffFrom[0]].interval < dataset[diffFrom[1]].interval) {
                maxInterval = dataset[diffFrom[1]].interval;
                largeIntervalCurveData = dataset[diffFrom[1]].data;
            }
            var minuendData = dataset[diffFrom[0]].data;
            var subtrahendData = dataset[diffFrom[1]].data;
            var subtrahendIndex = 0;
            var minuendIndex = 0;
            for (var largeIntervalCurveIndex = 0; largeIntervalCurveIndex < largeIntervalCurveData.length; largeIntervalCurveIndex++) {
                var subtrahendTime = subtrahendData[subtrahendIndex][0];
                var minuendTime = minuendData[minuendIndex][0];
                var largeIntervalTime = largeIntervalCurveData[largeIntervalCurveIndex][0];
                while (largeIntervalTime > minuendTime) {
                    minuendTime = minuendData[++minuendIndex][0];
                }
                while (largeIntervalTime > subtrahendTime) {
                    subtrahendTime = subtrahendData[++subtrahendIndex][0];
                }
                var diffValue = null;
                if (minuendData[minuendIndex] !== undefined && subtrahendData[subtrahendIndex] !== undefined) {  // might be a fill value (null)
                    if (minuendData[minuendIndex][1] !== null && subtrahendData[subtrahendIndex][1] !== null) {
                        diffValue = minuendData[minuendIndex][1] - subtrahendData[subtrahendIndex][1];
                        d.push([largeIntervalTime, diffValue]);
                    }
                }
            }
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


        var mean = 0;


        for (var i = 0; i < d.length; i++) {
            mean = mean + d[i][1];
        }
        mean = mean / d.length;

        var options = {
            yaxis: variableStatSet[variableStat].index,
            label: label,
            annotation: label + "- mean = " + mean.toPrecision(4),
            color: color,
            data: d,
            ctime: ctime,
            points: {symbol: pointSymbol, fillColor: color, show: true},
            lines: {show: true, fill: false},
            interval: interval,
            xmin: xmin,
            xmax: xmax

        };
        dataset.push(options);
    }

    // if matching is true we need to iterate through the entire dataset by the x axis and null all entries that do
    // not have data in each curve.
    if (matching) {
        if (diffFrom == null)
        {
            var numCurves = dataset.length;
        }else{
            var numCurves = diffFrom.length;
        }
        var matchInterval = 0;
        for (var ci = 0; ci < numCurves; ci++) {
            var this_interval = dataset[ci].interval;
            if (this_interval > matchInterval) matchInterval = this_interval;
        }

        var timeIntersection = dataset[0].ctime;
        for (var ci = 1; ci < numCurves; ci++) {
            var this_time = dataset[ci].ctime;
            timeIntersection = _.intersection(this_time, timeIntersection);
        }

        var new_curve_dd = {};
        for (var ci = 0; ci < numCurves; ci++) {
            new_curve_dd[ci] = [];
        }

        var new_timeIntersection = [];
        var tlength = timeIntersection.length;
        for (var si = 0; si < tlength; si++) {
            var this_secs = timeIntersection[si];
            for (var ci = 0; ci < numCurves; ci++) {
                var ctime = dataset[ci].ctime;
                var myIndex = ctime.indexOf(this_secs);
                this_data = dataset[ci].data[myIndex][1];
                if (this_data == null) {
                    // new_curve_dd[ci].push([this_secs,this_data]);

                    delete timeIntersection[si];
                }
            }
        }

        for (var si = 0; si < tlength; si++) {
            if (timeIntersection[si] != undefined) {
                new_timeIntersection.push(timeIntersection[si]);

            }

        }

        n_length = new_timeIntersection.length;


        tmin = new_timeIntersection[0];
        tmax = new_timeIntersection[n_length - 1];

        tt = tmin;
        while (tt <= tmax) {
            for (var ci = 0; ci < numCurves; ci++) {

                if (new_timeIntersection.indexOf(tt) > 0) {
                    var ctime = dataset[ci].ctime;
                    var myIndex = ctime.indexOf(tt);
                    this_data = dataset[ci].data[myIndex][1];

                    new_curve_dd[ci].push([tt, this_data]);
                } else {

                    new_curve_dd[ci].push([tt, null]);
                }

            }
            tt = tt + matchInterval;

        }


        for (var ci = 0; ci < numCurves; ci++) {
            dataset[ci].data = [];
            dataset[ci].data = new_curve_dd[ci];
        }

        for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
            var curve = curves[curveIndex];
            var diffFrom = curve.diffFrom;
            if (diffFrom != null) {
                var minuendIndex = diffFrom[0];
                var subtrahendIndex = diffFrom[1];
                var minuendData = dataset[minuendIndex].data;
                var subtrahendData = dataset[subtrahendIndex].data;

                // add dataset copied from minuend
                var d = [];
                // do the differencing of the data
                for (var i = 0; i < minuendData.length; i++) {
                    d[i] = [];
                    d[i][0] = subtrahendData[i][0];
                    if (minuendData[i][1] != null && subtrahendData[i][1] != null) {
                        d[i][1] = minuendData[i][1] - subtrahendData[i][1];
                    } else {
                        d[i][1] = null;
                    }
                    // ymin and ymax will change with diff
                    ymin = ymin < d[i][1] ? ymin : d[i][1];
                    ymax = ymax > d[i][1] ? ymax : d[i][1];
                }


                var mean = 0;
                for (var i = 0; i < d.length; i++) {
                    mean = mean + d[i][1];
                }
                mean = mean / d.length;

                dataset[curveIndex].data = d;
                dataset[curveIndex].mean = label + "- mean = " + mean.toPrecision(4);

            }
        }

    }//end of matching

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
            alignTicksWithAxis: 1,
            tickDecimals: 3
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
                lineWidth: matsCollections.Settings.findOne({}, {fields: {lineWidth: 1}}).lineWidth
            },
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

    // add black 0 line curve
    // need to find the minimum and maximum x value for making the zero curve
    dataset.push( {annotation: "", color: 'black', points: {show: false}, data: [[mxmin, 0, "zero"], [mxmax, 0, "zero"]]});
    var result = {
        error: error,
        data: dataset,
        options: options,
        basis:{
            plotParams:plotParams,
            queries:dataRequests
        }
    };
    plotFunction(result);
};