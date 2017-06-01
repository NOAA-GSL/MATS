import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataSeries = function (plotParams, plotFunction) {
    var dataRequests = {}; // used to store data queries
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    // convert dates for sql
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var axisMap = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;

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
        // axisKey is used to determine which axis a curve should use.
        // This axisMap object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisMap value, which is the axisKey.
        var axisKey = thresholdStr + ":" + statisticSelect;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
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
            var queryResult;
            try {
                queryResult = matsDataUtils.querySeriesDB(sumPool,statement, validTimeStr, interval, averageStr);
            d = queryResult.data;
            } catch (e) {
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw new Error(e.message);
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                throw (new Error(error));
            }
            if (d[0] === undefined) {
                throw new error("no data returned for curve " + curves[curveIndex].label);
            } else {
                xmin = xmin < d[0][0] ? xmin : d[0][0];
                xmax = xmax > d[d.length - 1][0] ? xmax : d[d.length - 1][0];
            }
            var sum = 0;
            var count = 0;
        for (var i = 0; i < d.length; i++) {
                if (d[i][1] !== null) {
                    sum = sum + d[i][1];
                    count++;
                    ymin = Number(ymin) < Number(d[i][1]) ? ymin : d[i][1];
                    ymax = Number(ymax) > Number(d[i][1]) ? ymax : d[i][1];
        }
    }
        }else{
            // this is a difference curve
            const diffResult = matsDataUtils.getDataForSeriesDiffCurve({dataset:dataset, ymin:ymin, ymax:ymax, diffFrom:diffFrom});
            d = diffResult.dataset;
            ymin = diffResult.ymin;
            ymax = diffResult.ymax;
        }

        const mean = sum / count;
        const annotation = label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['ymin'] = ymin;
        curve['ymax'] = ymax;
        curve['axisKey'] = axisKey;
        const cOptions = matsDataUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
    }  // end for curves

    //if matching
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched)) {
        dataset = matsDataUtils.getMatchedDataSet(dataset, interval);
        }

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    dataset.push({color:'black',points:{show:false},annotation:"",data:[[xmin,0,"zero"],[xmax,0,"zero"]]});
    const resultOptions = matsDataUtils.generateSeriesPlotOptions( dataset, curves, axisMap );
    var result = {
        error: error,
        data: dataset,
        options: resultOptions,
        basis:{
            plotParams:plotParams,
            queries:dataRequests
        }
    };
    plotFunction(result);
};