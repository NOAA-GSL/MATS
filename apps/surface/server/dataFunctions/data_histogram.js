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

dataHistogram = function (plotParams, plotFunction) {
    // initialize variables common to all curves
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = [];
    var matching = plotParams['plotAction'] === matsTypes.PlotActions.matched;
    var alreadyMatched = false;
    var totalProcessingStart = moment();
    var error = "";
    var curves = JSON.parse(JSON.stringify(plotParams.curves));
    var curvesLength = curves.length;
    var curvesLengthSoFar = 0;
    var dataset = [];
    var allReturnedSubStats = [];
    var allReturnedSubSecs = [];
    var axisMap = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;

    // process user bin customizations
    var yAxisFormat = plotParams['histogram-yaxis-controls'];
    var binType = plotParams['histogram-bin-controls'];
    var binNum = 12;    // default bin number
    var pivotVal = undefined;      // default is not to shift the bins over to a pivot
    var binBounds = []; // default is no specified bin bounds -- our algorithm will figure them out if this array stays empty

    switch (binType) {
        case "Set number of bins":
            // get the user's chosen number of bins
            binNum = Number(plotParams['bin-number']);
            if (isNaN(binNum)) {
                throw new Error("Error parsing bin number: please enter the desired number of bins.");
            }
            break;

        case "Make zero a bin bound":
            // let the histogram routine know that we want the bins shifted over to zero
            pivotVal = 0;
            break;

        case "Choose a bin bound":
            // let the histogram routine know that we want the bins shifted over to whatever was input
            pivotVal = Number(plotParams['bin-pivot']);
            if (isNaN(pivotVal)) {
                throw new Error("Error parsing bin pivot: please enter the desired bin pivot.");
            }
            break;

        case "Set number of bins and make zero a bin bound":
            // get the user's chosen number of bins and let the histogram routine know that we want the bins shifted over to zero
            binNum = Number(plotParams['bin-number']);
            if (isNaN(binNum)) {
                throw new Error("Error parsing bin number: please enter the desired number of bins.");
            }
            pivotVal = 0;
            break;

        case "Set number of bins and choose a bin bound":
            // get the user's chosen number of bins and let the histogram routine know that we want the bins shifted over to whatever was input
            binNum = Number(plotParams['bin-number']);
            if (isNaN(binNum)) {
                throw new Error("Error parsing bin number: please enter the desired number of bins.");
            }
            pivotVal = Number(plotParams['bin-pivot']);
            if (isNaN(pivotVal)) {
                throw new Error("Error parsing bin pivot: please enter the desired bin pivot.");
            }
            break;

        case "Manual bins":
            // try to parse whatever we've been given for bin bounds. Throw an error if they didn't follow directions to enter a comma-separated list of numbers.
            try {
                binBounds = plotParams['bin-bounds'].split(",").map(function (item) {
                    item.trim();
                    item = Number(item);
                    if (!isNaN(item)) {
                        return item
                    } else {
                        throw new Error("Error parsing bin bounds: please enter  at least two numbers delimited by commas.");
                    }
                });
                binNum = binBounds.length + 1; // add 1 because these are inner bin bounds
            } catch (e) {
                throw new Error("Error parsing bin bounds: please enter  at least two numbers delimited by commas.");
            }
            // make sure that we've been given at least two good bin bounds (enough to make one bin).
            if (binNum < 3) {
                throw new Error("Error parsing bin bounds: please enter at least two numbers delimited by commas.");
            }
            break;

        case "Default bins":
        default:
            break;
    }

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        // initialize variables specific to each curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        dataFoundForCurve[curveIndex] = true;
        var label = curve['label'];
        var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var metarStringStr = curve['truth'];
        var metarString = Object.keys(matsCollections.CurveParams.findOne({name: 'truth'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'truth'}).valuesMap[key] === metarStringStr);
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic;
        if (variableStr === '2m temperature' || variableStr === '2m dewpoint') {
            statistic = statisticOptionsMap[statisticSelect][0];
        } else if (variableStr === '10m wind') {
            statistic = statisticOptionsMap[statisticSelect][2];
        } else {
            statistic = statisticOptionsMap[statisticSelect][1];
        }
        statistic = statistic.replace(/\{\{variable0\}\}/g, variable[0]);
        statistic = statistic.replace(/\{\{variable1\}\}/g, variable[1]);
        var validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        var dateRange = matsDataUtils.getDateRange(curve['curve-dates']);
        var fromSecs = dateRange.fromSeconds;
        var toSecs = dateRange.toSeconds;
        var forecastLength = curve['forecast-length'];
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

        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            // prepare the query from the above parameters
            var statement = "select m0.valid_day+3600*m0.hour as avtime, " +
                "count(distinct m0.valid_day+3600*m0.hour) as N_times, " +
                "min(m0.valid_day+3600*m0.hour) as min_secs, " +
                "max(m0.valid_day+3600*m0.hour) as max_secs, " +
                "{{statistic}} " +
                "from {{model}} as m0 " +
                "where 1=1 " +
                "{{validTimeClause}} " +
                "and m0.fcst_len = {{forecastLength}} " +
                "and m0.valid_day+3600*m0.hour >= '{{fromSecs}}' " +
                "and m0.valid_day+3600*m0.hour <= '{{toSecs}}' " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{forecastLength}}', forecastLength);
            statement = statement.replace('{{fromSecs}}', fromSecs);
            statement = statement.replace('{{toSecs}}', toSecs);
            statement = statement.replace('{{model}}', model + "_" + metarString + "_" + region);
            statement = statement.replace('{{statistic}}', statistic);
            var validTimeClause = " ";
            if (validTimes.length > 0) {
                validTimeClause = " and  m0.hour IN(" + validTimes + ")";
            }
            statement = statement.replace('{{validTimeClause}}', validTimeClause);

            dataRequests[curve.label] = statement;

            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                // send the query statement to the query function
                queryResult = matsDataQueryUtils.queryDBSpecialtyCurve(sumPool, statement, matsTypes.PlotTypes.histogram, false);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + curve.label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.length
                };
                // get the data back from the query
                d = queryResult.data;
                allReturnedSubStats.push(d.curveSubStats); // save returned data so that we can calculate histogram stats once all the queries are done
                allReturnedSubSecs.push(d.curveSubSecs);
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
                        throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is not supported by the database for the model/region [" + model + " and " + region + "].");
                    } else {
                        throw new Error(error);
                    }
                }
            }
        }
    }

    // flatten all the returned data into one stats array and one secs array in order to calculate histogram bins over the whole range.
    const curveSubStats = [].concat.apply([], allReturnedSubStats);
    const curveSubSecs = [].concat.apply([], allReturnedSubSecs);
    var binStats;
    if (binBounds.length === 0) {
        binStats = matsDataUtils.calculateHistogramBins(curveSubStats, curveSubSecs, binNum, pivotVal).binStats;
    } else {
        binStats = matsDataUtils.prescribeHistogramBins(curveSubStats, curveSubSecs, binNum, binBounds).binStats;
    }

    // store bin labels and x-axis positions of those labels for later when we set up the plot options
    var plotBins = [];
    for (var b_idx = 0; b_idx < binStats.binMeans.length; b_idx++) {
        plotBins.push([binStats.binMeans[b_idx], binStats.binLabels[b_idx]]);
    }

    var sortedData;
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        curve = curves[curveIndex];
        diffFrom = curve.diffFrom;
        if (diffFrom == null) {
            var postQueryStartMoment = moment();
            if (dataFoundForCurve[curveIndex]) {
                // sort queried data into the full set of histogram bins
                sortedData = matsDataUtils.sortHistogramBins(allReturnedSubStats[curveIndex], allReturnedSubSecs[curveIndex], [], binNum, binStats, false, []);
                d = sortedData.d;
                // set axis limits based on returned data
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
            } else {
                d = [];
            }
        } else {
            // this is a difference curve, so we're done with regular curves.
            // do any matching that needs to be done.
            if (matching && !alreadyMatched) {
                dataset = matsDataMatchUtils.getMatchedDataSetHistogram(dataset, curvesLengthSoFar, binStats);
                alreadyMatched = true;
            }

            // then take diffs
            const diffResult = matsDataDiffUtils.getDataForDiffCurve({
                dataset: dataset,
                ymin: ymin,
                ymax: ymax,
                diffFrom: diffFrom
            }, matsTypes.PlotTypes.histogram, false);

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
        const cOptions = matsDataCurveOpsUtils.generateBarChartCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        curvesLengthSoFar++;
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        }
    }  // end for curves

    // if matching, pare down dataset to only matching data. Only do this if we didn't already do it while calculating diffs.
    if (curvesLength > 1 && (matching && !alreadyMatched)) {
        dataset = matsDataMatchUtils.getMatchedDataSetHistogram(dataset, curvesLength, binStats);
    }

    // we may need to recalculate the axis limits after unmatched data and outliers are removed
    var axisLimitReprocessed = {};

    // calculate data statistics (including error bars) for each curve
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        axisLimitReprocessed[curves[curveIndex].axisKey] = axisLimitReprocessed[curves[curveIndex].axisKey] !== undefined;
        statisticSelect = curves[curveIndex]['statistic'];
        diffFrom = curves[curveIndex].diffFrom;
        var data = dataset[curveIndex].data;
        const label = dataset[curveIndex].label;

        var di = 0;
        var values = [];
        var bins = [];

        while (di < data.length) {

            /*
             DATASET ELEMENTS:
             series: [data,data,data ...... ]   each data is itself an array
             data[0] - bin number (plotted against the x axis)
             data[1] - number in bin OR bin RF (ploted against the y axis)
             data[2] - -1 (no error bars for histograms)
             data[3] - bin values -- removed here to save on data volume
             data[4] - bin times -- removed here to save on data volume
             data[5] - reserved for if there are bin levels -- removed here to save on data volume
             data[6] - bin stats
             data[7] - global stats
             data[8] - tooltip
             */

            if (yAxisFormat === 'Relative frequency') {
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
        axisMap[curves[curveIndex].axisKey]['ymax'] = (axisMap[curves[curveIndex].axisKey]['ymax'] < maxy || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? maxy : axisMap[curves[curveIndex].axisKey]['ymax'];
        axisMap[curves[curveIndex].axisKey]['ymin'] = (axisMap[curves[curveIndex].axisKey]['ymin'] > miny || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? miny : axisMap[curves[curveIndex].axisKey]['ymin'];

        // recalculate curve annotation after QC and matching
        if (stats.d_mean !== undefined && stats.d_mean !== null) {
            dataset[curveIndex]['annotation'] = label + "- mean = " + stats.d_mean.toPrecision(4);
        }
    }

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    const zeroLine = matsDataCurveOpsUtils.getHorizontalValueLine(xmax, xmin, 0, matsTypes.ReservedWords.zero);
    dataset.push(zeroLine);

    // generate plot options
    const resultOptions = matsDataPlotOpsUtils.generateHistogramPlotOptions(dataset, curves, axisMap, plotBins);
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