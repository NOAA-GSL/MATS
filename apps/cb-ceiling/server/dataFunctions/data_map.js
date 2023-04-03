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
    matsDataPlotOpsUtils
} from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';

dataMap = function (plotParams, plotFunction)
{
    var fs = require("fs");
    const appParams = {
        "plotType": matsTypes.PlotTypes.map,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": false,
        "isCouchbase": true
    };

    var queryTemplate = fs.readFileSync("assets/app/sqlTemplates/tmpl_Map.sql", "utf8");
    
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    if (curves.length > 1)
    {
        throw new Error("INFO:  There must only be one added curve.");
    }
    var dataset = [];
    var curve = curves[0];
    var label = curve['label'];
    var variable = curve['variable'];
    var model = matsCollections['data-source'].findOne({ name: 'data-source' }).optionsMap[variable][curve['data-source']][0];
    queryTemplate = queryTemplate.replace(/vxMODEL/g, model);
    var siteMap = matsCollections.StationMap.findOne({ name: 'stations' }, { optionsMap: 1 })['optionsMap'];
    var thresholdStr = curve['threshold'];
    var threshold = Object.keys(matsCollections['threshold'].findOne({ name: 'threshold' }).valuesMap[variable]).find(key => matsCollections['threshold'].findOne({ name: 'threshold' }).valuesMap[variable][key] === thresholdStr);
    threshold = threshold.replace(/_/g, ".");
    queryTemplate = queryTemplate.replace(/vxFROM_SECS/g, fromSecs);
    queryTemplate = queryTemplate.replace(/vxTO_SECS/g, toSecs);
    queryTemplate = queryTemplate.replace(/vxTHRESHOLD/g, threshold);
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
    queryTemplate = queryTemplate.replace(/vxFCST_LEN/g, forecastLength);
    var statistic = curve['statistic'];
    var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
    if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused)
    {
        queryTemplate = queryTemplate.replace(
            /vxSITES_LIST_OBS/g,
            cbPool.trfmListToCSVString(sitesList, "obs.data.", false)
        );
        queryTemplate = queryTemplate.replace(
            /vxSITES_LIST_MODELS/g,
            cbPool.trfmListToCSVString(sitesList, "models.data.", false)
        );
    } else
    {
        throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
    }
    statement = cbPool.trfmSQLForDbTarget(queryTemplate);

    dataRequests[label] = statement;

    var queryResult;
    var startMoment = moment();
    var finishMoment;
    try
    {
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
        var dPurpleBlue = queryResult.dataPurpleBlue;
        var dBlue = queryResult.dataBlue;
        var dBlueGreen = queryResult.dataBlueGreen;
        var dGreen = queryResult.dataGreen;
        var dGreenYellow = queryResult.dataGreenYellow;
        var dYellow = queryResult.dataYellow;
        var dOrange = queryResult.dataOrange;
        var dOrangeRed = queryResult.dataOrangeRed;
        var dRed = queryResult.dataRed;
        var valueLimits = queryResult.valueLimits;
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

    var cOptions = matsDataCurveOpsUtils.generateCTCMapCurveOptions(curve, d, appParams);  // generate map with site data
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCPurpleCurveText, "Values <= " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .1).toFixed(0), dPurple);  // generate purple text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCPurpleBlueCurveText, "Values > " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .1).toFixed(0) + " and <= " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .2).toFixed(0), dPurpleBlue);  // generate purple-blue text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCBlueCurveText, "Values > " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .2).toFixed(0) + " and <= " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .3).toFixed(0), dBlue);  // generate blue text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCBlueGreenCurveText, "Values > " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .3).toFixed(0) + " and <= " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .4).toFixed(0), dBlueGreen);  // generate blue-green text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCGreenCurveText, "Values > " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .4).toFixed(0) + " and <= " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .5).toFixed(0), dGreen);  // generate green text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCGreenYellowCurveText, "Values > " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .5).toFixed(0) + " and <= " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .6).toFixed(0), dGreenYellow);  // generate green-yellow text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCYellowCurveText, "Values > " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .6).toFixed(0) + " and <= " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .7).toFixed(0), dYellow);  // generate yellow text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCOrangeCurveText, "Values > " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .7).toFixed(0) + " and <= " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .8).toFixed(0), dOrange);  // generate orange text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCOrangeRedCurveText, "Values > " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .8).toFixed(0) + " and <= " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .9).toFixed(0), dOrangeRed);  // generate orange-red text layer
    dataset.push(cOptions);

    cOptions = matsDataCurveOpsUtils.generateMapColorTextOptions(matsTypes.ReservedWords.CTCRedCurveText, "Values > " + (valueLimits.lowLimit + (valueLimits.highLimit - valueLimits.lowLimit) * .9).toFixed(0), dRed);  // generate red text layer
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