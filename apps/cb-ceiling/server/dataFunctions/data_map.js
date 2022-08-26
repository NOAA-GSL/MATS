/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
    matsCollections,
    matsTypes,
    matsDataUtils,
    matsDataQueryUtils,
    matsDataCurveOpsUtils,
    matsDataPlotOpsUtils
} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataMap = function (plotParams, plotFunction) {
    const appParams = {
        "plotType": matsTypes.PlotTypes.map,
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
    var curve = curves[0];
    var label = curve['label'];
    var database = curve['database'];
    var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[database][curve['data-source']][0];
    var modelClause = "AND m0.model='" + model + "' ";
    var queryTableClause = "FROM mdata AS m0 USE INDEX (ix_subset_version_model_fcstLen_fcstValidEpoc) " +
        "JOIN mdata AS o USE INDEX(adv_fcstValidEpoch_docType_subset_version_type) " +
        "ON o.fcstValidEpoch = m0.fcstValidEpoch " +
        "UNNEST o.data AS odata " +
        "UNNEST m0.data AS m0data ";
    var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
    var thresholdStr = curve['threshold'];
    var threshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[database]).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[database][key] === thresholdStr);
    var validTimeClause = "";
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = "and m0.fcstValidEpoch%(24*3600)/3600 IN[" + validTimes + "]";
    }
    var forecastLength = curve['forecast-length'];
    var forecastLengthClause = "AND m0.fcstLen = " + forecastLength;
    var statistic = curve['statistic'];
    var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
    if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
        var sitesClause = " and m0data.name in ['" + sitesList.join("','") + "']";
        sitesClause = sitesClause + " and odata.name in ['" + sitesList.join("','") + "']";
        var siteMatchClause = "and m0data.name = odata.name ";
    } else {
        throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
    }
    var statisticClause = "SUM(CASE WHEN m0data.Ceiling < " + threshold + " " +
        "AND odata.Ceiling < " + threshold + " THEN 1 ELSE 0 END) AS hit, " +
        "SUM(CASE WHEN m0data.Ceiling < " + threshold + " " +
        "AND NOT odata.Ceiling < " + threshold + " THEN 1 ELSE 0 END) AS fa, " +
        "SUM(CASE WHEN NOT m0data.Ceiling < " + threshold + " " +
        "AND odata.Ceiling < " + threshold + " THEN 1 ELSE 0 END) AS miss, " +
        "SUM(CASE WHEN NOT m0data.Ceiling < " + threshold + " " +
        "AND NOT odata.Ceiling < " + threshold + " THEN 1 ELSE 0 END) AS cn, " +
        "SUM(CASE WHEN m0data.Ceiling IS NOT MISSING " +
        "AND odata.Ceiling IS NOT MISSING THEN 1 ELSE 0 END) AS N0, " +
        "ARRAY_AGG(TO_STRING(m0.fcstValidEpoch) || ';' || CASE WHEN m0data.Ceiling < " + threshold + " " +
        "AND odata.Ceiling < " + threshold + " THEN '1' ELSE '0' END || ';' || CASE WHEN m0data.Ceiling < " + threshold + " " +
        "AND NOT odata.Ceiling < " + threshold + " THEN '1' ELSE '0' END || ';' || CASE WHEN NOT m0data.Ceiling < " + threshold + " " +
        "AND odata.Ceiling < " + threshold + " THEN '1' ELSE '0' END || ';' || CASE WHEN NOT m0data.Ceiling < " + threshold + " " +
        "AND NOT odata.Ceiling < " + threshold + " THEN '1' ELSE '0' END) AS sub_data ";
    var dateClause = "and m0.fcstValidEpoch >= " + fromSecs + " and m0.fcstValidEpoch <= " + toSecs + " and m0.fcstValidEpoch = o.fcstValidEpoch";
    var whereClause = "AND m0.type='DD' " +
        "AND m0.docType='model' " +
        "AND m0.subset='METAR' " +
        "AND m0.version='V01' ";
    var siteDateClause = "and o.fcstValidEpoch >= " + fromSecs + " and o.fcstValidEpoch <= " + toSecs;
    var siteWhereClause = "WHERE o.type='DD' " +
        "AND o.docType='obs' " +
        "AND o.subset='METAR' " +
        "AND o.version='V01' ";

    var statement = "SELECT m0.data[*].name AS sta_id, " +
        "COUNT(DISTINCT m0.fcstValidEpoch) N_times, " +
        "MIN(m0.fcstValidEpoch) min_secs, " +
        "MAX(m0.fcstValidEpoch) max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "{{siteWhereClause}} " +
        "{{whereClause}} " +
        "{{modelClause}} " +
        "{{validTimeClause}} " +
        "{{sitesClause}} " +
        "{{siteMatchClause}} " +
        "{{forecastLengthClause}} " +
        "{{siteDateClause}} " +
        "{{dateClause}} " +
        "GROUP BY m0.data[*].name " +
        "ORDER BY sta_id" +
        ";";

    statement = statement.replace('{{statisticClause}}', statisticClause);
    statement = statement.replace('{{queryTableClause}}', queryTableClause);
    statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
    statement = statement.replace('{{sitesClause}}', sitesClause);
    statement = statement.replace('{{whereClause}}', whereClause);
    statement = statement.replace('{{siteWhereClause}}', siteWhereClause);
    statement = statement.replace('{{modelClause}}', modelClause);
    statement = statement.replace('{{validTimeClause}}', validTimeClause);
    statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
    statement = statement.replace('{{dateClause}}', dateClause);
    statement = statement.replace('{{siteDateClause}}', siteDateClause);
    dataRequests[label] = statement;

    var queryResult;
    var startMoment = moment();
    var finishMoment;
    try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBMapCTC(cbPool, statement, model, statistic, siteMap, appParams);
        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + label] = {
            begin: startMoment.format(),
            finish: finishMoment.format(),
            duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
            recordCount: queryResult.data.length
        };
        // get the data back from the query
        var d = queryResult.data;
        var dPurple = queryResult.dataPurple;
        var dBlue = queryResult.dataBlue;
        var dGreen = queryResult.dataGreen;
        var dOrange = queryResult.dataOrange;
        var dRed = queryResult.dataRed;
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
    }

    var cOptions = matsDataCurveOpsUtils.generateCTCMapCurveOptions(curve, d, appParams);  // generate map with site data
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCPurpleCurveText, dPurple);  // generate purple text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCPurpleBlueCurveText, dPurple);  // generate purple text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCBlueCurveText, dBlue);  // generate blue text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCBlueGreenCurveText, dBlue);  // generate blue text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCGreenCurveText, dGreen);  // generate green text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCGreenYellowCurveText, dGreen);  // generate green text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCYellowCurveText, dGreen);  // generate green text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCOrangeCurveText, dOrange);  // generate orange text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCOrangeRedCurveText, dOrange);  // generate orange text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCRedCurveText, dRed);  // generate red text layer
    dataset.push(cOptions);

    const resultOptions = matsDataPlotOpsUtils.generateMapPlotOptions(true);
    var totalProcessingFinish = moment();
    dataRequests["total retrieval and processing time for curve set"] = {
        begin: totalProcessingStart.format(),
        finish: totalProcessingFinish.format(),
        duration: moment.duration(totalProcessingFinish.diff(totalProcessingStart)).asSeconds() + ' seconds'
    };
    var result = {
        error: error,
        data: dataset,
        options: resultOptions,
        basis: {
            plotParams: plotParams,
            queries: dataRequests
        }
    };
    plotFunction(result);
};