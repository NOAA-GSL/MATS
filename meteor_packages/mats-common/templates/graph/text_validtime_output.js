import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common'; 
import { moment } from 'meteor/momentjs:moment';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsMathUtils } from 'meteor/randyp:mats-common';

var times = [];

const getDataForTime = function(curveIndex, time) {
    try {
        for (var i = 0; i < matsCurveUtils.PlotResult.data[curveIndex].data.length; i++) {
            if (Number(matsCurveUtils.PlotResult.data[curveIndex].data[i][0]) === Number(time)) {
                return matsCurveUtils.PlotResult.data[curveIndex].data[i][1] === null ? undefined : Number(matsCurveUtils.PlotResult.data[curveIndex].data[i][1]);
            }
        }
        return undefined;
    } catch (e)
        {
            console.log ("getDataForTime error: " + e);
            return undefined;
        }
};

Template.textValidTimeOutput.helpers({
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
        if (this.regionName) {
            this.regionName = this.region.split(' ')[0];
        }  // regionName might be needed in getCurveText but only region is defined
        const text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(),this);
        return text;
    },
    dataRows: function() {
        /*
         This (plotResultsUpDated) is very important.
         The page is rendered when the graph page comes up, but the data from the data processing callback
         in plotList.js or curveList.js may not have set the global variable
         PlotResult. The callback sets the variable then sets the session variable plotResultsUpDated.
         Referring to plotResultsUpDated here causes the html to get re-rendered with the current graph data
         (which is in the PlotResults global). This didn't used to be necessary because the plot data
         was contained in the session, but some unknown ddp behavior having to do with the amount of plot data
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.validtime) {
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.validtime) {
            return false;
        }
        const curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }
        var line = "<td>" + time + "</td>";
        const settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
        if (settings === undefined) {
            return false;
        }
        const fillStr = settings.NullFillString;
        // We must only set data when the times match on a curve.
        var pdata = fillStr;
        for (var curveIndex = 0; curveIndex < curves.length; curveIndex++) {
            pdata = fillStr;
            try {
                // see if I have a valid data object for this curve and this time....
                const dataPointVal = getDataForTime(curveIndex, time);
                if (dataPointVal !== undefined) {
                    pdata = dataPointVal.toPrecision(4);
                }
            } catch (problem) {
                console.log("Problem in deriving curve text: " + problem);
            }
            // pdata is now either data value or fillStr
            line += "<td>" + pdata + "</td>";
        }
        return line;
    },
    stats: function(curve) {
        /*
         This (plotResultsUpDated) is very important.
         The page is rendered when the graph page comes up, but the data from the data processing callback
         in plotList.js or curveList.js may not have set the global variable PlotResult.
         The callback sets the variable then sets the session variable plotResultsUpDated.
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.validtime) {
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
        var times = resultData.map(function(value){return value[0];});
        const stats = matsCurveUtils.get_err(data,times);
        const n = data.length;
        const line = "<td>" + curve.label + "</td>" +
            "<td>" + stats.d_mean.toPrecision(4) + "</td>" +
            "<td> +/- " + stats.stde_betsy.toPrecision(4) + "</td>" +
            "<td>" + stats.n_good + "</td>" +
            "<td>" + stats.sd.toPrecision(4) + "</td>" +
            "<td>" + stats.minVal.toPrecision(4) + "</td>" +
            "<td>" + stats.maxVal.toPrecision(4) + "</td>";
        return line;
    }
});

Template.textValidTimeOutput.events({
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
