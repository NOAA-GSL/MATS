import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common'; 
import { moment } from 'meteor/momentjs:moment';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsMathUtils } from 'meteor/randyp:mats-common';

var curveIndexes;

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
        var plotResultsUpDated = Session.get('PlotResultsUpDated');
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
        var text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(),this);
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

        var plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined) {
            return [];
        }
        if (matsCurveUtils.PlotResult.data === undefined || matsCurveUtils.PlotResult.length == 0) {
            return [];
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.timeSeries) {
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
        var dataRows = _.range(matsCurveUtils.PlotResult.data[maxi].data.length);
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }
        var curveNums = curves.length;
        curveIndexes = [];
        for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
            curveIndexes.push(0);
        }
        return dataRows;
    },
    points: function(rowIndex) {
        var plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined) {
            return [];
        }
        if (matsCurveUtils.PlotResult.data === undefined ||
            matsCurveUtils.PlotResult.data[0] === undefined ||
            matsCurveUtils.PlotResult.data[0].data[rowIndex] === undefined ||
            matsCurveUtils.PlotResult.length == 0) {
            return false;
        }
                  
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.timeSeries) {
            return false;
        }
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }
        var time = matsCurveUtils.PlotResult.data[0].data[rowIndex][0];
        var line = "<td>" + moment.utc(Number(time)).format('YYYY-MM-DD:HH') + "</td>";
        var settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
        if (settings === undefined) {
            return false;
        }
        var fillStr = settings.NullFillString;
        var curveNums = curves.length;
        // have to keep a collection of curve indexes because a row does not necessarily have the same time for each curve entry.
        // We must only set data when the times match on a curve.
        // The technique is to find what the minimum time (minTime) for all the curves at this rowIndex is, and then add data for each curve that matches that time.
        // increment the data pointer (curveIndexes[curveIndex]) ONLY for each curve when its time matches the minTime.
        // The pointers are initialized in the dataRows helper.
        var curveIndex;
        var minTime = Number.MAX_VALUE;
        for (curveIndex = 0; curveIndex < curveNums; curveIndex++) {
            try {
                // if a time doesn't exist for a curve it will throw exception and won't mess up the minTime
                minTime = minTime < matsCurveUtils.PlotResult.data[curveIndex].data[curveIndexes[curveIndex]][0] ? minTime : matsCurveUtils.PlotResult.data[curveIndex].data[curveIndexes[curveIndex]][0];
            } catch (no_data_this_time_this_curve){}
        }
        var pdata = fillStr;
        for (curveIndex = 0; curveIndex < curveNums; curveIndex++) {
            pdata = fillStr;
            try {
                // if there isn't any data in this curve for this time, catch the exception, ignore it and use fillStr
                // otherwise save the data in the line
                // do NOT increment the data pointer unless there is a match (curveIndexes[curveIndex]++ comes after any Exception would be thrown)
                if (matsCurveUtils.PlotResult.data[curveIndex].data[curveIndexes[curveIndex]][0] == minTime) {
                    pdata = Number(matsCurveUtils.PlotResult.data[curveIndex].data[curveIndexes[curveIndex]][1]).toPrecision(4);
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
        var resultData = matsCurveUtils.PlotResult.data[cindex].data;
        var data = resultData.map(function(value,index){return value[1];});
        for (var i = 0; i < data.length; i++){
            if (data[i] == null){
                data.splice(i, 1);
                i--;
            }
        }
        var weimean = matsMathUtils.mean(data).toPrecision(4);
        var min =  Math.min.apply(Math, data).toPrecision(4);
        var max =  Math.max.apply(Math, data).toPrecision(4);
        var sd = Math.sqrt(matsMathUtils.variance(data)).toPrecision(4);
        var se = Math.sqrt(matsMathUtils.variance(data)/(data.length-1)).toPrecision(4);
        var line = "<td>" + curve.label + "</td>" +
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
        var curves = Session.get('Curves');
        var fillStr = settings.NullFillString;
        var data = [];
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
            var line = moment.utc(matsCurveUtils.PlotResult.data[0].data[rowIndex][0]).format('YYYY-MM-DD:HH');
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
