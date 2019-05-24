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
        var label = curve['label'];
        var xAxisParam = curve['x-axis-parameter'];
        var yAxisParam = curve['y-axis-parameter'];
        var xValClause = matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}).optionsMap[xAxisParam];
        var yValClause = matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}).optionsMap[yAxisParam];
        var data_source = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        var regionClause;
        if (region === 'all_stat') {
            regionClause = "";
        } else if (region === 'all_surf') {
            regionClause = "and m0.id in(1,2,3,4,5,6,7) ";
        } else if (region === 'all_sol') {
            regionClause = "and m0.id in(8,9,10,11,12,13,14) ";
        } else {
            regionClause = "and m0.id in(" + region + ") ";
        }
        var scaleStr = curve['scale'];
        var grid_scale = Object.keys(matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap[key] === scaleStr);
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic = statisticOptionsMap[statisticSelect][0];
        statistic = statistic.replace(/\{\{variable0\}\}/g, variable[0]);
        statistic = statistic.replace(/\{\{variable1\}\}/g, variable[1]);
        statistic = statistic.replace(/\{\{variable2\}\}/g, variable[2]);
        var statVarUnitMap = matsCollections.CurveParams.findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
        var varUnits = statVarUnitMap[statisticSelect][variableStr];
        var validTimeClause = "";
        var forecastLengthClause = "";
        var dateClause = "";
        var obsDateClause = "";
        if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
            var forecastLength = Number(curve['forecast-length']) * 60;
            forecastLengthClause = "and m0.fcst_len = " + forecastLength;
        }
        if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
            var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
            if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
                validTimeClause = " and (m0.secs)%(24*3600)/3600 IN(" + validTimes + ")";
            }
        }
        if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
            dateClause = "m0.secs-m0.fcst_len*60";
            obsDateClause = "ob0.secs-ob0.fcst_len*60";
        } else {
            dateClause = "m0.secs";
            obsDateClause = "ob0.secs";
        }

        // for two contours it's faster to just take care of matching in the query
        var matchModel = "";
        var matchDates = "";
        var matchRegionClause = "";
        var matchScaleClause = "";
        var matchValidTimeClause = "";
        var matchForecastLengthClause = "";
        var matchClause = "";
        if (matching) {
            const otherCurveIndex = curveIndex === 0 ? 1 : 0;
            const otherModel = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curves[otherCurveIndex]['data-source']][0];
            matchModel = ", " + otherModel + " as a0";
            const matchDateClause = dateClause.split('m0').join('a0');
            matchDates = "and " + matchDateClause + " >= '" + fromSecs + "' and " + matchDateClause + " <= '" + toSecs + "'";
            matchClause = "and m0.secs = a0.secs and m0.id = a0.id and ob0.secs = a0.secs and ob0.id = a0.id";

            const otherRegion = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === curves[otherCurveIndex]['region']);
            if (otherRegion === 'all_stat') {
                matchRegionClause = "";
            } else if (otherRegion === 'all_surf') {
                matchRegionClause = "and a0.id in(1,2,3,4,5,6,7) ";
            } else if (otherRegion === 'all_sol') {
                matchRegionClause = "and a0.id in(8,9,10,11,12,13,14) ";
            } else {
                matchRegionClause = "and a0.id in(" + otherRegion + ") ";
            }
            var otherScale = Object.keys(matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap[key] === curves[otherCurveIndex]['scale']);
            matchScaleClause = "and a0.scale = '" + otherScale + "'";

            if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
                var matchForecastLength = Number(curves[otherCurveIndex]['forecast-length']) * 60;
                matchForecastLengthClause = "and a0.fcst_len = " + matchForecastLength;
            } else {
                matchForecastLengthClause = "and m0.fcst_len = a0.fcst_len";
            }
            if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
                var matchValidTimes = curves[otherCurveIndex]['valid-time'] === undefined ? [] : curves[otherCurveIndex]['valid-time'];
                if (matchValidTimes.length > 0 && matchValidTimes !== matsTypes.InputTypes.unused) {
                    matchValidTimeClause = " and (a0.secs)%(24*3600)/3600 IN(" + matchValidTimes + ")";
                }
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
            "from surfrad as ob0, {{data_source}} as m0{{matchModel}} " +
            "where 1=1 " +
            "{{matchClause}} " +
            "and ob0.secs = m0.secs " +
            "and ob0.id = m0.id " +
            "and {{dateClause}} >= '{{fromSecs}}' " +
            "and {{dateClause}} <= '{{toSecs}}' " +
            "and {{obsDateClause}} >= '{{fromSecs}}' " +
            "and {{obsDateClause}} <= '{{toSecs}}' " +
            "{{matchDates}} " +
            "and m0.scale = '{{scale}}' " +
            "{{matchScaleClause}} " +
            "{{regionClause}} " +
            "{{matchRegionClause}} " +
            "{{validTimeClause}} " +
            "{{matchValidTimeClause}} " +
            "{{forecastLengthClause}} " +
            "{{matchForecastLengthClause}} " +
            "group by xVal,yVal " +
            "order by xVal,yVal" +
            ";";

        statement = statement.replace('{{xValClause}}', xValClause);
        statement = statement.replace('{{yValClause}}', yValClause);
        statement = statement.replace('{{statistic}}', statistic);
        statement = statement.replace('{{data_source}}', data_source);
        statement = statement.replace('{{matchModel}}', matchModel);
        statement = statement.split('{{fromSecs}}').join(fromSecs);
        statement = statement.split('{{toSecs}}').join(toSecs);
        statement = statement.replace('{{scale}}', grid_scale);
        statement = statement.replace('{{matchScaleClause}}', matchScaleClause);
        statement = statement.replace('{{matchDates}}', matchDates);
        statement = statement.replace('{{matchClause}}', matchClause);
        statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
        statement = statement.replace('{{matchForecastLengthClause}}', matchForecastLengthClause);
        statement = statement.replace('{{validTimeClause}}', validTimeClause);
        statement = statement.replace('{{matchValidTimeClause}}', matchValidTimeClause);
        statement = statement.replace('{{regionClause}}', regionClause);
        statement = statement.replace('{{matchRegionClause}}', matchRegionClause);
        statement = statement.split('{{dateClause}}').join(dateClause);
        statement = statement.split('{{obsDateClause}}').join(obsDateClause);
        dataRequests[curve.label] = statement;

        if (data_source !== 'HRRR' && (variableStr !== 'dswrf' && statisticSelect !== 'Obs average')) {
            throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is only available for the HRRR data-source.");
        }

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