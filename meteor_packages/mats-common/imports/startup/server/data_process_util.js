/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
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

    const appName = matsCollections.appName.findOne({}).app;

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
        if (appName !== "surfrad") {
            axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey] = axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey] !== undefined;
        }
        var diffFrom = curveInfoParams.curves[curveIndex].diffFrom;
        var statisticSelect = appName.indexOf("anomalycor") !== -1 ? "ACC" : curveInfoParams.curves[curveIndex]['statistic'];
        var data = dataset[curveIndex];
        const label = dataset[curveIndex].label;

        var di = 0;
        var values = [];
        var indVars = [];
        var means = [];
        var rawStat;

        while (di < data.x.length) {

            // errorResult holds all the calculated curve stats like mean, sd, etc.
            var errorResult;
            if (appParams.hasLevels) {
                errorResult = matsDataUtils.get_err(data.subVals[di], data.subSecs[di], data.subLevs[di], appParams);
            } else {
                errorResult = matsDataUtils.get_err(data.subVals[di], data.subSecs[di], [], appParams);
            }

            // store raw statistic from query before recalculating that statistic to account for data removed due to matching, QC, etc.
            rawStat = data.y[di];
            // this ungainly if statement is because the surfrad3 database doesn't support recalculating some stats.
            if (appName !== "surfrad" ||
                !(appName === "surfrad" &&
                    (statisticSelect === 'Std deviation (do not plot matched)' || statisticSelect === 'RMS (do not plot matched)') &&
                    !appParams.matching)) {
                if ((diffFrom === null || diffFrom === undefined) || !appParams.matching) {
                    // assign recalculated statistic to data[di][1], which is the value to be plotted
                    data.y[di] = errorResult.d_mean;
                } else {
                    if (dataset[diffFrom[0]].y[di] !== null && dataset[diffFrom[1]].y[di] !== null) {
                        // make sure that the diff curve actually shows the difference when matching. Otherwise outlier filtering etc. can make it slightly off.
                        data.y[di] = dataset[diffFrom[0]].y[di] - dataset[diffFrom[1]].y[di];
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
            const errorBar = errorResult.stde_betsy * 1.96;
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

            // store statistics for this di datapoint
            data.stats[di] = {
                raw_stat: rawStat,
                d_mean: errorResult.d_mean,
                sd: errorResult.sd,
                n_good: errorResult.n_good,
                lag1: errorResult.lag1,
                stde_betsy: errorResult.stde_betsy
            };

            // the tooltip is stored in data.text
            // also change the x array from epoch to date for timeseries and DMC, as we are now done with it for calculations.
            data.text[di] = label;
            switch (appParams.plotType) {
                case matsTypes.PlotTypes.timeSeries:
                    data.text[di] = data.text[di] + "<br>time: " + moment.utc(data.x[di]).format("YYYY-MM-DD HH:mm");
                    break;
                case matsTypes.PlotTypes.dailyModelCycle:
                    var fhr = ((data.x[di] / 1000) % (24 * 3600)) / 3600 - curveInfoParams.utcCycleStarts[curveIndex];
                    fhr = fhr < 0 ? fhr + 24 : fhr;
                    data.text[di] = data.text[di] + "<br>time: " + moment.utc(data.x[di]).format("YYYY-MM-DD HH:mm");
                    data.text[di] = data.text[di] + "<br>forecast hour: " + fhr;
                    break;
                case matsTypes.PlotTypes.dieoff:
                    data.text[di] = data.text[di] + "<br>fhr: " + data.x[di];
                    break;
                case matsTypes.PlotTypes.threshold:
                    data.text[di] = data.text[di] + "<br>threshold: " + data.x[di];
                    break;
                case matsTypes.PlotTypes.validtime:
                    data.text[di] = data.text[di] + "<br>hour of day: " + data.x[di];
                    break;
                default:
                    data.text[di] = data.text[di] + "<br>" + data.x[di];
                    break;
            }
            data.text[di] = data.text[di] +
                "<br>" + statisticSelect + ": " + (data.y[di] === null ? null : data.y[di].toPrecision(4)) +
                "<br>sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>n: " + errorResult.n_good +
                // "<br>lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                // "<br>stde: " + errorResult.stde_betsy +
                "<br>errorbars: " + Number((data.y[di]) - (errorResult.stde_betsy * 1.96)).toPrecision(4) + " to " + Number((data.y[di]) + (errorResult.stde_betsy * 1.96)).toPrecision(4);

            di++;
        }

        // enable error bars if matching and they aren't null
        if (appParams.matching && data.error_y.array.filter(x => x).length > 0) {
            data.error_y.visible = true;
        }

        // get the overall stats for the text output - this uses the means not the stats.
        const stats = matsDataUtils.get_err(values, indVars, [], appParams);
        const filteredMeans = means.filter(x => x);
        var miny = Math.min(...filteredMeans);
        var maxy = Math.max(...filteredMeans);
        if (means.indexOf(0) !== -1 && 0 < miny) {
            miny = 0;
        }
        if (means.indexOf(0) !== -1 && 0 > maxy) {
            maxy = 0;
        }
        stats.miny = miny;
        stats.maxy = maxy;
        dataset[curveIndex]['glob_stats'] = stats;

        // recalculate axis options after QC and matching
        if (appName !== "surfrad") {
            const minx = Math.min(...indVars);
            const maxx = Math.max(...indVars);
            curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymax'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymax'] < maxy || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? maxy : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymax'];
            curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymin'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymin'] > miny || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? miny : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['ymin'];
            curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmax'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmax'] < maxx || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? maxx : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmax'];
            curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmin'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmin'] > minx || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? minx : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmin'];
        }

        // recalculate curve annotation after QC and matching
        if (stats.d_mean !== undefined && stats.d_mean !== null) {
            dataset[curveIndex]['annotation'] = label + "- mean = " + stats.d_mean.toPrecision(4);
        }

        if (appParams.plotType === matsTypes.PlotTypes.timeSeries || appParams.plotType === matsTypes.PlotTypes.dailyModelCycle) {
            data['x_epoch'] = data.x;
            data.x = data.x.map(function (val) {
                return moment.utc(val).format("YYYY-MM-DD HH:mm");
            });
        }
    }

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    const zeroLine = matsDataCurveOpsUtils.getHorizontalValueLine(curveInfoParams.xmax, curveInfoParams.xmin, 0, matsTypes.ReservedWords.zero);
    dataset.push(zeroLine);

    //add ideal value lines, if any
    var idealValueLine;
    var idealLabel;
    for (var ivIdx = 0; ivIdx < curveInfoParams.idealValues.length; ivIdx++) {
        idealLabel = "ideal" + ivIdx.toString();
        idealValueLine = matsDataCurveOpsUtils.getHorizontalValueLine(curveInfoParams.xmax, curveInfoParams.xmin, curveInfoParams.idealValues[ivIdx], matsTypes.ReservedWords[idealLabel]);
        dataset.push(idealValueLine);
    }

    // generate plot options
    var resultOptions;
    switch (appParams.plotType) {
        case matsTypes.PlotTypes.timeSeries:
        case matsTypes.PlotTypes.dailyModelCycle:
            resultOptions = matsDataPlotOpsUtils.generateSeriesPlotOptions(dataset, curveInfoParams.axisMap, errorMax);
            break;
        case matsTypes.PlotTypes.dieoff:
            resultOptions = matsDataPlotOpsUtils.generateDieoffPlotOptions(dataset, curveInfoParams.axisMap, errorMax);
            break;
        case matsTypes.PlotTypes.validtime:
            resultOptions = matsDataPlotOpsUtils.generateValidTimePlotOptions(dataset, curveInfoParams.axisMap, errorMax);
            break;
        case matsTypes.PlotTypes.threshold:
            resultOptions = matsDataPlotOpsUtils.generateThresholdPlotOptions(dataset, curveInfoParams.axisMap, errorMax);
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

    const appName = matsCollections.appName.findOne({}).app;

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
        var statisticSelect = appName.indexOf("anomalycor") !== -1 ? "ACC" : curveInfoParams.curves[curveIndex]['statistic'];
        var data = dataset[curveIndex];
        const label = dataset[curveIndex].label;

        var di = 0;
        var values = [];
        var levels = [];
        var means = [];
        var rawStat;

        while (di < data.y.length) {

            // errorResult holds all the calculated curve stats like mean, sd, etc.
            var errorResult = matsDataUtils.get_err(data.subVals[di], data.subSecs[di], data.subLevs[di], appParams);

            // store raw statistic from query before recalculating that statistic to account for data removed due to matching, QC, etc.
            rawStat = data.x[di];
            if ((diffFrom === null || diffFrom === undefined) || !appParams.matching) {
                // assign recalculated statistic to data[di][1], which is the value to be plotted
                data.x[di] = errorResult.d_mean;
            } else {
                if (dataset[diffFrom[0]].x[di] !== null && dataset[diffFrom[1]].x[di] !== null) {
                    // make sure that the diff curve actually shows the difference when matching. Otherwise outlier filtering etc. can make it slightly off.
                    data.x[di] = dataset[diffFrom[0]].x[di] - dataset[diffFrom[1]].x[di];
                } else {
                    // keep the null for no data at this point
                    data.x[di] = null;
                }
            }
            values.push(data.x[di]);
            levels.push(data.y[di]);
            means.push(errorResult.d_mean);

            // store error bars if matching
            const errorBar = errorResult.stde_betsy * 1.96;
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

            // the tooltip is stored in data.text
            data.text[di] = label +
                "<br>" + data.y[di] + "mb" +
                "<br>" + statisticSelect + ": " + (data.x[di] === null ? null : data.x[di].toPrecision(4)) +
                "<br>sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>n: " + errorResult.n_good +
                // "<br>lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                // "<br>stde: " + errorResult.stde_betsy +
                "<br>errorbars: " + Number((data.x[di]) - (errorResult.stde_betsy * 1.96)).toPrecision(4) + " to " + Number((data.x[di]) + (errorResult.stde_betsy * 1.96)).toPrecision(4);

            di++;
        }

        // enable error bars if matching and they aren't null
        if (appParams.matching && data.error_x.array.filter(x => x).length > 0) {
            data.error_x.visible = true;
        }

        // get the overall stats for the text output - this uses the means not the stats.
        const stats = matsDataUtils.get_err(values.reverse(), levels.reverse(), [], appParams); // have to reverse because of data inversion
        const filteredMeans = means.filter(x => x);
        var minx = Math.min(...filteredMeans);
        var maxx = Math.max(...filteredMeans);
        if (means.indexOf(0) !== -1 && 0 < minx) {
            minx = 0;
        }
        if (means.indexOf(0) !== -1 && 0 > maxx) {
            maxx = 0;
        }
        stats.minx = minx;
        stats.maxx = maxx;
        dataset[curveIndex]['glob_stats'] = stats;

        // recalculate axis options after QC and matching
        curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmax'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmax'] < maxx || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? maxx : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmax'];
        curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmin'] = (curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmin'] > minx || !axisLimitReprocessed[curveInfoParams.curves[curveIndex].axisKey]) ? minx : curveInfoParams.axisMap[curveInfoParams.curves[curveIndex].axisKey]['xmin'];

        // recalculate curve annotation after QC and matching
        if (stats.d_mean !== undefined && stats.d_mean !== null) {
            dataset[curveIndex]['annotation'] = label + "- mean = " + stats.d_mean.toPrecision(4);
        }
    }

    // add black 0 line curve
    // need to define the minimum and maximum y value for making the zero curve
    const zeroLine = matsDataCurveOpsUtils.getVerticalValueLine(1100, 0, 0, matsTypes.ReservedWords.zero);
    dataset.push(zeroLine);

    //add ideal value lines, if any
    var idealValueLine;
    var idealLabel;
    for (var ivIdx = 0; ivIdx < curveInfoParams.idealValues.length; ivIdx++) {
        idealLabel = "ideal" + ivIdx.toString();
        idealValueLine = matsDataCurveOpsUtils.getVerticalValueLine(1100, 0, curveInfoParams.idealValues[ivIdx], matsTypes.ReservedWords[idealLabel]);
        dataset.push(idealValueLine);
    }

    // generate plot options
    const resultOptions = matsDataPlotOpsUtils.generateProfilePlotOptions(dataset, curveInfoParams.axisMap, errorMax);
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

