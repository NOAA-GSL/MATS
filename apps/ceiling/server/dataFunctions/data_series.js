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
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
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
    var axisMap = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var maxRunInterval = Number.MIN_VALUE;
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var model = matsCollections.CurveParams.findOne({name: 'model'}).optionsMap[curve['model']][0];
        var region = curve['region'];
        var threshHold = matsCollections.CurveParams.findOne({name: 'threshHold'}).optionsMap[curve['threshHold']][0];
        var label = curve['label'];
        var top = curve['top'];
        var bottom = curve['bottom'];
        var color = curve['color'];

        var statisticSelect = curve['statistic'];
        // formula depends on stats (rms vs bias), also variables like temperature and dew points need convert from f to c
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic;
        statistic = statisticOptionsMap[statisticSelect][0];
        var validTimeStr = curve['valid-time'];
        // var validTimeOptionsMap = matsCollections.CurveParams.findOne({name: 'valid time'}, {optionsMap: 1})['optionsMap'];
        // var validTime = validTimeOptionsMap[validTimeStr][0];

        var averageStr = curve['average'];
        var averageOptionsMap = matsCollections.CurveParams.findOne({name: 'average'}, {optionsMap: 1})['optionsMap'];
        var average = averageOptionsMap[averageStr][0];
        var forecastLength = curve['forecast-length'];
        // axisKey is used to determine which axis a curve should use.
        // This axisMap object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisMap value, which is the axisKey.
        var axisKey = statisticSelect;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var interval;
        interval = 1 * 3600 * 1000;
        if (averageStr == "None") {
            if (model.search('FIM') >= 0) {
                interval = 12 * 3600 * 1000;
            }
            else if (model.search('GFS') >= 0) {
                interval = 6 * 3600 * 1000;
            }
            else if (model.search('NAM') >= 0) {
                interval = 6 * 3600 * 1000;
            }
            else if (model.search('RR') >= 0) {
                interval = 1 * 3600 * 1000;
            }
            else if (model.search('RAP') >= 0) {
                interval = 1 * 3600 * 1000;
            }

        } else {
            var daycount = averageStr.replace("D", "");
            interval = daycount * 24 * 3600 * 1000;
        }
        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            var statement = "select {{average}} as avtime " +
                " ,min(m0.time) as min_secs" +
                ",max(m0.time) as max_secs" +
                ", {{statistic}} " +
                "from {{model}}_{{threshHold}}_{{forecastLength}}_{{region}} as m0" +
                " where 1=1" +
                "{{validTime}} " +
                " and m0.yy+m0.ny+m0.yn+m0.nn > 0" +
                " and m0.time >= {{fromSecs}} and m0.time <  {{toSecs}} " +
                " group by avtime" +
                " order by avtime;";

            statement = statement.replace('{{average}}', average);
            statement = statement.replace('{{model}}', model);
            statement = statement.replace('{{threshHold}}', threshHold);
            statement = statement.replace('{{forecastLength}}', forecastLength);
            statement = statement.replace('{{region}}', region);
            statement = statement.replace('{{fromSecs}}', fromSecs);
            statement = statement.replace('{{toSecs}}', toSecs);
            statement = statement.replace('{{statistic}}', statistic);
            var validTime = " ";
            if (validTimeStr != "All") {
                // validTime =" and floor((m0.time)%(24*3600)/3600) IN(0,3) "
                validTime = " and floor((m0.time)%(24*3600)/3600) IN(" + validTimeStr + ")"
            }
            statement = statement.replace('{{validTime}}', validTime);
            dataRequests[curve.label] = statement;
            var queryResult;
            try {
                queryResult = matsDataUtils.querySeriesDB(sumPool,statement, validTimeStr, qxmin, qxmax, interval, averageStr);
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
        } else {
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
        maxRunInterval = interval > maxRunInterval ? interval : maxRunInterval;
    }  // end for curves

    //if matching
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched)) {
        dataset = matsDataUtils.getMatchedDataSet(dataset, maxRunInterval);
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