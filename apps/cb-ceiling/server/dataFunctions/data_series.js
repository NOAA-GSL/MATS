/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsCollections } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsDataUtils } from 'meteor/randyp:mats-common';
import { matsDataQueryUtils } from 'meteor/randyp:mats-common';
import { matsDataDiffUtils } from 'meteor/randyp:mats-common';
import { matsDataCurveOpsUtils } from 'meteor/randyp:mats-common';
import { matsDataProcessUtils } from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';



dataSeries = function (plotParams, plotFunction)
{
    // initialize variables common to all curves
    const appParams = {
        plotType: matsTypes.PlotTypes.timeSeries,
        matching: plotParams["plotAction"] === matsTypes.PlotActions.matched,
        completeness: plotParams["completeness"],
        outliers: plotParams["outliers"],
        hideGaps: plotParams["noGapsCheck"],
        hasLevels: false,
    };
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var dataFoundForAnyCurve = false;
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    console.log(JSON.stringify(plotParams, null, 2));
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    var dataset = [];
    var utcCycleStarts = [];
    var axisMap = Object.create(null);
    var xmax = -1 * Number.MAX_VALUE;
    var ymax = -1 * Number.MAX_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var idealValues = [];
    var statement = "";

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++)
    {
        // initialize variables specific to each curve

        queryTemplate_region = queryTemplate_region.replace(
            /vxFROM_SECS/g,
            fromSecs
        );
        queryTemplate_stations = queryTemplate_stations.replace(
            /vxFROM_SECS/g,
            fromSecs
        );
        queryTemplate_region = queryTemplate_region.replace(/vxTO_SECS/g, toSecs);
        queryTemplate_stations = queryTemplate_stations.replace(
            /vxTO_SECS/g,
            toSecs
        );

        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var label = curve['label'];
        var variable = curve['variable'];
        var model = matsCollections['data-source'].findOne({ name: 'data-source' }).optionsMap[variable][curve['data-source']][0];
        var modelClause = "AND m0.model='" + model + "' ";
        var queryTableClause;
        var thresholdStr = curve['threshold'];
        var threshold = Object.keys(matsCollections['threshold'].findOne({ name: 'threshold' }).valuesMap[variable]).find(key => matsCollections['threshold'].findOne({ name: 'threshold' }).valuesMap[variable][key] === thresholdStr);
        threshold = threshold.replace(/_/g, ".");
        var validTimeClause = "";
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused)
        {
            validTimeClause = "and m0.fcstValidEpoch%(24*3600)/3600 IN[" + validTimes + "]";
        }
        var forecastLength = curve['forecast-length'];
        var forecastLengthClause = "AND m0.fcstLen = " + forecastLength;
        var dateClause;
        var siteDateClause = "";
        var siteMatchClause = "";
        var sitesClause = "";
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({ name: 'statistic' }, { optionsMap: 1 })['optionsMap'];
        var statisticClause;
        var regionType = curve['region-type'];
        var regionClause = "";
        var whereClause;
        var siteWhereClause = "";
        if (regionType === 'Predefined region')
        {
            queryTableClause = "from vxDBTARGET  m0";
            var regionStr = curve['region'];
            var region = Object.keys(matsCollections['region'].findOne({ name: 'region' }).valuesMap).find(key => matsCollections['region'].findOne({ name: 'region' }).valuesMap[key] === regionStr);
            regionClause = "AND m0.region='" + region + "' ";
            statisticClause = "sum(m0.data.['" + threshold + "'].hits) hit, sum(m0.data.['" + threshold + "'].false_alarms) fa, " +
                "sum(m0.data.['" + threshold + "'].misses) miss, sum(m0.data.['" + threshold + "'].correct_negatives) cn, " +
                "ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['" + threshold + "'].hits) || ';' || " +
                "TO_STRING(m0.data.['" + threshold + "'].false_alarms) || ';' || TO_STRING(m0.data.['" + threshold + "'].misses) || ';' || " +
                "TO_STRING(m0.data.['" + threshold + "'].correct_negatives))) sub_data, count(m0.data.['" + threshold + "'].hits) N0 ";
            dateClause = "and m0.fcstValidEpoch >= " + fromSecs + " and m0.fcstValidEpoch <= " + toSecs;
            whereClause = "WHERE " +
                "m0.type='DD' " +
                "AND m0.docType='CTC' " +
                "AND m0.subset='METAR' " +
                "AND m0.version='V01' ";
        } else
        {
            queryTableClause = "from vxDBTARGET  AS m0 " +
                "JOIN mdata AS o " +
                "ON o.fcstValidEpoch = m0.fcstValidEpoch " +
                "UNNEST o.data AS odata " +
                "UNNEST m0.data AS m0data ";
            var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
            if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused)
            {
                sitesClause = " and m0data.name in ['" + sitesList.join("','") + "']";
                sitesClause = sitesClause + " and odata.name in ['" + sitesList.join("','") + "']";
                siteMatchClause = "and m0data.name = odata.name ";
            } else
            {
                throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
            }
            statement = queryTemplate_stations;
        }
        var averageStr = curve['average'];
        var averageOptionsMap = matsCollections['average'].findOne({ name: 'average' }, { optionsMap: 1 })['optionsMap'];
        var average = averageOptionsMap[averageStr][0];
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var statType = statisticOptionsMap[statisticSelect][0];
        var axisKey = statisticOptionsMap[statisticSelect][1];
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var idealVal = statisticOptionsMap[statisticSelect][2];
        if (idealVal !== null && idealValues.indexOf(idealVal) === -1)
        {
            idealValues.push(idealVal);
        }

        var d;
        if (diffFrom == null)
        {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "SELECT {{average}} AS avtime, " +
                "COUNT(DISTINCT m0.fcstValidEpoch) N_times, " +
                "MIN(m0.fcstValidEpoch) min_secs, " +
                "MAX(m0.fcstValidEpoch) max_secs, " +
                "{{statisticClause}} " +
                "{{queryTableClause}} " +
                "{{siteWhereClause}} " +
                "{{whereClause}} " +
                "{{modelClause}} " +
                "{{regionClause}} " +
                "{{forecastLengthClause}} " +
                "{{validTimeClause}} " +
                "{{siteDateClause}} " +
                "{{dateClause}} " +
                "{{sitesClause}} " +
                "{{siteMatchClause}} " +
                "GROUP BY {{average}} " +
                "ORDER BY avtime" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
            statement = statement.replace('{{sitesClause}}', sitesClause);
            statement = statement.replace('{{whereClause}}', whereClause);
            statement = statement.replace('{{siteWhereClause}}', siteWhereClause);
            statement = statement.replace('{{modelClause}}', modelClause);
            statement = statement.replace('{{regionClause}}', regionClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            statement = statement.replace('{{siteDateClause}}', siteDateClause);
            statement = statement.split('{{average}}').join(average);

            statement = cbPool.trfmSQLForDbTarget(statement);
            dataRequests[label] = statement;

            // math is done on forecastLength later on -- set all analyses to 0
            if (forecastLength === "-99")
            {
                forecastLength = "0";
            }

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try
            {
                // send the query statement to the query function
                fs.writeFileSync(
                    "/Users/gopa.padmanabhan/scratch/appout.sql",
                    statement,
                    "utf8"
                );
                // console.log(statement);
                queryResult = matsDataQueryUtils.queryDBTimeSeries(
                    cbPool,
                    statement,
                    model,
                    forecastLength,
                    fromSecs,
                    toSecs,
                    averageStr,
                    statisticSelect,
                    validTimes,
                    appParams,
                    false
                );
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration:
                        moment.duration(finishMoment.diff(startMoment)).asSeconds() +
                        " seconds",
                    recordCount: queryResult.data.x.length,
                };
                // get the data back from the query
                d = queryResult.data;
            } catch (e)
            {
                // this is an error produced by a bug in the query function, not an error returned by the mysql database
                e.message =
                    "Error in queryDB: " + e.message + " for statement: " + statement;
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
                    error +=
                        "Error from verification query: <br>" +
                        queryResult.error +
                        "<br> query: <br>" +
                        statement +
                        "<br>";
                    throw new Error(error);
                }
            } else
            {
                dataFoundForAnyCurve = true;
            }

            // set axis limits based on returned data
            var postQueryStartMoment = moment();
            if (dataFoundForCurve)
            {
                xmin = xmin < d.xmin ? xmin : d.xmin;
                xmax = xmax > d.xmax ? xmax : d.xmax;
                ymin = ymin < d.ymin ? ymin : d.ymin;
                ymax = ymax > d.ymax ? ymax : d.ymax;
            }
        } else
        {
            // this is a difference curve
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(
                dataset,
                diffFrom,
                appParams,
                statType === "ctc",
                statType === "scalar"
            );
            d = diffResult.dataset;
            xmin = xmin < d.xmin ? xmin : d.xmin;
            xmax = xmax > d.xmax ? xmax : d.xmax;
            ymin = ymin < d.ymin ? ymin : d.ymin;
            ymax = ymax > d.ymax ? ymax : d.ymax;
        }

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = d.sum / d.x.length;
        const annotation =
            mean === undefined
                ? label + "- mean = NoData"
                : label + "- mean = " + mean.toPrecision(4);
        curve["annotation"] = annotation;
        curve["xmin"] = d.xmin;
        curve["xmax"] = d.xmax;
        curve["ymin"] = d.ymin;
        curve["ymax"] = d.ymax;
        curve["axisKey"] = axisKey;
        const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(
            curve,
            curveIndex,
            axisMap,
            d,
            appParams
        ); // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration:
                moment
                    .duration(postQueryFinishMoment.diff(postQueryStartMoment))
                    .asSeconds() + " seconds",
        };
    } // end for curves

    if (!dataFoundForAnyCurve)
    {
        // we found no data for any curves so don't bother proceeding
        throw new Error("INFO:  No valid data for any curves.");
    }

    // process the data returned by the query
    const curveInfoParams = {
        curves: curves,
        curvesLength: curvesLength,
        idealValues: idealValues,
        utcCycleStarts: utcCycleStarts,
        statType: statType,
        axisMap: axisMap,
        xmax: xmax,
        xmin: xmin,
    };
    const bookkeepingParams = {
        dataRequests: dataRequests,
        totalProcessingStart: totalProcessingStart,
    };
    const bookkeepingParams = { "dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart };
    var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};
