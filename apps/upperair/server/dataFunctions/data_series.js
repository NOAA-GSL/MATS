import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'
import {matsDataUtils} from 'meteor/randyp:mats-common';
const Future = require('fibers/future');
// use future to wait for the query callback to complete

var queryDB = function (statement, validTimeStr, xmin, xmax, interval, averageStr) {
    var dFuture = new Future();
    var d = [];  // d will contain the curve data
    var error = "";
    var N0 = [];
    var N_times = [];
    var ymin;
    var ymax;
    sumPool.query(statement, function (err, rows) {
        // query callback - build the curve data from the results - or set an error
        if (err != undefined) {
            error = err.message;
        } else if (rows === undefined || rows.length === 0) {
            error = 'No data to plot: ' + err;
            // done waiting - error condition
        } else {
            ymin = Number(rows[0].stat);
            ymax = Number(rows[0].stat);
            var curveTime = [];
            var curveStat = [];
            var N0_max = 0;
            var N_times_max = 0;
            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var avSeconds = Number(rows[rowIndex].avtime);
                var stat = rows[rowIndex].stat;
                var N0_loop = rows[rowIndex].N0;
                var N_times_loop = rows[rowIndex].N_times;

                if (N0_loop > N0) {
                    N0_max = N0_loop;
                }
                if (N_times_loop > N_times) {
                    N_times_max = N_times_loop;
                }

                curveTime.push(avSeconds * 1000);
                curveStat.push(stat);
                N0.push(N0_loop);
                N_times.push(N_times_loop);
            }

            if (xmin < Number(rows[0].avtime) * 1000 || averageStr != "None") {
                xmin = Number(rows[0].avtime) * 1000;
            }
            var loopTime = xmin;
            while (loopTime < xmax + 1) {
                if (curveTime.indexOf(loopTime) < 0) {
                    d.push([loopTime, null]);
                } else {
                    var d_idx = curveTime.indexOf(loopTime);
                    var this_N0 = N0[d_idx];
                    var this_N_times = N_times[d_idx];
                    if (this_N0 < 0.1 * N0_max || this_N_times < 0.75 * N_times_max) {
                        d.push([loopTime, null]);
                    } else {
                        d.push([loopTime, curveStat[d_idx]]);
                    }
                }
                loopTime = loopTime + interval;
            }
            // done waiting - have results
        }
        dFuture['return']();
    });
    // wait for future to finish
    dFuture.wait();
    return {
        data: d,
        error: error,
        ymin: ymin,
        ymax: ymax,
        N0: N0,
        N_times: N_times,
        averageStr: averageStr,
        interval: interval
    };
};

