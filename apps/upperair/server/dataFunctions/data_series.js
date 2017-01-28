import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataSeries = function (plotParams, plotFunction) {
    var dataRequests = {}; // used to store data queries
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromDate = dateRange.fromDate;
    var toDate = dateRange.toDate;
    // convert dates for sql
    fromDate = moment.utc(fromDate, "MM-DD-YYYY").format('YYYY-M-D');
    toDate = moment.utc(toDate, "MM-DD-YYYY").format('YYYY-M-D');

    var weitemp = fromDate.split("-");
    var qxmin = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    weitemp = toDate.split("-");
    var qxmax = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var variableStatSet = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
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
            dataRequests[curve.label] = statement;
            var queryResult;
            try {
                queryResult = matsDataUtils.queryDB(statement, validTimeStr, qxmin, qxmax, interval, averageStr);
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
            var sum = 0;
            for (var i = 0; i < d.length; i++) {
                sum = sum + d[i][1];
                if (d[i][1] !== null) {
                    ymin = Number(ymin) < Number(d[i][1]) ? ymin : d[i][1];
                    ymax = Number(ymax) > Number(d[i][1]) ? ymax : d[i][1];
                }
            }
        } else {
            // this is a difference curve
            const diffResult = matsDataUtils.getSeriesDataForDiffCurve(dataset, ymin, ymax, diffFrom);
            d = diffResult.dataset;
            ymin = diffResult.ymin;
            ymax = diffResult.ymax;
        }
        // build options
        const pointSymbol = matsDataUtils.getPointSymbol(curveIndex);
        // some curves will share an axis based on the variable and the statistic
        // these have been stashed in the variableStat
        // Also the ymax and the ymin have to be stashed
        var yAxisIndex = 1;
        if (variableStat in variableStatSet) {
            yAxisIndex = variableStatSet[variableStat].index;
            variableStatSet[variableStat].label = variableStatSet[variableStat].label + " | " + label;
            variableStatSet[variableStat].ymin = ymin < variableStatSet[variableStat].ymin ? ymin : variableStatSet[variableStat].ymin;
            variableStatSet[variableStat].ymax = ymax > variableStatSet[variableStat].ymax ? ymax : variableStatSet[variableStat].ymax;
        } else {
            variableStatSet[variableStat] = {index: curveIndex + 1, label: label, ymin:ymin, ymax:ymax};
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
    }  // end for curves

    // now have data in each curve.
    //if matching
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched)) {
        dataset = matsDataUtils.getMatchedDataSet(dataset, interval);
    }
    // generate y-axis
    var yaxes = [];
    var yaxis = [];
    for (var dsi = 0; dsi < dataset.length; dsi++) {
        var variableStat = curves[dsi].variableStat;
        ymin = variableStatSet[variableStat].ymin;
        ymax = variableStatSet[variableStat].ymax;
        var yPad = (ymax - ymin) * 0.2;
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