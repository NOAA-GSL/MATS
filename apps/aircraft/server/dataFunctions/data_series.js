import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment'

dataSeries = function (plotParams, plotFunction) {
    var dataRequests = {}; // used to store data queries
    var dataFoundForCurve = true;
    var totalProecssingStart = moment();
    var dateRange = matsDataUtils.getDateRange(plotParams.dates);
    var fromDate = dateRange.fromDate;
    var toDate = dateRange.toDate;
    // convert dates for sql
    fromDate = moment.utc(fromDate, "MM-DD-YYYY").format('YYYY-M-D');
    toDate = moment.utc(toDate, "MM-DD-YYYY").format('YYYY-M-D');
    var error = "";
    var curves = plotParams.curves;
    var curvesLength = curves.length;
    var dataset = [];
    var axisMap = Object.create(null);
    var xmax = Number.MIN_VALUE;
    var ymax = Number.MIN_VALUE;
    var xmin = Number.MAX_VALUE;
    var ymin = Number.MAX_VALUE;
    var maxValuesPerAvtime = 0;

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        const diffFrom = curve.diffFrom;
        const data_source = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
        const regionStr = curve['region'];
        const region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        const label = curve['label'];
        const top = curve['top'];
        const bottom = curve['bottom'];
        const color = curve['color'];
        const variableStr = curve['variable'];
        const variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        const variable = variableOptionsMap[variableStr];
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
        const validTimes = curve['valid-time'] === undefined ? [] : curve['valid-time'];
        var validTimeClause =" ";
        if (validTimes.length > 0){
            validTimeClause = " and  m0.hour IN(" + validTimes + ")";
        }
        const averageStr = curve['average'];
        const averageOptionsMap = matsCollections.CurveParams.findOne({name: 'average'}, {optionsMap: 1})['optionsMap'];
        const average = averageOptionsMap[averageStr][0];
        const forecastLength = curve['forecast-length'];
        const phaseStr = curve['phase'];
        const phaseOptionsMap = matsCollections.CurveParams.findOne({name: 'phase'}, {optionsMap: 1})['optionsMap'];
        const phase = phaseOptionsMap[phaseStr];
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        //CHANGED TO PLOT ON THE SAME AXIS IF SAME STATISTIC, REGARDLESS OF THRESHOLD
        var axisKey = varUnits;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var interval;
        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            var statement = "select {{average}} as avtime, " +
                "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
                "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
                "{{statistic}} " +
                " from {{data_source}} as m0 " +
                "  where 1=1 "+
                "{{validTimeClause}} " +
                "and m0.date >= '{{fromDate}}' " +
                "and m0.date <= '{{toDate}}' " +
                "{{phase}} " +
                "and m0.mb10 >= {{top}}/10 " +
                "and m0.mb10 <= {{bottom}}/10 " +
                "group by avtime " +
                "order by avtime" +
                ";";

            statement = statement.replace('{{average}}', average);
            statement = statement.replace('{{statistic}}', statistic);
            statement = statement.replace('{{data_source}}', data_source + "_" + forecastLength + "_" + region + "_sums");
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{phase}}', phase);
            statement = statement.replace('{{top}}', top);
            statement = statement.replace('{{bottom}}', bottom);
            statement = statement.replace('{{fromDate}}', fromDate);
            statement = statement.replace('{{toDate}}', toDate);

            dataRequests[curve.label] = statement;
            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                queryResult = matsDataUtils.querySeriesWithLevelsDB(sumPool, statement, interval, averageStr);
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
                    if (error.includes('Unknown column')) {
                        throw new Error("INFO:  The statistic/variable combination [" + statisticSelect + " and " + variableStr + "] is not supported by the database for the model/region [" + model + " and " + region + "].");
                    } else {
                        throw new Error(error);
                    }
                }
            }

            var postQueryStartMoment = moment();
            if (dataFoundForCurve) {
                xmin = xmin < d[0][0] ? xmin : d[0][0];
                xmax = xmax > d[d.length - 1][0] ? xmax : d[d.length - 1][0];
                interval = queryResult.interval;
                var sum = 0;
                var count = 0;
                for (var i = 0; i < d.length; i++) {
                    if (d[i][1] !== null) {
                        sum = sum + d[i][1];
                        count++;
                        ymin = Number(ymin) < Number(d[i][1]) ? ymin : d[i][1];
                        ymax = Number(ymax) > Number(d[i][1]) ? ymax : d[i][1];
                        maxValuesPerAvtime = maxValuesPerAvtime > d[i][3].length ? maxValuesPerAvtime : d[i][3].length;
                    }
                }
            }
        } else {
            // this is a difference curve
            var diffResult = matsDataUtils.getDataForSeriesWithLevelsDiffCurve({
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
        const cOptions = matsDataUtils.generateSeriesCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
        dataset.push(cOptions);
        var postQueryFinishMoment = moment();
        dataRequests["post data retreival (query) process time - " + curve.label] = {
            begin: postQueryStartMoment.format(),
            finish: postQueryFinishMoment.format(),
            duration: moment.duration(postQueryFinishMoment.diff(postQueryStartMoment)).asSeconds() + ' seconds'
        }
    }  // end for curves

    var errorMax = Number.MIN_VALUE;
    var sub_levs;

    //if matching
    if (curvesLength > 1 && (plotParams['plotAction'] === matsTypes.PlotActions.matched)) {
        dataset = matsDataUtils.getMatchedDataSetWithLevels(dataset, interval);

        var subLevs = new Set();
        var avTimeGroups = [];
        for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
            avTimeGroups[curveIndex] = [];
            var data = dataset[curveIndex].data;
            for (var di = 0; di < data.length; di++) { // every fhr
                sub_levs = data[di][5];
                avTimeGroups[curveIndex].push(data[di][0]);
                for (var li = 0; li < sub_levs.length; li++) {
                    var lev = sub_levs[li];
                    subLevs.add(lev);
                }
            }
        }
        var matchingAvTimes = _.intersection.apply(_, avTimeGroups);
        var subLevIntersection = Array.from(subLevs);
    }

    var diffFrom;
    // calculate stats for each dataset matching to subsec_intersection if matching is specified
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        var statisticSelect = curves[curveIndex]['statistic'];
        diffFrom = curves[curveIndex].diffFrom;
        data = dataset[curveIndex].data;
        const dataLength = data.length;
        const label = dataset[curveIndex].label;
        //for (di = 0; di < dataLength; di++) { // every forecast hour
        var di = 0;
        var values = [];
        var avtimes = [];
        var means = [];

        while (di < dataLength) {
            if ((plotParams['plotAction'] === matsTypes.PlotActions.matched && curvesLength > 1) && matchingAvTimes.indexOf(data[di][0]) === -1) {
                dataset[curveIndex].data.splice(di, 1);
                continue;   // not a matching time - skip it
            }

            sub_levs = data[di][5];
            var sub_secs = data[di][4];
            var subValues = data[di][3];
            var errorResult = {};

            if (plotParams['plotAction'] === matsTypes.PlotActions.matched && curvesLength > 1 && !isNaN(sub_levs)) {
                var newSubValues = [];
                var newSubSecs = [];
                for (var subLevIntersectionIndex = 0; subLevIntersectionIndex < subLevIntersection.length; subLevIntersectionIndex++) {
                    var levsIndex = sub_levs.indexOf(subLevIntersection[subLevIntersectionIndex]);
                    var newVal = subValues[levsIndex];
                    var newSec = sub_secs[levsIndex];
                    if (newVal === undefined || newVal == 0) {
                        //console.log ("found undefined at level: " + di + " curveIndex:" + curveIndex + " and secsIndex:" + subSecIntersection[subSecIntersectionIndex] + " subSecIntersectionIndex:" + subSecIntersectionIndex );
                    } else {
                        newSubValues.push(newVal);
                        newSubSecs.push(newSec);
                    }
                }
                data[di][3] = newSubValues;
                data[di][4] = newSubSecs;
                data[di][5] = subLevIntersection; // we're going to overwrite this later because we don't need it anymore and we need to keep dataset with a similar structure to the rest of the apps
            }

            /*
             DATASET ELEMENTS:
             series: [data,data,data ...... ]   each data is itself an array
             data[0] - avtime (plotted against the x axis)
             data[1] - statValue (ploted against the y axis)
             data[2] - errorBar (stde_betsy * 1.96)
             data[3] - avtime values
             data[4] - avtime times
             data[5] - avtime stats
             data[6] - tooltip
             */

            //console.log('Getting errors for avtime ' + data[di][0]);
            errorResult = matsDataUtils.get_err(data[di][3], data[di][4]);
            values.push(data[di][1]);
            avtimes.push(data[di][0]);  // inverted data for graphing - remember?
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
                "<br>" + "time: " + moment.utc(data[di][0]).format("YYYY-MM-DD HH:mm") +
                "<br> " + statisticSelect + ":" + (data[di][1] === null ? null : data[di][1].toPrecision(4)) +
                "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>  n: " + errorResult.n_good +
                "<br>  lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                "<br>  stde: " + errorResult.stde_betsy +
                "<br>  errorbars: " + Number((data[di][1]) - (errorResult.stde_betsy * 1.96)).toPrecision(4) + " to " + Number((data[di][1]) + (errorResult.stde_betsy * 1.96)).toPrecision(4);

            di++;
        }
        // get the overall stats for the text output - this uses the means not the stats. refer to

        const stats = matsDataUtils.get_err(avtimes, values);
        const miny = Math.min.apply(null, means);
        const maxy = Math.max.apply(null, means);
        stats.miny = miny;
        stats.maxy = maxy;
        dataset[curveIndex]['stats'] = stats;
        // }
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
    const resultOptions = matsDataUtils.generateSeriesPlotOptions(dataset, curves, axisMap, errorMax);
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