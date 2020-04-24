/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataPlotOpsUtils} from 'meteor/randyp:mats-common';
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
    var modelTable = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
    var obsTable = (modelTable.includes('ret_') || modelTable.includes('Ret_')) ? 'obs_retro' : 'obs';
    var queryTableClause = "from " + obsTable + " as o, " + modelTable + " as m0 ";
    var thresholdStr = curve['threshold'];
    var threshold = Object.keys(matsCollections.CurveParams.findOne({name: 'threshold'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'threshold'}).valuesMap[key] === thresholdStr);
    var validTimeClause = "";
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
            validTimeClause = "and floor((m0.time+450)%(24*3600)/900)/4 IN(" + validTimes + ")";
    }
    var forecastLength = Number(curve['forecast-length']);
    var forecastHour = Math.floor(forecastLength);
    var forecastMinute = (forecastLength - forecastHour) * 60;
    var forecastLengthClause = "and m0.fcst_len = " + forecastLength + " and m0.fcst_min = " + forecastMinute;
    var sitesClause = "";
    var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
    var statistic = curve['statistic'];
    var statisticClause = 'sum(if((m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0)) as yy,sum(if((m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0)) as yn, sum(if(NOT (m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0)) as ny, sum(if(NOT (m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0)) as nn, count(m0.ceil) as N0';
    statisticClause = statisticClause.replace(/\{\{threshold\}\}/g, threshold);
    var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
    var querySites = [];
    if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
        var thisSite;
        var thisSiteObj;
        for (var sidx = 0; sidx < sitesList.length; sidx++) {
            thisSite = sitesList[sidx];
            thisSiteObj = siteMap.find(obj => {
                return obj.origName === thisSite;
            });
            querySites.push(thisSiteObj.options.id);
        }
        sitesClause = " and m0.madis_id in('" + querySites.join("','") + "')";
    } else {
        throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
    }
    var dateClause = "and m0.time + 300 >= " + fromSecs + " and m0.time - 300 <= " + toSecs;
    var siteDateClause = "and o.time + 300 >= " + fromSecs + " and o.time - 300 <= " + toSecs;
    var siteMatchClause = "and m0.madis_id = o.madis_id and m0.time = o.time";

    var statement = "select m0.madis_id as sta_id, " +
        "count(distinct ceil(900*floor((m0.time+450)/900))) as N_times, " +
        "min(ceil(900*floor((m0.time+450)/900))) as min_secs, " +
        "max(ceil(900*floor((m0.time+450)/900))) as max_secs, " +
        "{{statisticClause}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{siteMatchClause}} " +
        "{{sitesClause}} " +
        "{{dateClause}} " +
        "{{siteDateClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthClause}} " +
        "group by sta_id " +
        "order by N0" +
        ";";

    statement = statement.replace('{{statisticClause}}', statisticClause);
    statement = statement.replace('{{queryTableClause}}', queryTableClause);
    statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
    statement = statement.replace('{{sitesClause}}', sitesClause);
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
        queryResult = matsDataQueryUtils.queryDBMapCTC(modelPool, statement, modelTable, statistic, siteMap);
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