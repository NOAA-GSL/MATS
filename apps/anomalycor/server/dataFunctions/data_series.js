/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

dataSeries = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
    const plotType = matsTypes.PlotTypes.timeSeries;
    const hasLevels = true;
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
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
    var idealValues = [100];

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        const label = curve['label'];
        const data_source = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        const regionStr = curve['region'];
        const region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        var dbtable = data_source + "_anomcorr_" + region;
        const variable = curve['variable'];
        var levels = curve['pres-level'] === undefined ? [] : curve['pres-level'];
        var levelClause = " ";
        if (levels.length > 0) {
            levelClause = " and  m0.level IN(" + levels + ")";
        }
        curves[curveIndex]['statistic'] = "Correlation";
        const validTimeStr = curve['valid-time'];
        const validTimeOptionsMap = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'];
        const validTimes = validTimeOptionsMap[validTimeStr][0];
        var validTimeClause = " ";
        if (validTimes.length > 0) {
            validTimeClause = validTimes;
        }
        const averageStr = curve['average'];
        const averageOptionsMap = matsCollections.CurveParams.findOne({name: 'average'}, {optionsMap: 1})['optionsMap'];
        const average = averageOptionsMap[averageStr][0];
        var forecastLength = curve['forecast-length'];
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = "Correlation";
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select {{average}} as avtime, " +
                "count(distinct unix_timestamp(m0.valid_date)+3600*m0.valid_hour) as N_times, " +
                "min(unix_timestamp(m0.valid_date)+3600*m0.valid_hour) as min_secs, " +
                "max(unix_timestamp(m0.valid_date)+3600*m0.valid_hour) as max_secs, " +
                "avg(m0.wacorr/100) as stat, " +
                "count(m0.wacorr) as N0, " +
                "group_concat(m0.wacorr/100 order by unix_timestamp(m0.valid_date)+3600*m0.valid_hour) as sub_values0, " +
                "group_concat(unix_timestamp(m0.valid_date)+3600*m0.valid_hour order by unix_timestamp(m0.valid_date)+3600*m0.valid_hour) as sub_secs0, " +
                "group_concat(m0.level order by unix_timestamp(m0.valid_date)+3600*m0.valid_hour) as sub_levs0 " +
                "from {{dbtable}} as m0 " +
                "where 1=1 " +
                "and unix_timestamp(m0.valid_date)+3600*m0.valid_hour >= '{{fromSecs}}' " +
                "and unix_timestamp(m0.valid_date)+3600*m0.valid_hour <= '{{toSecs}}' " +
                "and m0.variable = '{{variable}}' " +
                "{{validTimeClause}} " +
                "and m0.fcst_len = {{forecastLength}} " +
                "{{levelClause}} " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{dbtable}}', dbtable);
            statement = statement.replace('{{average}}', average);
            statement = statement.replace('{{data_source}}', data_source);
            statement = statement.replace('{{region}}', region);
            statement = statement.replace('{{variable}}', variable);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLength}}', forecastLength);
            statement = statement.replace('{{levelClause}}', levelClause);
            statement = statement.replace('{{fromSecs}}', fromSecs);
            statement = statement.replace('{{toSecs}}', toSecs);
            dataRequests[curve.label] = statement;

            // math is done on forecastLength later on -- set all analyses to 0
            if (forecastLength === "-99") {
                forecastLength = "0";
            }

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBTimeSeries(sumPool, statement, data_source, forecastLength, fromSecs, toSecs, averageStr, validTimes, hasLevels, false);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + curve.label] = {
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
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, plotType, hasLevels);
            d = diffResult.dataset;
            xmin = xmin < d.xmin ? xmin : d.xmin;
            xmax = xmax > d.xmax ? xmax : d.xmax;
            ymin = ymin < d.ymin ? ymin : d.ymin;
            ymax = ymax > d.ymax ? ymax : d.ymax;
        }

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = d.sum / d.x.length;
        const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = d.xmin;
        curve['xmax'] = d.xmax;
        curve['ymin'] = d.ymin;
        curve['ymax'] = d.ymax;
        curve['axisKey'] = axisKey;
        const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        }
    }  // end for curves

    // process the data returned by the query
    const appParams = {"plotType": plotType, "hasLevels": hasLevels, "matching": matching};
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "idealValues": idealValues,
        "utcCycleStarts": utcCycleStarts,
        "axisMap": axisMap,
        "xmax": xmax,
        "xmin": xmin
    };
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataXYCurve(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};