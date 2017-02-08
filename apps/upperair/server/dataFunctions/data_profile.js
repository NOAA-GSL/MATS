import { matsCollections } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsDataUtils } from 'meteor/randyp:mats-common';
import { mysql } from 'meteor/pcel:mysql';
import { moment } from 'meteor/momentjs:moment';

dataProfile = function(plotParams, plotFunction) {
    //console.log("plotParams: ", JSON.stringify(plotParams, null, 2));
    var dataRequests = {}; // used to store data queries
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

    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom; // [minuend, subtrahend]
        var label = curve['label'];
        var model = matsCollections.CurveParams.findOne({name: 'model'}).optionsMap[curve['model']][0];
        var region = matsCollections.RegionDescriptions.findOne({description:curve['region']}).regionMapTable;
        var curveDates = curve['curve-dates'];
        var fromDateStr = curveDates.split( ' - ')[0]; // get the from part
        fromDateStr = fromDateStr.split(' ')[0];  // strip off time field
        var toDateStr = curveDates.split( ' - ')[1]; // get the to part
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
        var validTime = validTimeOptionsMap[validTimeStr][0];
        var forecastLength = curve['forecast-length'];
        // axisKey is used to determine which axis a curve should use.
        // This axisMap object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisMap value, which is the axisKey.
        var axisKey = variableStr + ":" + statisticSelect;
        curves[curveIndex].axisKey = axisKey; // stash the axisKey to use it later for axis options
        var d = [];
        if (diffFrom == null) {
            // this is a database driven curve, not a difference curve
            var statement = "select  -m0.mb10*10 as avVal, " +
                "count(distinct unix_timestamp(m0.date)+3600*m0.hour) as N_times, " +
                "min(unix_timestamp(m0.date)+3600*m0.hour) as min_secs, " +
                "max(unix_timestamp(m0.date)+3600*m0.hour) as max_secs, " +
                "{{statistic}} " +
                "from {{model}} as m0 " +
                "where 1=1 " +
                "{{validTime}} " +
                "and m0.fcst_len = {{forecastLength}} " +
                "and m0.mb10 >= {{top}}/10. " +
                "and m0.mb10 <= {{bottom}}/10. " +
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
            statement = statement.replace('{{validTime}}', validTime);
            statement = statement.replace('{{forecastLength}}', forecastLength);
            dataRequests[curve.label] = statement;
            var queryResult;
            try {
                queryResult = matsDataUtils.queryProfileDB(sumPool, statement, validTimeStr, statisticSelect, label);
                d = queryResult.data;
            } catch (e) {
                e.message = "Error in queryDB: " + e.message + " for statement: " + statement;
                throw new Error(e.message);
            }
            if (queryResult.error !== undefined && queryResult.error !== "") {
                error += "Error from verification query: <br>" + queryResult.error + "<br> query: <br>" + statement + "<br>";
                throw (new Error(error));
            }
            if (d[0] === undefined) {
                throw new error("no data returned for curve " + curves[curveIndex].label);
            }
        } else {
            // this is a difference curve
            const diffResult = matsDataUtils.getDataForProfileDiffCurve({dataset:dataset, diffFrom:diffFrom});
            d = diffResult.dataset;
        }
        // get the x min and max
        for (var di = 0; di < d.length; di++) {
            xmax = xmax > d[di][0] ? xmax : d[di][0];
            xmin = xmin < d[di][0] ? xmin : d[di][0];
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

    // match the data by subseconds
    // build an array of sub_second arrays
    // data is [stat,avVal,[sub_values],[sub_secs]]
    if (matching) {
        var subSecs = new Set();
        for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
            var data = dataset[curveIndex].data;
            for (var di = 0; di < data.length; di++) { // every pressure level
                var sub_secs = data[di][4];
                for (var sec of sub_secs) {
                        subSecs.add(sec);
                }
            }
        }
        var subSecIntersection = Array.from(subSecs);
    }

    // calculate stats for each dataset matching to subsec_intersection if matching is specified
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        data = dataset[curveIndex].data;
        const label = dataset[curveIndex].label;
        for (di = 0; di < data.length; di++) { // every pressure level
            sub_secs = data[di][4];
            var subValues = data[di][3];
            var errorResult = {};
            if (matching) {
                var newSubValues = [];
                for (var subSecIntersectionIndex = 0; subSecIntersectionIndex < subSecIntersection.length; subSecIntersectionIndex++) {
                    var secsIndex = sub_secs.indexOf(subSecIntersection[subSecIntersectionIndex]);
                    var newVal = subValues[secsIndex];
                    if (newVal === undefined || newVal == 0) {
                        console.log ("found undefined at level: " + di + " curveIndex:" + curveIndex + " and secsIndex:" + subSecIntersection[subSecIntersectionIndex] + " subSecIntersectionIndex:" + subSecIntersectionIndex );
                    } else {
                        newSubValues.push(newVal);
                    }
                }
                data[di][3] = newSubValues;
                data[di][4] = subSecIntersection;
            }
            errorResult = matsDataUtils.get_err(data[di][3], data[di][4]);
            // already have [stat,pl,subval,subsec]
            // want - [stat,pl,subval,{subsec,std_betsy,d_mean,n_good,lag1},tooltiptext

            // stde_betsy is standard error with auto correlation - errorbars indicate +/- 2 (actually 1.96) standard errors from the mean
            // errorbar values are stored in the dataseries element position 2 i.e. data[di][2] for plotting by flot error bar extension
            data[di][2] = errorResult.stde_betsy * 1.96;
            data[di][5] = {
                d_mean: errorResult.d_mean,
                sd: errorResult.sd,
                n_good: errorResult.n_good,
                lag1: errorResult.lag1,
                stde: errorResult.stde_betsy
            };
            // this is the tooltip, it is the last element of each dataseries element
            data[di][6] = label +
                "<br>" + -data[di][1] + "mb" +
                "<br> " + statisticSelect + ":" + (data[di][0] === null ? null : data[di][0].toPrecision(4)) +
                "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>  n: " + errorResult.n_good +
                "<br>  lag1: " + (errorResult.lag1 === null? null : errorResult.lag1.toPrecision(4)) +
                "<br>  stde: " + errorResult.stde_betsy  +
                "<br>  errorbars: " + Number((data[di][0]) - (errorResult.stde_betsy * 1.96)).toPrecision(4) + " to " + Number((data[di][0]) + (errorResult.stde_betsy * 1.96)).toPrecision(4);
        }
        var values = [];
        var levels = [];
        for (var li = 0; li < data.length; li++) {
            values.push(data[li][0]);
            levels.push(data[li][1] * -1);  // inverted data for graphing - remember?
        }
        // get the overall stats for the text output
        const stats = matsDataUtils.get_err(values.reverse(),levels.reverse()); // have to reverse because of data inversion
        const minx = Math.min.apply(null,values);
        const maxx = Math.max.apply(null,values);
        stats.minx = minx;
        stats.maxx = maxx;
        dataset[curveIndex]['stats'] = stats;
    }

    // add black 0 line curve
//    dataset.push( {color:'black',points:{show:false},data:[[0,-1000,"zero"],[0,-100,"zero"]]});
    const resultOptions = matsDataUtils.generateProfilePlotOptions( dataset, curves, axisMap );
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
