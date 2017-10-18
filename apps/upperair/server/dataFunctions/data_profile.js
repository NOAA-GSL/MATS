import { matsCollections } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsDataUtils } from 'meteor/randyp:mats-common';
import { mysql } from 'meteor/pcel:mysql';
import { moment } from 'meteor/momentjs:moment';

dataProfile = function(plotParams, plotFunction) {
    //console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {}; // used to store data queries
    var totalProecssingStart = moment();
    var matching = plotParams.plotAction === matsTypes.PlotActions.matched;
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
    var maxValuesPerLevel = 0;
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var dataFoundForCurve = true;
        // Determine all the plot params for this curve
        maxValuesPerLevel = 0;
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom; // [minuend, subtrahend]
        var label = curve['label'];
        var model = matsCollections.CurveParams.findOne({name: 'model'}).optionsMap[curve['model']][0];
        var regionStr = curve['region'];
        var region = Object.keys(matsCollections.CurveParams.findOne({name: 'region'}).valuesMap).find(key => matsCollections.CurveParams.findOne({name: 'region'}).valuesMap[key] === regionStr);
        var curveDates = curve['curve-dates'];
        var fromDateStr = curveDates.split(' - ')[0]; // get the from part
        fromDateStr = fromDateStr.split(' ')[0];  // strip off time field
        var toDateStr = curveDates.split(' - ')[1]; // get the to part
        toDateStr = toDateStr.split(' ')[0];  // strip off time field
        var curveDatesDateRangeFrom = moment.utc(fromDateStr, "MM-DD-YYYY").format('YYYY-M-D');
        var curveDatesDateRangeTo = moment.utc(toDateStr, "MM-DD-YYYY").format('YYYY-M-D');
        var top = curve['top'];
        var bottom = curve['bottom'];
        var color = curve['color'];
        var variableStr = curve['variable'];
        var variableOptionsMap = matsCollections.CurveParams.findOne({name: 'variable'}, {optionsMap: 1})['optionsMap'];
        var variable = variableOptionsMap[variableStr];
        var statisticSelect = curve['statistic'];
        var statisticOptionsMap = matsCollections.CurveParams.findOne({name: 'statistic'}, {optionsMap: 1})['optionsMap'];
        var statistic;
        if (variableStr == 'winds') {
            statistic = statisticOptionsMap[statisticSelect][1];
        } else {
            statistic = statisticOptionsMap[statisticSelect][0];
        }
        statistic = statistic + "," + statisticOptionsMap[statisticSelect][2];
        statistic = statistic.replace(/\{\{variable0\}\}/g, variable[0]);
        statistic = statistic.replace(/\{\{variable1\}\}/g, variable[1]);
        var validTimeStr = curve['valid-time'];
        var validTimeOptionsMap = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'];
        var validTimeClause = validTimeOptionsMap[validTimeStr][0];
        var forecastLength = curve['forecast-length'];
        // axisKey is used to determine which axis a curve should use.
        // This axisMap object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisMap value, which is the axisKey.
        var axisKey = variableStr + ":" + statisticSelect;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var d = [];
        // create database query statements
        if (diffFrom === null || diffFrom === undefined) {
            // this is a database driven curve, not a difference curve
            // create the database queries and retrieve the data
            var statement = "select  -m0.mb10*10 as avVal, " +
                "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
                "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
                "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
                "{{statistic}} " +
                "from {{model}} as m0 " +
                "where 1=1 " +
                "{{validTimeClause}} " +
                "and m0.fcst_len = {{forecastLength}} " +
                "and m0.mb10 > {{top}}/10 " +
                "and m0.mb10 <= {{bottom}}/10 " +
                "and m0.date >= '{{fromDate}}' " +
                "and m0.date <= '{{toDate}}' " +
                "group by avVal " +
                "order by avVal" +
                ";";
            // build the query
            statement = statement.replace('{{model}}', model + '_Areg' + region);
            statement = statement.replace('{{top}}', top);
            statement = statement.replace('{{bottom}}', bottom);
            statement = statement.replace('{{fromDate}}', curveDatesDateRangeFrom);
            statement = statement.replace('{{toDate}}', curveDatesDateRangeTo);
            statement = statement.replace('{{statistic}}', statistic); // statistic replacement has to happen first
            statement = statement.replace('{{validTimeClause}}', validTimeClause);
            statement = statement.replace('{{forecastLength}}', forecastLength);
            // save the query for the data lineage
            dataRequests[curve.label] = statement;
            var queryResult;
            var startMoment = moment();
            var finishMoment;
            try {
                queryResult = matsDataUtils.queryProfileDB(sumPool, statement, statisticSelect, label);
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
        } else {
            // this is a difference curve
            // calculate the data based on matching or unmatched
            var diffResult;
            if (matching) {
                //console.log("curve: " + curveIndex + " getDataForProfileMatchingDiffCurve");
                diffResult = matsDataUtils.getDataForProfileMatchingDiffCurve({
                    dataset: dataset,
                    diffFrom: diffFrom
                });
            } else {
                // an unmatched difference curve. In this case we just difference the plot points, we don't calculate stats
                //console.log ("curve: " + curveIndex + " getDataForProfileUnMatchedDiffCurve");
                diffResult = matsDataUtils.getDataForProfileUnMatchedDiffCurve({
                    dataset: dataset,
                    diffFrom: diffFrom
                });
            }
            d = diffResult.dataset;
        }  // end difference curve
            // get the x min and max
            for (var di = 0; di < d.length; di++) {
                xmax = xmax > d[di][0] ? xmax : d[di][0];
                xmin = xmin < d[di][0] ? xmin : d[di][0];
                maxValuesPerLevel = maxValuesPerLevel > d[di][3].length ? maxValuesPerLevel : d[di][3].length;
            }

            // specify these so that the curve options generator has them available
            // profile plots always go from 0 to 1000 initially
            curve['annotation'] = "";
            curve['ymin'] = ymin;
            curve['ymax'] = ymax;
            curve['xmin'] = xmin;
            curve['xmax'] = xmax;
            const cOptions = matsDataUtils.generateProfileCurveOptions(curve, curveIndex, axisMap, d);  // generate plot with data, curve annotation, axis labels, etc.
            dataset.push(cOptions);

    }  // end for curves

    var postQueryStartMoment = moment();

    // match the data by subseconds
    // build an array of sub_second arrays
    // data is [stat,avVal,[sub_values],[sub_secs]]
    // be sure to match the pressure levels as well
    var matchingLevels = [];
    if (matching) {
        var subSecs = new Set();
        var levelGroups = [];
        for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
            levelGroups[curveIndex] = [];
            var data = dataset[curveIndex].data;
            for (var di = 0; di < data.length; di++) { // every pressure level
                var sub_secs = data[di][4];
                levelGroups[curveIndex].push(data[di][1]);
                for (var sec of sub_secs) {
                        subSecs.add(sec);
                }
            }
        }
        matchingLevels = _.intersection.apply(_, levelGroups);
        var subSecIntersection = Array.from(subSecs);
    }


    // calculate stats for each dataset matching to subsec_intersection if matching is specified
    var errorMax = Number.MIN_VALUE;
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        diffFrom = curves[curveIndex].diffFrom;
        // if it is NOT difference curve OR it is a difference curve with matching specified calculate stats
        if (diffFrom === undefined || diffFrom === null || (diffFrom !== null && matching)) {
            data = dataset[curveIndex].data;
            const dataLength = data.length;
            const label = dataset[curveIndex].label;
            //for (di = 0; di < dataLength; di++) { // every pressure level
            di = 0;
            var values = [];
            var levels = [];
            var means = [];
            while (di < data.length) {
                if (matching && matchingLevels.indexOf(data[di][1]) === -1) {
                    dataset[curveIndex].data.splice(di, 1);
                    continue;   // not a matching level - skip it
                }
                sub_secs = data[di][4];
                var subValues = data[di][3];
                var errorResult = {};
                if (matching) {
                    var newSubValues = [];
                    for (var subSecIntersectionIndex = 0; subSecIntersectionIndex < subSecIntersection.length; subSecIntersectionIndex++) {
                        var secsIndex = sub_secs.indexOf(subSecIntersection[subSecIntersectionIndex]);
                        var newVal = subValues[secsIndex];
                        if (newVal === undefined || newVal == 0) {
                            //console.log ("found undefined at level: " + di + " curveIndex:" + curveIndex + " and secsIndex:" + subSecIntersection[subSecIntersectionIndex] + " subSecIntersectionIndex:" + subSecIntersectionIndex );
                        } else {
                            newSubValues.push(newVal);
                        }
                    }
                    data[di][3] = newSubValues;
                    data[di][4] = subSecIntersection;
                }
                if (data[di][3].length < maxValuesPerLevel * 0.75) {
                    // IMPLICIT QUALITY CONTROL - throw away levels that are not at least 75% complete
                    errorResult = {d_mean: 0, stde_betsy: 0, sd: 0, n_good: 0, lag1: 0, min: 0, max: 0, sum: 0};
                    data[di][0] = null; //null out the value
                } else {
                    /*
                     DATASET ELEMENTS:
                     series: [data,data,data ...... ]   each data is itself an array
                     data[0] - statValue (ploted against the x axis)
                     data[1] - level (plotted against the y axis)
                     data[2] - errorBar (stde_betsy * 1.96)
                     data[3] - level values
                     data[4] - level times
                     data[5] - level stats
                     data[6] - tooltip
                     */
                    //console.log('Getting errors for level ' + data[di][1]);
                    errorResult = matsDataUtils.get_err(data[di][3], data[di][4]);
                    values.push(data[di][0]);
                    levels.push(data[di][1] * -1);  // inverted data for graphing - remember?
                    means.push(errorResult.d_mean);
                }
                // already have [stat,pl,subval,subsec]
                // want - [stat,pl,subval,{subsec,std_betsy,d_mean,n_good,lag1},tooltiptext
                // stde_betsy is standard error with auto correlation - errorbars indicate +/- 2 (actually 1.96) standard errors from the mean
                // errorbar values are stored in the dataseries element position 2 i.e. data[di][2] for plotting by flot error bar extension
                // unmatched curves get no error bars
                const errorBar = errorResult.stde_betsy * 1.96;
                errorMax = errorMax > errorBar ? errorMax : errorBar;
                if (matching) {
                    data[di][2] = errorBar;
                }
                data[di][5] = {
                    d_mean: errorResult.d_mean,
                    sd: errorResult.sd,
                    n_good: errorResult.n_good,
                    lag1: errorResult.lag1,
                    stde_betsy: errorResult.stde_betsy
                };
                if (data[di][3].length < maxValuesPerLevel * 0.75) {
                    // IMPLICIT QUALITY CONTROL - throw away levels that are not at least 75% complete
                    // this is the tooltip, it is the last element of each dataseries element
                    data[di][6] = label +
                        "<br>" + -data[di][1] + "mb" +
                        "<br> " + "values array is less than 75% complete - disregraded";
                } else {
                    // this is the tooltip, it is the last element of each dataseries element
                    data[di][6] = label +
                        "<br>" + -data[di][1] + "mb" +
                        "<br> " + statisticSelect + ":" + (data[di][0] === null ? null : data[di][0].toPrecision(4)) +
                        "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                        "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                        "<br>  n: " + errorResult.n_good +
                        "<br>  lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                        "<br>  stde: " + errorResult.stde_betsy +
                        "<br>  errorbars: " + Number((data[di][0]) - (errorResult.stde_betsy * 1.96)).toPrecision(4) + " to " + Number((data[di][0]) + (errorResult.stde_betsy * 1.96)).toPrecision(4);
                }
                di++;
            }
            // get the overall stats for the text output - this uses the means not the stats. refer to

            //const stats = matsDataUtils.get_err(means.reverse(), levels.reverse()); // have to reverse because of data inversion
            const stats = matsDataUtils.get_err(values.reverse(), levels.reverse()); // have to reverse because of data inversion
            const minx = Math.min.apply(null, means);
            const maxx = Math.max.apply(null, means);
            stats.minx = minx;
            stats.maxx = maxx;
            dataset[curveIndex]['stats'] = stats;
            // END if (diffFrom === null || (diffFrom !== null && matching))
        }

    }

    // add black 0 line curve
    dataset.push({
            "yaxis": 1,
            "label": "zero",
            "color": "rgb(0,0,0)",
            "data": [
                [0, -1000, 0, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, "zero"],
                [0, -50, 0, [0], [0], {"d_mean": 0, "sd": 0, "n_good": 0, "lag1": 0, "stde": 0}, "zero"]
            ],
            "points": {
                "show": false,
                "errorbars": "x",
                "xerr": {
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
                "min": 50,
                "max": 1000,
                "sum": 0,
                "minx": 0,
                "maxx": 0
            }
        });
    const resultOptions = matsDataUtils.generateProfilePlotOptions( dataset, curves, axisMap, errorMax );
    const result = {
        error: error,
        data: dataset,
        options: resultOptions,
        basis:{
            plotParams:plotParams,
            queries:dataRequests
        }
    };
    plotFunction(result);
};
