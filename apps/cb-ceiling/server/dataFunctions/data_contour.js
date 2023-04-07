/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import
{
    matsCollections,
    matsTypes,
    matsDataUtils,
    matsDataQueryUtils,
    matsDataCurveOpsUtils,
    matsDataProcessUtils
} from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';

dataContour = function (plotParams, plotFunction)
{
    var fs = require("fs");
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
    var xAxisParam = plotParams['x-axis-parameter'];
    var yAxisParam = plotParams['y-axis-parameter'];
    var xValClause = matsCollections.PlotParams.findOne({ name: 'x-axis-parameter' }).optionsMap[xAxisParam];
    var yValClause = matsCollections.PlotParams.findOne({ name: 'y-axis-parameter' }).optionsMap[yAxisParam];
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    if (curves.length > 1)
    {
        throw new Error("INFO:  There must only be one added curve.");
    }
    var dataset = [];
    var axisMap = Object.create(null);

    // initialize variables specific to the curve
    var curve = curves[0];

    queryTemplate = fs.readFileSync("assets/app/sqlTemplates/tmpl_Contour.sql", "utf8");

    var label = curve['label'];
    var variable = curve['variable'];
    var model = matsCollections['data-source'].findOne({ name: 'data-source' }).optionsMap[variable][curve['data-source']][0];
    var dateString = "";
    if (xAxisParam !== 'Threshold' && yAxisParam !== 'Threshold')
    {
        var thresholdStr = curve['threshold'];
        if (thresholdStr === undefined)
        {
            throw new Error("INFO:  " + label + "'s threshold is undefined. Please assign it a value.");
        }
        var threshold = Object.keys(matsCollections['threshold'].findOne({ name: 'threshold' }).valuesMap[variable]).find(key => matsCollections['threshold'].findOne({ name: 'threshold' }).valuesMap[variable][key] === thresholdStr);
        threshold = threshold.replace(/_/g, ".");
    }
    if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour')
    {
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused)
        {
            queryTemplate = queryTemplate.replace(
                /vxVALID_TIMES/g,
                cbPool.trfmListToCSVString(validTimes, null, false)
            );
        } else
        {
            queryTemplate = cbPool.trfmSQLRemoveClause(
                queryTemplate,
                "vxVALID_TIMES"
            );
        }
    } else
    {
        queryTemplate = cbPool.trfmSQLRemoveClause(
            queryTemplate,
            "vxVALID_TIMES"
        );
    }

    if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time')
    {
        var forecastLength = curve['forecast-length'];
        if (forecastLength === undefined)
        {
            throw new Error("INFO:  " + label + "'s forecast lead time is undefined. Please assign it a value.");
        }
        queryTemplate = queryTemplate.replace(/vxFCST_LEN/g, forecastLength);
    } else
    {
        queryTemplate = cbPool.trfmSQLRemoveClause(
            queryTemplate,
            "vxFCST_LEN"
        );
    }

    if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date'))
    {
        dateString = "m0.fcstValidEpoch-m0.fcstLen*3600";
    } else
    {
        dateString = "m0.fcstValidEpoch";
    }
    queryTemplate = queryTemplate.replace(/vxDATE_STRING/g, dateString);

    var regionType = curve['region-type'];
    if (regionType === 'Select stations')
    {
        throw new Error("INFO:  Single/multi station plotting is not available for performance diagrams.");
    }
    var regionStr = curve['region'];
    var region = Object.keys(matsCollections['region'].findOne({ name: 'region' }).valuesMap).find(key => matsCollections['region'].findOne({ name: 'region' }).valuesMap[key] === regionStr);
    var statisticSelect = curve['statistic'];
    var statisticOptionsMap = matsCollections['statistic'].findOne({ name: 'statistic' }, { optionsMap: 1 })['optionsMap'];

    queryTemplate = queryTemplate.replace(/vxFROM_SECS/g, fromSecs);
    queryTemplate = queryTemplate.replace(/vxTO_SECS/g, toSecs);
    queryTemplate = queryTemplate.replace(/vxTHRESHOLD/g, threshold);
    queryTemplate = queryTemplate.replace(/vxREGION/g, region);
    queryTemplate = queryTemplate.replace(/vxMODEL/g, model);
    queryTemplate = queryTemplate.replace(/vxXVAL_CLAUSE/g, xValClause);
    queryTemplate = queryTemplate.replace(/vxYVAL_CLAUSE/g, yValClause);

    // For contours, this functions as the colorbar label.
    var statType = statisticOptionsMap[statisticSelect][0];
    curve['unitKey'] = statisticOptionsMap[statisticSelect][1];

    var d = {};
    // this is a database driven curve, not a difference curve
    // prepare the query from the above parameters
    statement = cbPool.trfmSQLForDbTarget(queryTemplate);
 
    dataRequests[label] = statement;

    var queryResult;
    var startMoment = moment();
    var finishMoment;
    try
    {
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
    } catch (e)
    {
        // this is an error produced by a bug in the query function, not an error returned by the mysql database
        e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
    }
    if (queryResult.error !== undefined && queryResult.error !== "")
    {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND)
        {
            // this is NOT an error just a no data condition
            dataFoundForCurve = false;
        } else
        {
            // this is an error returned by the mysql database
            error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
            throw (new Error(error));
        }
    }

    if (!dataFoundForCurve)
    {
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
    const curveInfoParams = { "curve": curves, "statType": statType, "axisMap": axisMap };
    const bookkeepingParams = { "dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart };
    var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};