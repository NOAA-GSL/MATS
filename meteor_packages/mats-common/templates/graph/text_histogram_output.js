import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common'; 
import { moment } from 'meteor/momentjs:moment';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsMathUtils } from 'meteor/randyp:mats-common';

var bins = [];

const getDataForBin = function(data, bin) {
    for (var i =0; i < data.length; i++) {
        if (data[i][6].binLabel == bin) {
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

Template.textHistogramOutput.helpers({
    plotName: function() {
        return Session.get('plotName');
    },
    bins: function(curve) {
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.histogram) {
            return [];
        }
        const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
        if (curveData === undefined || curveData.length == 0) {
            return [];
        }

        var bins = [];
        var di;
        for (di = 0; di < curveData.length; di++) {
            curveData[di] && bins.push(curveData[di][6].binLabel);
        }
        return bins;
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.histogram) {
            return [];
        }

        const curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }

        var binSet = new Set();
        var di = 0;
        for (var i = 0; i < matsCurveUtils.PlotResult.data.length; i++) {
            for (di = 0; di < matsCurveUtils.PlotResult.data[i].data.length; di++) {
                matsCurveUtils.PlotResult.data[i] && matsCurveUtils.PlotResult.data[i].data[di] && binSet.add(matsCurveUtils.PlotResult.data[i].data[di][0]);
            }
        }
        bins = Array.from (binSet);
        bins.sort((a, b) => (a - b));
        return bins;
    },
    points: function(bin) {
        const plotResultsUpDated = Session.get('PlotResultsUpDated');
        if (plotResultsUpDated === undefined) {
            return [];
        }
        if (matsCurveUtils.PlotResult.data === undefined ||
            matsCurveUtils.PlotResult.length == 0) {
            return false;
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.histogram) {
            return false;
        }
        var curve = Template.parentData();
        var line = "<td>" + bin + "</td>";
        const settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
        if (settings === undefined) {
            return false;
        }
        const fillStr = settings.NullFillString;
        // We must only set data when the times match on a curve.
        var n = fillStr;
        var lbound = fillStr;
        var ubound = fillStr;
        var mean = fillStr;
        var stddev = fillStr;
        try {
            // see if I have a valid data object for this dataIndex and this bin....
            const curveData = getDataForCurve(curve) && getDataForCurve(curve).data;
            const dataPointVal = getDataForBin(curveData, bin);
            if (dataPointVal !== undefined) {
                n = dataPointVal[1].toString();
                lbound = dataPointVal[6].binLowBound && dataPointVal[6].binLowBound.toPrecision(4);
                ubound = dataPointVal[6].binUpBound && dataPointVal[6].binUpBound.toPrecision(4);
                mean = dataPointVal[6].bin_mean && dataPointVal[6].bin_mean.toPrecision(4);
                stddev = dataPointVal[6].bin_sd && dataPointVal[6].bin_sd.toPrecision(4);
            }
        } catch (problem) {
            console.log("Problem in deriving curve text: " + problem);
        }
        // pdata is now either data value or fillStr
        line += "<td>" + n + "</td>" + "<td>" + lbound + "</td>" + "<td>" + ubound + "</td>"  + "<td>" + mean + "</td>" + "<td>" + stddev + "</td>";
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.histogram) {
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
        const stats = resultData[0][7];
        const line = "<td>" + curve.label + "</td>" +
            "<td>" + (stats.glob_mean ? stats.glob_mean.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.glob_sd ? stats.glob_sd.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.glob_n).toString() + "</td>" +
            "<td>" + ((stats.glob_min || stats.glob_min === 0) ? stats.glob_min.toPrecision(4) : "undefined").toString() + "</td>" +
            "<td>" + (stats.glob_max ? stats.glob_max.toPrecision(4) : "undefined").toString() + "</td>";

        return line;
    }
});

Template.textHistogramOutput.events({
    'click .export': function() {
        // var settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
        // if (settings === undefined) {
        //     return false;
        // }
        // const curves = Session.get('Curves');
        // const fillStr = settings.NullFillString;
        // var data = [];
        // if (curves === undefined || curves.length == 0) {
        //     return data;
        // }
        // var clabels = 'time';
        // for (var c=0; c < curves.length;c++) {
        //     clabels += "," + curves[c].label;
        // }
        // data.push(clabels);
        // const curveNums = matsCurveUtils.PlotResult.data.length - 1;
        // const dataRows = _.range(matsCurveUtils.PlotResult.data[0].data.length);
        // for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex ++) {
        //     var line = matsCurveUtils.PlotResult.data[0].data[rowIndex][0];
        //     for (var curveIndex = 0; curveIndex < curveNums; curveIndex++) {
        //         const pdata = matsCurveUtils.PlotResult.data[curveIndex].data[rowIndex][1] !== null?(Number(matsCurveUtils.PlotResult.data[curveIndex].data[rowIndex][1])).toPrecision(4):fillStr;
        //         line += "," + pdata;
        //     }
        //     data.push(line);
        // }
        // const csvString = data.join("%0A");
        // const a         = document.createElement('a');
        // a.href        = 'data:attachment/csv,' + csvString;
        // a.target      = '_blank';
        // a.download    = 'data.csv';
        // document.body.appendChild(a);
        // a.click();
    }
});
