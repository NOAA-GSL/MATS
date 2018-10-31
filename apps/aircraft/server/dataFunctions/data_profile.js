import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataProcessUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataProfile = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    const appName = "aircraft";
    const matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
    const plotType = matsTypes.PlotTypes.profile;
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
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    // ymin is negative in order to get the yaxis to plot inverted for profiles
    // we tried to use flot's invert and transform functions but this did not work properly
    // so just draw the axis negative and change the ticks to positive numbers.
    var ymax = 0;
    var ymin = -1100;
    var idealValues = [];

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        const label = curve['label'];
        const data_source = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        const regionStr = curve['region'];
        const region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        const variableStr = curve['variable'];
        const variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        const variable = variableOptionsMap[variableStr];
        const top = curve['top'];
        const bottom = curve['bottom'];
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
        var curveDates = curve['curve-dates'];
        var fromDateStr = curveDates.split(' - ')[0]; // get the from part
        fromDateStr = fromDateStr.split(' ')[0];  // strip off time field
        var toDateStr = curveDates.split(' - ')[1]; // get the to part
        toDateStr = toDateStr.split(' ')[0];  // strip off time field
        var curveDatesDateRangeFrom = moment.utc(fromDateStr, "MM-DD-YYYY").format('YYYY-M-D');
        var curveDatesDateRangeTo = moment.utc(toDateStr, "MM-DD-YYYY").format('YYYY-M-D');
        const validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        var validTimeClause = " ";
        if (validTimes.length > 0) {
            validTimeClause = " and  m0.hour IN(" + validTimes + ")";
        }
        const forecastLength = curve['forecast-length'];
        const phaseStr = curve['phase'];
        const phaseOptionsMap = matsCollections.CurveParams.findOne({name: 'phase'}, {optionsMap: 1})['optionsMap'];
        const phase = phaseOptionsMap[phaseStr];
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // units (axisKey) it will use the same axis.
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        var axisKey = varUnits;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options

        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select  -m0.mb10*10 as avVal, " +
                "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
                "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
                "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
                "{{statistic}} " +
                "from {{data_source}} as m0 " +
                "where 1=1 " +
                "{{validTimeClause}} " +
                "{{phase}} " +
                "and m0.mb10 >= {{top}}/10 " +
                "and m0.mb10 <= {{bottom}}/10 " +
                "and m0.date >= '{{fromDate}}' " +
                "and m0.date <= '{{toDate}}' " +
                "group by avVal " +
                "order by avVal" +
                ";";
            // build the query
            statement = statement.replace('{{data_source}}', data_source + "_" + forecastLength + "_" + region + "_sums");
            statement = statement.replace('{{top}}', top);
            statement = statement.replace('{{bottom}}', bottom);
            statement = statement.replace('{{fromDate}}', curveDatesDateRangeFrom);
            statement = statement.replace('{{toDate}}', curveDatesDateRangeTo);
            statement = statement.replace('{{statistic}}', statistic);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{phase}}', phase);
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
                        throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is not supported by the database for the model/region [" + data_source + " and " + region + "].");
                    } else {
                        throw new Error(error);
                    }
                }
            }

            // set axis limits based on returned data
            var postQueryStartMoment = moment();

        } else {
            // this is a difference curve
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, plotType, hasLevels);

            // adjust axis stats based on new data from diff curve
            d = diffResult.dataset;
        }

        xmax = d.xmax;
        xmin = d.xmin;

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        // profile plots always go from 0 to 1000 initially
        curve['annotation'] = "";
        curve['xmin'] = xmin;
        curve['xmax'] = xmax;
        curve['ymin'] = ymin;
        curve['ymax'] = ymax;
        const cOptions = matsDataCurveOpsUtils.generateProfileCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        }
    }  // end for curves

    // process the data returned by the query
    const appParams = {"appName": appName, "plotType": plotType, "hasLevels": hasLevels, "matching": matching};
    const curveInfoParams = {
        "curves": curves,
        "curvesLength": curvesLength,
        "idealValues": idealValues,
        "axisMap": axisMap
    };
    const bookkeepingParams = {"dataRequests": dataRequests, "totalProcessingStart": totalProcessingStart};
    var result = matsDataProcessUtils.processDataProfile(dataset, appParams, curveInfoParams, plotParams, bookkeepingParams);
    plotFunction(result);
};