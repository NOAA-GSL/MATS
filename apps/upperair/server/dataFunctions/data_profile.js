import {matsCollections} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsDataUtils} from 'meteor/randyp:mats-common';
import {mysql} from 'meteor/pcel:mysql';
import {moment} from 'meteor/momentjs:moment';

dataProfile = function (plotParams, plotFunction) {
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
    for (var curveIndex = 0; curveIndex < curvesLength; curveIndex++) {
        var dataFoundForCurve = true;
        // Determine all the plot params for this curve
        var curve = curves[curveIndex];
        var diffFrom = curve.diffFrom; // [minuend, subtrahend]
        var label = curve['label'];
        var model = matsCollections.CurveParams.findOne({name: 'data-source'}).optionsMap[curve['data-source']][0];
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
        var validTimeStr = curve['valid-time'];
        var validTimeOptionsMap = matsCollections.CurveParams.findOne({name: 'valid-time'}, {optionsMap: 1})['optionsMap'];
        var validTimeClause = validTimeOptionsMap[validTimeStr][0];
        var forecastLength = curve['forecast-length'];
        // axisKey is used to determine which axis a curve should use.
        // This axisKeySet object is used like a set and if a curve has the same
        // variable and statistic (axisKey) it will use the same axis,
        // The axis number is assigned to the axisKeySet value, which is the axisKey.
        //CHANGED TO PLOT ON THE SAME AXIS IF SAME STATISTIC, REGARDLESS OF THRESHOLD
        var axisKey = varUnits;
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
                queryResult = matsDataUtils.queryProfileDB(sumPool, statement);
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
        } else {
            // this is a difference curve
            var diffResult = matsDataUtils.getDataForProfileDiffCurve({
                    dataset: dataset,
                    diffFrom: diffFrom
                });
            d = diffResult.dataset;
        }  // end difference curve
        // get the x min and max
        for (var di = 0; di < d.length; di++) {
            xmax = (xmax > d[di][0] || d[di][0] === null) ? xmax : d[di][0];
            xmin = (xmin < d[di][0] || d[di][0] === null) ? xmin : d[di][0];
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
    if (matching) {

        var subSecs = [];
        var subLevs = [];
        var levelGroups = [];
        var currLevel;

        for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
            levelGroups[curveIndex] = [];
            subSecs[curveIndex] = {};
            subLevs[curveIndex] = {};
            var data = dataset[curveIndex].data;
            for (di = 0; di < data.length; di++) { // every level
                currLevel = data[di][1];
                subSecs[curveIndex][currLevel * -1] = data[di][4]; //store raw secs and levels for each level
                subLevs[curveIndex][currLevel * -1] = data[di][5];
                levelGroups[curveIndex].push(currLevel);
            }
        }
        var matchingLevels = _.intersection.apply(_, levelGroups);  //make sure we're only comparing similar levels
        var subIntersections = [];
        for (var fi = 0; fi < matchingLevels.length; fi++) { // every fhr
            currLevel = matchingLevels[fi];
            subIntersections[currLevel * -1] = [];
            var currSubIntersections = [];
            for (var si = 0; si < subSecs[0][currLevel * -1].length; si++) {
                currSubIntersections.push([subSecs[0][currLevel * -1][si], subLevs[0][currLevel * -1][si]]);   //fill current intersection array with sec-lev pairs from the first curve
            }
            for (curveIndex = 1; curveIndex < curvesLength; curveIndex++) { // every curve
                var tempSubIntersections = [];
                for (si = 0; si < subSecs[curveIndex][currLevel * -1].length; si++) { // every sub value
                    var tempPair = [subSecs[curveIndex][currLevel * -1][si], subLevs[curveIndex][currLevel * -1][si]];    //create an individual sec-lev pair for each index in the subsec and sublev arrays
                    if (matsDataUtils.arrayContainsSubArray(currSubIntersections, tempPair)) {   //see if the individual sec-lev pair matches a pair from the current intersection array
                        tempSubIntersections.push(tempPair);    //store matching pairs
                    }
                }
                currSubIntersections = tempSubIntersections;    //replace current intersection array with array of only pairs that matched from this loop through.
            }
            subIntersections[currLevel * -1] = currSubIntersections;   //store final current intersection array for each level
        }

    }


    // calculate stats for each dataset matching to subSecIntersection if matching is specified
    var errorMax = Number.MIN_VALUE;
    var maxx;
    var minx;
    // var axisLimitReprocessed = {};
    for (curveIndex = 0; curveIndex < curvesLength; curveIndex++) { // every curve
        //axisLimitReprocessed[curves[curveIndex].axisKey] = axisLimitReprocessed[curves[curveIndex].axisKey] !== undefined;
        diffFrom = curves[curveIndex].diffFrom;
        data = dataset[curveIndex].data;
        const dataLength = data.length;
        const label = dataset[curveIndex].label;

        di = 0;
        var values = [];
        var levels = [];
        var means = [];

        while (di < data.length) {
            if ((matching && curvesLength > 1) && matchingLevels.indexOf(data[di][1]) === -1) {
                dataset[curveIndex].data.splice(di, 1);
                continue;   // not a matching level - skip it
            }

            var sub_secs = data[di][4];
            var sub_levs = data[di][5];
            var subValues = data[di][3];
            var errorResult = {};

            if (matching && curvesLength > 1 && sub_secs.length > 0 && sub_levs.length > 0) {
                currLevel = data[di][1];
                var newSubValues = [];
                var newSubSecs = [];
                var newSubLevs = [];

                for (si = 0; si < sub_secs.length; si++) {  //loop over all sub values for this fhr
                    tempPair = [sub_secs[si],sub_levs[si]]; //create sec-lev pair for each sub value
                    if (matsDataUtils.arrayContainsSubArray(subIntersections[currLevel * -1],tempPair)) {  //store the sub-value only if its sec-lev pair is in the matching array for this fhr
                        var newVal = subValues[si];
                        var newSec = sub_secs[si];
                        var newLev = sub_levs[si];
                        if (newVal === undefined || newVal == 0) {
                            //console.log ("found undefined at level: " + di + " curveIndex:" + curveIndex + " and secsIndex:" + subSecIntersection[subSecIntersectionIndex] + " subSecIntersectionIndex:" + subSecIntersectionIndex );
                        } else {
                            newSubValues.push(newVal);
                            newSubSecs.push(newSec);
                            newSubLevs.push(newLev);
                        }
                    }
                }

                data[di][3] = newSubValues;
                data[di][4] = newSubSecs;
                data[di][5] = newSubLevs;
            }

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
            // data[di][1] = errorResult.d_mean;
            values.push(data[di][0]);
            levels.push(data[di][1] * -1);  // inverted data for graphing - remember?
            means.push(errorResult.d_mean);

            // already have [stat,pl,subval,subsec]
            // want - [stat,pl,subval,{subsec,std_betsy,d_mean,n_good,lag1},tooltiptext
            // stde_betsy is standard error with auto correlation - errorbars indicate +/- 2 (actually 1.96) standard errors from the mean
            // errorbar values are stored in the dataseries element position 2 i.e. data[di][2] for plotting by flot error bar extension
            // unmatched curves get no error bars
            const errorBar = errorResult.stde_betsy * 1.96;
            errorMax = errorMax > errorBar ? errorMax : errorBar;
            if (matching) {
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
                "<br>" + -data[di][1] + "mb" +
                "<br> " + statisticSelect + ":" + (data[di][0] === null ? null : data[di][0].toPrecision(4)) +
                "<br>  sd: " + (errorResult.sd === null ? null : errorResult.sd.toPrecision(4)) +
                "<br>  mean: " + (errorResult.d_mean === null ? null : errorResult.d_mean.toPrecision(4)) +
                "<br>  n: " + errorResult.n_good +
                "<br>  lag1: " + (errorResult.lag1 === null ? null : errorResult.lag1.toPrecision(4)) +
                "<br>  stde: " + errorResult.stde_betsy +
                "<br>  errorbars: " + Number((data[di][0]) - (errorResult.stde_betsy * 1.96)).toPrecision(4) + " to " + Number((data[di][0]) + (errorResult.stde_betsy * 1.96)).toPrecision(4);

            di++;
        }

        // get the overall stats for the text output - this uses the means not the stats. refer to
        const stats = matsDataUtils.get_err(values.reverse(), levels.reverse()); // have to reverse because of data inversion
        const filteredMeans = means.filter(x => x);
        minx = Math.min.apply(null, filteredMeans);
        maxx = Math.max.apply(null, filteredMeans);
        stats.minx = minx;
        stats.maxx = maxx;
        dataset[curveIndex]['stats'] = stats;

        //recalculate axis options after QC and matching
        // axisMap[curves[curveIndex].axisKey]['xmax'] = (axisMap[curves[curveIndex].axisKey]['xmax'] < maxx || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? maxx : axisMap[curves[curveIndex].axisKey]['xmax'];
        // axisMap[curves[curveIndex].axisKey]['xmin'] = (axisMap[curves[curveIndex].axisKey]['xmin'] > minx || !axisLimitReprocessed[curves[curveIndex].axisKey]) ? minx : axisMap[curves[curveIndex].axisKey]['xmin'];
    }

    // add black 0 line curve
    dataset.push({
        "yaxis": 1,
        "label": "zero",
        "color": "rgb(0,0,0)",
        "annotation": "",
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
    const resultOptions = matsDataUtils.generateProfilePlotOptions(dataset, curves, axisMap, errorMax);
    const result = {
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
