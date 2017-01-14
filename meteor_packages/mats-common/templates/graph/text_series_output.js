import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common'; 
import { moment } from 'meteor/momentjs:moment';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsMathUtils } from 'meteor/randyp:mats-common';

var curveIndexes = [];
var times = [];

Template.textSeriesOutput.helpers({
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
        const plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined) {
            return [];
        }
        return Session.get('Curves');
    },
    curveLabel: function (curve) {
      return curve.label;
    },
    curveText: function () {
        this.regionName = this.region.split(' ')[0];  // regionName might be needed in getCurveText but only region is defined
        const text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(),this);
        return text;
    },
    dataRows: function() {
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

        /*
        Algorithm -
        - create a set of all the times in the data set
        - create a sorted array from that set to be used by the points routine
        - return the length of that array as the number of rows. (missing times should have been filled in by the backend data routine)
        - for each point find the valid data for each curve at that point. If it is missing at the time just treat it as missing.
         */
        const plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined) {
            return [];
        }
        if (matsCurveUtils.PlotResult.data === undefined || matsCurveUtils.PlotResult.length == 0) {
            return [];
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.timeSeries) {
            return [];
        }

        const curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }

        var timeSet = new Set();
        var di = 0;
        for (var i = 0; i < matsCurveUtils.PlotResult.data.length; i++) {
            for (di = 0; di < matsCurveUtils.PlotResult.data[i].data.length; di++) {
                matsCurveUtils.PlotResult.data[i] && matsCurveUtils.PlotResult.data[i].data[di] && timeSet.add(matsCurveUtils.PlotResult.data[i].data[di][0]);
            }
        }
        times = Array.from (timeSet);
        times.sort((a, b) => (a - b));

        // curveIndexes are used to index each curve of the dataset - they all start with 0
        curveIndexes = [];
        for (var curveIndex = 0; curveIndex < curves.length; curveIndex++) {
            curveIndexes.push(0);
        }
        return times;
    },
    points: function(time) {
        const plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined) {
            return [];
        }
        if (matsCurveUtils.PlotResult.data === undefined ||
            matsCurveUtils.PlotResult.length == 0) {
            return false;
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.timeSeries) {
            return false;
        }
        const curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }
        var line = "<td>" + moment.utc(Number(time)).format('YYYY-MM-DD:HH:mm') + "</td>";
        const settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
        if (settings === undefined) {
            return false;
        }
        const fillStr = settings.NullFillString;
        // have to keep a collection of curve indexes because a row does not necessarily have the same time for each curve entry.
        // We must only set data when the times match on a curve.
        // The technique is to find what the minimum time (minTime) for all the curves at this rowIndex is, and then add data for each curve that matches that time.
        // increment the data pointer (curveIndexes[curveIndex]) ONLY for each curve when its time matches the minTime.
        // The pointers are initialized in the dataRows helper.
        var pdata = fillStr;
        for (var curveIndex = 0; curveIndex < curves.length; curveIndex++) {
            pdata = fillStr;
            try {
                // if there isn't any data in this curve for this time, catch the exception, ignore it and use fillStr
                // otherwise save the data in the line
                // do NOT increment the data pointer unless there is a match (curveIndexes[curveIndex]++ comes after any Exception would be thrown)
                if (matsCurveUtils.PlotResult.data[curveIndex].data[curveIndexes[curveIndex]][0] == time) {
                    if (matsCurveUtils.PlotResult.data[curveIndex].data[curveIndexes[curveIndex]][1] !== null) {
                        pdata = Number(matsCurveUtils.PlotResult.data[curveIndex].data[curveIndexes[curveIndex]][1]).toPrecision(4);
                    }
                    curveIndexes[curveIndex]++;
                }
            } catch (no_data_this_time_this_curve) {}
            // pdata is either real value or fillStr
            line += "<td>" + pdata + "</td>";
        }
        return line;
    },
    stats: function(curve) {
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
            return[];
        }
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return[];
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.timeSeries) {
            return[];
        }
        var cindex;
        for (cindex = 0; cindex < curves.length; cindex++) {
            if (curves[cindex].label == curve.label) {
                break;
            }
        }
        if (matsCurveUtils.PlotResult.data[cindex] === undefined) {
            return [];
        }
        const resultData = matsCurveUtils.PlotResult.data[cindex].data;
        var data = resultData.map(function(value){return value[1];});
        for (var i = 0; i < data.length; i++){
            if (data[i] == null){
                data.splice(i, 1);
                i--;
            }
        }

        const weimean = matsMathUtils.mean(data).toPrecision(4);
        const min =  Math.min.apply(Math, data).toPrecision(4);
        const max =  Math.max.apply(Math, data).toPrecision(4);
        const sd = Math.sqrt(matsMathUtils.variance(data)).toPrecision(4);
        const se = Math.sqrt(matsMathUtils.variance(data)/(data.length-1)).toPrecision(4);
        const line = "<td>" + curve.label + "</td>" +
            "<td>" + weimean + "</td>" +
            "<td>" + min + "</td>" +
            "<td>" + max + "</td>" +
            "<td>" + sd + "</td>" +
            "<td>" + se + "</td>";
        return line;
    }
});

Template.textSeriesOutput.events({
    'click .export': function() {
        var settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
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
        for (var c=0; c < curves.length;c++) {
            clabels += "," + curves[c].label;
        }
        data.push(clabels);
        const curveNums = matsCurveUtils.PlotResult.data.length - 1;
        const dataRows = _.range(matsCurveUtils.PlotResult.data[0].data.length);
        for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex ++) {
            var line = moment.utc(matsCurveUtils.PlotResult.data[0].data[rowIndex][0]).format('YYYY-MM-DD:HH');
            for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
                const pdata = matsCurveUtils.PlotResult.data[curveIndex].data[rowIndex][1] !== null?(Number(matsCurveUtils.PlotResult.data[curveIndex].data[rowIndex][1])).toPrecision(4):fillStr;
                line += "," + pdata;
            }
            data.push(line);
        }
        const csvString = data.join("%0A");
        const a         = document.createElement('a');
        a.href        = 'data:attachment/csv,' + csvString;
        a.target      = '_blank';
        a.download    = 'data.csv';
        document.body.appendChild(a);
        a.click();
    }
});
