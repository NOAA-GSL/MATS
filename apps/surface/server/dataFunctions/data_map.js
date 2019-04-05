import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataPlotOpsUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

dataMap = function (plotParams, plotFunction) {
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
    var dataSource = curve['data-source'];
    var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
    var forecastLength = curve['forecast-length'];
    var modelTable;
    var forecastLengthClause;
    if (forecastLength === 1) {
        modelTable = model + "qp1f";
        forecastLengthClause = "";
    } else {
        modelTable = (model.includes('ret_') || model.includes('Ret_')) ? model + "p" : model + "qp";
        forecastLengthClause = "and m0.fcst_len = " + forecastLength + " "
    }
    var obsTable = (model.includes('ret_') || model.includes('Ret_')) ? 'obs_retro' : 'obs';
    var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
    var sitesClause = "";
    var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
    if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
        sitesClause = " and s.name in('" + sitesList.join("','") + "')";
    }
    var variableStr = curve['variable'];
    var variable = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 2})['optionsMap'][variableStr][2];
    var variableClause;
    if (variable === "temp" || variable === "dp") {
        variableClause = "sum((((m0." + variable + "/10)-32)*(5/9)) - (((o." + variable + "/10)-32)*(5/9)))";
    } else if (variable === "rh" || variable === "press") {
        variableClause = "sum((m0." + variable + " - o." + variable + ")/10)";
    } else {
        variableClause = "sum((m0." + variable + " - o." + variable + ")*0.44704)";
    }
    var statisticSelect = 'diff';
    var statVarUnitMap = matsCollections.CurveParams.findOne({name: 'variable'}, {mapVarUnitMap: 1})['mapVarUnitMap'];
    var varUnits = statVarUnitMap[statisticSelect][variableStr];
    var validTimeClause = "";
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
        validTimeClause = " and ((m0.time%3600<1800 and FROM_UNIXTIME((m0.time-(m0.time%3600)),'%H') IN(" + validTimes + "))" +
            " OR (m0.time%3600>=1800 and FROM_UNIXTIME((m0.time-((m0.time%3600)-3600)),'%H') IN (" + validTimes + ")))";
    }

    var statement = "select s.name as sta_name, " +
        "s.madis_id as sta_id, " +
        "count(distinct m0.time) as N_times, " +
        "min(m0.time) as min_time, " +
        "max(m0.time) as max_time, " +
        "{{variableClause}}/count(distinct m0.time) as model_ob_diff " +
        "from metars as s, {{obsTable}} as o, {{modelTable}} as m0 " +
        "where 1=1 " +
        "and s.madis_id = m0.sta_id " +
        "and s.madis_id = o.sta_id " +
        "and m0.time = o.time " +
        "{{sitesClause}} " +
        "and m0.time >= '{{fromSecs}}' " +
        "and m0.time <= '{{toSecs}}' " +
        "and o.time >= '{{fromSecs}}' " +
        "and o.time <= '{{toSecs}}' " +
        "{{forecastLengthClause}} " +
        "{{validTimeClause}}" +
        "group by sta_name " +
        "order by sta_name" +
        ";";

    statement = statement.replace('{{modelTable}}', modelTable);
    statement = statement.replace('{{obsTable}}', obsTable);
    statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
    statement = statement.replace('{{sitesClause}}', sitesClause);
    statement = statement.replace('{{variableClause}}', variableClause);
    statement = statement.replace('{{validTimeClause}}', validTimeClause);
    statement = statement.split('{{fromSecs}}').join(fromSecs);
    statement = statement.split('{{toSecs}}').join(toSecs);
    dataRequests[curve.label + " - " + 0] = statement;
    var queryResult;
    var startMoment = moment();
    var finishMoment;
    try {
        queryResult = matsDataQueryUtils.queryMapDB(sitePool, statement, dataSource, variable, varUnits, siteMap);
        finishMoment = moment();
        dataRequests["data retrieval (query) time - " + curve.label + " - " + 0] = {
            begin: startMoment.format(),
            finish: finishMoment.format(),
            duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
            recordCount: queryResult.data.length
        };

        var d = queryResult.data;
        var dBlue = queryResult.dataBlue;
        var dBlack = queryResult.dataBlack;
        var dRed = queryResult.dataRed;

    } catch (e) {
        e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
        throw new Error(e.message);
    }
    if (queryResult.error !== undefined && queryResult.error !== "") {
        if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
            // This is NOT an error just a no data condition
            dataFoundForCurve = false;
        } else {
            error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
            if (error.includes('Unknown column')) {
                throw new Error("INFO:  The variable combination [" + variableStr + "] is not supported by the database for the model/site [" + model + " and " + site + "].");
            } else {
                throw new Error(error);
            }
        }
    }

    var cOptions = matsDataCurveOpsUtils.generateMapCurveOptions(curve, d);  // generate map with site data
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