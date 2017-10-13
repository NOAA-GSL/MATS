import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataDieOff = function (plotParams, plotFunction) {
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProecssingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromDate = dateRange.fromDate;
    var toDate = dateRange.toDate;
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    // convert dates for sql
    fromDate = moment.utc(fromDate, "MM-DD-YYYY").format('YYYY-M-D');
    toDate = moment.utc(toDate, "MM-DD-YYYY").format('YYYY-M-D');

    // var weitemp = fromDate.split("-");
    // var qxmin = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
    // weitemp = toDate.split("-");
    // var qxmax = Date.UTC(weitemp[0], weitemp[1] - 1, weitemp[2]);
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
        var thresholdStr = curve['threshold'];
        var threshold = matsCollections.CurveParams.findOne({name: 'threshold'}).optionsMap[curve['threshold']][0];
        var label = curve['label'];
        var top = curve['top'];
        var bottom = curve['bottom'];
        var color = curve['color'];

        var statisticSelect = curve['statistic'];
        // formula depends on stats (rms vs bias), also variables like temperature and dew points need convert from f to c
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic;
        statistic = statisticOptionsMap[statisticSelect][0];
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];

        const forecastLength = curve['dieoff-forecast-length'];
        if (forecastLength !== "dieoff") {
            throw new Error("INFO:  non dieoff curves are not yet supported");
        }
        // axisKey is used to determine which axis a curve should use.
        // This axisMap object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisMap value, which is the axisKey.
        var axisKey =  statisticSelect;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var interval;
        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            var statement = "SELECT " +
                "m0.fcst_len AS avtime " +
                ",min(m0.time) as min_secs" +
                ",max(m0.time) as max_secs" +
                ",{{statistic}} " +
                ",count(m0.nn)/1000 as Nhrs0" +
                ",avg(m0.yy+m0.ny+0.000)/1000 as Nlow0" +
                ",avg(m0.yy+m0.ny+m0.yn+m0.nn+0.000)/1000 as Ntot0" +
                " from {{model}}_{{region}} as m0" +
                " where 1=1" +
                " {{validTimeClause}}" +
                " and m0.yy+m0.ny+m0.yn+m0.nn > 0" +
                " and m0.time >= {{fromSecs}} and m0.time <  {{toSecs}} " +
                " and m0.trsh = {{threshold}} " +
                " group by avtime" +
                " order by avtime;";

            statement = statement.replace('{{model}}', model);
            statement = statement.replace('{{region}}', region);
            statement = statement.replace('{{top}}', top);
            statement = statement.replace('{{bottom}}', bottom);
            statement = statement.replace('{{fromSecs}}', fromSecs);
            statement = statement.replace('{{toSecs}}', toSecs);
            statement = statement.replace('{{statistic}}', statistic); // statistic replacement has to happen first
            statement = statement.replace('{{threshold}}', threshold);
            var validTimeClause = " ";
            if (validTimes.length != 0) {
                validTimeClause = " and floor((m0.time)%(24*3600)/3600) IN(" + validTimes + ")"
            }
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            dataRequests[curve.label] = statement;
            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                queryResult = matsDataUtils.queryDieoffDB(sumPool,statement, interval);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + curve.label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.length
                }
            d = queryResult.data;
            } catch (e) {
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw new Error(e.message);
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
                    // This is NOT an error just a no data condition
                    dataFoundForCurve = false;
                } else {
                error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                throw (new Error(error));
            }
            }

            var postQueryStartMoment = moment();
            if (dataFoundForCurve) {
                xmin = xmin < d[0][0] ? xmin : d[0][0];
                xmax = xmax > d[d.length - 1][0] ? xmax : d[d.length - 1][0];
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
        var postQueryFinishMoment = moment();
        dataRequests["post data retreival (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        }
    }  // end for curves

    //if matching
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched)) {
        dataset = matsDataUtils.getDieOffMatchedDataSet(dataset, maxRunInterval);
        }

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    dataset.push({color:'black',points:{show:false},annotation:"",data:[[xmin,0,"zero"],[xmax,0,"zero"]]});
    const resultOptions = matsDataUtils.generateDieoffPlotOptions( dataset, curves, axisMap );
    var totalProecssingFinish = moment();
    dataRequests["total retrieval and processing time for curve set"] = {
        begin: totalProecssingStart.format(),
        finish: totalProecssingFinish.format(),
        duration: moment.duration(totalProecssingFinish.diff(totalProecssingStart)).asSeconds() + ' seconds'
    }

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