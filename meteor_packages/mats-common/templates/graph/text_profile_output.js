import {matsCollections, matsCurveUtils, matsPlotUtils, matsTypes} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';
/*
Referring to the Session variable plotResultKey here causes the html template to get re-rendered with the current graph data
(which is in the Results collection).
 */

const getDataForLevel = function (data, level) {
    for (var i = 0; i < data.length; i++) {
        if (data[i][1] == level) {
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

Template.textProfileOutput.helpers({
    mean: function (curve) {
        try {
            return getDataForCurve(curve).stats.d_mean.toPrecision(4);
        } catch (e) {
            return NaN;
        }
    },
    numberOf: function (curve) {
        try {
            return getDataForCurve(curve).stats.n_good;
        } catch (e) {
            return NaN;
        }
    },
    stderr: function (curve) {
        try {
            return getDataForCurve(curve).stats.stde_betsy.toPrecision(4);
        } catch (e) {
            return NaN;
        }
    },
    sd: function (curve) {
        try {
            return getDataForCurve(curve).stats.sd.toPrecision(4);
        } catch (e) {
            return NaN;
        }
    },
    lag1: function (curve) {
        try {
            return getDataForCurve(curve).stats.lag1.toPrecision(4);
        } catch (e) {
            return NaN;
        }
    },
    min: function (curve) {
        try {
            return getDataForCurve(curve).stats.minx.toPrecision(4);
        } catch (e) {
            return NaN;
        }
    },
    max: function (curve) {
        try {
            return getDataForCurve(curve).stats.maxx.toPrecision(4);
        } catch (e) {
            return NaN;
        }
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
        const text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(), this);
        return text;
    },
    pressureLevels: function (curve) {
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.profile) {
            return [];
        }
        const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
        if (curveData === undefined || curveData.length == 0) {
            return [];
        }

        var levelSet = new Set();
        var di;
        for (di = 0; di < curveData.length; di++) {
            curveData[di] && levelSet.add(curveData[di][1]);
        }
        var levels = Array.from(levelSet);
        levels.sort((a, b) => (b - a));
        return levels;
    },
    points: function (level) {
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.profile) {
            return false;
        }
        var curve = Template.parentData();
        var line = "<td>" + Math.abs(level) + "</td>";
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
            // see if I have a valid data object for this dataIndex and this level....
            const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
            const dataPointVal = getDataForLevel(curveData, level);
            if (dataPointVal !== undefined) {
                pdata = dataPointVal[5].raw_stat && dataPointVal[5].raw_stat.toPrecision(4);
                mean = dataPointVal[0] && dataPointVal[0].toPrecision(4);
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
    }
});

Template.textProfileOutput.events({
    'click .export': function () {
        const settings = matsCollections.Settings.findOne({}, {fields: {NullFillString: 1}});
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
            var line = Number(matsCurveUtils.getPlotResultData()[0].data[rowIndex][1]);
            for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
                const pdata = matsCurveUtils.getPlotResultData()[curveIndex].data[rowIndex][0] !== null ? (Number(matsCurveUtils.getPlotResultData()[curveIndex].data[rowIndex][0])).toPrecision(4) : fillStr;
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
