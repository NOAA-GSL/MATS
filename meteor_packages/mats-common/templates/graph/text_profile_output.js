import { matsCollections } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { moment } from 'meteor/momentjs:moment';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
const getDataForLevel = function(data, level) {
    for (var i =0; i < data.length; i++) {
        if (data[i][1] == level) {
            return data[i] === null ? undefined : data[i];
        }
    }
    return undefined;
};

const getDataForCurve = function(curve) {
    var dataIndex = 0;
    for (var dataIndex = 0; dataIndex < matsCurveUtils.PlotResult.data.length; dataIndex++) {
        if (matsCurveUtils.PlotResult.data[dataIndex].label === curve.label) {
            break;
        }
    }
    return matsCurveUtils.PlotResult.data[dataIndex];
};

Template.textProfileOutput.helpers({
    plotName: function() {
        return Session.get('plotName');
    },
    mean: function(curve) {
        try {
            return getDataForCurve(curve).stats.d_mean.toPrecision(4);
        } catch(e) {
            return NaN;
        }
    },
    numberOf: function(curve) {
        try {
            return getDataForCurve(curve).stats.n_good;
        } catch (e) {
            return NaN;
        }
    },
    stderr: function(curve) {
        try {
            return getDataForCurve(curve).stats.stde_betsy.toPrecision(4);
        } catch (e) {
            return NaN;
        }
    },
    lag1: function(curve) {
        try {
            return getDataForCurve(curve).stats.lag1.toPrecision(4);
        } catch (e) {
            return NaN;
        }
    },
    min: function(curve) {
        try {
            return getDataForCurve(curve).stats.minx.toPrecision(4);
        } catch (e) {
            return NaN;
        }
    },
    max: function(curve) {
        try {
            return getDataForCurve(curve).stats.maxx.toPrecision(4);
        } catch (e) {
            return NaN;
        }
    },
    curves: function (curve) {
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
    curveText: function () {
        this.regionName = this.region.split(' ')[0];  // regionName might be needed in getCurveText but only region is defined
        const text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(),this);
        return text;
    },
    curveLabel: function (curve) {
        return curve.label;
    },
    pressureLevels: function(curve) {
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
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.profile) {
            return [];
        }
        data = getDataForCurve(curve).data;
        if (data === undefined || data.length == 0) {
            return [];
        }

        var levelSet = new Set();
        var di;
        for (di = 0; di < data.length; di++) {
            data[di] && levelSet.add(data[di][1]);
        }
        var levels = Array.from (levelSet);
        levels.sort((a, b) => (b - a));
        return levels;
    },

    points: function(level) {
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
        if (matsCurveUtils.PlotResult.data === undefined ||
            matsCurveUtils.PlotResult.length == 0) {
            return false;
        }
        if (matsPlotUtils.getPlotType() != matsTypes.PlotTypes.profile) {
            return false;
        }

        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return false;
        }

        var line = "<td>" + (level * -1) + "</td>";
        const settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
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
            const dataPointVal = getDataForLevel(data, level);
            if (dataPointVal !== undefined) {
                pdata = dataPointVal[0].toPrecision(4);
                perror = dataPointVal[5].stde.toPrecision(4);
                stddev = dataPointVal[5].sd.toPrecision(4);
                mean = dataPointVal[5].d_mean.toPrecision(4);
                lag1 = dataPointVal[5].lag1.toPrecision(4);
                n = dataPointVal[5].n_good;
            }
        } catch (problem) {
            console.log("Problem in deriving curve text: " + problem);
        }
        // pdata is now either data value or fillStr
        line += "<td>" + pdata + "</td>" + "<td>" + perror + "</td>"  + "<td>" + stddev + "</td>" + "<td>" + mean + "</td>" + "<td>" + lag1 + "</td>" + "<td>" + n + "</td>";
        return line;
    }
});

Template.textProfileOutput.events({
    'click .export': function() {
        const settings = matsCollections.Settings.findOne({},{fields:{NullFillString:1}});
        if (settings === undefined) {
            return false;
        }
        const fillStr = settings.NullFillString;
        var data = [];
        const curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return data;
        }
        var clabels = 'time';
        for (var c=0; c < curves.length;c++) {
            clabels += "," + curves[c].label;
        }
        data.push(clabels);
        //var dataSet = Session.get('dataset');
        const curveNums = matsCurveUtils.PlotResult.data.length;
        const dataRows = _.range(matsCurveUtils.PlotResult.data[0].data.length);
        for (var rowIndex = 0; rowIndex < dataRows.length; rowIndex ++) {
            var line = moment.utc(Number(matsCurveUtils.PlotResult.data[0].data[rowIndex][0])).format('YYYY-MM-DD:HH:mm');
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
