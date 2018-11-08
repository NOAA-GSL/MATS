import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataPlotOpsUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
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
    var dataset = [];
    var curve = curves[0];
    var diffFrom = curve.diffFrom;
    var dataSource = curve['data-source'];
    var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
    var sitesList = curve['sites'];
    var siteLength = sitesList.length;
    var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
    var variableStr = curve['variable'];
    var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 2})['optionsMap'];
    var variableOption = variableOptionsMap[variableStr];
    var variable = variableOption[2];
    var statisticSelect = 'diff';
    var statVarUnitMap = matsCollections.CurveParams.findOne({name: 'variable'}, {mapVarUnitMap: 1})['mapVarUnitMap'];
    var varUnits = statVarUnitMap[statisticSelect][variableStr];
    var forecastLength = curve['forecast-length'];
    var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
    // axisKey is used to determine which axis a curve should use.
    // This axisKeySet object is used like a set and if a curve has the same
    // variable and statistic (axisKey) it will use the same axis,
    // The axis number is assigned to the axisKeySet value, which is the axisKey.
    //CHANGED TO PLOT ON THE SAME AXIS IF SAME STATISTIC, REGARDLESS OF THRESHOLD
    var axisKey = varUnits;
    curves[0].axisKey = axisKey; // stash the axisKey to use it later for axis options
    var d;
    var thisSite;
    for (var siteIndex = 0; siteIndex < siteLength; siteIndex++) {
        if (diffFrom == null) {
            var site = sitesList[siteIndex];

            var siteOptions = matsCollections.SiteMap.findOne({siteName: site});

            // this is a database driven curve, not a difference curve
            var statement = "select s.name as sta_name, " +
                "count(distinct m0.time) as N_times, " +
                "min(m0.time) as min_time, " +
                "max(m0.time) as max_time, " +
                "sum({{variable}} - {{variable}})/count(distinct m0.time) as model_ob_diff " +
                "from metars as s, obs as o, {{model}} as m0 " +
                "where 1=1 " +
                "and s.madis_id = m0.sta_id " +
                "and s.madis_id = o.sta_id " +
                "and m0.time = o.time " +
                "and s.madis_id = '{{station}}' " +
                "and m0.fcst_len = {{forecastLength}} " +
                "and m0.time >= '{{fromSecs}}' " +
                "and m0.time <= '{{toSecs}}' " +
                "{{validTimeClause}}" +
                ";";

            statement = statement.replace('{{fromSecs}}', fromSecs);
            statement = statement.replace('{{toSecs}}', toSecs);
            if (forecastLength == 1) {
                statement = statement.replace('{{model}}', model + "qp1f");
                statement = statement.replace('and m0.fcst_len = {{forecastLength}}', "");
            } else {
                statement = statement.replace('{{model}}', model + "qp");
                statement = statement.replace('{{forecastLength}}', forecastLength);
            }
            if (variable == "temp" || variable == "dp") {
                statement = statement.replace('{{variable}}', "(((m0." + variable + "/10)-32)*(5/9))");
                statement = statement.replace('{{variable}}', "(((o." + variable + "/10)-32)*(5/9))");
            } else if (variable == "rh" || variable == "press") {
                statement = statement.replace('{{variable}}', "m0." + variable + "/10");
                statement = statement.replace('{{variable}}', "o." + variable + "/10");
            } else {
                statement = statement.replace('{{variable}}', "m0." + variable + "*0.44704");
                statement = statement.replace('{{variable}}', "o." + variable + "*0.44704");
            }
            statement = statement.replace('{{station}}', siteOptions.siteId);
            var validTimeClause = " ";
            if (validTimes.length > 0) {
                validTimeClause = " and ((m0.time%3600<1800 and FROM_UNIXTIME((m0.time-(m0.time%3600)),'%H') IN(" + validTimes + "))" +
                    " OR (m0.time%3600>=1800 and FROM_UNIXTIME((m0.time-((m0.time%3600)-3600)),'%H') IN (" + validTimes + ")))";
            }
            statement = statement.replace('{{validTimeClause}}', validTimeClause);

            dataRequests[curve.label + " - " + site] = statement;
            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                queryResult = matsDataQueryUtils.queryMapDB(sitePool, statement, d);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + curve.label + " - " + site] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.length
                };

                d = queryResult.data;

                var tooltips = site +
                    "<br>" + "variable: " + variable +
                    "<br>" + "model: " + dataSource +
                    "<br>" + "model-obs: " + d.queryVal[siteIndex] + " " + varUnits +
                    "<br>" + "n: " + d.stats[siteIndex].N_times;

                d.text.push(tooltips);

                thisSite = siteMap.find(obj => {
                    return obj.name === site;
                });

                d.lat.push(thisSite.point[0]);
                d.lon.push(thisSite.point[1]);

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
        }
    }


    const cOptions = matsDataCurveOpsUtils.generateMapCurveOptions(curve, d);  // generate map with site data
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