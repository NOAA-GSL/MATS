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
        var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        var regionClause;
        if (region === 'all_stat') {
            regionClause = "";
        } else if (region === 'all_surf') {
            regionClause = "and m0.id in(1,2,3,4,5,6,7) ";
        } else if (region === 'all_sol') {
            regionClause = "and m0.id in(8,9,10,11,12,13,14) ";
        } else {
            regionClause = "and m0.id in(" + region + ") ";
        }
        var scaleStr = curve['scale'];
        var grid_scale = Object.keys(matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap[key] === scaleStr);
        var scaleClause = "and m0.scale = " + grid_scale;
        var queryTableClause = "from surfrad as ob0, " + model + " as m0";
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var validTimeClause = "";
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
            validTimeClause = "and (m0.secs)%(24*3600)/3600 IN(" + validTimes + ")";
        }
        var forecastLength = Number(curve['forecast-length']) * 60;
        var forecastLengthClause = "and m0.fcst_len = " + forecastLength;
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var dateClause = "and ob0.secs >= " + fromSecs + " and ob0.secs <= " + toSecs;
        dateClause = dateClause + " and m0.secs >= " + fromSecs + " and m0.secs <= " + toSecs;
        var matchClause = "and m0.id = ob0.id and m0.secs = ob0.secs";
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause = statisticOptionsMap[statisticSelect][0];
        statisticClause = statisticClause.replace(/\{\{variable0\}\}/g, variable[0]);
        statisticClause = statisticClause.replace(/\{\{variable1\}\}/g, variable[1]);
        statisticClause = statisticClause.replace(/\{\{variable2\}\}/g, variable[2]);
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
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
            var statement = "select m0.secs as avtime, " +
                "count(distinct m0.secs) as N_times, " +
                "min(m0.secs) as min_secs, " +
                "max(m0.secs) as max_secs, " +
                "{{statisticClause}} " +
                "{{queryTableClause}} " +
                "where 1=1 " +
                "{{matchClause}} " +
                "{{dateClause}} " +
                "{{validTimeClause}} " +
                "{{forecastLengthClause}} " +
                "{{scaleClause}} " +
                "{{regionClause}} " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
            statement = statement.replace('{{scaleClause}}', scaleClause);
            statement = statement.replace('{{regionClause}}', regionClause);
            statement = statement.replace('{{matchClause}}', matchClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            dataRequests[label] = statement;

            if (model !== 'HRRR' && (variableStr !== 'dswrf' && statisticSelect !== 'Obs average')) {
                throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is only available for the HRRR data-source.");
            }

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

    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "dataFoundForCurve": dataFoundForCurve,
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