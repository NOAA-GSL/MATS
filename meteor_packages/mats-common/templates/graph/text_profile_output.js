import { matsCollections } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';
import { matsPlotUtils } from 'meteor/randyp:mats-common';

Template.textProfileOutput.helpers({
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
        this.regionName = this.region.split(' ')[0];  // regionName might be needed in getCurveText but only region is defined
        var text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(),this);
        return text;
    },
    curveLabel: function (curve) {
        return curve.label;
    },
    pressureLevels: function() {
        /*
         This (plotResultsUpDated) is very important.
         The page is rendered when the graph page comes up, but the data from the data processing callback
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

        if (matsCurveUtils.PlotResult.data === undefined) {
            return [];
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.profile) {
            return [];
        }

        var maxl = 0;
        var maxi =0;
        for (var i = 0; i < matsCurveUtils.PlotResult.data.length; i++) {
            if (matsCurveUtils.PlotResult.data[i].length > maxl) {
                maxl = matsCurveUtils.PlotResult.data[i].length;
                maxi = i;
            }
        }
        var levelIndexes = _.range(matsCurveUtils.PlotResult.data[maxi].data.length);
        return levelIndexes;

    },
    points: function(levelIndex) {
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
        if (matsCurveUtils.PlotResult.data === undefined || matsCurveUtils.PlotResult.length == 0) {
            return;
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.profile) {
            return;
        }

        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return;
        }
        var maxl = 0;
        var maxi =0;
        for (var i = 0; i < matsCurveUtils.PlotResult.data.length; i++) {
            if (matsCurveUtils.PlotResult.data[i].length > maxl) {
                maxl = matsCurveUtils.PlotResult.data[i].length;
                maxi = i;
            }
        }
        // i is the one that has the most levels
        if (matsCurveUtils.PlotResult.data[maxi].data[levelIndex][1] === undefined) {
            return "";
        }
        var line = "<td>" + matsCurveUtils.PlotResult.data[maxi].data[levelIndex][1] + "</td>";
        var settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
        if (settings === undefined) {
            return false;
        }
        var fillStr = settings.NullFillString;
        var curveNums = curves.length;
        for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
            if (matsCurveUtils.PlotResult.data[curveIndex].data[levelIndex]) {
                var val = matsCurveUtils.PlotResult.data[curveIndex].data[levelIndex][1] !== undefined ? (Number(matsCurveUtils.PlotResult.data[curveIndex].data[levelIndex][0])).toPrecision(4) : fillStr;
                line += "<td>" + val + "</td>";
            }
        }
        return line;
    }
});

Template.textProfileOutput.events({
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
        //var dataSet = Session.get('dataset');
        var curveNums = matsCurveUtils.PlotResult.data.length;
        var dataRows = _.range(matsCurveUtils.PlotResult.data[0].data.length);
        for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex ++) {
            var line = moment.utc(Number(matsCurveUtils.PlotResult.data[0].data[rowIndex][0])).format('YYYY-MM-DD:HH:mm');
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
