import {matsCollections, matsCurveUtils, matsPlotUtils, matsTypes} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';
/*
Referring to the Session variable plotResultKey here causes the html template to get re-rendered with the current graph data
(which is in the Results collection).
 */

var times = [];
const getDataForVt = function (data, time) {
    for (var i = 0; i < data.length; i++) {
        if (data[i][0] == Number(time)) {
            return data[i] === null ? undefined : data[i];
        }
    }
    return undefined;
};

const getDataForCurve = function (curve) {
    if (Session.get("plotResultKey") == undefined) {
        return undefined;
    }
    for (var dataIndex = 0; dataIndex < matsCurveUtils.getPlotResultData().length; dataIndex++) {
        if (matsCurveUtils.getPlotResultData()[dataIndex].label === curve.label) {
            return matsCurveUtils.getPlotResultData()[dataIndex];
        }
    }
    return undefined;
};

Template.textValidTimeOutput.helpers({
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
        const text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(), this);
        return text;
    },
    points: function (vt) {
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.validtime) {
            return false;
        }
        var curve = Template.parentData();
        var line = "<td>" + Number(vt) + "</td>";
        const settings = matsCollections.Settings.findOne({}, {fields: {NullFillString: 1}});
        if (settings === undefined) {
            return false;
        }
        const fillStr = settings.NullFillString;
        var pdata = fillStr;
        var perror = fillStr;
        var mean = fillStr;
        var lag1 = fillStr;
        var n = fillStr;
        var stddev = fillStr;
        try {
            // see if I have a valid data object for this dataIndex and this vt....
            const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
            const dataPointVal = getDataForVt(curveData, vt);
            if (dataPointVal !== undefined) {
                pdata = dataPointVal[5].raw_stat && dataPointVal[5].raw_stat.toPrecision(4);
                mean = dataPointVal[1] && dataPointVal[1].toPrecision(4);
                perror = dataPointVal[5].stde_betsy && dataPointVal[5].stde_betsy.toPrecision(4);
                stddev = dataPointVal[5].sd && dataPointVal[5].sd.toPrecision(4);
                lag1 = dataPointVal[5].lag1 && dataPointVal[5].lag1.toPrecision(4);
                n = dataPointVal[5].n_good;
            }
        } catch (problem) {
            console.log("Problem in deriving curve text: " + problem);
        }
        // pdata is now either data value or fillStr
        line += "<td>" + pdata + "</td>" + "<td>" + mean + "</td>" + "<td>" + perror + "</td>" + "<td>" + stddev + "</td>" + "<td>" + lag1 + "</td>" + "<td>" + n + "</td>";
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.validtime) {
            return [];
        }
        var cindex;
        for (cindex = 0; cindex < curves.length; cindex++) {
            if (curves[cindex].label == curve.label) {
                break;
            }
        }
        if (matsCurveUtils.getPlotResultData()[cindex] === undefined) {
            return [];
        }
        const resultData = matsCurveUtils.getPlotResultData()[cindex].data;
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
    },
    vts: function (curve) {
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.validtime) {
            return [];
        }
        const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
        if (curveData === undefined || curveData.length == 0) {
            return [];
        }

        var vtSet = new Set();
        var di;
        for (di = 0; di < curveData.length; di++) {
            curveData[di] && vtSet.add(curveData[di][0]);
        }
        var vts = Array.from(vtSet);
        vts.sort((a, b) => (a - b));
        return vts;
    }
});

Template.textValidTimeOutput.events({
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
        const curveNums = matsCurveUtils.getPlotResultData().length - 1;
        const dataRows = _.range(matsCurveUtils.getPlotResultData()[0].data.length);
        for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            var line = matsCurveUtils.getPlotResultData()[0].data[rowIndex][0];
            for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
                const pdata = matsCurveUtils.getPlotResultData()[curveIndex].data[rowIndex][1] !== null ? (Number(matsCurveUtils.getPlotResultData()[curveIndex].data[rowIndex][1])).toPrecision(4) : fillStr;
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
