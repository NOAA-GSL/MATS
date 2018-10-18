import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataMatchUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataPlotOpsUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

const processDataXYCurve = function (curvesLength, curves, plotParams, dataset, appName, matching, plotType, hasLevels, diffFrom, idealValues, axisMap, xmax, xmin, dataRequests, totalProcessingStart) {
    var error = "";

    // variable to store maximum error bar length
    var errorMax = Number.MIN_VALUE;

    // if matching, pare down dataset to only matching data
    if (curvesLength > 1 && matching) {
        if (hasLevels) {
            dataset = matsDataMatchUtils.getMatchedDataSetWithLevels(dataset, curvesLength, plotType);
        } else {
            dataset = matsDataMatchUtils.getMatchedDataSet(dataset, curvesLength);
        }
    }

    // we may need to recalculate the axis limits after unmatched data and outliers are removed
    var axisLimitReprocessed = {};

    // calculate data statistics (including error bars) for each curve
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        if (appName !== "surfrad") {
            axisLimitReprocessed[curves[curveIndex].axisKey] = axisLimitReprocessed[curves[curveIndex].axisKey] !== undefined;
        }
        diffFrom = curves[curveIndex].diffFrom;
        var statisticSelect = curves[curveIndex]['statistic'];
        var data = dataset[curveIndex].data;
        const label = dataset[curveIndex].label;

        var di = 0;
        var values = [];
        var indVars = [];
        var means = [];
        var rawStat;

        while (di < data.length) {

            var errorResult = {};

            /*
             DATASET ELEMENTS:
             series: [data,data,data ...... ]   each data is itself an array
             data[0] - independentVar (plotted against the x axis)
             data[1] - statValue (ploted against the y axis)
             data[2] - errorBar (sd * 1.96, formerly stde_betsy * 1.96)
             data[3] - avtime values -- removed here to save on data volume
             data[4] - avtime times -- removed here to save on data volume
             data[5] - avtime stats
             data[6] - tooltip
             */

            // errorResult holds all the calculated curve stats like mean, sd, etc.
            errorResult = matsDataUtils.get_err(data[di][3], data[di][4]);

            // store raw statistic from query before recalculating that statistic to account for data removed due to matching, QC, etc.
            rawStat = data[di][1];
            if (appName !== "surfrad" || !(appName === "surfrad" && (statisticSelect === 'Std deviation (do not plot matched)' || statisticSelect === 'RMS (do not plot matched)') && !matching)) {  // this ungainly if statement is because the surfrad3 database doesn't support recalculating some stats.
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
            }
            values.push(data[di][1]);
            indVars.push(data[di][0]);
            means.push(errorResult.d_mean);

            // store error bars if matching
            const errorBar = errorResult.sd * 1.96;
            if (matching) {
                errorMax = errorMax > errorBar ? errorMax : errorBar;
                data[di][2] = errorBar;
            } else {
                data[di][2] = -1;
            }

            // remove sub values and times to save space
            data[di][3] = [];
            data[di][4] = [];

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
            data[di][6] = label;

            if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle) {
                data[di][6] = data[di][6] + "<br> time: " + moment.utc(data[di][0]).format("YYYY-MM-DD HH:mm");
            } else {
                data[di][6] = data[di][6] + "<br> time: " + data[di][0];
            }

            data[di][6] = data[di][6] +
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
        const stats = matsDataUtils.get_err(values, indVars);
        const filteredMeans = means.filter(x => x);
        const miny = Math.min(...filteredMeans);
        const maxy = Math.max(...filteredMeans);
        stats.miny = miny;
        stats.maxy = maxy;
        dataset[curveIndex]['stats'] = stats;

        // recalculate axis options after QC and matching
        if (appName !== "surfrad") {
            axisMap[curves[curveIndex].axisKey]['ymax'] = (axisMap[curves[curveIndex].axisKey]['ymax'] < maxy || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? maxy : axisMap[curves[curveIndex].axisKey]['ymax'];
            axisMap[curves[curveIndex].axisKey]['ymin'] = (axisMap[curves[curveIndex].axisKey]['ymin'] > miny || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? miny : axisMap[curves[curveIndex].axisKey]['ymin'];
        }

        // recalculate curve annotation after QC and matching
        if (stats.d_mean !== undefined && stats.d_mean !== null) {
            dataset[curveIndex]['annotation'] = label + "- mean = " + stats.d_mean.toPrecision(4);
        }
    }

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    const zeroLine = matsDataCurveOpsUtils.getHorizontalValueLine(xmax, xmin, 0, matsTypes.ReservedWords.zero);
    dataset.push(zeroLine);

    //add ideal value lines, if any
    var idealValueLine;
    var idealLabel;
    for (var ivIdx = 0; ivIdx < idealValues.length; ivIdx++) {
        idealLabel = "ideal" + ivIdx.toString();
        idealValueLine = matsDataCurveOpsUtils.getHorizontalValueLine(xmax, xmin, idealValues[ivIdx], matsTypes.ReservedWords[idealLabel]);
        dataset.push(idealValueLine);
    }

    // generate plot options
    const resultOptions = matsDataPlotOpsUtils.generateSeriesPlotOptions(dataset, curves, axisMap, errorMax);
    var totalProcessingFinish = moment();
    dataRequests["total retrieval and processing time for curve set"] = {
        begin: totalProcessingStart.format(),
        finish: totalProcessingFinish.format(),
        duration: moment.duration(totalProcessingFinish.diff(totalProcessingStart)).asSeconds() + ' seconds'
    };

    // pass result to client-side plotting functions
    return {
        error: error,
        data: dataset,
        options: resultOptions,
        basis: {
            plotParams: plotParams,
            queries: dataRequests
        }
    };
};

export default matsDataProcessUtils = {

    processDataXYCurve: processDataXYCurve

}