const processDataReliability = function (dataset, appParams, curveInfoParams, plotParams, bookkeepingParams) {
    var error = "";

    // sort data statistics for each curve
    for (var curveIndex = 0; curveIndex < curveInfoParams.curvesLength; curveIndex++) {

        var data = dataset[curveIndex];
        const label = dataset[curveIndex].label;
        var sample_climo = data.subVals;

        var di = 0;
        while (di < data.x.length) {

            // store statistics for this di datapoint
            data.stats[di] = {
                prob_bin: data.x[di],
                hit_rate: data.y[di],
                obs_y: data.error_x[di],
                obs_n: data.subLevs[di]
            };

            // the tooltip is stored in data.text
            data.text[di] = label;
            data.text[di] = data.text[di] + "<br>probability bin: " + data.x[di];
            data.text[di] = data.text[di] + "<br>hit rate: " + data.y[di];
            data.text[di] = data.text[di] + "<br>oy: " + data.error_x[di];
            data.text[di] = data.text[di] + "<br>on: " + data.subLevs[di];

            di++;
        }
        dataset[curveIndex]['glob_stats'] = {
            sample_climo: sample_climo
        };
    }

    // add black perfect reliability line curve
    const perfectLine = matsDataCurveOpsUtils.getLinearValueLine(curveInfoParams.xmax, curveInfoParams.xmin, data.ymax, data.ymin, matsTypes.ReservedWords.perfectReliability);
    dataset.push(perfectLine);

    if (sample_climo >= data.ymin) {
        var skillmin = sample_climo - ((sample_climo - data.xmin) / 2);
    } else {
        var skillmin = data.xmin - ((data.xmin - sample_climo) / 2);
    }
    if (sample_climo >= data.ymax) {
        var skillmax = sample_climo - ((sample_climo - data.xmax) / 2);
    } else {
        var skillmax = data.xmax - ((data.xmax - sample_climo) / 2);
    }

    // add black no skill line curve
    const noSkillLine = matsDataCurveOpsUtils.getLinearValueLine(curveInfoParams.xmax, curveInfoParams.xmin, skillmax, skillmin, matsTypes.ReservedWords.noSkill);
    dataset.push(noSkillLine);

    // add sample climo lines
    const xClimoLine = matsDataCurveOpsUtils.getHorizontalValueLine(curveInfoParams.xmax, curveInfoParams.xmin, sample_climo, matsTypes.ReservedWords.zero);
    dataset.push(xClimoLine);

    const yClimoLine = matsDataCurveOpsUtils.getVerticalValueLine(curveInfoParams.xmax, curveInfoParams.xmin, sample_climo, matsTypes.ReservedWords.zero);
    dataset.push(yClimoLine);

    // generate plot options
    var resultOptions = matsDataPlotOpsUtils.generateReliabilityPlotOptions();

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

const processDataROC = function (dataset, appParams, curveInfoParams, plotParams, bookkeepingParams) {
    var error = "";

    // sort data statistics for each curve
    for (var curveIndex = 0; curveIndex < curveInfoParams.curvesLength; curveIndex++) {

        var data = dataset[curveIndex];
        const label = dataset[curveIndex].label;
        var auc = data.sum;

        var di = 0;
        while (di < data.x.length) {

            // store statistics for this di datapoint
            data.stats[di] = {
                threshold: data.subVals[di],
                pody: data.y[di],
                fa: data.x[di],
                obs_y: data.error_x[di],
                obs_n: data.subLevs[di]
            };

            // the tooltip is stored in data.text
            data.text[di] = label;
            data.text[di] = data.text[di] + "<br>threshold: " + data.subVals[di];
            data.text[di] = data.text[di] + "<br>probability of detection: " + data.y[di];
            data.text[di] = data.text[di] + "<br>false alarm rate: " + data.x[di];
            //data.text[di] = data.text[di] + "<br>oy: " + data.error_x[di];
            //data.text[di] = data.text[di] + "<br>on: " + data.subLevs[di];

            di++;
        }
        dataset[curveIndex]['glob_stats'] = {
            auc: auc
        };
    }

    // add black no skill line curve
    const noSkillLine = matsDataCurveOpsUtils.getLinearValueLine(curveInfoParams.xmax, curveInfoParams.xmin, data.ymax, data.ymin, matsTypes.ReservedWords.noSkill);
    dataset.push(noSkillLine);

    // add perfect forecast lines
    const xPerfectLine = matsDataCurveOpsUtils.getHorizontalValueLine(curveInfoParams.xmax, curveInfoParams.xmin, data.ymax, matsTypes.ReservedWords.perfectForecast);
    dataset.push(xPerfectLine);

    const yPerfectLine = matsDataCurveOpsUtils.getVerticalValueLine(curveInfoParams.xmax, curveInfoParams.xmin, data.xmin, matsTypes.ReservedWords.perfectForecast);
    dataset.push(yPerfectLine);

    // generate plot options
    var resultOptions = matsDataPlotOpsUtils.generateROCPlotOptions();

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
    var xmax = -1 * Number.MAX_VALUE;
    var ymax = -1 * Number.MAX_VALUE;
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
    var plotBins = {};
    plotBins['binMeans'] = [];
    plotBins['binLabels'] = [];
    for (var b_idx = 0; b_idx < binStats.binMeans.length; b_idx++) {
        plotBins['binMeans'].push(binStats.binMeans[b_idx]);
        plotBins['binLabels'].push(binStats.binLabels[b_idx]);
    }

    // post process curves
    var sortedData;
    var curve;
    var diffFrom;
    var label;
    for (var curveIndex = 0; curveIndex < curveInfoParams.curvesLength; curveIndex++) {
        curve = curveInfoParams.curves[curveIndex];
        diffFrom = curve.diffFrom;
        label = curve.label;

        var d = {// d will contain the curve data
            x: [], //placeholder
            y: [], //placeholder
            error_x: [], // unused
            error_y: [], // unused
            subVals: [],
            subSecs: [],
            subLevs: [],
            glob_stats: {}, // placeholder
            bin_stats: [], // placeholder
            text: [], //placeholder
            xmin: Number.MAX_VALUE,
            xmax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
        };

        if (diffFrom == null) {
            var postQueryStartMoment = moment();
            if (curveInfoParams.dataFoundForCurve[curveIndex]) {
                // sort queried data into the full set of histogram bins
                sortedData = matsDataUtils.sortHistogramBins(allReturnedSubStats[curveIndex], allReturnedSubSecs[curveIndex], allReturnedSubLevs[curveIndex], binParams.binNum, binStats, appParams, d);
                d = sortedData.d;
            }
        } else {
            // this is a difference curve, so we're done with regular curves.
            // do any matching that needs to be done.
            if (appParams.matching && !bookkeepingParams.alreadyMatched) {
                if (appParams.hasLevels) {
                    dataset = matsDataMatchUtils.getMatchedDataSetHistogramWithLevels(dataset, curvesLengthSoFar, binStats, appParams);
                } else {
                    dataset = matsDataMatchUtils.getMatchedDataSetHistogram(dataset, curvesLengthSoFar, binStats, appParams);
                }
                bookkeepingParams.alreadyMatched = true;
            }

            // then take diffs
            const diffResult = matsDataDiffUtils.getDataForDiffCurve(dataset, diffFrom, appParams);

            // adjust axis stats based on new data from diff curve
            d = diffResult.dataset;
        }

        // set curve annotation to be the curve mean -- may be recalculated later
        // also pass previously calculated axis stats to curve options
        curve['annotation'] = "";
        curve['axisKey'] = curveInfoParams.curves[curveIndex].axisKey;
        d.ymin = curveInfoParams.yAxisFormat === 'Relative frequency' ? d.ymin / d.glob_stats.glob_n * 100 : d.ymin;
        d.ymax = curveInfoParams.yAxisFormat === 'Relative frequency' ? d.ymax / d.glob_stats.glob_n * 100 : d.ymax;
        xmin = d.xmin < xmin ? d.xmin : xmin;
        xmax = d.xmax > xmax ? d.xmax : xmax;
        ymin = d.ymin < ymin ? d.ymin : ymin;
        ymax = d.ymax > ymax ? d.ymax : ymax;
        const cOptions = matsDataCurveOpsUtils.generateBarChartCurveOptions(curve, curveIndex, curveInfoParams.axisMap, d, appParams);  // generate plot with data, curve annotation, axis labels, etc.
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
            dataset = matsDataMatchUtils.getMatchedDataSetHistogramWithLevels(dataset, curveInfoParams.curvesLength, binStats, appParams);
        } else {
            dataset = matsDataMatchUtils.getMatchedDataSetHistogram(dataset, curveInfoParams.curvesLength, binStats, appParams);
        }
    }

    // calculate data statistics (including error bars) for each curve
    for (curveIndex = 0; curveIndex < curveInfoParams.curvesLength; curveIndex++) {
        var statisticSelect = curveInfoParams.curves[curveIndex]['statistic'];
        diffFrom = curveInfoParams.curves[curveIndex].diffFrom;
        var data = dataset[curveIndex];
        label = dataset[curveIndex].label;

        var di = 0;
        while (di < data.x.length) {

            if (curveInfoParams.yAxisFormat === 'Relative frequency') {
                // replace the bin number with the bin relative frequency for the plotted statistic
                data.y[di] = data.bin_stats[di].bin_rf * 100;
            }

            // remove sub values and times to save space
            data.subVals[di] = [];
            data.subSecs[di] = [];
            data.subLevs[di] = [];

            // the tooltip is stored in data.text
            data.text[di] = label +
                "<br>" + "bin: " + di + " (" + statisticSelect + " values between " + (data.bin_stats[di].binLowBound === null ? null : data.bin_stats[di].binLowBound.toPrecision(4)) + " and " + (data.bin_stats[di].binUpBound === null ? null : data.bin_stats[di].binUpBound.toPrecision(4)) + ")" +
                "<br>" + "number in bin for this curve: " + (data.y[di] === null ? null : data.y[di]) +
                "<br>bin mean for this curve: " + statisticSelect + " = " + (data.bin_stats[di].bin_mean === null ? null : data.bin_stats[di].bin_mean.toPrecision(4)) +
                "<br>bin sd for this curve: " + statisticSelect + " = " + (data.bin_stats[di].bin_sd === null ? null : data.bin_stats[di].bin_sd.toPrecision(4));

            di++;
        }
    } // end curves

    // generate plot options
    curveInfoParams.axisMap[curveInfoParams.curves[0].axisKey]['xmin'] = xmin;
    curveInfoParams.axisMap[curveInfoParams.curves[0].axisKey]['xmax'] = xmax;
    curveInfoParams.axisMap[curveInfoParams.curves[0].axisKey]['ymin'] = ymin;
    curveInfoParams.axisMap[curveInfoParams.curves[0].axisKey]['ymax'] = ymax;
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

const processDataContour = function (dataset, curveInfoParams, plotParams, bookkeepingParams) {
    var error = "";
    const appName = matsCollections.appName.findOne({}).app;
    var statisticSelect = appName.indexOf("anomalycor") !== -1 ? "ACC" : curveInfoParams.curve[0]['statistic'];
    var data = dataset[0];
    const label = dataset[0].label;

    // if we have dates on one axis, make sure they're formatted correctly
    if (data.xAxisKey.indexOf("Date") !== -1) {
        data.x = data.x.map(function (val) {
            return moment.utc(val * 1000).format("YYYY-MM-DD HH:mm");
        });
    } else if (data.yAxisKey.indexOf("Date") !== -1) {
        data.y = data.y.map(function (val) {
            return moment.utc(val * 1000).format("YYYY-MM-DD HH:mm");
        });
    }

    // build the tooltip, and store it in data.text
    var i;
    var j;
    var currX;
    var currY;
    var currText;
    var currYTextArray;
    for (j = 0; j < data.y.length; j++) {
        currY = data.y[j];
        currYTextArray = [];
        for (i = 0; i < data.x.length; i++) {
            currX = data.x[i];
            currText = label +
                "<br>" + data['xAxisKey'] + ": " + data.x[i] +
                "<br>" + data['yAxisKey'] + ": " + data.y[j] +
                "<br>" + statisticSelect + ": " + (data.z[j][i] === undefined || data.z[j][i] === null || data.z[j][i] === 'null' ? null : data.z[j][i].toPrecision(4)) +
                "<br>n: " + data['n'][j][i];
            currYTextArray.push(currText);
        }
        data.text.push(currYTextArray);
    }

    // generate plot options
    const resultOptions = matsDataPlotOpsUtils.generateContourPlotOptions(dataset);

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
    processDataReliability: processDataReliability,
    processDataROC: processDataROC,
    processDataHistogram: processDataHistogram,
    processDataContour: processDataContour

}