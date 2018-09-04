import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataQueryUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataMatchUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataPlotOpsUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataProfile = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
    var totalProcessingStart = moment();
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var axisMap = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    // ymin is negative in order to get the yaxis to plot inverted for profiles
    // we tried to use flots invert and transform functions but this did not work properly
    // so just draw the axis negative and change the ticks to positive numbers.
    var ymax = 0;
    var ymin = -1100;

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var label = curve['label'];
        var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var tablePrefix = matsCollections.CurveParams.findOne({name: 'data-source'}).tableMap[curve['data-source']];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var top = curve['top'];
        var bottom = curve['bottom'];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
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
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromDate = dateRange.fromDate;
        var toDate = dateRange.toDate;
        fromDate = moment.utc(fromDate, "MM-DD-YYYY").format('YYYY-M-D');
        toDate = moment.utc(toDate, "MM-DD-YYYY").format('YYYY-M-D');
        var validTimeStr = curve['valid-time'];
        var validTimeOptionsMap = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'];
        var validTimeClause = validTimeOptionsMap[validTimeStr][0];
        var forecastLength = curve['forecast-length'];
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
                "from {{model}} as m0 " +
                "where 1=1 " +
                "{{validTimeClause}} " +
                "and m0.fcst_len = {{forecastLength}} " +
                "and m0.mb10 >= {{top}}/10 " +
                "and m0.mb10 <= {{bottom}}/10 " +
                "and m0.date >= '{{fromDate}}' " +
                "and m0.date <= '{{toDate}}' " +
                "group by avVal " +
                "order by avVal" +
                ";";

            statement = statement.replace('{{model}}', tablePrefix + region);
            statement = statement.replace('{{top}}', top);
            statement = statement.replace('{{bottom}}', bottom);
            statement = statement.replace('{{fromDate}}', fromDate);
            statement = statement.replace('{{toDate}}', toDate);
            statement = statement.replace('{{statistic}}', statistic); // statistic replacement has to happen first
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLength}}', forecastLength);
            dataRequests[curve.label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, matsTypes.PlotTypes.profile, true);
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
                        throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is not supported by the database for the model/region [" + model + " and " + region + "].");
                    } else {
                        throw new Error(error);
                    }
                }
            }

            // set axis limits based on returned data
            var postQueryStartMoment = moment();

        } else {
            // this is a difference curve
            const diffResult = matsDataDiffUtils.getDataForDiffCurve({
                dataset: dataset,
                diffFrom: diffFrom
            }, matsTypes.PlotTypes.profile, true);

            // adjust axis stats based on new data from diff curve
            d = diffResult.dataset;
        }

        // set axis limits based on returned data
        for (var di = 0; di < d.length; di++) {
            xmax = (xmax > d[di][0] || d[di][0] === null) ? xmax : d[di][0];
            xmin = (xmin < d[di][0] || d[di][0] === null) ? xmin : d[di][0];
        }

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

    // variable to store maximum error bar length
    var errorMax = Number.MIN_VALUE;

    // if matching, pare down dataset to only matching data
    if (curvesLength > 1 && (matching)) {
        dataset = matsDataMatchUtils.getMatchedDataSetWithLevels(dataset, curvesLength, matsTypes.PlotTypes.profile);
    }

    // we may need to recalculate the axis limits after unmatched data and outliers are removed
    var maxx;
    var minx;
    var axisLimitReprocessed = {};

    // calculate data statistics (including error bars) for each curve
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        axisLimitReprocessed[curves[curveIndex].axisKey] = axisLimitReprocessed[curves[curveIndex].axisKey] !== undefined;
        diffFrom = curves[curveIndex].diffFrom;
        statisticSelect = curves[curveIndex]['statistic'];
        var data = dataset[curveIndex].data;
        const label = dataset[curveIndex].label;

        var di = 0;
        var values = [];
        var levels = [];
        var means = [];
        var rawStat;

        while (di < data.length) {

            var errorResult = {};

            /*
                 DATASET ELEMENTS:
                 series: [data,data,data ...... ]   each data is itself an array
                 data[0] - statValue (ploted against the x axis)
                 data[1] - level (plotted against the y axis)
                 data[2] - errorBar (sd * 1.96, formerly stde_betsy * 1.96)
                 data[3] - level values
                 data[4] - level times
                 data[5] - level stats
                 data[6] - tooltip
                 */

            // errorResult holds all the calculated curve stats like mean, sd, etc.
            errorResult = matsDataUtils.get_err(data[di][3], data[di][4]);

            // store raw statistic from query before recalculating that statistic to account for data removed due to matching, QC, etc.
            rawStat = data[di][0];
            if ((diffFrom === null || diffFrom === undefined) || !matching) {   // make sure that the diff curve actually shows the difference when matching. Otherwise outlier filtering etc. can make it slightly off.
                // assign recalculated statistic to data[di][1], which is the value to be plotted
                data[di][0] = errorResult.d_mean;
            } else {
                if (dataset[diffFrom[0]].data[di][0] !== null && dataset[diffFrom[1]].data[di][0] !== null) {
                    // make sure that the diff curve actually shows the difference when matching. Otherwise outlier filtering etc. can make it slightly off.
                    data[di][0] = dataset[diffFrom[0]].data[di][0] - dataset[diffFrom[1]].data[di][0];
                } else {
                    // keep the null for no data at this point
                    data[di][0] = null;
                }
            }
            values.push(data[di][0]);
            levels.push(data[di][1] * -1);  // inverted data for graphing - remember?
            means.push(errorResult.d_mean);

            // store error bars if matching
            const errorBar = errorResult.sd * 1.96;
            if (matching) {
                errorMax = errorMax > errorBar ? errorMax : errorBar;
                data[di][2] = errorBar;
            } else {
                data[di][2] = -1;
            }

            // store statistics
            data[di][5] = {
                raw_stat: rawStat,
                d_mean: errorResult.d_mean,
                sd: errorResult.sd,
                n_good: errorResult.n_good,
                lag1: errorResult.lag1,
                stde_betsy: errorResult.stde_betsy
            };

            // this is the tooltip, it is the last element of each dataseries element
            data[di][6] = label +
                "<br>" + -data[di][1] + "mb" +
                "<br> " + statisticSelect + ": " + (data[di][0] === null ? null : data[di][0].toPrecision(4)) +
                "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>  n: " + errorResult.n_good +
                // "<br>  lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                // "<br>  stde: " + errorResult.stde_betsy +
                "<br>  errorbars: " + Number((data[di][0]) - (errorResult.sd * 1.96)).toPrecision(4) + " to " + Number((data[di][0]) + (errorResult.sd * 1.96)).toPrecision(4);

            di++;
        }

        // get the overall stats for the text output - this uses the means not the stats.
        const stats = matsDataUtils.get_err(values.reverse(), levels.reverse()); // have to reverse because of data inversion
        const filteredMeans = means.filter(x => x);
        minx = Math.min.apply(null, filteredMeans);
        maxx = Math.max.apply(null, filteredMeans);
        stats.minx = minx;
        stats.maxx = maxx;
        dataset[curveIndex]['stats'] = stats;

        // recalculate axis options after QC and matching
        axisMap[curves[curveIndex].axisKey]['xmax'] = (axisMap[curves[curveIndex].axisKey]['xmax'] < maxx || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? maxx : axisMap[curves[curveIndex].axisKey]['xmax'];
        axisMap[curves[curveIndex].axisKey]['xmin'] = (axisMap[curves[curveIndex].axisKey]['xmin'] > minx || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? minx : axisMap[curves[curveIndex].axisKey]['xmin'];

        // recalculate curve annotation after QC and matching
        if (stats.d_mean !== undefined && stats.d_mean !== null) {
            axisMap[curves[curveIndex].axisKey]['annotation'] = label + "- mean = " + stats.d_mean.toPrecision(4);
        }
    }

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    const zeroLine = matsDataCurveOpsUtils.getVerticalValueLine(1050,50,0);
    dataset.push(zeroLine);

    // generate plot options
    const resultOptions = matsDataPlotOpsUtils.generateProfilePlotOptions(dataset, curves, axisMap, errorMax);
    var totalProcessingFinish = moment();
    dataRequests["total retrieval and processing time for curve set"] = {
        begin: totalProcessingStart.format(),
        finish: totalProcessingFinish.format(),
        duration: moment.duration(totalProcessingFinish.diff(totalProcessingStart)).asSeconds() + ' seconds'
    };

    // pass result to client-side plotting functions
    var result = {
        error: error,
        data: dataset,
        options: resultOptions,
        basis: {
            plotParams: plotParams,
            queries: dataRequests
        }
    };
    plotFunction(result);
};