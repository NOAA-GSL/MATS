/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataPlotOpsUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

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
    var dataSource = curve['data-source'];
    var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[dataSource][0];
    var variableStr = curve['variable'];
    var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
    var variable = variableOptionsMap[variableStr];
    var forecastLength = curve['forecast-length'];
    var sitesClause = "";
    var forecastLengthClause = "";
    var validTimeClause = "";
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
    var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
    var queryTableClause = "from metars as s, " + obsTable + " as o, " + modelTable + " as m0 ";
    var variableClause;
    if (variable[2] === "temp" || variable[2] === "dp") {
        variableClause = "(((m0." + variable[2] + "/10)-32)*(5/9)) - (((o." + variable[2] + "/10)-32)*(5/9))";
        varUnits = '°C';
    } else if (variable[2] === "rh") {
        variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")/10";
        varUnits = 'RH (%)';
    } else {
        variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")*0.44704";
        varUnits = 'm/s';
    }
    var statistic = 'sum({{variableClause}})/count(distinct m0.time) as stat, count(distinct m0.time) as N0';
    statistic = statistic.replace(/\{\{variableClause\}\}/g, variableClause);
    curves[0]['statistic'] = "Bias (Model - Obs)";
    var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
    if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
        sitesClause = " and s.name in('" + sitesList.join("','") + "')";
    } else {
        throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
    }
    var siteDateClause = "and o.time >= '{{fromSecs}}' and o.time <= '{{toSecs}}'";
    var siteMatchClause = "and s.madis_id = m0.sta_id and s.madis_id = o.sta_id and m0.time = o.time";
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = "and floor((m0.time+1800)%(24*3600)/3600) IN(" + validTimes + ")";   // adjust by 1800 seconds to center obs at the top of the hour
    }

    var statement = "select s.name as sta_name, " +
        "s.madis_id as sta_id, " +
        "count(distinct ceil(3600*floor((m0.time+1800)/3600))) as N_times, " +
        "min(ceil(3600*floor((m0.time+1800)/3600))) as min_secs, " +
        "max(ceil(3600*floor((m0.time+1800)/3600))) as max_secs, " +
        "{{statistic}} " +
        "{{queryTableClause}} " +
        "where 1=1 " +
        "{{siteMatchClause}} " +
        "{{sitesClause}} " +
        "and m0.time >= '{{fromSecs}}' " +
        "and m0.time <= '{{toSecs}}' " +
        "{{siteDateClause}} " +
        "{{validTimeClause}} " +
        "{{forecastLengthClause}} " +
        "group by sta_name " +
        "order by sta_name" +
        ";";

    statement = statement.replace('{{statistic}}', statistic);
    statement = statement.replace('{{queryTableClause}}', queryTableClause);
    statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
    statement = statement.replace('{{siteDateClause}}', siteDateClause);
    statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
    statement = statement.replace('{{sitesClause}}', sitesClause);
    statement = statement.replace('{{validTimeClause}}', validTimeClause);
    statement = statement.split('{{fromSecs}}').join(fromSecs);
    statement = statement.split('{{toSecs}}').join(toSecs);
    dataRequests[label] = statement;

    var queryResult;
    var startMoment = moment();
    var finishMoment;
    try {
        // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryMapDB(sitePool, statement, dataSource, variable, varUnits, siteMap);
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

    var cOptions = matsDataCurveOpsUtils.generateMapCurveOptions(curve, d, appParams);  // generate map with site data
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.blueCurveText, dBlue);  // generate blue text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.blackCurveText, dBlack);  // generate black text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.redCurveText, dRed);  // generate red text layer
    dataset.push(cOptions);

    const resultOptions = matsDataPlotOpsUtils.generateMapPlotOptions();
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