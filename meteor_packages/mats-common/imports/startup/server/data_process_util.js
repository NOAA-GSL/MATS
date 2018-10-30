import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {matsDataMatchUtils} from 'meteor/randyp:mats-common';
import {matsDataDiffUtils} from 'meteor/randyp:mats-common';
import {matsDataCurveOpsUtils} from 'meteor/randyp:mats-common';
import {matsDataPlotOpsUtils} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment'

const processDataXYCurve = function (dataset, appParams, curveInfoParams, plotParams, bookkeepingParams) {
    // variable to store maximum error bar length
    var errorMax = Number.MIN_VALUE;
    var error = "";

    // if matching, pare down dataset to only matching data
    if (curveInfoParams.curvesLength > 1 && appParams.matching) {
        if (appParams.hasLevels) {
            dataset = matsDataMatchUtils.getMatchedDataSetWithLevels(dataset, curveInfoParams.curvesLength, appParams.plotType);
        } else {
            dataset = matsDataMatchUtils.getMatchedDataSet(dataset, curveInfoParams.curvesLength);
        }
    }

    // we may need to recalculate the axis limits after unmatched data and outliers are removed
    var axisLimitReprocessed = {};

    // calculate data statistics (including error bars) for each curve
    for (var curveIndex = 0; curveIndex < curveInfoParams.curvesLength; curveIndex++) {
        if (appParams.appName !== "surfrad") {
            axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey] = axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey] !== undefined;
        }
        var diffFrom = curveInfoParams.curves[curveIndex].diffFrom;
        var statisticSelect = curveInfoParams.curves[curveIndex]['statistic'];
        var data = dataset[curveIndex];
        const label = dataset[curveIndex].label;

        var di = 0;
        var values = [];
        var indVars = [];
        var means = [];
        var rawStat;
        /*
        dataset[curveLength]
        each dataset has dataset[curveLength].data
        dataset[curveLength].data is
        {
            x:[],
            y:[],
            error_x:[],
            error_y:[],
            subVals:[],
            subSecs:[],
            subLevs:[],
            stats:[],
            tooltip:[]
            xmin:num,
            xmax:num,
            ymin:num,
            ymax:num,
            sum:sum,
            count:count
        }
        */

        while (di < data.x.length) {
            var errorResult = {};
            /*
             DATASET ELEMENTS:
             series: [data,data,data ...... ]   each data is itself an array
             data[0] - independentVar (plotted against the x axis)
             data[1] - statValue (ploted against the y axis)
             data[2] - errorBar (sd * 1.96, formerly stde_betsy * 1.96)
             data[3] - independentVar values -- removed here to save on data volume
             data[4] - independentVar times -- removed here to save on data volume
             data[5] - independentVar stats
             data[6] - tooltip
             */

            // errorResult holds all the calculated curve stats like mean, sd, etc.
            errorResult = matsDataUtils.get_err(data.subVals[di], data.subSecs[di]);

            // store raw statistic from query before recalculating that statistic to account for data removed due to matching, QC, etc.
            rawStat = data.y[di];
            // this ungainly if statement is because the surfrad3 database doesn't support recalculating some stats.
            if (appParams.appName !== "surfrad" ||
                !(appParams.appName === "surfrad" &&
                    (statisticSelect === 'Std deviation (do not plot matched)' || statisticSelect === 'RMS (do not plot matched)') &&
                    !appParams.matching)) {
                if ((diffFrom === null || diffFrom === undefined) || !appParams.matching) {
                    // assign recalculated statistic to data[di][1], which is the value to be plotted
                    data.y[di] = errorResult.d_mean;
                } else {
                    if (dataset[diffFrom[0]].data.y[di] !== null && dataset[diffFrom[1]].data.y[di] !== null) {
                        // make sure that the diff curve actually shows the difference when matching. Otherwise outlier filtering etc. can make it slightly off.
                        data.y[di] = dataset[diffFrom[0]].data.y[di] - dataset[diffFrom[1]].data.y[di];
                    } else {
                        // keep the null for no data at this point
                        data.y[di] = null;
                    }
                }
            }
            values.push(data.y[di]);
            indVars.push(data.x[di]);
            means.push(errorResult.d_mean);

            // store error bars if matching
            const errorBar = errorResult.sd * 1.96;
            if (appParams.matching) {
                errorMax = errorMax > errorBar ? errorMax : errorBar;
                data.error_y.array[di] = errorBar;
            } else {
                data.error_y.array[di] = null;
            }

            // remove sub values and times to save space
            data.subVals[di] = [];
            data.subSecs[di] = [];
            data.subLevs[di] = [];

            // store statistics
            data.stats[di] = {
                raw_stat: rawStat,
                d_mean: errorResult.d_mean,
                sd: errorResult.sd,
                n_good: errorResult.n_good,
                lag1: errorResult.lag1,
                stde_betsy: errorResult.stde_betsy
            };

            // this is the tooltip, it is the last element of each dataseries element
            data.toolTips[di] = label;
            switch (appParams.plotType) {
                case matsTypes.PlotTypes.timeSeries:
                    data.toolTips[di] = data.toolTips[di] + "<br> time: " + moment.utc(data.x[di]).format("YYYY-MM-DD HH:mm");
                    break;
                case matsTypes.PlotTypes.dailyModelCycle:
                    var fhr = ((data.x[di] / 1000) % (24 * 3600)) / 3600 - curveInfoParams.utcCycleStarts[curveIndex];
                    fhr = fhr < 0 ? fhr + 24 : fhr;
                    data.toolTips[di] = data.toolTips[di] + "<br> time: " + moment.utc(data.x[di]).format("YYYY-MM-DD HH:mm");
                    data.toolTips[di] = data.toolTips[di] + "<br> forecast hour: " + fhr;
                    break;
                case matsTypes.PlotTypes.dieoff:
                    data.toolTips[di] = data.toolTips[di] + "<br> fhr: " + data.x[di];
                    break;
                case matsTypes.PlotTypes.validtime:
                    data.toolTips[di] = data.toolTips[di] + "<br> hour of day: " + data.x[di];
                    break;
                case matsTypes.PlotTypes.threshold:
                    data.toolTips[di] = data.toolTips[di] + "<br> threshold: " + data.x[di];
                    break;
                default:
                    data.toolTips[di] = data.toolTips[di] + "<br>" + data.x[di];
                    break;
            }
            data.toolTips[di] = data.toolTips[di] +
                "<br> " + statisticSelect + ": " + (data.y[di] === null ? null : data.y[di].toPrecision(4)) +
                "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>  n: " + errorResult.n_good +
                // "<br>  lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                // "<br>  stde: " + errorResult.stde_betsy +
                "<br>  errorbars: " + Number((data.y[di]) - (errorResult.sd * 1.96)).toPrecision(4) + " to " + Number((data.y[di]) + (errorResult.sd * 1.96)).toPrecision(4);

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
        if (appParams.appName !== "surfrad") {
            curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymax'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymax'] < maxy || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? maxy : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymax'];
            curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymin'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymin'] > miny || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? miny : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymin'];
        }

        // recalculate curve annotation after QC and matching
        if (stats.d_mean !== undefined && stats.d_mean !== null) {
            dataset[curveIndex]['annotation'] = label + "- mean = " + stats.d_mean.toPrecision(4);
        }
    }

    // // add black 0 line curve
    // // need to define the minimum and maximum x value for making the zero curve
    // const zeroLine = matsDataCurveOpsUtils.getHorizontalValueLine(curveInfoParams.xmax, curveInfoParams.xmin, 0, matsTypes.ReservedWords.zero);
    // dataset.push(zeroLine);
    //
    // //add ideal value lines, if any
    // var idealValueLine;
    // var idealLabel;
    // for (var ivIdx = 0; ivIdx < curveInfoParams.idealValues.length; ivIdx++) {
    //     idealLabel = "ideal" + ivIdx.toString();
    //     idealValueLine = matsDataCurveOpsUtils.getHorizontalValueLine(curveInfoParams.xmax, curveInfoParams.xmin, curveInfoParams.idealValues[ivIdx], matsTypes.ReservedWords[idealLabel]);
    //     dataset.push(idealValueLine);
    // }

    // generate plot options
    var resultOptions;
    switch (appParams.plotType) {
        case matsTypes.PlotTypes.timeSeries:
        case matsTypes.PlotTypes.dailyModelCycle:
            resultOptions = matsDataPlotOpsUtils.generateSeriesPlotOptions(dataset, curveInfoParams.curves, curveInfoParams.axisMap, errorMax);
            break;
        case matsTypes.PlotTypes.dieoff:
            resultOptions = matsDataPlotOpsUtils.generateDieoffPlotOptions(dataset, curveInfoParams.curves, curveInfoParams.axisMap, errorMax);
            break;
        case matsTypes.PlotTypes.validtime:
            resultOptions = matsDataPlotOpsUtils.generateValidTimePlotOptions(dataset, curveInfoParams.curves, curveInfoParams.axisMap, errorMax);
            break;
        case matsTypes.PlotTypes.threshold:
            resultOptions = matsDataPlotOpsUtils.generateThresholdPlotOptions(dataset, curveInfoParams.curves, curveInfoParams.axisMap, errorMax);
            break;
        default:
            break;
    }

    var totalProcessingFinish = moment();
    bookkeepingParams.dataRequests["total retrieval and processing time for curve set"] = {
        begin: bookkeepingParams.totalProcessingStart.format(),
        finish: totalProcessingFinish.format(),
        duration: moment.duration(totalProcessingFinish.diff(bookkeepingParams.totalProcessingStart)).asSeconds() + ' seconds'
    };

    // pass result to client-side plotting functions
    return {
        error: error,
        data: dataset,
        options: resultOptions,
        basis: {
            plotParams: plotParams,
            queries: bookkeepingParams.dataRequests
        }
    };
};

