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

dataDieOff = function (plotParams, plotFunction) {
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
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        const label = curve['label'];
        const model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        const tablePrefix = matsCollections.CurveParams.findOne({name: 'data-source'}).tableMap[curve['data-source']];
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
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromDate = dateRange.fromDate;
        var toDate = dateRange.toDate;
        fromDate = moment.utc(fromDate, "MM-DD-YYYY").format('YYYY-M-D');
        toDate = moment.utc(toDate, "MM-DD-YYYY").format('YYYY-M-D');
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var forecastLengthStr = curve['dieoff-forecast-length'];
        var forecastLengthOptionsMap = matsCollections.CurveParams.findOne({name: 'dieoff-forecast-length'}, {optionsMap: 1})['optionsMap'];
        var forecastLength = forecastLengthOptionsMap[forecastLengthStr][0];
        var validTimeClause = "";
        var utcCycleStart;
        var utcCycleStartClause = "";
        var dateRangeClause = "and unix_timestamp(m0.date)+3600*m0.hour >= '" + fromSecs + "' and unix_timestamp(m0.date)+3600*m0.hour <= '" + toSecs + "' ";
        if (forecastLength === matsTypes.ForecastTypes.dieoff) {
            const validTimeStr = curve['valid-time'];
            const validTimeOptionsMap = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'];
            validTimeClause = validTimeOptionsMap[validTimeStr][0];
        } else if (forecastLength === matsTypes.ForecastTypes.utcCycle) {
            utcCycleStart = Number(curve['utc-cycle-start']);
            utcCycleStartClause = "and (unix_timestamp(m0.date)+3600*m0.hour - m0.fcst_len*3600)%(24*3600)/3600 IN(" + utcCycleStart + ")";
        } else {
            dateRangeClause = "and (unix_timestamp(m0.date)+3600*m0.hour - m0.fcst_len*3600) = " + fromSecs;
        }
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
            var statement = "SELECT m0.fcst_len AS avtime, " +
                "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
                "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
                "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
                "{{statistic}} " +
                "from {{model}} as m0 " +
                "where 1=1 " +
                "{{dateRangeClause}} " +
                "{{validTimeClause}} " +
                "{{utcCycleStartClause}} " +
                "and m0.fcst_len >= 0 " +
                "and m0.mb10 >= {{top}}/10 " +
                "and m0.mb10 <= {{bottom}}/10 " +
                "group by avtime " +
                "order by avtime;";

            statement = statement.replace('{{model}}', tablePrefix + region);
            statement = statement.replace('{{top}}', top);
            statement = statement.replace('{{bottom}}', bottom);
            statement = statement.replace('{{statistic}}', statistic); // statistic replacement has to happen first
            statement = statement.replace('{{dateRangeClause}}', dateRangeClause);
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{utcCycleStartClause}}', utcCycleStartClause);
            dataRequests[curve.label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, matsTypes.PlotTypes.dieoff, true);
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
            if (dataFoundForCurve) {
                xmin = xmin < d[0][0] ? xmin : d[0][0];
                xmax = xmax > d[d.length - 1][0] ? xmax : d[d.length - 1][0];
                var sum = 0;
                var count = 0;
                for (var i = 0; i < d.length; i++) {
                    if (d[i][1] !== null) {
                        sum = sum + d[i][1];
                        count++;
                        ymin = Number(ymin) < Number(d[i][1]) ? ymin : d[i][1];
                        ymax = Number(ymax) > Number(d[i][1]) ? ymax : d[i][1];
                    }
                }
            }
        } else {
            // this is a difference curve
            const diffResult = matsDataDiffUtils.getDataForDiffCurve({
                dataset: dataset,
                ymin: ymin,
                ymax: ymax,
                diffFrom: diffFrom
            }, matsTypes.PlotTypes.dieoff, true);

            // adjust axis stats based on new data from diff curve
            d = diffResult.dataset;
            ymin = diffResult.ymin;
            ymax = diffResult.ymax;
            sum = diffResult.sum;
            count = diffResult.count;
        }

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        const mean = sum / count;
        const annotation = label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['xmin'] = xmin;
        curve['xmax'] = xmax;
        curve['ymin'] = ymin;
        curve['ymax'] = ymax;
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

    // variable to store maximum error bar length
    var errorMax = Number.MIN_VALUE;

    // if matching, pare down dataset to only matching data
    if (curvesLength > 1 && (matching)) {
        dataset = matsDataMatchUtils.getMatchedDataSetWithLevels(dataset, curvesLength, matsTypes.PlotTypes.dieoff);
    }

    // we may need to recalculate the axis limits after unmatched data and outliers are removed
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
        var fhrs = [];
        var means = [];
        var rawStat;

        while (di < data.length) {

            var errorResult = {};

            /*
             DATASET ELEMENTS:
             series: [data,data,data ...... ]   each data is itself an array
             data[0] - fhr (plotted against the x axis)
             data[1] - statValue (ploted against the y axis)
             data[2] - errorBar (sd * 1.96, formerly stde_betsy * 1.96)
             data[3] - fhr values
             data[4] - fhr times
             data[5] - fhr stats
             data[6] - tooltip
             */

            // errorResult holds all the calculated curve stats like mean, sd, etc.
            errorResult = matsDataUtils.get_err(data[di][3], data[di][4]);

            // store raw statistic from query before recalculating that statistic to account for data removed due to matching, QC, etc.
            rawStat = data[di][1];
            if ((diffFrom === null || diffFrom === undefined) || !matching) {
                // assign recalculated statistic to data[di][1], which is the value to be plotted
                data[di][1] = errorResult.d_mean;
            } else {
                if (dataset[diffFrom[0]].data[di][1] !== null && dataset[diffFrom[1]].data[di][1] !== null) {
                    // make sure that the diff curve actually shows the difference when matching. Otherwise outlier filtering etc. can make it slightly off.
                    data[di][1] = dataset[diffFrom[0]].data[di][1] - dataset[diffFrom[1]].data[di][1];
                } else {
                    // keep the null for no data at this point
                    data[di][1] = null;
                }
            }
            values.push(data[di][1]);
            fhrs.push(data[di][0]);
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
                "<br>" + "fhr: " + data[di][0] +
                "<br> " + statisticSelect + ": " + (data[di][1] === null ? null : data[di][1].toPrecision(4)) +
                "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>  n: " + errorResult.n_good +
                // "<br>  lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                // "<br>  stde: " + errorResult.stde_betsy +
                "<br>  errorbars: " + Number((data[di][1]) - (errorResult.sd * 1.96)).toPrecision(4) + " to " + Number((data[di][1]) + (errorResult.sd * 1.96)).toPrecision(4);

            di++;
        }

        // get the overall stats for the text output - this uses the means not the stats.
        const stats = matsDataUtils.get_err(fhrs, values);
        const filteredMeans = means.filter(x => x);
        const miny = Math.min(...filteredMeans);
        const maxy = Math.max(...filteredMeans);
        stats.miny = miny;
        stats.maxy = maxy;
        dataset[curveIndex]['stats'] = stats;

        // recalculate axis options after QC and matching
        axisMap[curves[curveIndex].axisKey]['ymax'] = (axisMap[curves[curveIndex].axisKey]['ymax'] < maxy || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? maxy : axisMap[curves[curveIndex].axisKey]['ymax'];
        axisMap[curves[curveIndex].axisKey]['ymin'] = (axisMap[curves[curveIndex].axisKey]['ymin'] > miny || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? miny : axisMap[curves[curveIndex].axisKey]['ymin'];

        // recalculate curve annotation after QC and matching
        if (stats.d_mean !== undefined && stats.d_mean !== null) {
            axisMap[curves[curveIndex].axisKey]['annotation'] = label + "- mean = " + stats.d_mean.toPrecision(4);
        }
    }

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    const zeroLine = matsDataCurveOpsUtils.getHorizontalValueLine(xmax, xmin, 0);
    dataset.push(zeroLine);

    // generate plot options
    const resultOptions = matsDataPlotOpsUtils.generateDieoffPlotOptions(dataset, curves, axisMap, errorMax);
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