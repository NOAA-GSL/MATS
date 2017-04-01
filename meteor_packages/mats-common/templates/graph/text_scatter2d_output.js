import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';
import { matsPlotUtils } from 'meteor/randyp:mats-common';

Template.textScatter2dOutput.helpers({
    plotName: function() {
        return Session.get('plotName');
    },
    curves: function () {
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
        var plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined) {
            return [];
        }
        return Session.get('Curves');
    },
    curveText: function () {
        if (this.regionName) {
            this.regionName = this.region.split(' ')[0];
        }  // regionName might be needed in getCurveText but only region is defined
        var text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(),this);
        return text;
    },
    headers: function(curve) {
        var bFitLabel = "best fit";
        var plotResultsUpDated = Session.get('PlotResultsUpDated');

        if (plotResultsUpDated !== undefined) {
            if (matsCurveUtils.PlotResult.length >1) {
                bFitLabel = "best fit";
            }
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
        var plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined) {
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
        if (matsCurveUtils.PlotResult.data === undefined) {
            return [];
        }
        var dataRows = _.range(matsCurveUtils.PlotResult.data[i].data.length);
        return dataRows;
    },
    points: function(curve, rowIndex) {
        if (matsCurveUtils.PlotResult.data === undefined) {
            return "";
        }
        var line = '';
        for (var i = 0; i < matsCurveUtils.PlotResult.data.length; i++) {
            if (matsCurveUtils.PlotResult.data[i].label == curve.label) {
                line += "<td>" + Number(matsCurveUtils.PlotResult.data[i].data[rowIndex][0]).toPrecision(4) + "</td> <td>" + Number(matsCurveUtils.PlotResult.data[i].data[rowIndex][1]).toPrecision(4) + "</td>";
            }
            if (matsCurveUtils.PlotResult.data[i].label && matsCurveUtils.PlotResult.data[i].label.search(curve.label + '-best fit') > -1 && line.slice(4, 4 + Number(matsCurveUtils.PlotResult.data[i].data[rowIndex][0]).toPrecision(4).length) == Number(matsCurveUtils.PlotResult.data[i].data[rowIndex][0]).toPrecision(4)) {
                line += "</td> <td>" + Number(matsCurveUtils.PlotResult.data[i].data[rowIndex][1]).toPrecision(4) + "</td>"
            }
        }
        return line;
    }
});

Template.textScatter2dOutput.events({
    'click .export': function() {
        var settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
        if (settings === undefined) {
            return false;
        }
        var fillStr = settings.NullFillString;
        var data = [];
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return data;
        }
        var clabels = 'time';
        for (var c=0; c < curves.length;c++) {
            clabels += "," + curves[c].label;
        }
        data.push(clabels);
        var curveNums = matsCurveUtils.PlotResult.data.length - 1;
        var dataRows = _.range(matsCurveUtils.PlotResult.data[0].data.length);
        for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex ++) {
            var line = moment.utc(Number(matsCurveUtils.PlotResult.data[0].data[rowIndex][0])).format('YYYY-MM-DD:HH');
            for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
                var pdata = matsCurveUtils.PlotResult.data[curveIndex].data[rowIndex][1] !== null?(Number(matsCurveUtils.PlotResult.data[curveIndex].data[rowIndex][1])).toPrecision(4):fillStr;
                line += "," + pdata;
            }
            data.push(line);
        }
        var csvString = data.join("%0A");
        var a         = document.createElement('a');
        a.href        = 'data:attachment/csv,' + csvString;
        a.target      = '_blank';
        a.download    = 'data.csv';
        document.body.appendChild(a);
        a.click();
    }
});
