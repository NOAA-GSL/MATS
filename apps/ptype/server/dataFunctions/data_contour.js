/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

dataContour = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const plotType = matsTypes.PlotTypes.contour;
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
    var dataSourceStr = curve['data-source'];
    var data_source = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
    var variableStr = curve['variable'];
    var variable = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'][variableStr];
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
    var statistic = statisticOptionsMap[statisticSelect][0];
    var validTimeClause = "";
    var scaleClause = "";
    var forecastLengthClause = "";
    var dateClause = "";
    if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
        var forecastLength = curve['forecast-length'] * 60;
        forecastLengthClause = "and m0.fcst_len = " + forecastLength + " ";
    }
    if (xAxisParam !== 'Grid scale' && yAxisParam !== 'Grid scale') {
        var scaleStr = curve['scale'];
        var grid_scale = Object.keys(matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap[key] === scaleStr);
        scaleClause = "and m0.scale = " + grid_scale + " ";
    }
    if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
            validTimeClause = " and m0.valid_secs%(24*3600)/3600 IN(" + validTimes + ")";
        }
    }
    if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
        dateClause = "m0.valid_secs-m0.fcst_len*60";
    } else {
        dateClause = "m0.valid_secs";
    }

    // For contours, this functions as the colorbar label.
    curve['unitKey'] = statisticOptionsMap[statisticSelect][1];

    var d;
    // this is a database driven curve, not a difference curve
    // prepare the query from the above parameters
    var statement = "{{xValClause}} " +
        "{{yValClause}} " +
        "count(distinct {{dateClause}}) as N_times, " +
        "min({{dateClause}}) as min_secs, " +
        "max({{dateClause}}) as max_secs, " +
        "{{statistic}} " +
        "from {{data_source}} as m0 " +
        "where 1=1 " +
        "and {{dateClause}} >= '{{fromSecs}}' " +
        "and {{dateClause}} <= '{{toSecs}}' " +
        "{{scaleClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthClause}} " +
        "group by xVal,yVal " +
        "order by xVal,yVal" +
        ";";

    statement = statement.replace('{{xValClause}}', xValClause);
    statement = statement.replace('{{yValClause}}', yValClause);
    statement = statement.replace('{{data_source}}', data_source + '_freq_' + region);
    statement = statement.replace('{{statistic}}', statistic);
    statement = statement.replace('{{fromSecs}}', fromSecs);
    statement = statement.replace('{{toSecs}}', toSecs);
    statement = statement.replace('{{scaleClause}}', scaleClause);
    statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
    statement = statement.replace('{{validTimeClause}}', validTimeClause);
    statement = statement.split('{{variable}}').join(variable);
    statement = statement.split('{{dateClause}}').join(dateClause);
    dataRequests[curve.label] = statement;

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
        dataRequests["data retrieval (query) time - " + curve.label] = {
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
            if (error.includes('ER_NO_SUCH_TABLE')) {
                throw new Error("INFO:  The region/scale combination [" + regionStr + " and " + scaleStr + "] is not supported by the database for the model [" + dataSourceStr + "]. " +
                    "Choose a different scale to continue using this region.");
            } else {
                throw new Error(error);
            }
        }
    }

    var postQueryStartMoment = moment();

    // set curve annotation to be the curve mean -- may be recalculated later
    // also pass previously calculated axis stats to curve options
    const mean = d.glob_stats.mean;
    const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
    curve['annotation'] = annotation;
    curve['xmin'] = d.xmin;
    curve['xmax'] = d.xmax;
    curve['ymin'] = d.ymin;
    curve['ymax'] = d.ymax;
    curve['zmin'] = d.zmin;
    curve['zmax'] = d.zmax;
    curve['xAxisKey'] = xAxisParam;
    curve['yAxisKey'] = yAxisParam;
    const cOptions = matsDataCurveOpsUtils.generateContourCurveOptions(curve, axisMap, d, plotType);  // generate plot with data, curve annotation, axis labels, etc.
    dataset.push(cOptions);
    var postQueryFinishMoment = moment();
    dataRequests["post data retrieval (query) process time - " + curve.label] = {
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