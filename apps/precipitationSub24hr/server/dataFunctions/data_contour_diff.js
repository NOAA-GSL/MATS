/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
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
    var dataFoundForAnyCurve = false;
    var showSignificance = false;
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    if (curvesLength !== 2) {
        throw new Error("INFO:  There must be two added curves.");
    }
    if (curves[0]['x-axis-parameter'] !== curves[1]['x-axis-parameter'] || curves[0]['y-axis-parameter'] !== curves[1]['y-axis-parameter']) {
        throw new Error("INFO:  The x-axis-parameter and y-axis-parameter must be consistent across both curves.");
    }
    var dataset = [];
    var axisMap = Object.create(null);

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var label = curve['label'];
        var xAxisParam = curve['x-axis-parameter'];
        var yAxisParam = curve['y-axis-parameter'];
        var xValClause = matsCollections['x-axis-parameter'].findOne({name: 'x-axis-parameter'}).optionsMap[xAxisParam];
        var yValClause = matsCollections['y-axis-parameter'].findOne({name: 'y-axis-parameter'}).optionsMap[yAxisParam];
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === regionStr);
        var scaleStr = curve['scale'];
        var grid_scale = Object.keys(matsCollections['scale'].findOne({name: 'scale'}).valuesMap).find(key => matsCollections['scale'].findOne({name: 'scale'}).valuesMap[key] === scaleStr);
        var queryTableClause = "from " + model + '_' + grid_scale + '_' + region + " as m0";
        var thresholdClause = "";
        var forecastLength = 0; //precip apps have no forecast length, but the query and matching algorithms still need it passed in.
        var forecastTypeStr = curve['forecast-type'];
        var forecastType = Object.keys(matsCollections['forecast-type'].findOne({name: 'forecast-type'}).valuesMap).find(key => matsCollections['forecast-type'].findOne({name: 'forecast-type'}).valuesMap[key] === forecastTypeStr);
        var forecastTypeClause = "and m0.accum_len = " + forecastType;
        var dateString = "";
        var dateClause = "";
        if (xAxisParam !== 'Threshold' && yAxisParam !== 'Threshold') {
            var thresholdStr = curve['threshold'];
            var threshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[key] === thresholdStr);
            thresholdClause = "and m0.trsh = " + threshold * 0.01;
        }
        if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
            dateString = "m0.time-m0.fcst_len*3600";
        } else {
            dateString = "m0.time";
        }
        dateClause = "and " + dateString + " >= " + fromSecs + " and " + dateString + " <= " + toSecs;
        // for contingency table apps, we currently have to deal with matching in the query.
        if (appParams.matching && curvesLength > 1) {
            var matchCurveIdx = 0;
            var mcidx;
            for (mcidx = 0; mcidx < curvesLength; mcidx++) {
                const matchCurve = curves[mcidx];
                if (curveIndex === mcidx || matchCurve.diffFrom != null) {
                    continue;
                }
                matchCurveIdx++;
                const matchModel = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[matchCurve['data-source']][0];
                const matchRegion = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === matchCurve['region']);
                const matchScale = Object.keys(matsCollections['scale'].findOne({name: 'scale'}).valuesMap).find(key => matsCollections['scale'].findOne({name: 'scale'}).valuesMap[key] === matchCurve['scale']);
                queryTableClause = queryTableClause + ", " + matchModel + "_" + matchScale + "_" + matchRegion + " as m" + matchCurveIdx;
                if (xAxisParam !== 'Threshold' && yAxisParam !== 'Threshold') {
                    const matchThreshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[key] === matchCurve['threshold']);
                    thresholdClause = thresholdClause + " and m" + matchCurveIdx + ".trsh = " + matchThreshold * 0.01;
                } else {
                    thresholdClause = thresholdClause + " and m0.trsh = m" + matchCurveIdx + ".trsh";
                }
                const matchForecastType = Object.keys(matsCollections['forecast-type'].findOne({name: 'forecast-type'}).valuesMap).find(key => matsCollections['forecast-type'].findOne({name: 'forecast-type'}).valuesMap[key] === matchCurve['forecast-type']);
                forecastTypeClause = forecastTypeClause + " and m" + matchCurveIdx + ".accum_len = " + matchForecastType;
                var matchDateString = "";
                if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
                    matchDateString = "m" + matchCurveIdx + ".time-m" + matchCurveIdx + ".fcst_len*3600";
                } else {
                    matchDateString = "m" + matchCurveIdx + ".time";
                }
                dateClause = "and m0.time = m" + matchCurveIdx + ".time " + dateClause;
                dateClause = dateClause + " and " + matchDateString + " >= " + fromSecs + " and " + matchDateString + " <= " + toSecs;
            }
        }
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause = statisticOptionsMap[statisticSelect][0];
        // For contours, this functions as the colorbar label.
        curves[curveIndex]['unitKey'] = statisticOptionsMap[statisticSelect][2];

        var d;
        // this is a database driven curve, not a difference curve
        // prepare the query from the above parameters
        var statement = "{{xValClause}} " +
            "{{yValClause}} " +
            "count(distinct {{dateString}}) as N_times, " +
            "min({{dateString}}) as min_secs, " +
            "max({{dateString}}) as max_secs, " +
            "{{statisticClause}} " +
            "{{queryTableClause}} " +
            "where 1=1 " +
            "and m0.yy+m0.ny+m0.yn+m0.nn > 0 " +
            "{{dateClause}} " +
            "{{thresholdClause}} " +
            "{{forecastTypeClause}} " +
            "group by xVal,yVal " +
            "order by xVal,yVal" +
            ";";

        statement = statement.replace('{{xValClause}}', xValClause);
        statement = statement.replace('{{yValClause}}', yValClause);
        statement = statement.replace('{{statisticClause}}', statisticClause);
        statement = statement.replace('{{queryTableClause}}', queryTableClause);
        statement = statement.replace('{{thresholdClause}}', thresholdClause);
        statement = statement.replace('{{forecastTypeClause}}', forecastTypeClause);
        statement = statement.replace('{{dateClause}}', dateClause);
        statement = statement.split('{{dateString}}').join(dateString);
        dataRequests[label] = statement;

        // math is done on forecastLength later on -- set all analyses to 0
        if (forecastLength === "-99") {
            forecastLength = "0";
        }

        var queryResult;
        var startMoment = moment();
        var finishMoment;
        try {
            // send the query statement to the query function
            queryResult = matsDataQueryUtils.queryDBContour(sumPool, statement);
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
        } else {
            dataFoundForAnyCurve = true;
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

    if (!dataFoundForAnyCurve) {
        // we found no data for any curves so don't bother proceeding
        throw new Error("INFO:  No valid data for any curves.");
    }

    // turn the two contours into one difference contour
    dataset = matsDataDiffUtils.getDataForDiffContour(dataset, showSignificance);
    plotParams.curves = matsDataUtils.getDiffContourCurveParams(plotParams.curves);
    curves = plotParams.curves;
    dataset[0]['name'] = matsPlotUtils.getCurveText(matsTypes.PlotTypes.contourDiff, curves[0]);

    // process the data returned by the query
    const curveInfoParams = {"curve": curves, "axisMap": axisMap};
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};