/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataContour = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.contour,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": false
    };
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    if (curves.length > 1) {
        throw new Error("INFO:  There must only be one added curve.");
    }
    var dataset = [];
    var axisMap = Object.create(null);

    // initialize variables specific to the curve
    var curve = curves[0];
    var label = curve['label'];
    var xAxisParam = curve['x-axis-parameter'];
    var yAxisParam = curve['y-axis-parameter'];
    var xValClause = matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}).optionsMap[xAxisParam];
    var yValClause = matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}).optionsMap[yAxisParam];
    var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
    var metarStringStr = curve['truth'];
    var metarString = Object.keys(matsCollections.CurveParams.findOne({name: 'truth'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'truth'}).valuesMap[key] === metarStringStr);
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
    var queryTableClause = "from " + model + "_" + metarString + "_" + region + " as m0";
    var variableStr = curve['variable'];
    var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
    var variable = variableOptionsMap[variableStr];
    var validTimeClause = "";
    var forecastLengthClause = "";
    var dateString = "";
    var dateClause = "";
    if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
            validTimeClause = "and m0.hour IN(" + validTimes + ")";
        }
    }
    if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
        var forecastLength = curve['forecast-length'];
        forecastLengthClause = "and m0.fcst_len = " + forecastLength;
    }
    if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
        dateString = "m0.valid_day+3600*m0.hour-m0.fcst_len*3600";
    } else {
        dateString = "m0.valid_day+3600*m0.hour";
    }
    dateClause = "and " + dateString + " >= " + fromSecs + " and " + dateString + " <= " + toSecs;
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
    var statisticClause;
    if (variableStr === '2m temperature' || variableStr === '2m dewpoint') {
        statisticClause = statisticOptionsMap[statisticSelect][0];
    } else if (variableStr === '10m wind') {
        statisticClause = statisticOptionsMap[statisticSelect][2];
    } else {
        statisticClause = statisticOptionsMap[statisticSelect][1];
    }
    statisticClause = statisticClause.replace(/\{\{variable0\}\}/g, variable[0]);
    statisticClause = statisticClause.replace(/\{\{variable1\}\}/g, variable[1]);
    var statVarUnitMap = matsCollections.CurveParams.findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
    var varUnits = statVarUnitMap[statisticSelect][variableStr];

    // For contours, this functions as the colorbar label.
    curve['unitKey'] = varUnits;

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
        "group by xVal,yVal " +
        "order by xVal,yVal" +
        ";";

    statement = statement.replace('{{xValClause}}', xValClause);
    statement = statement.replace('{{yValClause}}', yValClause);
    statement = statement.replace('{{statisticClause}}', statisticClause);
    statement = statement.replace('{{queryTableClause}}', queryTableClause);
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
            if (error.includes('Unknown column')) {
                throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is not supported by the database for the model/region [" + model + " and " + region + "].");
            } else {
                throw new Error(error);
            }
        }
    }

    if (!dataFoundForCurve) {
        // we found no data for any curves so don't bother proceeding
        throw new Error("INFO:  No valid data for any curves.");
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

    // process the data returned by the query
    const curveInfoParams = {"curve": curves, "axisMap": axisMap};
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};