/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
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
        "hasLevels": true
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
    var allReturnedSubLevs = [];
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
        var queryTableClause = "";
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var validTimeClause = "";
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var forecastLength = curve['forecast-length'];
        var forecastLengthClause = "and m0.fcst_len = " + forecastLength;
        var top = curve['top'];
        var bottom = curve['bottom'];
        var siteDateClause = "";
        var siteLevelClause = "";
        var siteMatchClause = "";
        var sitesClause = "";
        var statisticClause;
        var varUnits;
        var levelVar;
        var levelClause = "";
        var queryPool;
        var regionType = curve['region-type'];
        if (regionType === 'Predefined region') {
            levelVar = "m0.mb10*10";
            var tablePrefix = matsCollections.CurveParams.findOne({name: 'data-source'}).tableMap[curve['data-source']];
            var regionStr = curve['region'];
            var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
            queryTableClause = "from " + tablePrefix + region + " as m0";
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
            var statAuxMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {statAuxMap: 1})['statAuxMap'];
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
            varUnits = statVarUnitMap[statisticSelect][variableStr];
            levelClause = "and m0.mb10 >= " + top + "/10 and m0.mb10 <= " + bottom + "/10";
            queryPool = sumPool;
        } else {
            levelVar = "m0.press";
            var obsTable = (model.includes('ret_') || model.includes('Ret_')) ? 'RAOB_reXXtro' : 'RAOB';
            queryTableClause = "from metadata as s, " + obsTable + " as o, " + model + " as m0 ";
            var variableClause;
            if (variable[2] === "t" || variable[2] === "dp") {
                variableClause = "(((m0." + variable[2] + "/10)-32)*(5/9)) - (((o." + variable[2] + "/10)-32)*(5/9))";
                varUnits = '°C';
            } else if (variable[2] === "rh") {
                variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")";
                varUnits = 'RH (%)';
            } else if (variable[2] === "ws") {
                variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")*0.44704";
                varUnits = 'm/s';
            } else if (variable[2] === "z") {
                variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")";
                varUnits = 'm';
            } else {
                throw new Error("RHobT stats are not supported for single/multi station plots");
            }
            statisticClause = 'sum({{variableClause}})/count(distinct unix_timestamp(m0.date)+3600*m0.hour) as stat, stddev({{variableClause}}) as stdev, count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N0, group_concat({{variableClause}}, ";", ceil(43200*floor(((unix_timestamp(m0.date)+3600*m0.hour)+43200/2)/43200)), ";", m0.press order by ceil(43200*floor(((unix_timestamp(m0.date)+3600*m0.hour)+43200/2)/43200)), m0.press) as sub_data';
            statisticClause = statisticClause.replace(/\{\{variableClause\}\}/g, variableClause);
            curves[curveIndex]['statistic'] = "Bias (Model - Obs)";
            var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
            if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
                for (var sidx = 0; sidx < sitesList.length; sidx++) {
                    const possibleSiteNames = sitesList[sidx].match(/\(([^)]*)\)[^(]*$/);
                    sitesList[sidx] = possibleSiteNames === null ? sitesList[sidx] : possibleSiteNames[possibleSiteNames.length - 1];
                }
                sitesClause = " and s.name in('" + sitesList.join("','") + "')";
            } else {
                throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
            }
            siteDateClause = "and unix_timestamp(o.date)+3600*o.hour + 1800 >= " + fromSecs + " and unix_timestamp(o.date)+3600*o.hour - 1800 <= " + toSecs;
            levelClause = "and m0.press >= " + top + " and m0.press <= " + bottom;
            siteLevelClause = "and o.press >= " + top + " and o.press <= " + bottom;
            siteMatchClause = "and s.wmoid = m0.wmoid and s.wmoid = o.wmoid and m0.date = o.date and m0.hour = o.hour and m0.press = o.press";
            queryPool = modelPool;
        }
        var dateClause = "and unix_timestamp(m0.date)+3600*m0.hour + 1800 >= " + fromSecs + " and unix_timestamp(m0.date)+3600*m0.hour - 1800 <= " + toSecs;
        var validTimeStr = curve['valid-time'];
        validTimeClause = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'][validTimeStr][0];
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
            var statement = "select ceil(43200*floor(((unix_timestamp(m0.date)+3600*m0.hour)+43200/2)/43200)) as avtime, " +
                "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
                "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
                "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
                "{{statisticClause}} " +
                "{{queryTableClause}} " +
                "where 1=1 " +
                "{{siteMatchClause}} " +
                "{{sitesClause}} " +
                "{{dateClause}} " +
                "{{siteDateClause}} " +
                "{{validTimeClause}} " +
                "{{forecastLengthClause}} " +
                "{{levelClause}} " +
                "{{siteLevelClause}} " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
            statement = statement.replace('{{sitesClause}}', sitesClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
            statement = statement.replace('{{levelClause}}', levelClause);
            statement = statement.replace('{{siteLevelClause}}', siteLevelClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            statement = statement.replace('{{siteDateClause}}', siteDateClause);
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
                allReturnedSubLevs.push(d.subLevs);
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
    var result = matsDataProcessUtils.processDataHistogram(allReturnedSubStats, allReturnedSubSecs, allReturnedSubLevs, dataset, appParams, curveInfoParams, plotParams, binParams, bookkeepingParams);
    plotFunction(result);
};