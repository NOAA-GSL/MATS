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
        Session.get('textLoaded');
        var text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(), this);
        return text;
    },
    headers: function (curve) {
        Session.get('textLoaded');
        var bFitLabel = "best fit";
        if (Session.get("plotResultKey") !== undefined) {
            bFitLabel = "best fit";
        }
        var str = "<th>" + curve.label + " x axis</th>" +
            "<th>" + curve.label + " y axis </th>" +
            "<th>" + bFitLabel + "</th>";
        return str;
    },
    dataRows: function(curve) {
        /*
         This (plotResultsUpDated) is very important.
         The page is rendered whe the graph page comes up, but the data from the data processing callback
         in plotList.js or curveList.js may not have set the global variable
         PlotResult. The callback sets the variable then sets the session variable plotResultsUpDated.
         Referring to plotResultsUpDated here causes the html to get re-rendered with the current graph data
         (which is in the PlotResults global). This didn't used to be necessary because the plot data
         was contained in the session, but some unknown ddp behaviour having to do with the amount of plot data
         made that unworkable.
         */
        Session.get('textLoaded');
        var plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined || matsCurveUtils.getPlotResultData().length === 0) {
            return [];
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.scatter2d) {
            return [];
        }

        var curves = Session.get("Curves");
        for (var i = 0; i < curves.length; i++){
            if (curve.label === curves[i].label) {
                break;
            }
        }
        if (matsCurveUtils.getPlotResultData() === undefined || matsCurveUtils.getPlotResultData().length === 0) {
            return [];
        }
        var dataRows = _.range(matsCurveUtils.getPlotResultData()[i].data.length);
        return dataRows;
    },
    points: function(curve, rowIndex) {
        Session.get('textLoaded');
        if (matsCurveUtils.getPlotResultData() === undefined || matsCurveUtils.getPlotResultData().length === 0) {
            return "";
        }
        var line = '';
        var bestFitFound = false;
        for (var i = 0; i < matsCurveUtils.getPlotResultData().length; i++) {
            if (matsCurveUtils.getPlotResultData()[i].label == curve.label) {
                line = "<td>" + Number(matsCurveUtils.getPlotResultData()[i].data[rowIndex][0]).toPrecision(4) + "</td> <td>" + Number(matsCurveUtils.getPlotResultData()[i].data[rowIndex][1]).toPrecision(4) + "</td>";
            }
            if (matsCurveUtils.getPlotResultData()[i].label.search(curve.label + '-best fit') > -1) {  // make sure it is the best fit value for this curve
                // if there is a value use it else none
                if (line.slice(4, 4 + Number(matsCurveUtils.getPlotResultData()[i].data[rowIndex][0]).toPrecision(4).length) == Number(matsCurveUtils.getPlotResultData()[i].data[rowIndex][0]).toPrecision(4)) {
                    line += " <td>" + Number(matsCurveUtils.getPlotResultData()[1].data[i][1]).toPrecision(4) + "</td>";
                    bestFitFound = true;
                }
            }
        }
        if (bestFitFound === false) {
           line += "<td>none</td>";
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
