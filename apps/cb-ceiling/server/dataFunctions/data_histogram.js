/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import
{
    matsCollections,
    matsTypes,
    matsDataUtils,
    matsDataQueryUtils,
    matsDataProcessUtils
} from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';

dataHistogram = function (plotParams, plotFunction)
{
    var fs = require("fs");
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

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++)
    {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];

        queryTemplate = fs.readFileSync("assets/app/sqlTemplates/tmpl_Histogram.sql", "utf8");

        var diffFrom = curve.diffFrom;
        dataFoundForCurve[curveIndex] = true;
        var label = curve['label'];
        var variable = curve['variable'];
        var model = matsCollections['data-source'].findOne({ name: 'data-source' }).optionsMap[variable][curve['data-source']][0];
        var thresholdStr = curve['threshold'];
        var threshold = Object.keys(matsCollections['threshold'].findOne({ name: 'threshold' }).valuesMap[variable]).find(key => matsCollections['threshold'].findOne({ name: 'threshold' }).valuesMap[variable][key] === thresholdStr);
        threshold = threshold.replace(/_/g, ".");
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

        var forecastLength = curve['forecast-length'];
        var forecastLengthClause = "and m0.fcstLen = " + forecastLength;
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({ name: 'statistic' }, { optionsMap: 1 })['optionsMap'];
        var regionType = curve['region-type'];
        if (regionType === 'Select stations')
        {
            throw new Error("INFO:  Single/multi station plotting is not available for histograms.");
        }
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections['region'].findOne({ name: 'region' }).valuesMap).find(key => matsCollections['region'].findOne({ name: 'region' }).valuesMap[key] === regionStr);

        queryTemplate = queryTemplate.replace(/vxFROM_SECS/g, fromSecs);
        queryTemplate = queryTemplate.replace(/vxTO_SECS/g, toSecs);
        queryTemplate = queryTemplate.replace(/vxTHRESHOLD/g, threshold);
        queryTemplate = queryTemplate.replace(/vxFCST_LEN/g, forecastLength);
        queryTemplate = queryTemplate.replace(/vxREGION/g, region);
        queryTemplate = queryTemplate.replace(/vxMODEL/g, model);

        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var statType = statisticOptionsMap[statisticSelect][0];
        var varUnits = statisticOptionsMap[statisticSelect][1];
        var axisKey = yAxisFormat;
        if (yAxisFormat === 'Relative frequency')
        {
            axisKey = axisKey + " (x100)"
        }
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

        var d;
        if (diffFrom == null)
        {
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
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(cbPool, statement, appParams, statisticSelect);
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
                    dataFoundForCurve[curveIndex] = false;
                } else
                {
                    // this is an error returned by the mysql database
                    error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                    throw (new Error(error));
                }
            } else
            {
                dataFoundForAnyCurve = true;
            }
        }
    }

    if (!dataFoundForAnyCurve)
    {
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
        "yAxisFormat": yAxisFormat,
        "varUnits": varUnits
    };
    const bookkeepingParams = {
        "alreadyMatched": alreadyMatched,
        "dataRequests": dataRequests,
        "totalProcessingStart": totalProcessingStart
    };
    var result = matsDataProcessUtils.processDataHistogram(allReturnedSubStats, allReturnedSubSecs, [], dataset, appParams, curveInfoParams, plotParams, binParams, bookkeepingParams);
    plotFunction(result);
};