dataSeries = function (plotParams, plotFunction) {
    console.log(JSON.stringify(plotParams, null, 2));
    var dataRequests = {}; // used to store data queries
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromDate = dateRange.fromDate;
    var toDate = dateRange.toDate;
    // convert dates for sql
    fromDate = moment(fromDate, "MM-DD-YYYY").format('YYYY-M-D');
    toDate = moment(toDate, "MM-DD-YYYY").format('YYYY-M-D');

    var weitemp = fromDate.split("-");
    var qxmin = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    weitemp = toDate.split("-");
    var qxmax = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);

    var matching = plotParams.plotAction === matsTypes.PlotActions.matched;
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var variableStatSet = Object.create(null);
    var yAxisMaxes = [];
    var yAxisMins = [];
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        yAxisMaxes[curveIndex] = Number.MIN_VALUE;
        yAxisMins[curveIndex] = Number.MAX_VALUE;
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var model = matsCollections.CurveParams.findOne({name: 'model'}).optionsMap[curve['model']][0];
        var region = matsCollections.RegionDescriptions.findOne({description: curve['region']}).regionMapTable;
        var tableRegion = matsCollections.CurveParams.findOne({name: 'model'}).tableMap[curve['model']][0];
        var label = curve['label'];
        var top = curve['top'];
        var bottom = curve['bottom'];
        var color = curve['color'];
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic;
        if (variableStr == 'winds') {
            statistic = statisticOptionsMap[statisticSelect][1];
        } else {
            statistic = statisticOptionsMap[statisticSelect][0];
        }
        statistic = statistic.replace(/\{\{variable0\}\}/g, variable[0]);
        statistic = statistic.replace(/\{\{variable1\}\}/g, variable[1]);
        var validTimeStr = curve['valid-time'];
        var validTimeOptionsMap = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'];
        var validTime = validTimeOptionsMap[validTimeStr][0];
        var averageStr = curve['average'];
        var averageOptionsMap = matsCollections.CurveParams.findOne({name: 'average'}, {optionsMap: 1})['optionsMap'];
        var average = averageOptionsMap[averageStr][0];
        var forecastLength = curve['forecast-length'];
        // variableStat is used to determine which axis a curve should use.
        // This variableStatSet object is used like a set and if a curve has the same
        // variable and statistic (variableStat) it will use the same axis,
        // The axis number is assigned to the variableStatSet value, which is the variableStat.
        var variableStat = variableStr + ":" + statisticSelect;
        curves[curveIndex].variableStat = variableStat; // stash the variableStat to use it later for axis options
        var xmax = Number.MIN_VALUE;
        var ymax = Number.MIN_VALUE;
        var xmin = Number.MAX_VALUE;
        var ymin = Number.MAX_VALUE;
        var interval;

        if (averageStr == "None") {
            if (validTimeStr === 'BOTH') {
                interval = 12 * 3600 * 1000;
            } else {

                interval = 24 * 3600 * 1000;
            }
        } else {
            var daycount = averageStr.replace("D", "");
            interval = daycount * 24 * 3600 * 1000;
        }
        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            var statement = "select {{average}} as avtime, " +
                "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
                "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
                "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
                "{{statistic}} " +
                " from {{model}} as m0 " +
                "  where 1=1 " +
                "{{validTime}} " +
                "and m0.fcst_len = {{forecastLength}} " +
                "and m0.mb10 >= {{top}}/10 " +
                "and m0.mb10 <= {{bottom}}/10 " +
                "and m0.date >= '{{fromDate}}' " +
                "and m0.date <= '{{toDate}}' " +
                "group by avtime " +
                "order by avtime" +
                ";";

            // build the query
            //statement = statement.replace('{{model}}', model + '_Areg' + region);
            statement = statement.replace('{{model}}', model + '_' + tableRegion + region);
            statement = statement.replace('{{top}}', top);
            statement = statement.replace('{{bottom}}', bottom);
            statement = statement.replace('{{fromDate}}', fromDate);
            statement = statement.replace('{{toDate}}', toDate);
            statement = statement.replace('{{statistic}}', statistic); // statistic replacement has to happen first
            statement = statement.replace('{{validTime}}', validTime);
            statement = statement.replace('{{forecastLength}}', forecastLength);
            statement = statement.replace('{{average}}', average);
            console.log("query=" + statement);
            dataRequests[curve.label] = statement;
            var queryResult;
            try {
                queryResult = queryDB(statement, validTimeStr, qxmin, qxmax, interval, averageStr);
                d = queryResult.data;
            } catch (e) {
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw e;
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                throw ( new Error(queryResult.error) );
            }
            if (d[0] === undefined) {
                throw new error("no data returned for curve " + curves[curveIndex].label);
            } else {
                xmin = xmin < d[0][0] ? xmin : d[0][0];
                xmax = xmax > d[d.length - 1][0] ? xmax : d[d.length - 1][0];
            }
        } else {
            // this is a difference curve
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
                    ymin = d[i][1] < ymin ? d[i][1] : ymin;
                    ymax = d[i][1] > ymax ? d[i][1] : ymax;

                } else {
                    d[i][1] = null;
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

        var sum = 0;
        for (var i = 0; i < d.length; i++) {
            sum = sum + d[i][1];
            if (d[i][1] !== null) {
                ymin = ymin < d[i][1] ? ymin : d[i][1];
                ymax = ymax > d[i][1] ? ymax : d[i][1];
            }
        }
        var mean = sum / d.length;
        var pOptions = {
            yaxis: variableStatSet[variableStat].index,
            label: label,
            // mean: "<div style='color:"+ color+"'"+ label + "- mean = " + mean.toPrecision(4)+"</div>",
            annotation: label + "- mean = " + mean.toPrecision(4),
            color: color,
            data: d,
            points: {symbol: pointSymbol, fillColor: color, show: true},
            lines: {show: true, fill: false}
        };
        dataset.push(pOptions);
        // now we have a dense array as opposed to a sparse one with nulls being the fill value, except that they may not
        // start at the same xaxis point and they may not end at the same xaxis point.
        // We have to make them start and end at the same point (the xmin value and fill missing data with nulls).
        yAxisMins[curveIndex] = ymin;
        yAxisMaxes[curveIndex] = ymax;
    }

    // if matching is true we need to iterate through the entire dataset by the x axis and null all entries that do
    // not have data in each curve.
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched)) {
        var dataIndexes = {};
        var ci;
        var sci;
        for (ci = 0; ci < curvesLength; ci++) {
            dataIndexes[ci] = 0;
            yAxisMins[ci] = Number.MAX_VALUE;
            yAxisMaxes[ci] = Number.MIN_VALUE;

        }
        // for matching - the begin time must be the first coinciding time for all the curves.
        // Once we know at which index the curves coincide we can increment by the interval.
        //xin and xmax are the earliest and latest times, interval is the maximum valid time interval
        var time = xmin; // start at the minimum time
        var done = false;
        while (!done) {
            var same = true;
            for (ci = 0; ci < curvesLength; ci++) {
                if (dataIndexes[ci] >= dataset[ci].data.length) {
                    same = false;
                    done = true; // I went past the end - no coinciding points
                    break;
                }
                if (ci == curvesLength - 1) {
                    if (dataset[ci].data[dataIndexes[ci]][0] > dataset[0].data[dataIndexes[0]][0]) {
                        dataIndexes[0]++;
                        same = false;
                    }
                } else {
                    if (dataset[ci].data[dataIndexes[ci]][0] > dataset[ci + 1].data[dataIndexes[ci + 1]][0]) {
                        dataIndexes[ci + 1]++;
                        same = false;
                    }
                }
            }
            if (same) {
                done = true;
                time = dataset[0].data[dataIndexes[0]][0];
            }
        }
        var timeMatches;
        var newDataSet = [];
        while (time < xmax) {
            timeMatches = true;
            for (ci = 0; ci < curvesLength; ci++) {
                // move this curves index to equal or exceed the new time
                while (dataset[ci].data[dataIndexes[ci]] && dataset[ci].data[dataIndexes[ci]][0] < time) {
                    dataIndexes[ci]++;
                }
                // if the time isn't right or the data is null it doesn't match
                if (dataset[ci].data[dataIndexes[ci]] == undefined || dataset[ci].data[dataIndexes[ci]][0] != time) {
                    timeMatches = false;
                    break;
                } else {
                    // if there is no data entry here at this time it doesn't match
                    if (!(dataset[ci].data[dataIndexes[ci]] && dataset[ci].data[dataIndexes[ci]][0] && dataset[ci].data[dataIndexes[ci]][1])) {
                        timeMatches = false;
                    }
                }
            }   // for all the curves
            if (timeMatches) {
                for (sci = 0; sci < curvesLength; sci++) {
                    if (!newDataSet[sci]) {
                        newDataSet[sci] = {};
                        var keys = Object.keys(dataset[sci]);
                        for (var k = 0; k < keys.length; k++) {
                            var key = keys[k];
                            if (key == "data") {
                                newDataSet[sci][key] = [];
                            } else {
                                newDataSet[sci][key] = dataset[sci][key];
                            }
                        }
                    }
                    const valueObject = dataset[sci].data[dataIndexes[sci]];
                    const valData = valueObject[1];
                    // have to recalculate mins and maxes - might be throwing away outlier data
                    yAxisMins[sci] = (valData < yAxisMins[sci]) ? valData : yAxisMins[sci];
                    yAxisMaxes[sci] = (valData > yAxisMaxes[sci]) ? valData : yAxisMaxes[sci];
                    // push the data
                    newDataSet[sci].data.push(valueObject);
                }
            } else {
                for (sci = 0; sci < curvesLength; sci++) {
                    newDataSet[sci] = newDataSet[sci] === undefined ? {} : newDataSet[sci];
                    newDataSet[sci].data = newDataSet[sci].data === undefined ? [] : newDataSet[sci].data;
                    newDataSet[sci].data.push([time, null]);
                }
            }
            time = Number(time) + Number(interval);
        } // while time
        dataset = newDataSet;
    } // if matching

    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        ymin = yAxisMins[dsi];
        ymax = yAxisMaxes[dsi];
        var yPad = (ymax - ymin) * 0.2;
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
            min: ymin - yPad,
            max: ymax + yPad
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
            noColumns: 0,
            position: 'ne'
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
    //dataset.push( {color: 'black', points: {show: false},annotation:"", data: [[mxmin, 0, "zero"], [mxmax, 0, "zero"]]});
    var result = {
        error: error,
        data: dataset,
        options: options,
        basis: {
            plotParams: plotParams,
            queries: dataRequests
        }
    };
    plotFunction(result);
};