const processDataProfile = function (dataset, appParams, curveInfoParams, plotParams, bookkeepingParams) {
    // variable to store maximum error bar length
    var errorMax = Number.MIN_VALUE;
    var error = "";

    // if matching, pare down dataset to only matching data
    if (curveInfoParams.curvesLength > 1 && appParams.matching) {
        dataset = matsDataMatchUtils.getMatchedDataSetWithLevels(dataset, curveInfoParams.curvesLength, appParams.plotType);
    }

    // we may need to recalculate the axis limits after unmatched data and outliers are removed
    var axisLimitReprocessed = {};

    // calculate data statistics (including error bars) for each curve
    for (var curveIndex = 0; curveIndex < curveInfoParams.curvesLength; curveIndex++) {
        axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey] = axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey] !== undefined;
        var diffFrom = curveInfoParams.curves[curveIndex].diffFrom;
        var statisticSelect = curveInfoParams.curves[curveIndex]['statistic'];
        var data = dataset[curveIndex];
        const label = dataset[curveIndex].label;

        var di = 0;
        var values = [];
        var levels = [];
        var means = [];
        var rawStat;
        /*
        dataset[curveLength]
        each dataset has dataset[curveLength].data
        dataset[curveLength].data is
        {
            x:[],
            y:[],
            error_x:[],
            error_y:[],
            subVals:[],
            subSecs:[],
            subLevs:[],
            stats:[],
            tooltip:[]
            xmin:num,
            xmax:num,
            ymin:num,
            ymax:num,
            sum:sum,
            count:count
        }
        */

        while (di < data.y.length) {
            var errorResult = {};
            /*
                 DATASET ELEMENTS:
                 series: [data,data,data ...... ]   each data is itself an array
                 data[0] - statValue (ploted against the x axis)
                 data[1] - level (plotted against the y axis)
                 data[2] - errorBar (sd * 1.96, formerly stde_betsy * 1.96)
                 data[3] - level values -- removed here to save on data volume
                 data[4] - level times -- removed here to save on data volume
                 data[5] - level stats
                 data[6] - tooltip
                 */

            // errorResult holds all the calculated curve stats like mean, sd, etc.
            errorResult = matsDataUtils.get_err(data.subVals[di], data.subSecs[di]);

            // store raw statistic from query before recalculating that statistic to account for data removed due to matching, QC, etc.
            rawStat = data.x[di];
            if ((diffFrom === null || diffFrom === undefined) || !appParams.matching) {
                // assign recalculated statistic to data[di][1], which is the value to be plotted
                data.x[di] = errorResult.d_mean;
            } else {
                if (dataset[diffFrom[0]].data.x[di] !== null && dataset[diffFrom[1]].data.x[di] !== null) {
                    // make sure that the diff curve actually shows the difference when matching. Otherwise outlier filtering etc. can make it slightly off.
                    data.x[di] = dataset[diffFrom[0]].data.x[di] - dataset[diffFrom[1]].data.x[di];
                } else {
                    // keep the null for no data at this point
                    data.x[di] = null;
                }
            }
            values.push(data.x[di]);
            levels.push(data.y[di]);
            means.push(errorResult.d_mean);

            // store error bars if matching
            const errorBar = errorResult.sd * 1.96;
            if (appParams.matching) {
                errorMax = errorMax > errorBar ? errorMax : errorBar;
                data.error_x.array[di] = errorBar;
            } else {
                data.error_x.array[di] = null;
            }

            // remove sub values and times to save space
            data.subVals[di] = [];
            data.subSecs[di] = [];
            data.subLevs[di] = [];

            // store statistics
            data.stats[di] = {
                raw_stat: rawStat,
                d_mean: errorResult.d_mean,
                sd: errorResult.sd,
                n_good: errorResult.n_good,
                lag1: errorResult.lag1,
                stde_betsy: errorResult.stde_betsy
            };

            // this is the tooltip, it is the last element of each dataseries element
            data.toolTips[di] = label +
                "<br>" + data.y[di] + "mb" +
                "<br> " + statisticSelect + ": " + (data.x[di] === null ? null : data.x[di].toPrecision(4)) +
                "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>  n: " + errorResult.n_good +
                // "<br>  lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                // "<br>  stde: " + errorResult.stde_betsy +
                "<br>  errorbars: " + Number((data.x[di]) - (errorResult.sd * 1.96)).toPrecision(4) + " to " + Number((data.x[di]) + (errorResult.sd * 1.96)).toPrecision(4);

            di++;
        }

        // get the overall stats for the text output - this uses the means not the stats.
        const stats = matsDataUtils.get_err(values.reverse(), levels.reverse()); // have to reverse because of data inversion
        const filteredMeans = means.filter(x => x);
        const minx = Math.min(...filteredMeans);
        const maxx = Math.max(...filteredMeans);
        stats.minx = minx;
        stats.maxx = maxx;
        dataset[curveIndex]['globStats'] = stats;

        // recalculate axis options after QC and matching
        curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmax'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmax'] < maxx || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? maxx : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmax'];
        curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmin'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmin'] > minx || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? minx : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmin'];

        // recalculate curve annotation after QC and matching
        if (stats.d_mean !== undefined && stats.d_mean !== null) {
            dataset[curveIndex]['annotation'] = label + "- mean = " + stats.d_mean.toPrecision(4);
        }
    }

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    const zeroLine = matsDataCurveOpsUtils.getVerticalValueLine(1050, 50, 0, matsTypes.ReservedWords.zero);
    dataset.push(zeroLine);

    //add ideal value lines, if any
    var idealValueLine;
    var idealLabel;
    for (var ivIdx = 0; ivIdx < curveInfoParams.idealValues.length; ivIdx++) {
        idealLabel = "ideal" + ivIdx.toString();
        idealValueLine = matsDataCurveOpsUtils.getVerticalValueLine(1050, 50, curveInfoParams.idealValues[ivIdx], matsTypes.ReservedWords[idealLabel]);
        dataset.push(idealValueLine);
    }

    // generate plot options
    const resultOptions = matsDataPlotOpsUtils.generateProfilePlotOptions(dataset, curveInfoParams.curves, curveInfoParams.axisMap, errorMax);
    var totalProcessingFinish = moment();
    bookkeepingParams.dataRequests["total retrieval and processing time for curve set"] = {
        begin: bookkeepingParams.totalProcessingStart.format(),
        finish: totalProcessingFinish.format(),
        duration: moment.duration(totalProcessingFinish.diff(bookkeepingParams.totalProcessingStart)).asSeconds() + ' seconds'
    };

    // pass result to client-side plotting functions
    return {
        error: error,
        data: dataset,
        options: resultOptions,
        basis: {
            plotParams: plotParams,
            queries: bookkeepingParams.dataRequests
        }
    };
};

