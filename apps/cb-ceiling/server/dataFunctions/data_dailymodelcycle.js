/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataDailyModelCycle = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.dailyModelCycle,
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
    var utcCycleStarts = [];
    var axisMap = Object.create(null);
    var xmax = -1 * Number.MAX_VALUE;
    var ymax = -1 * Number.MAX_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var idealValues = [];

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var label = curve['label'];
        var database = curve['database'];
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[database][curve['data-source']][0];
        var modelClause = "AND m0.model='" + model + "' ";
        var queryTableClause;
        var thresholdStr = curve['threshold'];
        var threshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[database]).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[database][key] === thresholdStr);
        if (curve['utc-cycle-start'].length !== 1) {
            throw new Error("INFO:  Please select exactly one UTC Cycle Init Hour for this plot type.");
        }
        var utcCycleStart = Number(curve['utc-cycle-start'][0]);
        utcCycleStarts[curveIndex] = utcCycleStart;
        var utcCycleStartClause = "and (m0.fcstValidEpoch - m0.fcstLen*3600)%(24*3600)/3600 IN[" + utcCycleStart + "]";
        var forecastLengthClause = "and m0.fcstLen < 24";
        var dateClause;
        var siteDateClause = "";
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause;
        var regionType = curve['region-type'];
        var regionClause = "";
        var whereClause;
        var siteWhereClause = "";
        var groupByClause;
        if (regionType === 'Predefined region') {
            queryTableClause = "FROM mdata m0";
            var regionStr = curve['region'];
            var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === regionStr);
            regionClause = "AND m0.region='" + region + "' ";
            statisticClause = "sum(m0.data.['" + threshold + "'].hits) hit,\n sum(m0.data.['" + threshold + "'].false_alarms) fa,\n " +
                "sum(m0.data.['" + threshold + "'].misses) miss,\n sum(m0.data.['" + threshold + "'].correct_negatives) cn,\n " +
                "ARRAY_SORT(ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || TO_STRING(m0.data.['" + threshold + "'].hits) || ';' || " +
                "TO_STRING(m0.data.['" + threshold + "'].false_alarms) || ';' || TO_STRING(m0.data.['" + threshold + "'].misses) || ';' || " +
                "TO_STRING(m0.data.['" + threshold + "'].correct_negatives))) sub_data,\n count(m0.data.['" + threshold + "'].hits) N0 ";
            dateClause = "and m0.fcstValidEpoch >= " + fromSecs + " and m0.fcstValidEpoch <= " + toSecs;
            whereClause = "WHERE " +
                "m0.type='DD'\n " +
                "AND m0.docType='CTC'\n " +
                "AND m0.subset='METAR'\n " +
                "AND m0.version='V01'\n ";
            groupByClause = "group by m0.fcstValidEpoch";
        } else {
            queryTableClause = "FROM mdata AS m0 USE INDEX (ix_subset_version_model_fcstLen_fcstValidEpoc)\n " +
                "JOIN mdata AS o USE INDEX(adv_fcstValidEpoch_docType_subset_version_type) ON o.fcstValidEpoch = m0.fcstValidEpoch\n " +
                "LET pairs = ARRAY {'modelName':model.name,\n " +
                "                   'modelValue':model.Ceiling,\n " +
                "                   'observationName':FIRST observation.name FOR observation IN o.data WHEN observation.name = model.name END,\n " +
                "                   'observationValue':FIRST observation.Ceiling FOR observation IN o.data WHEN observation.name = model.name END\n " +
                "                   } FOR model IN m0.data WHEN model.name IN ['{{sitesList}}'] END,\n " +
                "   validPairs = ARRAY {'modelName':pair.modelName, 'observationName':pair.observationName} For pair IN pairs WHEN pair.modelName IS NOT missing AND pair.observationName IS NOT missing END\n";
            var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
            if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
                queryTableClause = queryTableClause.replace(/\{\{sitesList\}\}/g, sitesList.join("','"));
            } else {
                throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
            }
            statisticClause = "ARRAY_LENGTH(validPairs) AS N0,\n " +
                "ARRAY_SUM(ARRAY CASE WHEN (pair.modelValue < " + threshold + " " +
                "AND pair.observationValue < " + threshold + ") THEN 1 ELSE 0 END FOR pair IN pairs END) AS hit,\n " +
                "ARRAY_SUM(ARRAY CASE WHEN (pair.modelValue < " + threshold + " " +
                "AND NOT pair.observationValue < " + threshold + ") THEN 1 ELSE 0 END FOR pair IN pairs END) AS fa,\n " +
                "ARRAY_SUM(ARRAY CASE WHEN (NOT pair.modelValue < " + threshold + " " +
                "AND pair.observationValue < " + threshold + ") THEN 1 ELSE 0 END FOR pair IN pairs END) AS miss,\n " +
                "ARRAY_SUM(ARRAY CASE WHEN (NOT pair.modelValue < " + threshold + " " +
                "AND NOT pair.observationValue < " + threshold + ") THEN 1 ELSE 0 END FOR pair IN pairs END) AS cn\n " +
                "--validPairs";
            dateClause = "and m0.fcstValidEpoch >= " + fromSecs + " and m0.fcstValidEpoch <= " + toSecs + " and m0.fcstValidEpoch = o.fcstValidEpoch";
            whereClause = "AND " +
                "m0.type='DD'\n " +
                "AND m0.docType='model'\n " +
                "AND m0.subset='METAR'\n " +
                "AND m0.version='V01'\n ";
            siteDateClause = "and o.fcstValidEpoch >= " + fromSecs + " and o.fcstValidEpoch <= " + toSecs;
            siteWhereClause = "WHERE " +
                "o.type='DD'\n " +
                "AND o.docType='obs'\n " +
                "AND o.subset='METAR'\n " +
                "AND o.version='V01'\n ";
            groupByClause = "group by m0.fcstValidEpoch, pairs, validPairs";
        }
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var statType = statisticOptionsMap[statisticSelect][0];
        var axisKey = statisticOptionsMap[statisticSelect][1];
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var idealVal = statisticOptionsMap[statisticSelect][2];
        if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
            idealValues.push(idealVal);
        }

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "SELECT m0.fcstValidEpoch avtime,\n " +
                "COUNT(DISTINCT m0.fcstValidEpoch) N_times,\n " +
                "MIN(m0.fcstValidEpoch) min_secs,\n " +
                "MAX(m0.fcstValidEpoch) max_secs,\n " +
                "{{statisticClause}}\n " +
                "{{queryTableClause}}\n " +
                "{{siteWhereClause}}\n " +
                "{{whereClause}}\n " +
                "{{modelClause}}\n " +
                "{{regionClause}}\n " +
                "{{utcCycleStartClause}}\n " +
                "{{forecastLengthClause}}\n " +
                "{{siteDateClause}}\n " +
                "{{dateClause}}\n " +
                "{{groupByClause}}\n " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{whereClause}}', whereClause);
            statement = statement.replace('{{siteWhereClause}}', siteWhereClause);
            statement = statement.replace('{{modelClause}}', modelClause);
            statement = statement.replace('{{regionClause}}', regionClause);
            statement = statement.replace('{{utcCycleStartClause}}', utcCycleStartClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            statement = statement.replace('{{siteDateClause}}', siteDateClause);
            statement = statement.replace('{{groupByClause}}', groupByClause);
            dataRequests[label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
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
            // this is a difference curve
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, appParams, statType === "ctc", statType === "scalar");
            d = diffResult.dataset;
            xmin = xmin < d.xmin ? xmin : d.xmin;
            xmax = xmax > d.xmax ? xmax : d.xmax;
            ymin = ymin < d.ymin ? ymin : d.ymin;
            ymax = ymax > d.ymax ? ymax : d.ymax;
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
        curve['axisKey'] = axisKey;
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
        "idealValues": idealValues,
        "utcCycleStarts": utcCycleStarts,
        "statType": statType,
        "axisMap": axisMap,
        "xmax": xmax,
        "xmin": xmin
    };
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};