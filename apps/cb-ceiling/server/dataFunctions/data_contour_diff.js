/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
    matsCollections,
    matsTypes,
    matsDataUtils,
    matsDataQueryUtils,
    matsDataDiffUtils,
    matsDataCurveOpsUtils,
    matsDataProcessUtils,
    matsPlotUtils
} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataContourDiff = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.contourDiff,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": false
    };
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var dataNotFoundForAnyCurve = false;
    var showSignificance = plotParams['significance'] !== 'none';
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var xAxisParam = plotParams['x-axis-parameter'];
    var yAxisParam = plotParams['y-axis-parameter'];
    var xValClause = matsCollections.PlotParams.findOne({name: 'x-axis-parameter'}).optionsMap[xAxisParam];
    var yValClause = matsCollections.PlotParams.findOne({name: 'y-axis-parameter'}).optionsMap[yAxisParam];
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    if (curvesLength !== 2) {
        throw new Error("INFO:  There must be two added curves.");
    }
    var dataset = [];
    var axisMap = Object.create(null);

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var label = curve['label'];
        var variable = curve['variable'];
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[variable][curve['data-source']][0];
        var modelClause = "AND m0.model='" + model + "' ";
        var queryTableClause = "FROM mdata m0";
        var validTimeClause = "";
        var forecastLengthClause = "";
        var dateString = "";
        if (xAxisParam !== 'Threshold' && yAxisParam !== 'Threshold') {
            var thresholdStr = curve['threshold'];
            if (thresholdStr === undefined) {
                throw new Error("INFO:  " + label + "'s threshold is undefined. Please assign it a value.");
            }
            var threshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[variable]).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[variable][key] === thresholdStr);
        }
        if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
            var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
            if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
                validTimeClause = "and m0.fcstValidEpoch%(24*3600)/3600 IN[" + validTimes + "]";
            }
        }
        if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
            var forecastLength = curve['forecast-length'];
            if (forecastLength === undefined) {
                throw new Error("INFO:  " + label + "'s forecast lead time is undefined. Please assign it a value.");
            }
            forecastLengthClause = "and m0.fcstLen = " + forecastLength;
        }
        if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
            dateString = "m0.fcstValidEpoch-m0.fcstLen*3600";
        } else {
            dateString = "m0.fcstValidEpoch";
        }
        var regionType = curve['region-type'];
        if (regionType === 'Select stations') {
            throw new Error("INFO:  Single/multi station plotting is not available for performance diagrams.");
        }
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === regionStr);
        var regionClause = "AND m0.region='" + region + "' ";
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause = "sum(m0.data.['" + threshold + "'].hits) hit, sum(m0.data.['" + threshold + "'].false_alarms) fa, " +
            "sum(m0.data.['" + threshold + "'].misses) miss, sum(m0.data.['" + threshold + "'].correct_negatives) cn, " +
            "ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['" + threshold + "'].hits) || ';' || " +
            "TO_STRING(m0.data.['" + threshold + "'].false_alarms) || ';' || TO_STRING(m0.data.['" + threshold + "'].misses) || ';' || " +
            "TO_STRING(m0.data.['" + threshold + "'].correct_negatives))) sub_data, count(m0.data.['" + threshold + "'].hits) N0 ";
        var dateClause = "and " + dateString + " >= " + fromSecs + " and " + dateString + " <= " + toSecs;
        var whereClause = "WHERE " +
            "m0.type='DD' " +
            "AND m0.docType='CTC' " +
            "AND m0.subset='METAR' " +
            "AND m0.version='V01' ";
        // For contours, this functions as the colorbar label.
        var statType = statisticOptionsMap[statisticSelect][0];
        curves[curveIndex]['unitKey'] = statisticOptionsMap[statisticSelect][1];

        var d = {};
        // this is a database driven curve, not a difference curve
        // prepare the query from the above parameters
        var statement = "SELECT {{xValClause}} AS xVal, " +
            "{{yValClause}} yVal, " +
            "COUNT(DISTINCT m0.fcstValidEpoch) N_times, " +
            "MIN(m0.fcstValidEpoch) min_secs, " +
            "MAX(m0.fcstValidEpoch) max_secs, " +
            "{{statisticClause}} " +
            "{{queryTableClause}} " +
            "{{whereClause}} " +
            "{{modelClause}} " +
            "{{regionClause}} " +
            "{{dateClause}} " +
            "{{validTimeClause}} " +
            "{{forecastLengthClause}} " +
            "GROUP BY {{xValClause}}, {{yValClause}} " +
            "ORDER BY xVal,yVal" +
            ";";

        statement = statement.split('{{xValClause}}').join(xValClause);
        statement = statement.split('{{yValClause}}').join(yValClause);
        statement = statement.replace('{{statisticClause}}', statisticClause);
        statement = statement.replace('{{queryTableClause}}', queryTableClause);
        statement = statement.replace('{{whereClause}}', whereClause);
        statement = statement.replace('{{modelClause}}', modelClause);
        statement = statement.replace('{{regionClause}}', regionClause);
        statement = statement.replace('{{validTimeClause}}', validTimeClause);
        statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
        statement = statement.replace('{{dateClause}}', dateClause);
        dataRequests[label] = statement;

        var queryResult;
        var startMoment = moment();
        var finishMoment;
        try {
            // send the query statement to the query function
            queryResult = matsDataQueryUtils.queryDBContour(cbPool, statement, appParams, statisticSelect);
            finishMoment = moment();
            dataRequests["data retrieval (query) time - " + label] = {
                begin: startMoment.format(),
                finish: finishMoment.format(),
                duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                recordCount: queryResult.data.xTextOutput.length
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
            dataNotFoundForAnyCurve = true;
        }

        var postQueryStartMoment = moment();
        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = d.glob_stats.mean;
        const annotation = mean === undefined ? label + "- mean = NoData" : label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = d.xmin;
        curve['xmax'] = d.xmax;
        curve['ymin'] = d.ymin;
        curve['ymax'] = d.ymax;
        curve['zmin'] = d.zmin;
        curve['zmax'] = d.zmax;
        curve['xAxisKey'] = xAxisParam;
        curve['yAxisKey'] = yAxisParam;
        const cOptions = matsDataCurveOpsUtils.generateContourCurveOptions(curve, axisMap, d, appParams);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        };
    }  // end for curves

    if (dataNotFoundForAnyCurve) {
        // we found no data for at least one curve so don't bother proceeding
        throw new Error("INFO:  No valid data for at least one curve. Try making individual contour plots to determine which one.");
    }

    // turn the two contours into one difference contour
    dataset = matsDataDiffUtils.getDataForDiffContour(dataset, appParams, showSignificance, plotParams['significance'], statisticSelect, statType === "ctc", statType === "scalar");
    plotParams.curves = matsDataUtils.getDiffContourCurveParams(plotParams.curves);
    curves = plotParams.curves;
    dataset[0]['name'] = matsPlotUtils.getCurveText(matsTypes.PlotTypes.contourDiff, curves[0]);
    dataset[1] = matsDataCurveOpsUtils.getContourSignificanceLayer(dataset);

    // process the data returned by the query
    const curveInfoParams = {"curve": curves, "statType": statType, "axisMap": axisMap};
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};