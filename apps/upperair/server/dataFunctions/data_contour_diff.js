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
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

dataContourDiff = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
    const plotType = matsTypes.PlotTypes.contourDiff;
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    if (curvesLength !== 2) {
        throw new Error("INFO:  There must be two added curves.");
    }
    if (curves[0]['x-axis-parameter'] !== curves[1]['x-axis-parameter'] || curves[0]['y-axis-parameter'] !== curves[1]['y-axis-parameter']) {
        throw new Error("INFO:  The x-axis-parameter and y-axis-parameter must be consistent across both curves.");
    }
    var dataset = [];
    var axisMap = Object.create(null);

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        const label = curve['label'];
        const xAxisParam = curve['x-axis-parameter'];
        const yAxisParam = curve['y-axis-parameter'];
        const xValClause = matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}).optionsMap[xAxisParam];
        const yValClause = matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}).optionsMap[yAxisParam];
        const model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        const tablePrefix = matsCollections.CurveParams.findOne({name: 'data-source'}).tableMap[curve['data-source']];
        const regionStr = curve['region'];
        const region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        const variableStr = curve['variable'];
        const variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        const variable = variableOptionsMap[variableStr];
        var statisticSelect = curve['statistic'];
        const statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statAuxMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {statAuxMap: 1})['statAuxMap'];
        var statistic;
        var statKey;
        if (variableStr === 'winds') {
            statistic = statisticOptionsMap[statisticSelect][1];
            statKey = statisticSelect + '-winds';
            statistic = statistic + "," + statAuxMap[statKey];
        } else {
            statistic = statisticOptionsMap[statisticSelect][0];
            statKey = statisticSelect + '-other';
            statistic = statistic + "," + statAuxMap[statKey];
        }
        statistic = statistic.replace(/\{\{variable0\}\}/g, variable[0]);
        statistic = statistic.replace(/\{\{variable1\}\}/g, variable[1]);
        var statVarUnitMap = matsCollections.CurveParams.findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
        var varUnits = statVarUnitMap[statisticSelect][variableStr];
        var levelClause = "";
        var validTimeClause = "";
        var forecastLengthClause = "";
        var dateClause = "";
        if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
            var forecastLength = curve['forecast-length'];
            forecastLengthClause = "and m0.fcst_len = " + forecastLength;
        }
        if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
            const validTimeStr = curve['valid-time'];
            const validTimeOptionsMap = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'];
            validTimeClause = validTimeOptionsMap[validTimeStr][0];
        }
        if (xAxisParam !== 'Pressure level' && yAxisParam !== 'Pressure level') {
            const top = curve['top'];
            const bottom = curve['bottom'];
            levelClause = "and m0.mb10 >= " + top + "/10 and m0.mb10 <= " + bottom + "/10"
        }
        if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
            dateClause = "unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600";
        } else {
            dateClause = "unix_timestamp(m0.date)+3600*m0.hour";
        }

        // for two contours it's faster to just take care of matching in the query
        var matchModel = "";
        var matchDates = "";
        var matchValidTimeClause = "";
        var matchForecastLengthClause = "";
        var matchLevelClause = "";
        var matchClause = "";
        if (matching) {
            const otherCurveIndex = curveIndex === 0 ? 1 : 0;
            const otherModel = matsCollections.CurveParams.findOne({name: 'data-source'}).tableMap[curves[otherCurveIndex]['data-source']];
            const otherRegion = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === curves[otherCurveIndex]['region']);

            matchModel = ", " + otherModel + otherRegion + " as a0";
            const matchDateClause = dateClause.split('m0').join('a0');
            matchDates = "and " + matchDateClause + " >= '" + fromSecs + "' and " + matchDateClause + " <= '" + toSecs + "'";
            matchClause = "and m0.date = a0.date and m0.hour = a0.hour";

            if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
                var matchForecastLength = curves[otherCurveIndex]['forecast-length'];
                matchForecastLengthClause = "and a0.fcst_len = " + matchForecastLength;
            } else {
                matchForecastLengthClause = "and m0.fcst_len = a0.fcst_len";
            }
            if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
                matchValidTimeClause = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'][curves[otherCurveIndex]['valid-time']][0];
                matchValidTimeClause = matchValidTimeClause.split('m0').join('a0');
            }
            if (xAxisParam !== 'Pressure level' && yAxisParam !== 'Pressure level') {
                var matchTop = curves[otherCurveIndex]['top'];
                var matchBottom = curves[otherCurveIndex]['bottom'];
                matchLevelClause = "and m0.mb10 = a0.mb10 and a0.mb10 >= " + matchTop + "/10 and a0.mb10 <= " + matchBottom + "/10"    // multiselects always need an additional straight match clause
            } else {
                matchLevelClause = "and m0.mb10 = a0.mb10";
            }
        }

        // For contours, this functions as the colorbar label.
        curves[curveIndex]['unitKey'] = varUnits;

        var d;
        // this is a database driven curve, not a difference curve
        // prepare the query from the above parameters
        var statement = "{{xValClause}} " +
            "{{yValClause}} " +
            "count(distinct {{dateClause}}) as N_times, " +
            "min({{dateClause}}) as min_secs, " +
            "max({{dateClause}}) as max_secs, " +
            "{{statistic}} " +
            "from {{model}} as m0{{matchModel}} " +
            "where 1=1 " +
            "{{matchClause}} " +
            "and {{dateClause}} >= '{{fromSecs}}' " +
            "and {{dateClause}} <= '{{toSecs}}' " +
            "{{matchDates}} " +
            "{{levelClause}} " +
            "{{matchLevelClause}} " +
            "{{validTimeClause}} " +
            "{{matchValidTimeClause}} " +
            "{{forecastLengthClause}} " +
            "{{matchForecastLengthClause}} " +
            "and m0.fcst_len >= 0 " +
            "group by xVal,yVal " +
            "order by xVal,yVal" +
            ";";

        statement = statement.replace('{{xValClause}}', xValClause);
        statement = statement.replace('{{yValClause}}', yValClause);
        statement = statement.replace('{{model}}', tablePrefix + region);
        statement = statement.replace('{{matchModel}}', matchModel);
        statement = statement.replace('{{statistic}}', statistic); // statistic replacement has to happen first
        statement = statement.replace('{{validTimeClause}}', validTimeClause);
        statement = statement.replace('{{matchValidTimeClause}}', matchValidTimeClause);
        statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
        statement = statement.replace('{{matchForecastLengthClause}}', matchForecastLengthClause);
        statement = statement.replace('{{levelClause}}', levelClause);
        statement = statement.replace('{{matchLevelClause}}', matchLevelClause);
        statement = statement.split('{{dateClause}}').join(dateClause);
        statement = statement.replace('{{fromSecs}}', fromSecs);
        statement = statement.replace('{{toSecs}}', toSecs);
        statement = statement.replace('{{matchDates}}', matchDates);
        statement = statement.replace('{{matchClause}}', matchClause);
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
            queryResult = matsDataQueryUtils.queryDBContour(sumPool, statement);
            finishMoment = moment();
            dataRequests["data retrieval (query) time - " + curve.label] = {
                begin: startMoment.format(),
                finish: finishMoment.format(),
                duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                recordCount: queryResult.data.xTextOutput.length
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

        var postQueryStartMoment = moment();

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = d.glob_stats.mean;
        const annotation = mean === undefined ? label + "- mean = NaN" : label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = d.xmin;
        curve['xmax'] = d.xmax;
        curve['ymin'] = d.ymin;
        curve['ymax'] = d.ymax;
        curve['zmin'] = d.zmin;
        curve['zmax'] = d.zmax;
        curve['xAxisKey'] = xAxisParam;
        curve['yAxisKey'] = yAxisParam;
        const cOptions = matsDataCurveOpsUtils.generateContourCurveOptions(curve, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        };
    }

    // turn the two contours into one difference contour
    dataset = matsDataDiffUtils.getDataForDiffContour(dataset);
    plotParams.curves = matsDataUtils.getDiffContourCurveParams(plotParams.curves);
    curves = plotParams.curves;
    dataset[0]['name'] = matsPlotUtils.getCurveText(matsTypes.PlotTypes.contourDiff, curves[0]);

    // process the data returned by the query
    const curveInfoParams = {"curve": curves, "axisMap": axisMap};
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};