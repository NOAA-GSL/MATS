/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
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
        "hasLevels": true
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
        var xValClause = matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}).optionsMap[xAxisParam];
        var yValClause = matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}).optionsMap[yAxisParam];
        var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var tablePrefix = matsCollections.CurveParams.findOne({name: 'data-source'}).tableMap[curve['data-source']];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        var queryTableClause = "from " + tablePrefix + region + " as m0";
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var validTimeClause = "";
        var forecastLengthClause = "";
        var dateString = "";
        var dateClause = "";
        var levelClause = "";
        if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
            var validTimeStr = curve['valid-time'];
            validTimeClause = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'][validTimeStr][0];
        }
        if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
            var forecastLength = curve['forecast-length'];
            forecastLengthClause = "and m0.fcst_len = " + forecastLength;
        }
        forecastLengthClause = forecastLengthClause + " and m0.fcst_len >= 0";
        if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
            dateString = "unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600";
        } else {
            dateString = "unix_timestamp(m0.date)+3600*m0.hour";
        }
        dateClause = "and " + dateString + " >= " + fromSecs + " and " + dateString + " <= " + toSecs;
        if (xAxisParam !== 'Pressure level' && yAxisParam !== 'Pressure level') {
            var top = curve['top'];
            var bottom = curve['bottom'];
            levelClause = "and m0.mb10 >= " + top + "/10 and m0.mb10 <= " + bottom + "/10";
        }

        // for two contours it's faster to just take care of matching in the query
        if (appParams.matching) {
            var matchCurveIdx = 0;
            var mcidx;
            for (mcidx = 0; mcidx < curvesLength; mcidx++) {
                const matchCurve = curves[mcidx];
                if (curveIndex === mcidx || matchCurve.diffFrom != null) {
                    continue;
                }
                matchCurveIdx++;
                const matchModel = matsCollections.CurveParams.findOne({name: 'data-source'}).tableMap[matchCurve['data-source']];
                const matchRegion = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === matchCurve['region']);
                queryTableClause = queryTableClause + ", " + matchModel + matchRegion + " as m" + matchCurveIdx;
                if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
                    const matchValidTimes = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'][matchCurve['valid-time']][0].split('m0').join("m" + matchCurveIdx);
                    validTimeClause = validTimeClause + " " + matchValidTimes;
                }
                if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
                    const matchForecastLength = matchCurve['forecast-length'];
                    forecastLengthClause = forecastLengthClause + " and m" + matchCurveIdx + ".fcst_len = " + matchForecastLength;
                } else {
                    forecastLengthClause = forecastLengthClause + " and m0.fcst_len = m" + matchCurveIdx + ".fcst_len";
                }
                forecastLengthClause = forecastLengthClause + " and m" + matchCurveIdx + ".fcst_len >= 0";
                var matchDateString = "";
                if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
                    matchDateString = "unix_timestamp(m" + matchCurveIdx + ".date)+3600*m" + matchCurveIdx + ".hour-m" + matchCurveIdx + ".fcst_len*3600";
                } else {
                    matchDateString = "unix_timestamp(m" + matchCurveIdx + ".date)+3600*m" + matchCurveIdx + ".hour";
                }
                dateClause = "and m0.date = m" + matchCurveIdx + ".date and m0.hour = m" + matchCurveIdx + ".hour " + dateClause;
                dateClause = dateClause + " and " + matchDateString + " >= " + fromSecs + " and " + matchDateString + " <= " + toSecs;
                if (xAxisParam !== 'Pressure level' && yAxisParam !== 'Pressure level') {
                    const matchTop = matchCurve['top'];
                    const matchBottom = matchCurve['bottom'];
                    levelClause = levelClause + " and m0.mb10 = m" + matchCurveIdx + ".mb10 and m" + matchCurveIdx + ".mb10 >= " + matchTop + "/10 and m" + matchCurveIdx + ".mb10 <= " + matchBottom + "/10";    // multiselects always need an additional straight match clause
                } else {
                    levelClause = levelClause + " and m0.mb10 = m" + matchCurveIdx + ".mb10";
                }
            }
        }
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statAuxMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {statAuxMap: 1})['statAuxMap'];
        var statisticClause;
        if (variableStr === 'winds') {
            statisticClause = statisticOptionsMap[statisticSelect][1];
            statisticClause = statisticClause + "," + statAuxMap[statisticSelect + '-winds'];
        } else {
            statisticClause = statisticOptionsMap[statisticSelect][0];
            statisticClause = statisticClause + "," + statAuxMap[statisticSelect + '-other'];
        }
        statisticClause = statisticClause.replace(/\{\{variable0\}\}/g, variable[0]);
        statisticClause = statisticClause.replace(/\{\{variable1\}\}/g, variable[1]);
        var statVarUnitMap = matsCollections.CurveParams.findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
        var varUnits = statVarUnitMap[statisticSelect][variableStr];
        showSignificance = curve['significance'] !== 'none' || showSignificance;

        // For contours, this functions as the colorbar label.
        curves[curveIndex]['unitKey'] = varUnits;

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
            "{{dateClause}} " +
            "{{validTimeClause}} " +
            "{{forecastLengthClause}} " +
            "{{levelClause}} " +
            "group by xVal,yVal " +
            "order by xVal,yVal" +
            ";";

        statement = statement.replace('{{xValClause}}', xValClause);
        statement = statement.replace('{{yValClause}}', yValClause);
        statement = statement.replace('{{statisticClause}}', statisticClause);
        statement = statement.replace('{{queryTableClause}}', queryTableClause);
        statement = statement.replace('{{validTimeClause}}', validTimeClause);
        statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
        statement = statement.replace('{{levelClause}}', levelClause);
        statement = statement.replace('{{dateClause}}', dateClause);
        statement = statement.split('{{dateString}}').join(dateString);
        dataRequests[label] = statement;

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
    dataset = matsDataDiffUtils.getDataForDiffContour(dataset, showSignificance, curve['significance']);
    plotParams.curves = matsDataUtils.getDiffContourCurveParams(plotParams.curves);
    curves = plotParams.curves;
    dataset[0]['name'] = matsPlotUtils.getCurveText(matsTypes.PlotTypes.contourDiff, curves[0]);
    dataset[1] = matsDataCurveOpsUtils.getContourSignificanceLayer(dataset);

    // process the data returned by the query
    const curveInfoParams = {"curve": curves, "axisMap": axisMap};
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};