/*
 * Copyright (c) 2021 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {
    matsCollections,
    matsDataCurveOpsUtils,
    matsDataDiffUtils,
    matsDataProcessUtils,
    matsDataQueryUtils,
    matsDataUtils,
    matsTypes
} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataSeries = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.timeSeries,
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
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var thresholdStr = curve['threshold'];
        var threshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[key] === thresholdStr);
        var validTimeClause = "";
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        if (validTimes.length !== 0 && validTimes !== matsTypes.InputTypes.unused) {
            validTimeClause = "AND m0.fcstValidEpoch IN(" + validTimes + ")";
        }
        var forecastLength = curve['forecast-length'];
        var forecastLengthClause = "and m0.fcstLen = " + forecastLength;
        var dateClause;
        var siteDateClause = "";
        var siteMatchClause = "";
        var sitesClause = "";
        var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause;
        var filterClause = "";
        var queryPool;
        var regionType = curve['region-type'];
        var region;
        if (regionType === 'Predefined region') {
            var regionStr = curve['region'];
            region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === regionStr);
            statisticClause = statisticOptionsMap[statisticSelect][0];
            dateClause = "and m0.fcstValidEpoch >= " + fromSecs + " and m0.fcstValidEpoch <= " + toSecs;
            filterClause = "and m0.data.['{{threshold}}'].hits+m0.data.['{{threshold}}'].misses+m0.data.['{{threshold}}'].false_alarms+m0.data.['{{threshold}}'].correct_negatives > 0";
            queryPool = cbPool;
        } else {
            var obsTable = (model.includes('ret_') || model.includes('Ret_')) ? 'obs_retro' : 'obs';
            statisticClause = 'sum(if((m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0)) as yy,sum(if((m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0)) as yn, sum(if(NOT (m0.ceil < {{threshold}}) and (o.ceil < {{threshold}}),1,0)) as ny, sum(if(NOT (m0.ceil < {{threshold}}) and NOT (o.ceil < {{threshold}}),1,0)) as nn, count(m0.ceil) as N0';
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
            dateClause = "and m0.fcstValidEpoch >= " + fromSecs + " - 900 and m0.fcstValidEpoch <= " + toSecs + " + 900";
            siteDateClause = "and o.time >= " + fromSecs + " - 900 and o.time <= " + toSecs + " + 900";
            siteMatchClause = "and m0.madis_id = o.madis_id and m0.fcstValidEpoch = o.time ";
            queryPool = cbPool;
        }
        var averageStr = curve['average'];
        var averageOptionsMap = matsCollections['average'].findOne({name: 'average'}, {optionsMap: 1})['optionsMap'];
        var average = averageOptionsMap[averageStr][0];
        // for contingency table apps, we currently have to deal with matching in the query.
        if (appParams.matching && curvesLength > 1) {
            var matchCurveIdx = 0;
            var mcidx;
            for (mcidx = 0; mcidx < curvesLength; mcidx++) {
                const matchCurve = curves[mcidx];
                if (curveIndex === mcidx || matchCurve.diffFrom != null) {
                    continue;
                }
                matchCurveIdx++;
                const matchModel = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[matchCurve['data-source']][0];
                const matchValidTimes = matchCurve['valid-time'] === undefined ? [] : matchCurve['valid-time'];
                if (matchValidTimes.length !== 0 && matchValidTimes !== matsTypes.InputTypes.unused) {
                    validTimeClause = validTimeClause + " and floor((m" + matchCurveIdx + ".time+1800)%(24*3600)/3600) IN(" + matchValidTimes + ")";
                }
                const matchForecastLength = matchCurve['forecast-length'];
                forecastLengthClause = forecastLengthClause + " and m" + matchCurveIdx + ".fcst_len = " + matchForecastLength;
                const matchRegionType = matchCurve['region-type'];
                if (matchRegionType === 'Predefined region') {
                    const queryDB = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.SUMS_DATA, status: "active"}).database;
                    const matchRegion = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[key] === matchCurve['region']);
                    const matchThreshold = Object.keys(matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap).find(key => matsCollections['threshold'].findOne({name: 'threshold'}).valuesMap[key] === matchCurve['threshold']);
                    if (sitesClause.includes("m0.madis_id in")) {
                        dateClause = "and ceil(3600*floor((m0.fcstValidEpoch+1800)/3600)) = m" + matchCurveIdx + ".time " + dateClause;
                    } else {
                        dateClause = "and m0.fcstValidEpoch = m" + matchCurveIdx + ".time " + dateClause;
                    }
                    dateClause = dateClause + " and m" + matchCurveIdx + ".time >= " + fromSecs + " and m" + matchCurveIdx + ".time <= " + toSecs;
                } else {
                    const queryDB = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.MODEL_DATA, status: "active"}).database;
                    const matchSitesList = matchCurve['sites'] === undefined ? [] : matchCurve['sites'];
                    var matchQuerySites = [];
                    if (matchSitesList.length > 0 && matchSitesList !== matsTypes.InputTypes.unused) {
                        var thisMatchSite;
                        var thisMatchSiteObj;
                        for (var msidx = 0; msidx < matchSitesList.length; msidx++) {
                            thisMatchSite = matchSitesList[msidx];
                            thisMatchSiteObj = siteMap.find(obj => {
                                return obj.origName === thisMatchSite;
                            });
                            matchQuerySites.push(thisMatchSiteObj.options.id);
                        }
                        sitesClause = sitesClause + " and m" + matchCurveIdx + ".madis_id in('" + matchQuerySites.join("','") + "')";
                    } else {
                        throw new Error("INFO:  Please add sites in order to get a single/multi station plot.");
                    }
                    if (sitesClause.includes("m0.madis_id in")) {
                        siteMatchClause = siteMatchClause + "and m" + matchCurveIdx + ".madis_id = m0.madis_id";
                        dateClause = "and ceil(3600*floor((m0.fcstValidEpoch+1800)/3600)) = ceil(3600*floor((m" + matchCurveIdx + ".time+1800)/3600)) " + dateClause;
                    } else {
                        dateClause = "and m0.fcstValidEpoch = ceil(3600*floor((m" + matchCurveIdx + ".time+1800)/3600)) " + dateClause;
                    }
                    dateClause = dateClause + " and m" + matchCurveIdx + ".time >= " + fromSecs + " - 900 and m" + matchCurveIdx + ".time <= " + toSecs + " + 900";
                }
            }
        }
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var statType = statisticOptionsMap[statisticSelect][1];
        var axisKey = statisticOptionsMap[statisticSelect][2];
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var idealVal = statisticOptionsMap[statisticSelect][3];
        if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
            idealValues.push(idealVal);
        }

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement =
                "SELECT " +
                    "{{average}} avtime, " +
                    "COUNT(DISTINCT m0.fcstValidEpoch) N_times, " +
                    "{{forecastLength}} fcst_len, " +
                    "{{threshold}} thrsh, " +
                    "MIN(m0.fcstValidEpoch) min_secs, " +
                    "MAX(m0.fcstValidEpoch) max_secs, " +
                    "{{statisticClause}} " +
                    "FROM mdata as m0 " +
                    "WHERE " +
                    "m0.type='DD' " +
                    "AND m0.docType='CTC' " +
                    "AND m0.subset='METAR' " +
                    "AND m0.version='V01' " +
                    "AND m0.model='" + model + "' " +
                    "AND m0.region='" + regionStr + "' " +
                    "{{filterClause}} " +
                    "{{forecastLengthClause}} " +
                    "{{siteMatchClause}} " +
                    "{{sitesClause}} " +
                    "{{dateClause}} " +
                    "{{siteDateClause}} " +
                    "{{validTimeClause}} " +
                    "GROUP BY " +
                    "m0.fcstValidEpoch, " +
                    "m0.data.['{{threshold}}'].hits, " +
                    "m0.data.['{{threshold}}'].misses, " +
                    "m0.data.['{{threshold}}'].false_alarms, " +
                    "m0.data.['{{threshold}}'].correct_negatives " +
                    "ORDER BY m0.fcstValidEpoch;";

            statement = statement.replace('{{average}}', average);
            statement = statement.replace('{{forecastLength}}', forecastLength);
            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{filterClause}}', filterClause);
            statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
            statement = statement.replace('{{sitesClause}}', sitesClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
            statement = statement.replace('{{dateClause}}', dateClause);
            statement = statement.replace('{{siteDateClause}}', siteDateClause);
            // leave the {{threshold}} for last because {{threshold}} exists in some of the other replacements
            statement = statement.replace(/{{threshold}}/g, threshold);
            dataRequests[label] = statement;

            // math is done on forecastLength later on -- set all analyses to 0
            if (forecastLength === "-99") {
                forecastLength = "0";
            }

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBTimeSeries(queryPool, statement, model, forecastLength, fromSecs, toSecs, averageStr, statisticSelect, validTimes, appParams, false);
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
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, appParams);
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