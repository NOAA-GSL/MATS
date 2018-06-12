import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common'; 
import { moment } from 'meteor/momentjs:moment';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsMathUtils } from 'meteor/randyp:mats-common';

var times = [];

const getDataForTime = function(data, time) {
    for (var i =0; i < data.length; i++) {
        if (data[i][0] == Number(time)) {
            return data[i] === null ? undefined : data[i];
        }
    }
    return undefined;
};

const getDataForCurve = function(curve) {
    for (var dataIndex = 0; dataIndex < matsCurveUtils.PlotResult.data.length; dataIndex++) {
        if (matsCurveUtils.PlotResult.data[dataIndex].label === curve.label) {
            return matsCurveUtils.PlotResult.data[dataIndex];
        }
    }
    return undefined;
};

Template.textDieOffOutput.helpers({
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.dieoff) {
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
    fhrs: function(curve) {
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
        const plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined) {
            return [];
        }

        if (matsCurveUtils.PlotResult.data === undefined) {
            return [];
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.dieoff) {
            return [];
        }
        const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
        if (curveData === undefined || curveData.length == 0) {
            return [];
        }

        var timeSet = new Set();
        var di;
        for (di = 0; di < curveData.length; di++) {
            curveData[di] && timeSet.add(curveData[di][0]);
        }
        var times = Array.from (timeSet);
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.dieoff) {
            return false;
        }
        var curve = Template.parentData();
        var line = "<td>" + Number(time) + "</td>";
        const settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
        if (settings === undefined) {
            return false;
        }
        const fillStr = settings.NullFillString;
        // We must only set data when the times match on a curve.
        var pdata = fillStr;
        var perror = fillStr;
        var mean = fillStr;
        var lag1 = fillStr;
        var n = fillStr;
        var stddev = fillStr;
        try {
            // see if I have a valid data object for this dataIndex and this level....
            const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
            const dataPointVal = getDataForTime(curveData, time);
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
        line += "<td>" + pdata + "</td>" + "<td>" + mean + "</td>" + "<td>" + perror + "</td>"  + "<td>" + stddev + "</td>" + "<td>" + lag1 + "</td>" + "<td>" + n + "</td>";
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.dieoff) {
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
            "<td>" + (stats.d_mean ? stats.d_mean.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.stde_betsy ? stats.stde_betsy.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.n_good).toString() + "</td>" +
            "<td>" + (stats.sd ? stats.sd.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.minVal ? stats.minVal.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.maxVal ? stats.maxVal.toPrecision(4) : "undefined").toString() + "</td>";

        return line;
    }
});

Template.textDieOffOutput.events({
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
            var line = matsCurveUtils.PlotResult.data[0].data[rowIndex][0];
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
