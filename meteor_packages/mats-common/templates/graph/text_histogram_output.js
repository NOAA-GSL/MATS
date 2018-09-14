import {matsCollections, matsCurveUtils, matsPlotUtils, matsTypes} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';
/*
Referring to the Session variable plotResultKey here causes the html template to get re-rendered with the current graph data
(which is in the Results collection).
 */

var bins = [];
const getDataForBin = function (data, bin) {
    for (var i = 0; i < data.length; i++) {
        if (data[i][6].binLabel == bin) {
            return data[i] === null ? undefined : data[i];
        }
    }
    return undefined;
};

const getDataForCurve = function (curve) {
    if (Session.get("plotResultKey") == undefined) {
        return undefined;
    }
    var plotResultData = matsCollections.Results.findOne({key: Session.get("plotResultKey")}).result.data;
    for (var dataIndex = 0; dataIndex < plotResultData.length; dataIndex++) {
        if (plotResultData[dataIndex].label === curve.label) {
            return plotResultData[dataIndex];
        }
    }
    return undefined;
};

Template.textHistogramOutput.helpers({
    plotName: function () {
        return Session.get('plotName');
    },
    bins: function (curve) {
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.histogram) {
            return [];
        }
        const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
        if (curveData === undefined || curveData.length == 0) {
            return [];
        }

        var bins = [];
        var di;
        for (di = 0; di < curveData.length; di++) {
            curveData[di] && bins.push(curveData[di][6].binLabel);
        }
        return bins;
    },
    curves: function () {
        Session.get("plotResultKey"); // make sure we re-render when data changes
        return Session.get('Curves');
    },
    curveLabel: function (curve) {
        return curve.label;
    },
    curveText: function () {
        const text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(), this);
        return text;
    },
    dataRows: function () {
        /*
        Algorithm -
        - create a set of all the times in the data set
        - create a sorted array from that set to be used by the points routine
        - return the length of that array as the number of rows. (missing times should have been filled in by the backend data routine)
        - for each point find the valid data for each curve at that point. If it is missing at the time just treat it as missing.
         */
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.histogram) {
            return [];
        }
        if (Session.get("plotResultKey") === undefined) {
            return [];
        }
        const curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }

        var binSet = new Set();
        var di = 0;
        var resultData = matsCollections.Results.findOne({key: Session.get("plotResultKey")}).result.data;

        for (var i = 0; i < resultData.length; i++) {
            for (di = 0; di < resultData[i].data.length; di++) {
                resultData[i] && resultData[i].data[di] && binSet.add(resultData[i].data[di][0]);
            }
        }
        bins = Array.from(binSet);
        bins.sort((a, b) => (a - b));
        return bins;
    },
    points: function (bin) {
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.histogram) {
            return false;
        }
        var curve = Template.parentData();
        var line = "<td>" + bin + "</td>";
        const settings = matsCollections.Settings.findOne({}, {fields: {NullFillString: 1}});
        if (settings === undefined) {
            return false;
        }
        const fillStr = settings.NullFillString;
        var n = fillStr;
        var lbound = fillStr;
        var ubound = fillStr;
        var mean = fillStr;
        var stddev = fillStr;
        try {
            // see if I have a valid data object for this dataIndex and this bin....
            const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
            const dataPointVal = getDataForBin(curveData, bin);
            if (dataPointVal !== undefined) {
                n = dataPointVal[1].toString();
                lbound = dataPointVal[6].binLowBound && dataPointVal[6].binLowBound.toPrecision(4);
                ubound = dataPointVal[6].binUpBound && dataPointVal[6].binUpBound.toPrecision(4);
                mean = dataPointVal[6].bin_mean && dataPointVal[6].bin_mean.toPrecision(4);
                stddev = dataPointVal[6].bin_sd && dataPointVal[6].bin_sd.toPrecision(4);
            }
        } catch (problem) {
            console.log("Problem in deriving curve text: " + problem);
        }
        // pdata is now either data value or fillStr
        line += "<td>" + n + "</td>" + "<td>" + lbound + "</td>" + "<td>" + ubound + "</td>" + "<td>" + mean + "</td>" + "<td>" + stddev + "</td>";
        return line;
    },
    stats: function (curve) {
        if (Session.get("plotResultKey") === undefined) {
            return [];
        }
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return [];
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.histogram) {
            return [];
        }
        var cindex;
        for (cindex = 0; cindex < curves.length; cindex++) {
            if (curves[cindex].label == curve.label) {
                break;
            }
        }
        var plotResultData = matsCollections.Results.findOne({key: Session.get("plotResultKey")}).result.data;
        if (plotResultData[cindex] === undefined) {
            return [];
        }
        const resultData = plotResultData[cindex].data;
        const stats = resultData[0][7];

        const fillStr = settings.NullFillString;
        var glob_mean = fillStr;
        var glob_sd = fillStr;
        var glob_n = fillStr;
        var glob_min = fillStr;
        var glob_max = fillStr;

        try {
            glob_mean = (stats.glob_mean ? stats.glob_mean.toPrecision(4) : "undefined").toString();
            glob_sd = (stats.glob_sd ? stats.glob_sd.toPrecision(4) : "undefined").toString();
            glob_n = (stats.glob_n).toString();
            glob_min = ((stats.glob_min || stats.glob_min === 0) ? stats.glob_min.toPrecision(4) : "undefined").toString();
            glob_max = (stats.glob_max ? stats.glob_max.toPrecision(4) : "undefined").toString();
        } catch (problem) {
            console.log("Problem in deriving global stats text: " + problem);
        }

        const line = "<td>" + curve.label + "</td>" +
            "<td>" + glob_mean + "</td>" +
            "<td>" + glob_sd + "</td>" +
            "<td>" + glob_n + "</td>" +
            "<td>" + glob_min + "</td>" +
            "<td>" + glob_max + "</td>";

        return line;
    }
});

Template.textHistogramOutput.events({
    'click .export': function () {
        var settings = matsCollections.Settings.findOne({}, {fields: {NullFillString: 1}});
        if (settings === undefined) {
            return false;
        }
        const curves = Session.get('Curves');
        const fillStr = settings.NullFillString;
        var data = [];
        if (curves === undefined || curves.length == 0) {
            return data;
        }
        var clabels = 'time';
        for (var c = 0; c < curves.length; c++) {
            clabels += "," + curves[c].label;
        }
        data.push(clabels);
        var plotResultData = matsCollections.Results.findOne({key: Session.get("plotResultKey")}).result.data;
        const curveNums = plotResultData.length - 1;
        const dataRows = _.range(plotResultData[0].data.length);
        for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            var line = moment.utc(plotResultData[0].data[rowIndex][0]).format('YYYY-MM-DD HH:mm');
            for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
                const pdata = plotResultData[curveIndex].data[rowIndex][1] !== null ? (Number(plotResultData[curveIndex].data[rowIndex][1])).toPrecision(4) : fillStr;
                line += "," + pdata;
            }
            data.push(line);
        }
        const csvString = data.join("%0A");
        const a = document.createElement('a');
        a.href = 'data:attachment/csv,' + csvString;
        a.target = '_blank';
        a.download = 'data.csv';
        document.body.appendChild(a);
        a.click();
    }
});
