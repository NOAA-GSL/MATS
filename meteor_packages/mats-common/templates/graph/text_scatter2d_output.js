import {matsCollections, matsCurveUtils, matsPlotUtils, matsTypes} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';
/*
Referring to the Session variable plotResultKey here causes the html template to get re-rendered with the current graph data
(which is in the Results collection).
 */

var times = [];
const getDataForTime = function (data, time) {
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

Template.textScatter2dOutput.helpers({
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
        var text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(), this);
        return text;
    },
    headers: function (curve) {
        var bFitLabel = "best fit";
        if (Session.get("plotResultKey") !== undefined) {
            bFitLabel = "best fit";
        }
        var str = "<th>" + curve.label + " x axis</th>" +
            "<th>" + curve.label + " y axis </th>" +
            "<th>" + bFitLabel + "</th>";
        return str;
    },
    points: function (curve, rowIndex) {
        var plotResultData = matsCurveUtils.getPlotResultData();
        var line = '';
        for (var i = 0; i < plotResultData.length; i++) {
            if (plotResultData[i].label == curve.label) {
                line += "<td>" + Number(plotResultData[i].data[rowIndex][0]).toPrecision(4) + "</td> <td>" + Number(plotResultData[i].data[rowIndex][1]).toPrecision(4) + "</td>";
            }
            if (plotResultData[i].label && plotResultData[i].label.search(curve.label + '-best fit') > -1 && line.slice(4, 4 + Number(plotResultData[i].data[rowIndex][0]).toPrecision(4).length) == Number(plotResultData[i].data[rowIndex][0]).toPrecision(4)) {
                line += "</td> <td>" + Number(plotResultData[i].data[rowIndex][1]).toPrecision(4) + "</td>"
            }
        }
        return line;
    }
});

Template.textScatter2dOutput.events({
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
