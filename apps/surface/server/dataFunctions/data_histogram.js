/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

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
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var forecastLength = curve['forecast-length'];
        var timeVar;
        var statistic;
        var queryTableClause = "";
        var siteDateClause = "";
        var siteMatchClause = "";
        var sitesClause = "";
        var forecastLengthClause = "";
        var validTimeClause = "";
        var queryPool;
        var regionType = curve['region-type'];
        if (regionType === 'Predefined region') {
            timeVar = "m0.valid_day+3600*m0.hour";
            var metarStringStr = curve['truth'];
            var metarString = Object.keys(matsCollections.CurveParams.findOne({name: 'truth'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'truth'}).valuesMap[key] === metarStringStr);
            var regionStr = curve['region'];
            var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
            queryTableClause = "from " + model + "_" + metarString + "_" + region + " as m0";
            forecastLengthClause = "and m0.fcst_len = " + forecastLength;
            var statisticSelect = curve['statistic'];
            var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
            if (variableStr === '2m temperature' || variableStr === '2m dewpoint') {
                statistic = statisticOptionsMap[statisticSelect][0];
            } else if (variableStr === '10m wind') {
                statistic = statisticOptionsMap[statisticSelect][2];
            } else {
                statistic = statisticOptionsMap[statisticSelect][1];
            }
            statistic = statistic.replace(/\{\{variable0\}\}/g, variable[0]);
            statistic = statistic.replace(/\{\{variable1\}\}/g, variable[1]);
            queryPool = sumPool;
        } else {
            timeVar = "m0.time";
            var modelTable;
            if (forecastLength === 1) {
                modelTable = model + "qp1f";
                forecastLengthClause = "";
            } else {
                modelTable = (model.includes('ret_') || model.includes('Ret_')) ? model + "p" : model + "qp";
                forecastLengthClause = "and m0.fcst_len = " + forecastLength + " "
            }
            var obsTable = (model.includes('ret_') || model.includes('Ret_')) ? 'obs_retro' : 'obs';
            queryTableClause = "from metars as s, " + obsTable + " as o, " + modelTable + " as m0 ";
            var variableClause;
            if (variable[2] === "temp" || variable[2] === "dp") {
                variableClause = "(((m0." + variable[2] + "/10)-32)*(5/9)) - (((o." + variable[2] + "/10)-32)*(5/9))";
            } else if (variable[2] === "rh") {
                variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")/10";
            } else {
                variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")*0.44704";
            }
            statistic = 'sum({{variableClause}})/count(distinct m0.time) as stat, stddev({{variableClause}}) as stdev, count(distinct m0.time) as N0, group_concat({{variableClause}}, ";", ceil(3600*floor((m0.time+1800)/3600)) order by ceil(3600*floor((m0.time+1800)/3600))) as sub_data';
            statistic = statistic.replace(/\{\{variableClause\}\}/g, variableClause);
            var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
            if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
                sitesClause = " and s.name in('" + sitesList.join("','") + "')";
            } else {
                throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
            }
            siteDateClause = "and o.time >= '{{fromSecs}}' and o.time <= '{{toSecs}}'";
            siteMatchClause = "and s.madis_id = m0.sta_id and s.madis_id = o.sta_id and m0.time = o.time";
            queryPool = sitePool;
        }
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
            validTimeClause = "and floor(({{timeVar}}+1800)%(24*3600)/3600) IN(" + validTimes + ")";   // adjust by 1800 seconds to center obs at the top of the hour
        }
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
            var statement = "select ceil(3600*floor(({{timeVar}}+1800)/3600)) as avtime, " +
                "count(distinct ceil(3600*floor(({{timeVar}}+1800)/3600))) as N_times, " +
                "min(ceil(3600*floor(({{timeVar}}+1800)/3600))) as min_secs, " +
                "max(ceil(3600*floor(({{timeVar}}+1800)/3600))) as max_secs, " +
                "{{statistic}} " +
                "{{queryTableClause}} " +
                "where 1=1 " +
                "{{siteMatchClause}} " +
                "{{sitesClause}} " +
                "and {{timeVar}} >= '{{fromSecs}}' " +
                "and {{timeVar}} <= '{{toSecs}}' " +
                "{{siteDateClause}} " +
                "{{forecastLengthClause}} " +
                "{{validTimeClause}} " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{statistic}}', statistic);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
            statement = statement.replace('{{siteDateClause}}', siteDateClause);
            statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
            statement = statement.replace('{{sitesClause}}', sitesClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.split('{{timeVar}}').join(timeVar);
            statement = statement.split('{{fromSecs}}').join(fromSecs);
            statement = statement.split('{{toSecs}}').join(toSecs);
            dataRequests[label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(queryPool, statement, appParams);
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
                    if (error.includes('Unknown column')) {
                        throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is not supported by the database for the model/region [" + model + " and " + region + "].");
                    } else {
                        throw new Error(error);
                    }
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