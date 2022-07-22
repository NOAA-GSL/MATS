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

dataDieOff = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.dieoff,
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
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var queryTableClause = "";
        var regionType = curve['region-type'];
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections['variable'].findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[regionType][variableStr];
        var forecastLengthStr = curve['dieoff-type'];
        var forecastLengthOptionsMap = matsCollections['dieoff-type'].findOne({name: 'dieoff-type'}, {optionsMap: 1})['optionsMap'];
        var forecastLength = forecastLengthOptionsMap[forecastLengthStr][0];
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var timeVar;
        var dateClause;
        var siteDateClause = "";
        var siteMatchClause = "";
        var sitesClause = "";
        var varIndex;
        var NAggregate;
        var NClause;
        var queryPool;
        if (regionType === 'Predefined region') {
            timeVar = "m0.valid_day+3600*m0.hour";
            var metarStringStr = curve['truth'];
            var metarString = Object.keys(matsCollections['truth'].findOne({name: 'truth'}).valuesMap).find(key => matsCollections['truth'].findOne({name: 'truth'}).valuesMap[key] === metarStringStr);
            var regionStr = curve['region'];
            var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === regionStr);
            queryTableClause = "from " + model + "_" + metarString + "_" + region + " as m0";
            dateClause = "and m0.valid_day+3600*m0.hour >= " + fromSecs + " and m0.valid_day+3600*m0.hour <= " + toSecs;
            varIndex = 0;
            NAggregate = 'sum';
            NClause = variable[varIndex][1];
            queryPool = sumPool;
        } else {
            timeVar = "m0.time";
            var modelTable = (model.includes('ret_') || model.includes('Ret_')) ? model + "p" : model + "qp";
            var obsTable = (model.includes('ret_') || model.includes('Ret_')) ? 'obs_retro' : 'obs';
            queryTableClause = "from " + obsTable + " as o, " + modelTable + " as m0 ";
            var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
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
            dateClause = "and m0.time >= " + fromSecs + " - 900 and m0.time <= " + toSecs + " + 900";
            siteDateClause = "and o.time >= " + fromSecs + " - 900 and o.time <= " + toSecs + " + 900";
            siteMatchClause = "and m0.sta_id = o.sta_id and m0.time = o.time";
            varIndex = 1;
            NAggregate = 'count';
            NClause = '1';
            queryPool = sitePool;
        }
        var validTimes;
        var validTimeClause = "";
        var utcCycleStart;
        var utcCycleStartClause = "";
        if (forecastLength === matsTypes.ForecastTypes.dieoff) {
            validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
            if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
                validTimeClause = "and floor((" + timeVar + "+1800)%(24*3600)/3600) IN(" + validTimes + ")";   // adjust by 1800 seconds to center obs at the top of the hour
            }
        } else if (forecastLength === matsTypes.ForecastTypes.utcCycle) {
            utcCycleStart = curve['utc-cycle-start'] === undefined ? [] : curve['utc-cycle-start'];
            if (utcCycleStart.length !== 0 && utcCycleStart !== matsTypes.InputTypes.unused) {
                utcCycleStartClause = "and floor(((" + timeVar + "+1800) - m0.fcst_len*3600)%(24*3600)/3600) IN(" + utcCycleStart + ")";   // adjust by 1800 seconds to center obs at the top of the hour
            }
            if (regionType === 'Predefined region') {
                dateClause = "and " + timeVar + "-m0.fcst_len*3600 >= " + fromSecs + " and " + timeVar + "-m0.fcst_len*3600 <= " + toSecs;
            } else {
                dateClause = "and " + timeVar + "-m0.fcst_len*3600 >= " + fromSecs + " - 900 and " + timeVar + "-m0.fcst_len*3600 <= " + toSecs + " + 900";
            }
        } else {
            dateClause = "and " + timeVar + "-m0.fcst_len*3600 = " + fromSecs;
        }
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause = "sum(" + variable[varIndex][0] + ") as square_diff_sum, " + NAggregate + "(" + variable[varIndex][1] + ") as N_sum, sum(" + variable[varIndex][2] + ") as obs_model_diff_sum, sum(" + variable[varIndex][3] + ") as model_sum, sum(" + variable[varIndex][4] + ") as obs_sum, sum(" + variable[varIndex][5] + ") as abs_sum, " +
            "group_concat(" + timeVar + ", ';', " + variable[varIndex][0] + ", ';', " + NClause + ", ';', " + variable[varIndex][2] + ", ';', " + variable[varIndex][3] + ", ';', " + variable[varIndex][4] + ", ';', " + variable[varIndex][5] + " order by " + timeVar + ") as sub_data, count(" + variable[varIndex][0] + ") as N0";
        var statType = statisticOptionsMap[statisticSelect];
        var statVarUnitMap = matsCollections['variable'].findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
        var varUnits = statVarUnitMap[statisticSelect][variableStr];
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = varUnits;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select m0.fcst_len as fcst_lead, " +
                "count(distinct ceil(3600*floor(({{timeVar}}+1800)/3600))) as N_times, " +
                "min(ceil(3600*floor(({{timeVar}}+1800)/3600))) as min_secs, " +
                "max(ceil(3600*floor(({{timeVar}}+1800)/3600))) as max_secs, " +
                "{{statisticClause}} " +
                "{{queryTableClause}} " +
                "where 1=1 " +
                "{{siteMatchClause}} " +
                "{{sitesClause}} " +
                "{{dateClause}} " +
                "{{siteDateClause}} " +
                "{{validTimeClause}} " +
                "{{utcCycleStartClause}} " +
                "group by fcst_lead " +
                "order by fcst_lead" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
            statement = statement.replace('{{sitesClause}}', sitesClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{utcCycleStartClause}}', utcCycleStartClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            statement = statement.replace('{{siteDateClause}}', siteDateClause);
            statement = statement.split('{{timeVar}}').join(timeVar);
            dataRequests[label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(queryPool, statement, appParams, statisticSelect + "_" + variableStr);
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
                    if (error.includes('Unknown column')) {
                        throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is not supported by the database for the model/region [" + model + " and " + region + "].");
                    } else {
                        throw new Error(error);
                    }
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