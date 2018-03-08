import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataMap = function (plotParams, plotFunction) {
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProecssingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromDate = dateRange.fromDate;
    var toDate = dateRange.toDate;
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
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
        var dataSource = curve['data-source'];
        var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var sitesList = curve['sites'];
        var siteLength = sitesList.length;
        var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
        var siteMapLength = siteMap.length;
        var sitePlot = [];
        var label = curve['label'];
        var color = curve['color'];
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 2})['optionsMap'];
        var variableOption = variableOptionsMap[variableStr];
        var variable = variableOption[2];
        var statisticSelect = curve['statistic'];
        var statVarUnitMap = matsCollections.CurveParams.findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
        var varUnits = statVarUnitMap[statisticSelect][variableStr];
        var forecastLength = curve['forecast-length'];
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        //CHANGED TO PLOT ON THE SAME AXIS IF SAME STATISTIC, REGARDLESS OF THRESHOLD
        var axisKey =  varUnits;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var interval;
        var d = [];
        for (var siteIndex = 0; siteIndex < siteLength; siteIndex++) {
            if (diffFrom == null) {
                var site = sitesList[siteIndex];
                // this is a database driven curve, not a difference curve
                var statement = "select s.name as sta_name, " +
                    "count(distinct m0.time) as N_times, " +
                    "min(m0.time) as min_time, " +
                    "max(m0.time) as max_time, " +
                    "sum(m0.{{variable}} - o.{{variable}})/count(distinct m0.time) as model_ob_diff " +
                    "from metars as s, obs as o, {{model}} as m0 " +
                    "where 1=1 " +
                    "and m0.fcst_len = {{forecastLength}} " +
                    "and m0.time >= '{{fromSecs}}' " +
                    "and m0.time <= '{{toSecs}}' " +
                    "and s.name = '{{station}}' " +
                    "and s.madis_id = m0.sta_id " +
                    "and s.madis_id = o.sta_id " +
                    "and m0.time = o.time " +
                    ";";

                statement = statement.replace('{{forecastLength}}', forecastLength);
                statement = statement.replace('{{fromSecs}}', fromSecs);
                statement = statement.replace('{{toSecs}}', toSecs);
                if (forecastLength == 1) {
                    statement = statement.replace('{{model}}', model + "qp1f");
                } else {
                    statement = statement.replace('{{model}}', model + "qp");
                }
                statement = statement.replace('{{variable}}', variable);
                statement = statement.replace('{{variable}}', variable);
                statement = statement.replace('{{station}}', site);

                dataRequests[curve.label + " - " + site] = statement;
                var queryResult;
                var startMoment = moment();
                var finishMoment;
                try {
                    queryResult = matsDataUtils.queryMapDB(sitePool, statement);
                    finishMoment = moment();
                    dataRequests["data retrieval (query) time - " + curve.label + " - " + site] = {
                        begin: startMoment.format(),
                        finish: finishMoment.format(),
                        duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                        recordCount: queryResult.data.length
                    }
                    d[siteIndex] = queryResult.data;

                    var tooltips = site +
                        "<br>" + "variable: " + variable +
                        "<br>" + "model: " + dataSource +
                        "<br>" + "model-obs: " + queryResult.data[0][4];

                    d[siteIndex].push(tooltips);
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
                        if (error.includes('Unknown column')) {
                            throw new Error("INFO:  The variable combination [" + variableStr + "] is not supported by the database for the model/site [" + model + " and " + site + "].");
                        } else {
                            throw new Error(error);
                        }
                    }
                }
            }
        }

        for (var siteMapIndex = 0; siteMapIndex < siteMapLength; siteMapIndex++) {
            for (var siteIndex = 0; siteIndex < siteLength; siteIndex++) {
                var site = sitesList[siteIndex];
                if (site == siteMap[siteMapIndex].name) {
                    sitePlot.push(siteMap[siteMapIndex]);
                } else {
                    continue;
                }
            }
        }

            //var postQueryStartMoment = moment();
            //if (dataFoundForCurve) {
              //  xmin = xmin < d[0][0] ? xmin : d[0][0];
              //  xmax = xmax > d[d.length - 1][0] ? xmax : d[d.length - 1][0];
              //  interval = queryResult.interval;
              //  var sum = 0;
              //  var count = 0;
              //  for (var i = 0; i < d.length; i++) {
              //      if (d[i][1] !== null) {
              //          sum = sum + d[i][1];
               //         count++;
               //         ymin = Number(ymin) < Number(d[i][1]) ? ymin : d[i][1];
               //         ymax = Number(ymax) > Number(d[i][1]) ? ymax : d[i][1];
               //     }
               // }
            //}
        //} else {
            // this is a difference curve
        //    const diffResult = matsDataUtils.getDataForSeriesDiffCurve({dataset:dataset, ymin:ymin, ymax:ymax, diffFrom:diffFrom});
        //    d = diffResult.dataset;
        //    ymin = diffResult.ymin;
        //    ymax = diffResult.ymax;
        //}

        //const mean = sum / count;
        //const annotation = label + "- mean = " + mean.toPrecision(4);
        //curve['annotation'] = annotation;
        //curve['ymin'] = ymin;
        //curve['ymax'] = ymax;
        //curve['axisKey'] = axisKey;


        const cOptions = matsDataUtils.generateMapCurveOptions(curve, curveIndex, d, sitePlot);  // generate map with site data
        dataset.push(cOptions);

        //var postQueryFinishMoment = moment();
        //dataRequests["post data retreival (query) process time - " + curve.label] = {
        //    begin: postQueryStartMoment.format(),
        //    finish: postQueryFinishMoment.format(),
        //    duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        //}

    }  // end for curves

    //if matching
    //if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched)) {
    //    dataset = matsDataUtils.getMapMatchedDataSet(dataset, interval);
    //}

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    //dataset.push({color:'black',points:{show:false},annotation:"",data:[[xmin,0,"zero"],[xmax,0,"zero"]]});
    const resultOptions = matsDataUtils.generateMapPlotOptions( dataset, curves );
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