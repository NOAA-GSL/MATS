import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'
import {PythonShell} from 'python-shell';
import {Meteor} from "meteor/meteor";

dataContour = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const plotType = matsTypes.PlotTypes.contour;
    const hasLevels = true;
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProcessingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var dataset = [];
    var axisMap = Object.create(null);
    var xmax = -1 * Number.MAX_VALUE;
    var ymax = -1 * Number.MAX_VALUE;
    var zmax = -1 * Number.MAX_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var zmin = Number.MAX_VALUE;

    // initialize variables specific to the curve
    var curve = curves[0];
    const label = curve['label'];
    const xAxisParam = curve['x-axis-parameter'];
    const yAxisParam = curve['y-axis-parameter'];
    const xValClause = matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}).optionsMap[xAxisParam];
    const yValClause = matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}).optionsMap[yAxisParam];
    const database = curve['database'];
    const model = matsCollections.CurveParams.findOne({name: 'data-source'}, {optionsMap: 1}).optionsMap[database][curve['data-source']][0];
    var regions = (curve['region'] === undefined || curve['region'] === matsTypes.InputTypes.unused) ? [] : curve['region'];
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
    // the forecast lengths appear to have sometimes been inconsistent (by format) in the database so they
    // have been sanitized for display purposes in the forecastValueMap.
    // now we have to go get the damn ole unsanitary ones for the database.
    var forecastLengthsClause = "";
    if (xAxisParam !== 'Fcst lead time' && yAxisParam !== 'Fcst lead time') {
        var fcsts = (curve['forecast-length'] === undefined || curve['forecast-length'] === matsTypes.InputTypes.unused) ? [] : curve['forecast-length'];
        fcsts = Array.isArray(fcsts) ? fcsts : [fcsts];
        if (fcsts.length > 0) {
            const forecastValueMap = matsCollections.CurveParams.findOne({name: 'forecast-length'}, {valuesMap: 1})['valuesMap'][database][curve['data-source']];
            fcsts = fcsts.map(function (fl) {
                return forecastValueMap[fl];
            }).join(',');
            forecastLengthsClause = "and ld.fcst_lead IN (" + fcsts + ")";
        }
    }
    var levelsClause = "";
    var levels = (curve['pres-level'] === undefined || curve['pres-level'] === matsTypes.InputTypes.unused) ? [] : curve['pres-level'];
    levels = Array.isArray(levels) ? levels : [levels];
    if (levels.length > 0) {
        levels = levels.map(function (l) {
            return "'" + l + "'";
        }).join(',');
        levelsClause = "and h.fcst_lev IN(" + levels + ")";
    } else {
        // we can't just leave the level clause out, because we might end up with some upper levels in the mix
        levels = matsCollections.CurveParams.findOne({name: 'data-source'}, {levelsMap: 1})['levelsMap'][database][curve['data-source']];
        levels = levels.map(function (l) {
            return "'" + l + "'";
        }).join(',');
        levelsClause = "and h.fcst_lev IN(" + levels + ")";
    }
    var vts = "";   // start with an empty string that we can pass to the python script if there aren't vts.
    var validTimeClause = "";
    if (xAxisParam !== 'Valid UTC hour' && yAxisParam !== 'Valid UTC hour') {
        if (curve['valid-time'] !== undefined && curve['valid-time'] !== matsTypes.InputTypes.unused) {
            vts = curve['valid-time'];
            vts = Array.isArray(vts) ? vts : [vts];
            vts = vts.map(function (vt) {
                return "'" + vt + "'";
            }).join(',');
            validTimeClause = "and floor(unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600) IN(" + vts + ")";
        }
    }
    var dateClause = "";
    if ((xAxisParam === 'Init Date' || yAxisParam === 'Init Date') && (xAxisParam !== 'Valid Date' && yAxisParam !== 'Valid Date')) {
        dateClause = "unix_timestamp(ld.fcst_init_beg)";
    } else {
        dateClause = "unix_timestamp(ld.fcst_valid_beg)";
    }

    // For contours, this functions as the colorbar label.
    curve['unitKey'] = variable + " " + statistic;

    var d;
    // this is a database driven curve, not a difference curve
    // prepare the query from the above parameters
    // we query a lot of average values as sub values here, in order to comply with the common query routines from other plot types
    var statement = "{{xValClause}} " +
        "{{yValClause}} " +
        "min({{dateClause}}) as min_secs, " +
        "max({{dateClause}}) as max_secs, " +
        "count(ld.fbar) as n, " +
        "avg(ld.fbar) as sub_fbar, " +
        "avg(ld.obar) as sub_obar, " +
        "avg(ld.ffbar) as sub_ffbar, " +
        "avg(ld.oobar) as sub_oobar, " +
        "avg(ld.fobar) as sub_fobar, " +
        "avg(ld.total) as sub_total, " +
        "avg(ld.fcst_valid_beg) as sub_secs, " +    // this is just a dummy for the common python function -- the actual value doesn't matter
        "count(h.fcst_lev) as sub_levs " +      // this is just a dummy for the common python function -- the actual value doesn't matter
        "from {{database}}.stat_header h, " +
        "{{database}}.line_data_sl1l2 ld " +
        "where 1=1 " +
        "and h.model = '{{model}}' " +
        "{{regionsClause}} " +
        "and {{dateClause}} >= '{{fromSecs}}' " +
        "and {{dateClause}} <= '{{toSecs}}' " +
        "{{validTimeClause}} " +
        "{{forecastLengthsClause}} " +
        "and h.fcst_var = '{{variable}}' " +
        "{{levelsClause}} " +
        "and ld.stat_header_id = h.stat_header_id " +
        "group by xVal,yVal " +
        "order by xVal,yVal" +
        ";";

    statement = statement.replace('{{xValClause}}', xValClause);
    statement = statement.replace('{{yValClause}}', yValClause);
    statement = statement.replace('{{database}}', database);
    statement = statement.replace('{{database}}', database);
    statement = statement.replace('{{model}}', model);
    statement = statement.replace('{{regionsClause}}', regionsClause);
    statement = statement.replace('{{fromSecs}}', fromSecs);
    statement = statement.replace('{{toSecs}}', toSecs);
    statement = statement.replace('{{validTimeClause}}', validTimeClause);
    statement = statement.replace('{{forecastLengthsClause}}', forecastLengthsClause);
    statement = statement.replace('{{variable}}', variable);
    statement = statement.replace('{{levelsClause}}', levelsClause);
    statement = statement.split('{{dateClause}}').join(dateClause);
    dataRequests[curve.label] = statement;
    // console.log(statement);

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
            args: [Meteor.settings.private.MYSQL_CONF_PATH, statement, statistic, plotType, hasLevels, 0, vts]
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
                throw new Error("INFO:  The statistic/variable combination [" + statistic + " and " + variable + "] is not supported by the database for the model/regions [" + model + " and " + regions + "].");
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
        zmin = zmin < d.zmin ? zmin : d.zmin;
        zmax = zmax > d.zmax ? zmax : d.zmax;
    }

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

    // process the data returned by the query
    const curveInfoParams = {"curve": curves, "axisMap": axisMap};
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataContour(dataset, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};