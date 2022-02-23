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
        "hasLevels": true
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
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections['variable'].findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var forecastLengthStr = curve['dieoff-type'];
        var forecastLengthOptionsMap = matsCollections['dieoff-type'].findOne({name: 'dieoff-type'}, {optionsMap: 1})['optionsMap'];
        var forecastLength = forecastLengthOptionsMap[forecastLengthStr][0];
        var forecastLengthClause = "and m0.fcst_len >= 0";
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var top = curve['top'];
        var bottom = curve['bottom'];
        var siteDateClause = "";
        var siteLevelClause = "";
        var siteMatchClause = "";
        var sitesClause = "";
        var statisticClause;
        var statType;
        var varUnits;
        var levelClause = "";
        var queryPool;
        var regionType = curve['region-type'];
        if (regionType === 'Predefined region') {
            var tablePrefix = matsCollections['data-source'].findOne({name: 'data-source'}).tableMap[curve['data-source']];
            var regionStr = curve['region'];
            var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === regionStr);
            queryTableClause = "from " + tablePrefix + region + " as m0";
            var statisticSelect = curve['statistic'];
            var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
            var statAuxMap = matsCollections['statistic'].findOne({name: 'statistic'}, {statAuxMap: 1})['statAuxMap'];
            if (variableStr === 'winds') {
                statisticClause = statisticOptionsMap[statisticSelect][1][0];
                statisticClause = statisticClause + "," + statAuxMap[statisticSelect + '-winds'];
                statType = statisticOptionsMap[statisticSelect][1][1];
            } else {
                statisticClause = statisticOptionsMap[statisticSelect][0][0];
                statisticClause = statisticClause + "," + statAuxMap[statisticSelect + '-other'];
                statType = statisticOptionsMap[statisticSelect][0][1];
            }
            statisticClause = statisticClause.replace(/\{\{variable0\}\}/g, variable[0]);
            statisticClause = statisticClause.replace(/\{\{variable1\}\}/g, variable[1]);
            var statVarUnitMap = matsCollections['variable'].findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
            varUnits = statVarUnitMap[statisticSelect][variableStr];
            levelClause = "and m0.mb10 >= " + top + "/10 and m0.mb10 <= " + bottom + "/10";
            queryPool = sumPool;
        } else {
            var obsTable = (model.includes('ret_') || model.includes('Ret_')) ? 'RAOB_reXXtro' : 'RAOB';
            queryTableClause = "from " + obsTable + " as o, " + model + " as m0 ";
            var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
            var variableClause;
            if (variable[2] === "t" || variable[2] === "dp") {
                // stored in degC, and multiplied by 100.
                variableClause = "(m0." + variable[2] + " - o." + variable[2] + ") * 0.01";
                varUnits = '°C';
            } else if (variable[2] === "rh") {
                // stored in %.
                variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")";
                varUnits = 'RH (%)';
            } else if (variable[2] === "ws") {
                // stored in m/s, and multiplied by 100.
                variableClause = "(m0." + variable[2] + " - o." + variable[2] + ") * 0.01";
                varUnits = 'm/s';
            } else if (variable[2] === "z") {
                // stored in m.
                variableClause = "(m0." + variable[2] + " - o." + variable[2] + ")";
                varUnits = 'm';
            } else {
                throw new Error("RHobT stats are not supported for single/multi station plots");
            }
            statisticClause = 'avg({{variableClause}}) as stat, stddev({{variableClause}}) as stdev, count(unix_timestamp(m0.date)+3600*m0.hour) as N0, group_concat(ceil(43200*floor(((unix_timestamp(m0.date)+3600*m0.hour)+43200/2)/43200)), ";", m0.press, ";", {{variableClause}} order by ceil(43200*floor(((unix_timestamp(m0.date)+3600*m0.hour)+43200/2)/43200)), m0.press) as sub_data';
            statisticClause = statisticClause.replace(/\{\{variableClause\}\}/g, variableClause);
            statType = 'scalar';
            curves[curveIndex]['statistic'] = "Bias (Model - Obs)";
            var sitesList = curve['sites'] === undefined ? [] : curve['sites'];
            var querySites = [];
            if (sitesList.length > 0 && sitesList !== matsTypes.InputTypes.unused) {
                var thisSite;
                var thisSiteObj;
                for (var sidx = 0; sidx < sitesList.length; sidx++) {
                    const possibleSiteNames = sitesList[sidx].match(/\(([^)]*)\)[^(]*$/);
                    thisSite = possibleSiteNames === null ? sitesList[sidx] : possibleSiteNames[possibleSiteNames.length - 1];
                    thisSiteObj = siteMap.find(obj => {
                        return obj.origName === thisSite;
                    });
                    querySites.push(thisSiteObj.options.id);
                }
                sitesClause = " and m0.wmoid in('" + querySites.join("','") + "')";
            } else {
                throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
            }
            siteDateClause = "and unix_timestamp(o.date)+3600*o.hour >= " + fromSecs + " - 1800 and unix_timestamp(o.date)+3600*o.hour <= " + toSecs + " + 1800";
            levelClause = "and m0.press >= " + top + " and m0.press <= " + bottom;
            siteLevelClause = "and o.press >= " + top + " and o.press <= " + bottom;
            siteMatchClause = "and m0.wmoid = o.wmoid and m0.date = o.date and m0.hour = o.hour and m0.press = o.press";
            queryPool = modelPool;
        }
        var validTimeClause = "";
        var utcCycleStart;
        var utcCycleStartClause = "";
        var dateClause;
        if (forecastLength === matsTypes.ForecastTypes.dieoff) {
            var validTimeStr = curve['valid-time'];
            validTimeClause = matsCollections['valid-time'].findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'][validTimeStr][0];
            dateClause = "and unix_timestamp(m0.date)+3600*m0.hour >= '" + fromSecs + "' - 1800 and unix_timestamp(m0.date)+3600*m0.hour <= '" + toSecs + "' + 1800";
        } else if (forecastLength === matsTypes.ForecastTypes.utcCycle) {
            utcCycleStart = curve['utc-cycle-start'] === undefined ? [] : curve['utc-cycle-start'];
            if (utcCycleStart.length !== 0 && utcCycleStart !== matsTypes.InputTypes.unused) {
                utcCycleStartClause = "and floor(((unix_timestamp(m0.date)+3600*m0.hour) - m0.fcst_len*3600)%(24*3600)/3600) IN(" + utcCycleStart + ")";
            }
            dateClause = "and unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600 >= " + fromSecs + " and unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600 <= " + toSecs;
        } else {
            dateClause = "and unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600 = " + fromSecs;
        }
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
                "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
                "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
                "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
                "{{statisticClause}} " +
                "{{queryTableClause}} " +
                "where 1=1 " +
                "{{siteMatchClause}} " +
                "{{sitesClause}} " +
                "{{dateClause}} " +
                "{{siteDateClause}} " +
                "{{validTimeClause}} " +
                "{{utcCycleStartClause}} " +
                "{{forecastLengthClause}} " +
                "{{levelClause}} " +
                "{{siteLevelClause}} " +
                "group by fcst_lead " +
                "order by fcst_lead" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
            statement = statement.replace('{{sitesClause}}', sitesClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{utcCycleStartClause}}', utcCycleStartClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
            statement = statement.replace('{{levelClause}}', levelClause);
            statement = statement.replace('{{siteLevelClause}}', siteLevelClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            statement = statement.replace('{{siteDateClause}}', siteDateClause);
            dataRequests[label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(queryPool, statement, appParams, statisticSelect);
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
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, appParams, statType === "ctc");
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