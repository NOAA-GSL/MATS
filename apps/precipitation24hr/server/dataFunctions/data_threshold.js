import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataThreshold = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appName = "precipitation24hr";
    const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
    const plotType = matsTypes.PlotTypes.threshold;
    const hasLevels = false;
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProcessingStart = moment();
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    var dataset = [];
    var utcCycleStarts = [];
    var axisMap = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var idealValues = [];

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var label = curve['label'];
        var data_source = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic = statisticOptionsMap[statisticSelect][0];
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var forecastTypeStr = curve['forecast-type'];
        var forecastType = Object.keys(matsCollections.CurveParams.findOne({name: 'forecast-type'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'forecast-type'}).valuesMap[key] === forecastTypeStr);
        var scaleStr = curve['scale'];
        var scale = Object.keys(matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap[key] === scaleStr);
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = statisticOptionsMap[statisticSelect][1];
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var idealVal = statisticOptionsMap[statisticSelect][2];
        if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
            idealValues.push(idealVal);
        }

        var d;
        var sum = 0;
        var count = 0;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "SELECT m0.trsh as avtime, " +
                "count(distinct m0.time) as N_times, " +
                "min(m0.time) as min_secs, " +
                "max(m0.time) as max_secs, " +
                "{{statistic}} " +
                "from {{data_source}} as m0 " +
                "where 1=1 " +
                "and m0.time >= '{{fromSecs}}' " +
                "and m0.time <= '{{toSecs}}' " +
                "and m0.yy+m0.ny+m0.yn+m0.nn > 0 " +
                "and m0.num_fcsts = '{{forecastType}}' " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{fromSecs}}', fromSecs);
            statement = statement.replace('{{toSecs}}', toSecs);
            statement = statement.replace('{{data_source}}', data_source + '_' + scale + '_' + region);
            statement = statement.replace('{{statistic}}', statistic);
            statement = statement.replace('{{forecastType}}', forecastType);

            dataRequests[curve.label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, plotType, hasLevels);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + curve.label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.length
                };
                // get the data back from the query
                d = queryResult.data;
            } catch (e) {
                // this is an error produced by a bug in the query function, not an error returned by the mysql database
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw new Error(e.message);
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
                    // this is NOT an error just a no data condition
                    dataFoundForCurve = false;
                } else {
                    // this is an error returned by the mysql database
                    error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                    throw (new Error(error));
                }
            }

            // set axis limits based on returned data
            var postQueryStartMoment = moment();
            if (dataFoundForCurve) {
                xmin = d.xmin;
                ymin = d.ymin;
                xmax = d.xmax;
                ymax = d.ymax;
                sum = d.sum;
                count = d.x.length;
            }
        } else {
            // this is a difference curve
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, plotType, hasLevels);

            // adjust axis stats based on new data from diff curve
            d = diffResult.dataset;
            xmin = d.xmin;
            ymin = d.ymin;
            xmax = d.xmax;
            ymax = d.ymax;
            sum = d.sum;
            count = d.x.length;
        }

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = sum / count;
        const annotation = label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = xmin;
        curve['xmax'] = xmax;
        curve['ymin'] = ymin;
        curve['ymax'] = ymax;
        curve['axisKey'] = axisKey;
        const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        }
    }  // end for curves

    // process the data returned by the query
    const appParams = {"appName": appName, "plotType": plotType, "hasLevels": hasLevels, "matching": matching};
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "idealValues": idealValues,
        "utcCycleStarts": utcCycleStarts,
        "axisMap": axisMap,
        "xmax": xmax,
        "xmin": xmin
    };
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};