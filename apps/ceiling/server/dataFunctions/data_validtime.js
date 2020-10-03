/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataValidTime = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.validtime,
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
        var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var queryTableClause = "";
        var thresholdStr = curve['threshold'];
        var threshold = Object.keys(matsCollections.CurveParams.findOne({name: 'threshold'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'threshold'}).valuesMap[key] === thresholdStr);
        var thresholdClause = "";
        var forecastLength = curve['forecast-length'];
        var forecastLengthClause = "and m0.fcst_len = " + forecastLength;
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var dateClause;
        var siteDateClause = "";
        var siteMatchClause = "";
        var sitesClause = "";
        var siteMap = matsCollections.StationMap.findOne({name: 'stations'}, {optionsMap: 1})['optionsMap'];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause;
        var filterClause = "";
        var queryPool;
        var regionType = curve['region-type'];
        if (regionType === 'Predefined region') {
            var regionStr = curve['region'];
            var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
            queryTableClause = "from " + model + "_" + region + " as m0";
            thresholdClause = "and m0.trsh = " + threshold;
            statisticClause = statisticOptionsMap[statisticSelect][0];
            dateClause = "and m0.time >= " + fromSecs + " and m0.time <= " + toSecs;
            filterClause = "and m0.yy+m0.ny+m0.yn+m0.nn > 0";
            queryPool = sumPool;
        } else {
            var obsTable = (model.includes('ret_') || model.includes('Ret_')) ? 'obs_retro' : 'obs';
            queryTableClause = "from " + obsTable + " as o, " + model + " as m0 ";
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
            dateClause = "and m0.time >= " + fromSecs + " - 900 and m0.time <= " + toSecs + " + 900";
            siteDateClause = "and o.time >= " + fromSecs + " - 900 and o.time <= " + toSecs + " + 900";
            siteMatchClause = "and m0.madis_id = o.madis_id and m0.time = o.time ";
            queryPool = modelPool;
        }
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
                const matchModel = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[matchCurve['data-source']][0];
                const matchForecastLength = matchCurve['forecast-length'];
                forecastLengthClause = forecastLengthClause + " and m" + matchCurveIdx + ".fcst_len = " + matchForecastLength;
                const matchDateRange = matsDataUtils.getDateRange(matchCurve['curve-dates']);
                const matchFromSecs = matchDateRange.fromSeconds;
                const matchToSecs = matchDateRange.toSeconds;
                const matchRegionType = matchCurve['region-type'];
                if (matchRegionType === 'Predefined region') {
                    const queryDB = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.SUMS_DATA, status: "active"}).database;
                    const matchRegion = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === matchCurve['region']);
                    queryTableClause = queryTableClause + ", " + queryDB + "." + matchModel + "_" + matchRegion + " as m" + matchCurveIdx;
                    const matchThreshold = Object.keys(matsCollections.CurveParams.findOne({name: 'threshold'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'threshold'}).valuesMap[key] === matchCurve['threshold']);
                    thresholdClause = thresholdClause + " and m" + matchCurveIdx + ".trsh = " + matchThreshold;
                    if (sitesClause.includes("m0.madis_id in")) {
                        dateClause = "and ceil(3600*floor((m0.time+1800)/3600)) = m" + matchCurveIdx + ".time " + dateClause;
                    } else {
                        dateClause = "and m0.time = m" + matchCurveIdx + ".time " + dateClause;
                    }
                    dateClause = dateClause + " and m" + matchCurveIdx + ".time >= " + matchFromSecs + " and m" + matchCurveIdx + ".time <= " + matchToSecs;
                } else {
                    const queryDB = matsCollections.Databases.findOne({role: matsTypes.DatabaseRoles.MODEL_DATA, status: "active"}).database;
                    queryTableClause = queryTableClause + ", " + queryDB + "." + matchModel + " as m" + matchCurveIdx;
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
                        dateClause = "and ceil(3600*floor((m0.time+1800)/3600)) = ceil(3600*floor((m" + matchCurveIdx + ".time+1800)/3600)) " + dateClause;
                    } else {
                        dateClause = "and m0.time = ceil(3600*floor((m" + matchCurveIdx + ".time+1800)/3600)) " + dateClause;
                    }
                    dateClause = dateClause + " and m" + matchCurveIdx + ".time >= " + matchFromSecs + " - 900 and m" + matchCurveIdx + ".time <= " + matchToSecs + " + 900";
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
            var statement = "select floor((m0.time+1800)%(24*3600)/3600) as hr_of_day, " +
                "count(distinct ceil(3600*floor((m0.time+1800)/3600))) as N_times, " +
                "min(ceil(3600*floor((m0.time+1800)/3600))) as min_secs, " +
                "max(ceil(3600*floor((m0.time+1800)/3600))) as max_secs, " +
                "{{statisticClause}} " +
                "{{queryTableClause}} " +
                "where 1=1 " +
                "{{filterClause}} " +
                "{{siteMatchClause}} " +
                "{{sitesClause}} " +
                "{{dateClause}} " +
                "{{siteDateClause}} " +
                "{{thresholdClause}} " +
                "{{forecastLengthClause}} " +
                "group by hr_of_day " +
                "order by hr_of_day" +
                ";";

            statement = statement.replace('{{statisticClause}}', statisticClause);
            statement = statement.replace('{{queryTableClause}}', queryTableClause);
            statement = statement.replace('{{filterClause}}', filterClause);
            statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
            statement = statement.replace('{{sitesClause}}', sitesClause);
            statement = statement.replace('{{thresholdClause}}', thresholdClause);
            statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
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