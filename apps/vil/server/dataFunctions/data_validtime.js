import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataValidTime = function (plotParams, plotFunction) {
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProecssingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromSecs = dateRange.fromSeconds;
    var toSecs = dateRange.toSeconds;
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var axisMap = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var idealValues = [];

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom;
        var data_source = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        var thresholdStr = curve['threshold'];
        var thresholdTemp = Object.keys(matsCollections.CurveParams.findOne({name: 'threshold'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'threshold'}).valuesMap[key] === thresholdStr);
        var threshold = thresholdTemp/10000;
        var scaleStr = curve['scale'];
        var grid_scale = Object.keys(matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'scale'}).valuesMap[key] === scaleStr);
        var label = curve['label'];
        var color = curve['color'];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic = statisticOptionsMap[statisticSelect][0];
        var forecastLength = curve['forecast-length'];

        // axisKey is used to determine which axis a curve should use.
        // This axisMap object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisMap value, which is the axisKey.
        var axisKey =  statisticOptionsMap[statisticSelect][1];
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var idealVal = statisticOptionsMap[statisticSelect][2];
        if (idealVal !== null && idealValues.indexOf(idealVal) === -1) {
            idealValues.push(idealVal);
        }
        var interval;
        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            var statement = "select floor(m0.time%(24*3600)/3600) as hr_of_day, " +
                "count(distinct m0.time) as N_times, " +
                "min(m0.time) as min_secs, " +
                "max(m0.time) as max_secs, " +
                "{{statistic}} " +
                "from {{data_source}} as m0 " +
                "where 1=1 " +
                "and m0.yy+m0.ny+m0.yn+m0.nn > 0 " +
                "and m0.time >= '{{fromSecs}}' " +
                "and m0.time <= '{{toSecs}}' " +
                "and m0.trsh = '{{threshold}}' " +
                "and m0.fcst_len = '{{forecastLength}}' " +
                "group by hr_of_day " +
                "order by hr_of_day" +
                ";";

            statement = statement.replace('{{fromSecs}}', fromSecs);
            statement = statement.replace('{{toSecs}}', toSecs);
            statement = statement.replace('{{data_source}}', data_source + '_' + grid_scale + '_' + region);
            statement = statement.replace('{{statistic}}', statistic);
            statement = statement.replace('{{threshold}}', threshold);
            statement = statement.replace('{{forecastLength}}', forecastLength);

            dataRequests[curve.label] = statement;
            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                queryResult = matsDataUtils.queryValidTimeDB(sumPool, statement);
                finishMoment = moment();
                dataRequests["data retrieval (query) time - " + curve.label] = {
                    begin: startMoment.format(),
                    finish: finishMoment.format(),
                    duration: moment.duration(finishMoment.diff(startMoment)).asSeconds() + " seconds",
                    recordCount: queryResult.data.length
                }
                d = queryResult.data;
            } catch (e) {
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw new Error(e.message);
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                if (queryResult.error === matsTypes.Messages.NO_DATA_FOUND) {
                    // This is NOT an error just a no data condition
                    dataFoundForCurve = false;
                } else {
                    error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                    throw (new Error(error));
                }
            }

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
            const diffResult = matsDataUtils.getDataForValidTimeDiffCurve({
                dataset: dataset,
                ymin: ymin,
                ymax: ymax,
                diffFrom: diffFrom
            });

            d = diffResult.dataset;
            ymin = diffResult.ymin;
            ymax = diffResult.ymax;
            sum = diffResult.sum;
            count = diffResult.count;
        }

        const mean = sum / count;
        const annotation = label + "- mean = " + mean.toPrecision(4);
        curve['annotation'] = annotation;
        curve['ymin'] = ymin;
        curve['ymax'] = ymax;
        curve['axisKey'] = axisKey;
        const cOptions = matsDataUtils.generateValidTimeCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retrieval (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        }
    }  // end for curves

    var errorMax = Number.MIN_VALUE;

    //if matching
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched)) {
        dataset = matsDataUtils.getValidTimeMatchedDataSet(dataset);

        var subSecs = [];
        var vtGroups = [];
        var currVt;

        for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
            vtGroups[curveIndex] = [];
            subSecs[curveIndex] = {};
            var data = dataset[curveIndex].data;
            for (var di = 0; di < data.length; di++) { // every vt
                currVt = data[di][0];
                subSecs[curveIndex][currVt] = data[di][4]; //store raw secs for each valid time
                vtGroups[curveIndex].push(currVt);
            }
        }
        var matchingVts = _.intersection.apply(_, vtGroups);
        var subSecIntersection = {};

        for (var fi = 0; fi < matchingVts.length; fi++) { // every vt
            currVt = matchingVts[fi];
            var currSubSecIntersection = subSecs[0][currVt];   //fill current intersection array with secs from the first curve
            for (curveIndex = 1; curveIndex < curvesLength; curveIndex++) { // every curve
                currSubSecIntersection = _.intersection(currSubSecIntersection,subSecs[curveIndex][currVt]);   //take intersection of current secs and previously matched secs
            }
            subSecIntersection[currVt] = currSubSecIntersection;   //store final current intersection array for each vt
        }

    }

    var diffFrom;
    // calculate stats for each dataset matching to subSecIntersection if matching is specified
    // var axisLimitReprocessed = {};
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        // axisLimitReprocessed[curves[curveIndex].axisKey] = axisLimitReprocessed[curves[curveIndex].axisKey] !== undefined;
        var statisticSelect = curves[curveIndex]['statistic'];
        diffFrom = curves[curveIndex].diffFrom;
        // if it is NOT difference curve OR it is a difference curve with matching specified calculate stats
        data = dataset[curveIndex].data;
        const dataLength = data.length;
        const label = dataset[curveIndex].label;

        di = 0;
        var values = [];
        var vts = [];
        var means = [];

        while (di < data.length) {
            if ((plotParams['plotAction'] === matsTypes.PlotActions.matched && curvesLength > 1) && matchingVts.indexOf(data[di][0]) === -1) {
                dataset[curveIndex].data.splice(di, 1);
                continue;   // not a matching vt - skip it
            }

            var sub_secs = data[di][4];
            var subValues = data[di][3];
            var errorResult = {};

            if (plotParams['plotAction'] === matsTypes.PlotActions.matched && curvesLength > 1 && sub_secs.length > 0) {
                currVt = data[di][0];
                var newSubValues = [];
                var newSubSecs = [];

                for (var si = 0; si < sub_secs.length; si++) {  //loop over all sub values for this vt
                    if (subSecIntersection[currVt].indexOf(sub_secs[si]) !== -1) { //store the sub-value only if its associated sec is in the matching array for this vt
                        var newVal = subValues[si];
                        var newSec = sub_secs[si];
                        if (newVal === undefined || newVal == 0) {
                            //console.log ("found undefined at level: " + di + " curveIndex:" + curveIndex + " and secsIndex:" + subSecIntersection[subSecIntersectionIndex] + " subSecIntersectionIndex:" + subSecIntersectionIndex );
                        } else {
                            newSubValues.push(newVal);
                            newSubSecs.push(newSec);
                        }
                    }
                }

                data[di][3] = newSubValues;
                data[di][4] = newSubSecs;
            }

            /*
             DATASET ELEMENTS:
             series: [data,data,data ...... ]   each data is itself an array
             data[0] - vt (plotted against the x axis)
             data[1] - statValue (ploted against the y axis)
             data[2] - errorBar (stde_betsy * 1.96)
             data[3] - vt values
             data[4] - vt times
             data[5] - vt stats
             data[6] - tooltip
             */

            //console.log('Getting errors for fhr ' + data[di][0]);
            errorResult = matsDataUtils.get_err(data[di][3], data[di][4]);
            // data[di][1] = errorResult.d_mean;
            values.push(data[di][1]);
            vts.push(data[di][0]);  // inverted data for graphing - remember?
            means.push(errorResult.d_mean);

            // already have [stat,pl,subval,subsec]
            // want - [stat,pl,subval,{subsec,std_betsy,d_mean,n_good,lag1},tooltiptext
            // stde_betsy is standard error with auto correlation - errorbars indicate +/- 2 (actually 1.96) standard errors from the mean
            // errorbar values are stored in the dataseries element position 2 i.e. data[di][2] for plotting by flot error bar extension
            // unmatched curves get no error bars
            const errorBar = errorResult.stde_betsy * 1.96;
            if (plotParams['plotAction'] === matsTypes.PlotActions.matched) {
                errorMax = errorMax > errorBar ? errorMax : errorBar;
                data[di][2] = errorBar;
            } else {
                data[di][2] = -1;
            }
            data[di][5] = {
                d_mean: errorResult.d_mean,
                sd: errorResult.sd,
                n_good: errorResult.n_good,
                lag1: errorResult.lag1,
                stde_betsy: errorResult.stde_betsy
            };

            // this is the tooltip, it is the last element of each dataseries element
            data[di][6] = label +
                "<br>" + "hour of day: " + data[di][0] +
                "<br> " + statisticSelect + ": " + (data[di][1] === null ? null : data[di][1].toPrecision(4)) +
                "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>  n: " + errorResult.n_good +
                "<br>  lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                "<br>  stde: " + errorResult.stde_betsy +
                "<br>  errorbars: " + Number((data[di][1]) - (errorResult.stde_betsy * 1.96)).toPrecision(4) + " to " + Number((data[di][1]) + (errorResult.stde_betsy * 1.96)).toPrecision(4);

            di++;
        }
        // get the overall stats for the text output - this uses the means not the stats. refer to

        const stats = matsDataUtils.get_err(vts, values);
        const filteredMeans = means.filter(x => x);
        const miny = Math.min(...filteredMeans);
        const maxy = Math.max(...filteredMeans);
        stats.miny = miny;
        stats.maxy = maxy;
        dataset[curveIndex]['stats'] = stats;

        //recalculate axis options after QC and matching
        // axisMap[curves[curveIndex].axisKey]['ymax'] = (axisMap[curves[curveIndex].axisKey]['ymax'] < maxy || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? maxy : axisMap[curves[curveIndex].axisKey]['ymax'];
        // axisMap[curves[curveIndex].axisKey]['ymin'] = (axisMap[curves[curveIndex].axisKey]['ymin'] > miny || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? miny : axisMap[curves[curveIndex].axisKey]['ymin'];
    }

    // add black 0 line curve
    // need to define the minimum and maximum x value for making the zero curve
    dataset.push({
        "yaxis": 1,
        "label": "zero",
        "annotation": "",
        "color": "rgb(0,0,0)",
        "data": [
            [xmin, 0, 0, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, "zero"],
            [xmax, 0, 0, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, "zero"]
        ],
        "points": {
            "show": false,
            "errorbars": "y",
            "yerr": {
                "show": false,
                "asymmetric": false,
                "upperCap": "squareCap",
                "lowerCap": "squareCap",
                "color": "rgb(0,0,255)",
                "radius": 5
            }
        },
        "lines": {
            "show": true,
            "fill": false
        },
        "stats": {
            "d_mean": 0,
            "stde_betsy": 0,
            "sd": 0,
            "n_good": 0,
            "lag1": 0,
            "min": 0,
            "max": 0,
            "sum": 0,
            "miny": 0,
            "maxy": 0
        }
    });

    //add ideal value lines, if any
    for (var ivIdx = 0; ivIdx < idealValues.length; ivIdx++) {

        dataset.push({
            "yaxis": 1,
            "label": idealValues[ivIdx].toString(),
            "annotation": "",
            "color": "rgb(0,0,0)",
            "data": [
                [xmin, idealValues[ivIdx], idealValues[ivIdx], [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, idealValues[ivIdx].toString()],
                [xmax, idealValues[ivIdx], idealValues[ivIdx], [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, idealValues[ivIdx].toString()]
            ],
            "points": {
                "show": false,
                "errorbars": "y",
                "yerr": {
                    "show": false,
                    "asymmetric": false,
                    "upperCap": "squareCap",
                    "lowerCap": "squareCap",
                    "color": "rgb(0,0,255)",
                    "radius": 5
                }
            },
            "lines": {
                "show": true,
                "fill": false
            },
            "stats": {
                "d_mean": 0,
                "stde_betsy": 0,
                "sd": 0,
                "n_good": 0,
                "lag1": 0,
                "min": 0,
                "max": 0,
                "sum": 0,
                "miny": 0,
                "maxy": 0
            }
        });

    }

    const resultOptions = matsDataUtils.generateValidTimePlotOptions(dataset, curves, axisMap, errorMax);
    var totalProecssingFinish = moment();
    dataRequests["total retrieval and processing time for curve set"] = {
        begin: totalProecssingStart.format(),
        finish: totalProecssingFinish.format(),
        duration: moment.duration(totalProecssingFinish.diff(totalProecssingStart)).asSeconds() + ' seconds'
    }

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