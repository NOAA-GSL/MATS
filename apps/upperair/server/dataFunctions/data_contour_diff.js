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
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';

dataContourDiff = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appParams = {
        "plotType": matsTypes.PlotTypes.contourDiff,
        "matching": plotParams['plotAction'] === matsTypes.PlotActions.matched,
        "completeness": plotParams['completeness'],
        "outliers": plotParams['outliers'],
        "hideGaps": plotParams['noGapsCheck'],
        "hasLevels": true
    };
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var dataNotFoundForAnyCurve = false;
    var showSignificance = plotParams['significance'] !== 'none';
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var xAxisParam = plotParams['x-axis-parameter'];
    var yAxisParam = plotParams['y-axis-parameter'];
    var xValClause = matsCollections.PlotParams.findOne({name: 'x-axis-parameter'}).optionsMap[xAxisParam];
    var yValClause = matsCollections.PlotParams.findOne({name: 'y-axis-parameter'}).optionsMap[yAxisParam];
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    if (curvesLength !== 2) {
        throw new Error("INFO:  There must be two added curves.");
    }
    var dataset = [];
    var axisMap = Object.create(null);

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var label = curve['label'];
        var database = curve['database'];
        var databaseRef = matsCollections['database'].findOne({name: 'database'}).optionsMap[database];
        var model = matsCollections['data-source'].findOne({name: 'data-source'}).optionsMap[database][curve['data-source']][0];
        var regionStr = curve['region'];
        var regionDB = database.includes("RAOBs") ? "ID" : "shortName";
        var region = Object.keys(matsCollections['region'].findOne({name: 'region'}).valuesMap[regionDB]).find(key => matsCollections['region'].findOne({name: 'region'}).valuesMap[regionDB][key] === regionStr);
        var queryTableClause = "from " + databaseRef.sumsDB + "." + model + region + " as m0";
        if (database.includes("RAOBs")) {
            // Most of the RAOBs tables don't store a model sum or an obs sum for some reason.
            // So, we get the obs sum from HRRR_OPS, HRRR_HI, or GFS, because the obs are the same across all models.
            // Then we get the model sum by adding the obs sum to the bias sum (bias = model-obs).
            if (['5', '14', '15', '16', '17', '18'].includes(region.toString())) {
                queryTableClause = queryTableClause + ", " + databaseRef.sumsDB + ".HRRR_OPS_Areg" + region + " as m1";
            } else if (region.toString() === '19') {
                queryTableClause = queryTableClause + ", " + databaseRef.sumsDB + ".HRRR_HI_Areg" + region + " as m1";
            } else {
                queryTableClause = queryTableClause + ", " + databaseRef.sumsDB + ".GFS_Areg" + region + " as m1";
            }
        }
        var regionType = 'Predefined region';
        var phaseClause = "";
        if (database === 'AMDAR') {
            var phaseStr = curve['phase'];
            var phaseOptionsMap = matsCollections['phase'].findOne({name: 'phase'}, {optionsMap: 1})['optionsMap'];
            phaseClause = phaseOptionsMap[phaseStr];
        }
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections['variable'].findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[regionType][variableStr];
        var validTimeClause = "";
        var forecastLengthClause = "";
        var dateString = "";
        var dateClause = "";
        var levelClause = "";
        var siteMatchClause = "";
        if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
            var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
            if (validTimes.length > 0 && validTimes !== matsTypes.InputTypes.unused) {
                validTimeClause = "and m0.hour IN(" + validTimes + ")";
            }
        }
        if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
            var forecastLength = curve['forecast-length'];
            forecastLengthClause = "and m0.fcst_len = " + forecastLength;
        }
    if (database.includes("RAOBs")) {
        // we're just getting the obs from table m1, so only need fcst_len = 0
        forecastLengthClause = forecastLengthClause + " and m1.fcst_len = 0";
    }
        forecastLengthClause = forecastLengthClause + " and m0.fcst_len >= 0";
        if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
            dateString = "unix_timestamp(m0.date)+3600*m0.hour-m0.fcst_len*3600";
        } else {
            dateString = "unix_timestamp(m0.date)+3600*m0.hour";
        }
        dateClause = "and " + dateString + " >= " + fromSecs + " and " + dateString + " <= " + toSecs;
        if (xAxisParam !== 'Pressure level' && yAxisParam !== 'Pressure level') {
            var top = curve['top'];
            var bottom = curve['bottom'];
            levelClause = "and m0.mb10 >= " + top + "/10 and m0.mb10 <= " + bottom + "/10";
        }
        if (database.includes("RAOBs")) {
        siteMatchClause = "and m0.date = m1.date and m0.hour = m1.hour and m0.mb10 = m1.mb10";
        }
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections['statistic'].findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statisticClause = "sum(" + variable[0] + ") as square_diff_sum, sum(" + variable[1] + ") as N_sum, sum(" + variable[2] + ") as obs_model_diff_sum, sum(" + variable[3] + ") as model_sum, sum(" + variable[4] + ") as obs_sum, sum(" + variable[5] + ") as abs_sum, " +
        "group_concat(unix_timestamp(m0.date)+3600*m0.hour, ';', m0.mb10 * 10, ';', " + variable[0] + ", ';', " + variable[1] + ", ';', " + variable[2] + ", ';', " + variable[3] + ", ';', " + variable[4] + ", ';', " + variable[5] + " order by unix_timestamp(m0.date)+3600*m0.hour, m0.mb10 * 10) as sub_data, count(" + variable[0] + ") as N0";
        var statType = statisticOptionsMap[statisticSelect];
        var statVarUnitMap = matsCollections['variable'].findOne({name: 'variable'}, {statVarUnitMap: 1})['statVarUnitMap'];
        var varUnits = statVarUnitMap[statisticSelect][variableStr];

        // For contours, this functions as the colorbar label.
        curves[curveIndex]['unitKey'] = varUnits;

        var d;
        // this is a database driven curve, not a difference curve
        // prepare the query from the above parameters
        var statement = "{{xValClause}} " +
            "{{yValClause}} " +
            "count(distinct {{dateString}}) as N_times, " +
            "min({{dateString}}) as min_secs, " +
            "max({{dateString}}) as max_secs, " +
            "{{statisticClause}} " +
            "{{queryTableClause}} " +
            "where 1=1 " +
            "{{siteMatchClause}} " +
            "{{dateClause}} " +
            "{{validTimeClause}} " +
            "{{forecastLengthClause}} " +
            "{{levelClause}} " +
            "{{phaseClause}} " +
            "group by xVal,yVal " +
            "order by xVal,yVal" +
            ";";

        statement = statement.replace('{{xValClause}}', xValClause);
        statement = statement.replace('{{yValClause}}', yValClause);
        statement = statement.replace('{{statisticClause}}', statisticClause);
        statement = statement.replace('{{queryTableClause}}', queryTableClause);
        statement = statement.replace('{{siteMatchClause}}', siteMatchClause);
        statement = statement.replace('{{validTimeClause}}', validTimeClause);
        statement = statement.replace('{{forecastLengthClause}}', forecastLengthClause);
        statement = statement.replace('{{levelClause}}', levelClause);
        statement = statement.replace('{{phaseClause}}', phaseClause);
        statement = statement.replace('{{dateClause}}', dateClause);
        statement = statement.split('{{dateString}}').join(dateString);
        if (database === 'AMDAR') {
            // AMDAR tables have all partial sums so we can get them all from the main table
            statement = statement.split('m1').join('m0');
        }
        dataRequests[label] = statement;

        var queryResult;
        var startMoment = moment();
        var finishMoment;
        try {
            // send the query statement to the query function
        queryResult = matsDataQueryUtils.queryDBContour(sumPool, statement, appParams, statisticSelect + "_" + variableStr);
            finishMoment = moment();
            dataRequests["data retrieval (query) time - " + label] = {
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
                if (error.includes('Unknown column')) {
                    throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is not supported by the database for the model/region [" + curve['data-source'] + " and " + region + "].");
                } else {
                    throw new Error(error);
                }
            }
            dataNotFoundForAnyCurve = true;
        }

        var postQueryStartMoment = moment();

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = d.glob_stats.mean;
        const annotation = mean === undefined ? label + "- mean = NoData" : label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = d.xmin;
        curve['xmax'] = d.xmax;
        curve['ymin'] = d.ymin;
        curve['ymax'] = d.ymax;
        curve['zmin'] = d.zmin;
        curve['zmax'] = d.zmax;
        curve['xAxisKey'] = xAxisParam;
        curve['yAxisKey'] = yAxisParam;
        const cOptions = matsDataCurveOpsUtils.generateContourCurveOptions(curve, axisMap, d, appParams);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        };
    }  // end for curves

    if (dataNotFoundForAnyCurve) {
        // we found no data for at least one curve so don't bother proceeding
        throw new Error("INFO:  No valid data for at least one curve. Try making individual contour plots to determine which one.");
    }

    // turn the two contours into one difference contour
    dataset = matsDataDiffUtils.getDataForDiffContour(dataset, appParams, showSignificance, plotParams['significance'], statisticSelect + "_" + variableStr, statType === "ctc", statType === "scalar");
    plotParams.curves = matsDataUtils.getDiffContourCurveParams(plotParams.curves);
    curves = plotParams.curves;
    dataset[0]['name'] = matsPlotUtils.getCurveText(matsTypes.PlotTypes.contourDiff, curves[0]);
    dataset[1] = matsDataCurveOpsUtils.getContourSignificanceLayer(dataset);

    // process the data returned by the query
    const curveInfoParams = {"curve": curves, "statType": statType, "axisMap": axisMap};
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};