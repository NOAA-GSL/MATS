/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataPerformanceDiagram = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.performanceDiagram,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": false
    };
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var dataFoundForAnyCurve = false;
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    var dataset = [];
    var axisMap = Object.create(null);
    var xmax = -1 * Number.MAX_VALUE;
    var ymax = -1 * Number.MAX_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var label = curve['label'];
        var binParam = curve['bin-parameter'];
        var binClause = matsCollections['bin-parameter'].findOne({name: 'bin-parameter'}).optionsMap[binParam];
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === regionStr);
        var queryTableClause = "from " + model + "_" + region + " as m0";
        var thresholdClause = "";
        var validTimeClause = "";
        var forecastLengthClause = "";
        var dateString = "";
        var dateClause = "";
        if (binParam !== 'Threshold') {
            var thresholdStr = curve['threshold'];
            if (thresholdStr === undefined) {
                throw new Error("INFO:  " + label + "'s threshold is undefined. Please assign it a value.");
            }
            var threshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[key] === thresholdStr);
            thresholdClause = "and m0.trsh = " + threshold;
        }
        if (binParam !== 'Valid UTC hour') {
            var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
            if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
                validTimeClause = "and floor((m0.time)%(24*3600)/900)/4 IN(" + validTimes + ")";
            }
        }
        if (binParam !== 'Fcst lead time') {
            var forecastLength = Number(curve['forecast-length']);
            var forecastHour = Math.floor(forecastLength);
            var forecastMinute = (forecastLength - forecastHour) * 60;
            if (forecastLength === undefined) {
                throw new Error("INFO:  " + label + "'s forecast lead time is undefined. Please assign it a value.");
            }
            forecastLengthClause = "and m0.fcst_len = " + forecastLength + " and m0.fcst_min = " + forecastMinute;
        }
        if (binParam === 'Init Date') {
            dateString = "m0.time-(m0.fcst_len*3600+m0.fcst_min*60)";
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
                const matchLabel = matchCurve['label'];
                const matchBinParam = matchCurve['bin-parameter'];
                const matchModel = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[matchCurve['data-source']][0];
                const matchRegion = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === matchCurve['region']);
                queryTableClause = queryTableClause + ", " + matchModel + "_" + matchRegion + " as m" + matchCurveIdx;
                if (matchBinParam !== 'Threshold') {
                    const matchThresholdStr = matchCurve['threshold'];
                    if (matchThresholdStr === undefined) {
                        throw new Error("INFO:  " + matchLabel + "'s threshold is undefined. Please assign it a value.");
                    }
                    const matchThreshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[key] === matchThresholdStr);
                    thresholdClause = thresholdClause + " and m" + matchCurveIdx + ".trsh = " + matchThreshold;
                } else {
                    thresholdClause = thresholdClause + " and m0.trsh = m" + matchCurveIdx + ".trsh";
                }
                if (matchBinParam !== 'Valid UTC hour') {
                    const matchValidTimes = matchCurve['valid-time'] === undefined ? [] : matchCurve['valid-time'];
                    if (matchValidTimes.length !== 0 && matchValidTimes !== matsTypes.InputTypes.unused) {
                        validTimeClause = validTimeClause + " and floor((m" + matchCurveIdx + ".time)%(24*3600)/900)/4 IN(" + matchValidTimes + ")";
                    }
                }
                if (matchBinParam !== 'Fcst lead time') {
                    const matchForecastLength = Number(matchCurve['forecast-length']);
                    const matchForecastHour = Math.floor(matchForecastLength);
                    const matchForecastMinute = (matchForecastLength - matchForecastHour) * 60;
                    if (matchForecastLength === undefined) {
                        throw new Error("INFO:  " + matchLabel + "'s forecast lead time is undefined. Please assign it a value.");
                    }
                    forecastLengthClause = forecastLengthClause + " and m" + matchCurveIdx + ".fcst_len = " + matchForecastLength + " and m" + matchCurveIdx + ".fcst_min = " + matchForecastMinute;
                } else {
                    forecastLengthClause = forecastLengthClause + " and m0.fcst_len = m" + matchCurveIdx + ".fcst_len and m0.fcst_min = m" + matchCurveIdx + ".fcst_min";
                }
                var matchDateString = "";
                if (matchBinParam === 'Init Date') {
                    matchDateString = "m" + matchCurveIdx + ".time-(m" + matchCurveIdx + ".fcst_len*3600+m" + matchCurveIdx + ".fcst_min*60)";
                } else {
                    matchDateString = "m" + matchCurveIdx + ".time";
                }
                dateClause = "and m0.time = m" + matchCurveIdx + ".time " + dateClause;
                dateClause = dateClause + " and " + matchDateString + " >= " + fromSecs + " and " + matchDateString + " <= " + toSecs;
            }
        }
        var statisticSelect = 'PerformanceDiagram';
        var statType = 'precalculated';
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // variable + statistic (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        curves[curveIndex].axisKey = statisticSelect; // stash the axisKey to use it later for axis options

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "{{binClause}} " +
                "count(distinct {{dateString}}) as N_times, " +
                "min({{dateString}}) as min_secs, " +
                "max({{dateString}}) as max_secs, " +
                "((sum(m0.yy)+0.00)/sum(m0.yy+m0.ny)) as pod, ((sum(m0.yn)+0.00)/sum(m0.yn+m0.yy)) as far, " +
                "sum(m0.yy+m0.ny) as oy_all, sum(m0.yn+m0.nn) as on_all, count(m0.yy) as N0 " +
                "{{queryTableClause}} " +
                "where 1=1 " +
                "and m0.yy+m0.ny+m0.yn+m0.nn > 0 " +
                "{{dateClause}} " +
                "{{thresholdClause}} " +
                "{{validTimeClause}} " +
                "{{forecastLengthClause}} " +
                "group by binVal " +
                "order by binVal" +
                ";";

            statement = statement.replace('{{binClause}}', binClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{thresholdClause}}', thresholdClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            statement = statement.split('{{dateString}}').join(dateString);
            dataRequests[label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBPerformanceDiagram(sumPool, statement);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.x.length
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

            // set axis limits based on returned data
            var postQueryStartMoment = moment();
            if (dataFoundForCurve) {
                xmin = xmin < d.xmin ? xmin : d.xmin;
                xmax = xmax > d.xmax ? xmax : d.xmax;
                ymin = ymin < d.ymin ? ymin : d.ymin;
                ymax = ymax > d.ymax ? ymax : d.ymax;
            }
        } else {
            // this is a difference curve -- not supported for ROC plots
            throw new Error("INFO:  Difference curves are not supported for performance diagrams, as they do not feature consistent x or y values across all curves.");
        }

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = d.sum / d.x.length;
        const annotation = mean === undefined ? label + "- mean = NoData" : label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = d.xmin;
        curve['xmax'] = d.xmax;
        curve['ymin'] = d.ymin;
        curve['ymax'] = d.ymax;
        curve['axisKey'] = statisticSelect;
        const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d, appParams);  // generate plot with data, curve annotation, axis labels, etc.
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

    // process the data returned by the query
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "statType": statType,
        "axisMap": axisMap,
        "xmax": xmax,
        "xmin": xmin
    };
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataPerformanceDiagram(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};