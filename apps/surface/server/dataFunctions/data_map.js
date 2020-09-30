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
    var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
    var variableStr = curve['variable'];
    var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
    var variable = variableOptionsMap[variableStr];
    var validTimeClause = "";
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = "and floor((m0.time+1800)%(24*3600)/3600) IN(" + validTimes + ")";   // adjust by 1800 seconds to center obs at the top of the hour
    }
    var forecastLength = curve['forecast-length'];
    var forecastLengthClause = "";
    var sitesClause = "";
    var varUnits;
    var modelTable;
    if (forecastLength === 1) {
        modelTable = model + "qp1f";
        forecastLengthClause = "";
    } else {
        modelTable = (model.includes('ret_') || model.includes('Ret_')) ? model + "p" : model + "qp";
        forecastLengthClause = "and m0.fcst_len = " + forecastLength + " "
    }
    var obsTable = (model.includes('ret_') || model.includes('Ret_')) ? 'obs_retro' : 'obs';
    var queryTableClause = "from " + obsTable + " as o, " + modelTable + " as m0 ";
    var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
    var variableClause;
    var orderOfMagnitude; // approximate 10^x OOM that the returned data will be on.
    if (variable[2] === "temp" || variable[2] === "dp") {
        variableClause = "(((m0." + variable[2] + "/10)-32)*(5/9)) - (((o." + variable[2] + "/10)-32)*(5/9))";
        varUnits = '°C';
        orderOfMagnitude = 0;
    } else if (variable[2] === "rh") {
        variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")/10";
        varUnits = 'RH (%)';
        orderOfMagnitude = 0;
    } else {
        variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")*0.44704";
        varUnits = 'm/s';
        orderOfMagnitude = 0;
    }
    var statisticClause = 'avg({{variableClause}}) as stat, count(m0.time) as N0';
    statisticClause = statisticClause.replace(/\{\{variableClause\}\}/g, variableClause);
    curves[0]['statistic'] = "Bias (Model - Obs)";
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
        sitesClause = " and m0.sta_id in('" + querySites.join("','") + "')";
    } else {
        throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
    }
    var dateClause = "and m0.time >= " + fromSecs + " - 900 and m0.time <= " + toSecs + " + 900";
    var siteDateClause = "and o.time >= " + fromSecs + " - 900 and o.time <= " + toSecs + " + 900";
    var siteMatchClause = "and m0.sta_id = o.sta_id and m0.time = o.time";

    var statement = "select m0.sta_id as sta_id, " +
        "count(distinct ceil(3600*floor((m0.time+1800)/3600))) as N_times, " +
        "min(ceil(3600*floor((m0.time+1800)/3600))) as min_secs, " +
        "max(ceil(3600*floor((m0.time+1800)/3600))) as max_secs, " +
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
        "order by sta_id" +
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
        queryResult = matsDataQueryUtils.queryDBMap(sitePool, statement, model, variable, varUnits, siteMap, orderOfMagnitude);
        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + label] = {
            begin: startMoment.format(),
            finish: finishMoment.format(),
            duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
            recordCount: queryResult.data.length
        };
        // get the data back from the query
        var d = queryResult.data;
        var dBlue = queryResult.dataBlue;
        var dBlack = queryResult.dataBlack;
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
            if (error.includes('Unknown column')) {
                throw new Error("INFO:  The variable [" + variableStr + "] is not supported by the database for the model/sites [" + model + " and " + sitesList + "].");
            } else {
                throw new Error(error);
            }
        }
    }

    var cOptions = matsDataCurveOpsUtils.generateMapCurveOptions(curve, d, appParams, orderOfMagnitude);  // generate map with site data
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.blueCurveText, dBlue);  // generate blue text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.blackCurveText, dBlack);  // generate black text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.redCurveText, dRed);  // generate red text layer
    dataset.push(cOptions);

    const resultOptions = matsDataPlotOpsUtils.generateMapPlotOptions(false);
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