const processDataHistogram = function (allReturnedSubStats, allReturnedSubSecs, allReturnedSubLevs, dataset, appParams, curveInfoParams, plotParams, binParams, bookkeepingParams) {
    var error = "";
    var curvesLengthSoFar = 0;
    var xmax = Number.MIN_VALUE;
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;

    // flatten all the returned data into one stats array and one secs array in order to calculate histogram bins over the whole range.
    const curveSubStats = [].concat.apply([], allReturnedSubStats);
    const curveSubSecs = [].concat.apply([], allReturnedSubSecs);

    var binStats;
    if (binParams.binBounds.length === 0) {
        binStats = matsDataUtils.calculateHistogramBins(curveSubStats, curveSubSecs, binParams).binStats;
    } else {
        binStats = matsDataUtils.prescribeHistogramBins(curveSubStats, curveSubSecs, binParams).binStats;
    }

    // store bin labels and x-axis positions of those labels for later when we set up the plot options
    var plotBins = [];
    for (var b_idx = 0; b_idx < binStats.binMeans.length; b_idx++) {
        plotBins.push([binStats.binMeans[b_idx], binStats.binLabels[b_idx]]);
    }

    // post process curves
    var sortedData;
    var curve;
    var d = {// d will contain the curve data
        x: [],
        y: [],
        error_x: [],
        error_y: [],
        subVals: [],
        subSecs: [],
        subLevs: [],
        stats: [],
        bin_stats: [],
        toolTips: [],
        xmin: Number.MAX_VALUE,
        xmax: Number.MIN_VALUE,
        ymin: Number.MAX_VALUE,
        ymax: Number.MIN_VALUE,
        sum: 0
    };

    var diffFrom;
    var label;
    for (var curveIndex = 0; curveIndex < curveInfoParams.curvesLength; curveIndex++) {
        curve = curveInfoParams.curves[curveIndex];
        diffFrom = curve.diffFrom;
        label = curve.label;
        if (diffFrom == null) {
            var postQueryStartMoment = moment();
            if (curveInfoParams.dataFoundForCurve[curveIndex]) {
                // sort queried data into the full set of histogram bins
                sortedData = matsDataUtils.sortHistogramBins(allReturnedSubStats[curveIndex], allReturnedSubSecs[curveIndex], allReturnedSubLevs[curveIndex], binParams.binNum, binStats, appParams.hasLevels, d);
                d = sortedData.d;
            }
        } else {
            // this is a difference curve, so we're done with regular curves.
            // do any matching that needs to be done.
            if (appParams.matching && !bookkeepingParams.alreadyMatched) {
                if (appParams.hasLevels) {
                    dataset = matsDataMatchUtils.getMatchedDataSetHistogramWithLevels(dataset, curvesLengthSoFar, binStats);
                } else {
                    dataset = matsDataMatchUtils.getMatchedDataSetHistogram(dataset, curvesLengthSoFar, binStats);
                }
                bookkeepingParams.alreadyMatched = true;
            }

            // then take diffs
            const diffResult = matsDataDiffUtils.getDataForDiffCurve({
                dataset: dataset,
                ymin: ymin,
                ymax: ymax,
                diffFrom: diffFrom
            }, matsTypes.PlotTypes.histogram, appParams.hasLevels);

            // adjust axis stats based on new data from diff curve
            d = diffResult.dataset;
        }

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        curve['annotation'] = "";
        curve['xmin'] = d.xmin;
        curve['xmax'] = d.xmax;
        curve['ymin'] = d.ymin;
        curve['ymax'] = d.ymax;
        curve['axisKey'] = curveInfoParams.curves[curveIndex].axisKey;
        const cOptions = matsDataCurveOpsUtils.generateBarChartCurveOptions(curve, curveIndex, curveInfoParams.axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        curvesLengthSoFar++;
        var postQueryFinishMoment = moment();
        bookkeepingParams.dataRequests["post data retrieval (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        }
    }  // end for curves

    // if matching, pare down dataset to only matching data. Only do this if we didn't already do it while calculating diffs.
    if (curveInfoParams.curvesLength > 1 && (appParams.matching && !bookkeepingParams.alreadyMatched)) {
        if (appParams.hasLevels) {
            dataset = matsDataMatchUtils.getMatchedDataSetHistogramWithLevels(dataset, curveInfoParams.curvesLength, binStats);
        } else {
            dataset = matsDataMatchUtils.getMatchedDataSetHistogram(dataset, curveInfoParams.curvesLength, binStats);
        }
    }

    // we may need to recalculate the axis limits after unmatched data and outliers are removed
    var axisLimitReprocessed = {};

    // calculate data statistics (including error bars) for each curve
    for (curveIndex = 0; curveIndex < curveInfoParams.curvesLength; curveIndex++) {
        axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey] = axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey] !== undefined;
        var statisticSelect = curveInfoParams.curves[curveIndex]['statistic'];
        diffFrom = curveInfoParams.curves[curveIndex].diffFrom;
        var data = dataset[curveIndex].data;
        label = dataset[curveIndex].label;

        var di = 0;
        var values = [];
        var bins = [];

        while (di < data.length) {

            /*
             DATASET ELEMENTS:
             series: [data,data,data ...... ]   each data is itself an array
             data[0] - bin number (plotted against the x axis)
             data[1] - number in bin OR bin RF (plotted against the y axis)
             data[2] - -1 (no error bars for histograms)
             data[3] - bin values -- removed here to save on data volume
             data[4] - bin times -- removed here to save on data volume
             data[5] - reserved for if there are bin levels -- removed here to save on data volume
             data[6] - bin stats
             data[7] - global stats
             data[8] - tooltip
             */

            if (curveInfoParams.yAxisFormat === 'Relative frequency') {
                // replace the bin number with the bin relative frequency for the plotted statistic
                data[di][1] = data[di][6].bin_rf * 100;
            }

            values.push(data[di][1]);
            bins.push(data[di][0]);

            // remove sub values and times to save space
            data[di][3] = [];
            data[di][4] = [];
            data[di][5] = [];

            // this is the tooltip, it is the last element of each dataseries element
            data[di][8] = label +
                "<br>" + "bin: " + di + " (" + statisticSelect + " values between " + (data[di][6].binLowBound === null ? null : data[di][6].binLowBound.toPrecision(4)) + " and " + (data[di][6].binUpBound === null ? null : data[di][6].binUpBound.toPrecision(4)) + ")" +
                "<br> " + "number in bin for this curve: " + (data[di][1] === null ? null : data[di][1]) +
                "<br>  bin mean for this curve: " + statisticSelect + " = " + (data[di][6].bin_mean === null ? null : data[di][6].bin_mean.toPrecision(4)) +
                "<br>  bin sd  for this curve: " + statisticSelect + " = " + (data[di][6].bin_sd === null ? null : data[di][6].bin_sd.toPrecision(4));

            di++;
        }

        // get the overall stats for the text output - this uses the means not the stats.
        const stats = matsDataUtils.get_err(values, bins);
        const filteredValues = values.filter(x => x);
        const miny = Math.min(...filteredValues);
        const maxy = Math.max(...filteredValues);
        stats.miny = miny;
        stats.maxy = maxy;
        dataset[curveIndex]['stats'] = stats;

        // recalculate axis options after QC and matching
        curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymax'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymax'] < maxy || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? maxy : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymax'];
        curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymin'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymin'] > miny || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? miny : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymin'];

        // recalculate curve annotation after QC and matching
        if (stats.d_mean !== undefined && stats.d_mean !== null) {
            dataset[curveIndex]['annotation'] = label + "- mean = " + stats.d_mean.toPrecision(4);
        }
    }

    // generate plot options
    const resultOptions = matsDataPlotOpsUtils.generateHistogramPlotOptions(dataset, curveInfoParams.curves, curveInfoParams.axisMap, plotBins);
    var totalProcessingFinish = moment();
    bookkeepingParams.dataRequests["total retrieval and processing time for curve set"] = {
        begin: bookkeepingParams.totalProcessingStart.format(),
        finish: totalProcessingFinish.format(),
        duration: moment.duration(totalProcessingFinish.diff(bookkeepingParams.totalProcessingStart)).asSeconds() + ' seconds'
    };

    // pass result to client-side plotting functions
    return {
        error: error,
        data: dataset,
        options: resultOptions,
        basis: {
            plotParams: plotParams,
            queries: bookkeepingParams.dataRequests
        }
    };
};

export default matsDataProcessUtils = {

    processDataXYCurve: processDataXYCurve,
    processDataProfile: processDataProfile,
    processDataHistogram: processDataHistogram

}