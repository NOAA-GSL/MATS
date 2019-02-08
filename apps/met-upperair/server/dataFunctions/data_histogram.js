import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataHistogram = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appName = "met-upperair";
    const plotType = matsTypes.PlotTypes.histogram;
    const hasLevels = true;
    const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
    var alreadyMatched = false;
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = [];
    var totalProcessingStart = moment();
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    var dataset = [];
    var allReturnedSubStats = [];
    var allReturnedSubSecs = [];
    var allReturnedSubLevs = [];
    var axisMap = Object.create(null);

    // process user bin customizations
    const binParams = matsDataUtils.setHistogramParameters(plotParams);
    const yAxisFormat = binParams.yAxisFormat;
    const binNum = binParams.binNum;

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        dataFoundForCurve[curveIndex] = true;
        var label = curve['label'];
        const database = curve['database'];
        const model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[database][curve['data-source']][0];
        const region = curve['region'];
        const variable = curve['variable'];
        const statisticStr = curve['statistic'];
        const statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        const statistic = statisticOptionsMap[statisticStr][0];
        const forecastLengthStr = curve['forecast-length'];
        const forecastValueMap = matsCollections.CurveParams.findOne({name: 'forecast-length'}, {valuesMap: 1})['valuesMap'][database][model];
        const forecastLength = forecastValueMap[forecastLengthStr];
        var levels = curve['pres-level'] === undefined ? [] : curve['pres-level'];
        for (var levIdx = 0; levIdx < levels.length; levIdx++) {
            levels[levIdx] = "'" + levels[levIdx].toString() + "'"
        }
        var levelClause = "";
        if (levels.length > 0) {
            levelClause = "and h.fcst_lev IN(" + levels + ")";
        }
        var vts = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        var validTimeClause = "";
        if (vts.length > 0) {
            validTimeClause = "and floor(unix_timestamp(ld.fcst_valid_beg)%(24*3600)/3600) IN(" + vts + ")";
        }
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = yAxisFormat;
        if (yAxisFormat === 'Relative frequency') {
            axisKey = axisKey + " (x100)"
        }
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        curves[curveIndex].binNum = binNum; // stash the binNum to use it later for bar chart options

        var d;
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select unix_timestamp(ld.fcst_valid_beg) as avtime, " +
                "count(distinct unix_timestamp(ld.fcst_valid_beg)) as N_times, " +
                "min(unix_timestamp(ld.fcst_valid_beg)) as min_secs, " +
                "max(unix_timestamp(ld.fcst_valid_beg)) as max_secs, " +
                "{{statistic}} " +
                "from {{database}}.stat_header h, " +
                "{{database}}.line_data_sl1l2 ld " +
                "where 1=1 " +
                "and h.model = '{{model}}' " +
                "and h.vx_mask in ({{region}}) " +
                "and unix_timestamp(ld.fcst_valid_beg) >= '{{fromSecs}}' " +
                "and unix_timestamp(ld.fcst_valid_beg) <= '{{toSecs}}' " +
                "{{validTimeClause}} " +
                "and ld.fcst_lead = '{{forecastLength}}' " +
                "and h.fcst_var = '{{variable}}' " +
                "{{levelClause}} " +
                "and ld.stat_header_id = h.stat_header_id " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{statistic}}', statistic);
            statement = statement.replace('{{database}}', database);
            statement = statement.replace('{{database}}', database);
            statement = statement.replace('{{model}}', model);
            statement = statement.replace('{{region}}', region);
            statement = statement.replace('{{fromSecs}}', fromSecs);
            statement = statement.replace('{{toSecs}}', toSecs);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLength}}', forecastLength);
            statement = statement.replace('{{variable}}', variable);
            statement = statement.replace('{{levelClause}}', levelClause);
            dataRequests[curve.label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, plotType, hasLevels);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + curve.label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.length
                };
                // get the data back from the query
                d = queryResult.data;
                allReturnedSubStats.push(d.subVals); // save returned data so that we can calculate histogram stats once all the queries are done
                allReturnedSubSecs.push(d.subSecs);
                allReturnedSubLevs.push(d.subLevs);
            } catch (e) {
                // this is an error produced by a bug in the query function, not an error returned by the mysql database
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw new Error(e.message);
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
                    // this is NOT an error just a no data condition
                    dataFoundForCurve[curveIndex] = false;
                } else {
                    // this is an error returned by the mysql database
                    error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                    if (error.includes('Unknown column')) {
                        throw new Error("INFO:  The statistic/variable combination [" + statisticStr + " and " + variable + "] is not supported by the database for the model/region [" + model + " and " + region + "].");
                    } else {
                        throw new Error(error);
                    }
                }
            }
        }
    }
    const appParams = {"appName": appName, "plotType": plotType, "hasLevels": hasLevels, "matching": matching};
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "dataFoundForCurve": dataFoundForCurve,
        "axisMap": axisMap,
        "yAxisFormat": yAxisFormat
    };
    const bookkeepingParams = {
        "alreadyMatched": alreadyMatched,
        "dataRequests": dataRequests,
        "totalProcessingStart": totalProcessingStart
    };
    var result = matsDataProcessUtils.processDataHistogram(allReturnedSubStats, allReturnedSubSecs, allReturnedSubLevs, dataset, appParams, curveInfoParams, plotParams, binParams, bookkeepingParams);
    plotFunction(result);
};