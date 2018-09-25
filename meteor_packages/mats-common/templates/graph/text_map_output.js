import {matsCollections, matsCurveUtils, matsPlotUtils, matsTypes} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';
/*
Referring to the Session variable plotResultKey here causes the html template to get re-rendered with the current graph data
(which is in the Results collection).
 */

var times = [];

const getDataForTime = function (curveIndex, time) {
    try {
        var plotResultData = matsCurveUtils.getPlotResultData();
        for (var i = 0; i < plotResultData[curveIndex].data.length; i++) {
            if (Number(plotResultData[curveIndex].data[i][0]) === Number(time)) {
                return plotResultData[curveIndex].data[i][1] === null ? undefined : Number(plotResultData[curveIndex].data[i][1]);
            }
        }
        return undefined;
    } catch (e) {
        console.log("getDataForTime error: " + e);
        return undefined;
    }
};

Template.textMapOutput.helpers({
    plotName: function () {
        return Session.get('plotName');
    },
    curves: function () {
        Session.get('textLoaded');
        Session.get("plotResultKey"); // make sure we re-render when data changes
        if (matsCurveUtils.getPlotResultData() === null) {
            return [];
        } else {
            return Session.get('Curves');
        }
    },
    curveLabel: function (curve) {
        return curve.label;
    },
    curveText: function () {
        Session.get('textLoaded');
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
        Session.get('textLoaded');
        if (Session.get("plotResultKey") === undefined) {
            return [];
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.map) {
            return [];
        }
        const curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }
        var timeSet = new Set();
        var di = 0;
        var plotResultData = matsCurveUtils.getPlotResultData();
        for (var i = 0; i < plotResultData.length; i++) {
            for (di = 0; di < plotResultData[i].data.length; di++) {
                plotResultData[i] && plotResultData[i].data[di] && timeSet.add(plotResultData[i].data[di][0]);
            }
        }
        times = Array.from(timeSet);
        times.sort((a, b) => (a - b));
        return times;
    },

    points: function (time) {
        Session.get('textLoaded');
        if (Session.get("plotResultKey") === undefined) {
            return false;
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.map) {
            return false;
        }
        const curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }
        var line = "<td>" + time[0] + "</td><td>" + time[1] + "</td><td>" + moment.utc(time[2] * 1000).format('YYYY-MM-DD HH:mm') + "</td><td>" + moment.utc(time[3] * 1000).format('YYYY-MM-DD HH:mm') + "</td><td>" + time[4] + "</td>";

        return line;
    },

    stats: function (curve) {
        if (Session.get("plotResultKey") === undefined) {
            return [];
        }
        var plotResultData = matsCurveUtils.getPlotResultData();
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return [];
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.map) {
            return [];
        }
        var cindex;
        for (cindex = 0; cindex < curves.length; cindex++) {
            if (curves[cindex].label == curve.label) {
                break;
            }
        }
        if (plotResultData[cindex] === undefined) {
            return [];
        }
        const resultData = plotResultData[cindex].data;
        var data = resultData.map(function (value) {
            return value[1];
        });
        var times = resultData.map(function (value) {
            return value[0];
        });
        const stats = matsCurveUtils.get_err(data, times);
        const n = data.length;
        const line = "<td>" + curve.label + "</td>" +
            "<td>" + (stats.d_mean ? stats.d_mean.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.stde_betsy ? stats.stde_betsy.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.n_good).toString() + "</td>" +
            "<td>" + (stats.sd ? stats.sd.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.minVal ? stats.minVal.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.maxVal ? stats.maxVal.toPrecision(4) : "undefined").toString() + "</td>";
        return line;
    }
});

Template.textMapOutput.events({
    'click .export': function () {
        var settings = matsCollections.Settings.findOne({}, {fields: {NullFillString: 1}});
        if (settings === undefined) {
            return false;
        }
        if (Session.get("plotResultKey") === undefined) {
            return [];
        }
        var plotResultData = matsCurveUtils.getPlotResultData();
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
        const curveNums = plotResultData.length - 1;
        const dataRows = _.range(plotResultData[0].data.length);
        for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            var line = plotResultData[0].data[rowIndex][0];
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
