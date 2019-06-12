/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';
import {PythonShell} from 'python-shell';
import {Meteor} from "meteor/meteor";

dataDieOff = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
    const plotType = matsTypes.PlotTypes.dieoff;
    const hasLevels = true;
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
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
        const label = curve['label'];
        const database = curve['database'];
        const model = matsCollections.CurveParams.findOne({name: 'data-source'}, {optionsMap: 1}).optionsMap[database][curve['data-source']][0];
        var regions = curve['region'] === undefined ? [] : curve['region'];
        regions = Array.isArray(regions) ? regions : [regions];
        var regionsClause = "";
        if (regions.length > 0) {
            regions = regions.map(function (r) {
                return "'" + r + "'";
            }).join(',');
            regionsClause = "and h.vx_mask IN(" + regions + ")";
        }
        const variable = curve['variable'];
        const statistic = curve['statistic'];
        const forecastValueMap = matsCollections.CurveParams.findOne({name: 'forecast-length'}, {valuesMap: 1})['valuesMap'][database][curve['data-source']];
        const forecastKeys = Object.keys(forecastValueMap);
        var levels = curve['pres-level'] === undefined ? [] : curve['pres-level'];
        var levelsClause = "";
        levels = Array.isArray(levels) ? levels : [levels];
        if (levels.length > 0) {
            levels = levels.map(function (l) {
                return "'" + l + "'";
            }).join(',');
            levelsClause = "and h.fcst_lev IN(" + levels + ")";
        } else {
            // we can't just leave the level clause out, because we might end up with some surface levels in the mix
            levels = matsCollections.CurveParams.findOne({name: 'data-source'}, {levelsMap: 1})['levelsMap'][database][curve['data-source']];
            levels = levels.map(function (l) {
                return "'" + l + "'";
            }).join(',');
            levelsClause = "and h.fcst_lev IN(" + levels + ")";
        }
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var dieoffTypeStr = curve['dieoff-type'];
        var dieoffTypeOptionsMap = matsCollections.CurveParams.findOne({name: 'dieoff-type'}, {optionsMap: 1})['optionsMap'];
        var dieoffType = dieoffTypeOptionsMap[dieoffTypeStr][0];
        var validTimeClause = "";
        var utcCycleStart;
        var utcCycleStartClause = "";
        var dateRangeClause = "and unix_timestamp(ld.fcst_valid_beg) >= '" + fromSecs + "' and unix_timestamp(ld.fcst_valid_beg) <= '" + toSecs + "' ";
        if (dieoffType === matsTypes.ForecastTypes.dieoff) {
            var vts = "";   // start with an empty string that we can pass to the python script if there aren't vts.
            if (curve['valid-time'] !== undefined) {
                vts = curve['valid-time'];
                vts = Array.isArray(vts) ? vts : [vts];
                vts = vts.map(function (vt) {
                    return "'" + vt + "'";
                }).join(',');
                validTimeClause = "and floor(unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600) IN(" + vts + ")";
            }
        } else if (dieoffType === matsTypes.ForecastTypes.utcCycle) {
            utcCycleStart = Number(curve['utc-cycle-start']);
            utcCycleStartClause = "and (unix_timestamp(ld.fcst_valid_beg) - ld.fcst_lead*3600)%(24*3600)/3600 IN(" + utcCycleStart + ")";
        } else {
            dateRangeClause = "and (unix_timestamp(ld.fcst_valid_beg) - ld.fcst_lead*3600) = " + fromSecs;
        }
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // variable (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = variable;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "SELECT ld.fcst_lead AS avtime, " +
                "count(distinct unix_timestamp(ld.fcst_valid_beg)) as N_times, " +
                "min(unix_timestamp(ld.fcst_valid_beg)) as min_secs, " +
                "max(unix_timestamp(ld.fcst_valid_beg)) as max_secs, " +
                "sum(ld.total) as N0, " +
                "avg(ld.fbar) as fbar, " +
                "avg(ld.obar) as obar, " +
                "group_concat(ld.fbar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_fbar, " +
                "group_concat(ld.obar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_obar, " +
                "group_concat(ld.ffbar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_ffbar, " +
                "group_concat(ld.oobar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_oobar, " +
                "group_concat(ld.fobar order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_fobar, " +
                "group_concat(ld.total order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_total, " +
                "group_concat(unix_timestamp(ld.fcst_valid_beg) order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_secs, " +
                "group_concat(h.fcst_lev order by unix_timestamp(ld.fcst_valid_beg), h.fcst_lev) as sub_levs " +
                "from {{database}}.stat_header h, " +
                "{{database}}.line_data_sl1l2 ld " +
                "where 1=1 " +
                "and h.model = '{{model}}' " +
                "{{regionsClause}} " +
                "{{dateRangeClause}} " +
                "{{validTimeClause}} " +
                "{{utcCycleStartClause}} " +
                "and h.fcst_var = '{{variable}}' " +
                "{{levelsClause}} " +
                "and ld.stat_header_id = h.stat_header_id " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{database}}', database);
            statement = statement.replace('{{database}}', database);
            statement = statement.replace('{{model}}', model);
            statement = statement.replace('{{regionsClause}}', regionsClause);
            statement = statement.replace('{{dateRangeClause}}', dateRangeClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{utcCycleStartClause}}', utcCycleStartClause);
            statement = statement.replace('{{variable}}', variable);
            statement = statement.replace('{{levelsClause}}', levelsClause);
            dataRequests[curve.label] = statement;
            // console.log(statement);

            const QCParams = matsDataUtils.getPlotParamsFromStack();
            const completenessQCParam = Number(QCParams["completeness"]) / 100;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the python query function
                const pyOptions = {
                    mode: 'text',
                    pythonPath: Meteor.settings.private.PYTHON_PATH,
                    pythonOptions: ['-u'], // get print results in real-time
                    scriptPath: process.env.METEOR_PACKAGE_DIRS + '/mats-common/private/',
                    args: [Meteor.settings.private.MYSQL_CONF_PATH, statement, statistic, plotType, hasLevels, completenessQCParam, vts]
                };
                var pyError = null;
                const Future = require('fibers/future');
                var future = new Future();
                PythonShell.run('python_query_util.py', pyOptions, function (err, results) {
                    if (err) {
                        pyError = err;
                        future["return"]();
                    }
                    queryResult = JSON.parse(results);
                    // get the data back from the query
                    d = queryResult.data;
                    // might need to sanitize fhrs
                    if (d.x.length > 0) {
                        d.x = d.x.map(function (fl) {
                            return Number(forecastKeys.find(key => forecastValueMap[key] == fl));
                        });
                        d.xmax = Number(forecastKeys.find(key => forecastValueMap[key] == d.xmax));
                        d.xmin = Number(forecastKeys.find(key => forecastValueMap[key] == d.xmin));
                    }
                    finishMoment = moment();
                    dataRequests["data retrieval (query) time - " + curve.label] = {
                        begin: startMoment.format(),
                        finish: finishMoment.format(),
                        duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                        recordCount: queryResult.data.x.length
                    };
                    future["return"]();
                });
                future.wait();
                if (pyError != null) {
                    throw new Error(pyError);
                }
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
                        throw new Error("INFO:  The statistic/variable combination [" + statistic + " and " + variable + "] is not supported by the database for the model/region [" + model + " and " + region + "].");
                    } else {
                        throw new Error(error);
                    }
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
        const annotation = label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = d.xmin;
        curve['xmax'] = d.xmax;
        curve['ymin'] = d.ymin;
        curve['ymax'] = d.ymax;
        curve['axisKey'] = axisKey;
        const cOptions = matsDataCurveOpsUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d, plotType);  // generate plot with data, curve annotation, axis labels, etc.
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