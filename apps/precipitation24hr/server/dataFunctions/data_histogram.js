/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataHistogram = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.histogram,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": false
    };
    var alreadyMatched = false;
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = [];
    var dataFoundForAnyCurve = false;
    var totalProcessingStart = moment();
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    var dataset = [];
    var allReturnedSubStats = [];
    var allReturnedSubSecs = [];
    var axisMap = Object.create(null);

    // process user bin customizations
    const binParams = matsDataUtils.setHistogramParameters(plotParams);
    const yAxisFormat = binParams.yAxisFormat;
    const binNum = binParams.binNum;

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        dataFoundForCurve[curveIndex] = true;
        var label = curve['label'];
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === regionStr);
        var scaleStr = curve['scale'];
        var grid_scale = Object.keys(matsCollections['scale'].findOne({name: 'scale'}).valuesMap).find(key => matsCollections['scale'].findOne({name: 'scale'}).valuesMap[key] === scaleStr);
        var queryTableClause = "from " + model + '_' + grid_scale + '_' + region + " as m0";
        var thresholdStr = curve['threshold'];
        var threshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[key] === thresholdStr);
        var thresholdClause = "and m0.trsh = " + threshold * 0.01;
        var forecastLength = 0; //precip apps have no forecast length, but the query and matching algorithms still need it passed in.
        var forecastTypeStr = curve['forecast-type'];
        var forecastType = Object.keys(matsCollections['forecast-type'].findOne({name: 'forecast-type'}).valuesMap).find(key => matsCollections['forecast-type'].findOne({name: 'forecast-type'}).valuesMap[key] === forecastTypeStr);
        var forecastTypeClause = "and m0.num_fcsts = " + forecastType;
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var dateClause = "and m0.time >= " + fromSecs + " and m0.time <= " + toSecs;
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
                const matchThreshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[key] === matchCurve['threshold']);
                thresholdClause = thresholdClause + " and m" + matchCurveIdx + ".trsh = " + matchThreshold * 0.01;
                const matchForecastType = Object.keys(matsCollections['forecast-type'].findOne({name: 'forecast-type'}).valuesMap).find(key => matsCollections['forecast-type'].findOne({name: 'forecast-type'}).valuesMap[key] === matchCurve['forecast-type']);
                forecastTypeClause = forecastTypeClause + " and m" + matchCurveIdx + ".num_fcsts = " + matchForecastType;
                const matchDateRange = matsDataUtils.getDateRange(matchCurve['curve-dates']);
                const matchFromSecs = matchDateRange.fromSeconds;
                const matchToSecs = matchDateRange.toSeconds;
                dateClause = "and m0.time = m" + matchCurveIdx + ".time " + dateClause;
                dateClause = dateClause + " and m" + matchCurveIdx + ".time >= " + matchFromSecs + " and m" + matchCurveIdx + ".time <= " + matchToSecs;
            }
        }
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause = statisticOptionsMap[statisticSelect][0];
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var statType = statisticOptionsMap[statisticSelect][1];
        var axisKey = yAxisFormat;
        if (yAxisFormat === 'Relative frequency') {
            axisKey = axisKey + " (x100)"
        }
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select m0.time as avtime, " +
                "count(distinct m0.time) as N_times, " +
                "min(m0.time) as min_secs, " +
                "max(m0.time) as max_secs, " +
                "{{statisticClause}} " +
                "{{queryTableClause}} " +
                "where 1=1 " +
                "and m0.yy+m0.ny+m0.yn+m0.nn > 0 " +
                "{{dateClause}} " +
                "{{thresholdClause}} " +
                "{{forecastTypeClause}} " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{thresholdClause}}', thresholdClause);
            statement = statement.replace('{{forecastTypeClause}}', forecastTypeClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            dataRequests[label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, appParams, statisticSelect);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.x.length
                };
                // get the data back from the query
                d = queryResult.data;
                allReturnedSubStats.push(d.subVals); // save returned data so that we can calculate histogram stats once all the queries are done
                allReturnedSubSecs.push(d.subSecs);
            } catch (e) {
                // this is an error produced by a bug in the query function, not an error returned by the mysql database
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw new Error(e.message);
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
                    // this is NOT an error just a no data condition
                    dataFoundForCurve[curveIndex] = false;
                } else {
                    // this is an error returned by the mysql database
                    error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                    throw (new Error(error));
                }
            } else {
                dataFoundForAnyCurve = true;
            }
        }
    }

    if (!dataFoundForAnyCurve) {
        // we found no data for any curves so don't bother proceeding
        throw new Error("INFO:  No valid data for any curves.");
    }

    // process the data returned by the query
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "dataFoundForCurve": dataFoundForCurve,
        "statType": statType,
        "axisMap": axisMap,
        "yAxisFormat": yAxisFormat
    };
    const bookkeepingParams = {
        "alreadyMatched": alreadyMatched,
        "dataRequests": dataRequests,
        "totalProcessingStart": totalProcessingStart
    };
    var result = matsDataProcessUtils.processDataHistogram(allReturnedSubStats, allReturnedSubSecs, [], dataset, appParams, curveInfoParams, plotParams, binParams, bookkeepingParams);
    plotFunction(result);
};