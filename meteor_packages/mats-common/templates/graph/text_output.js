/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections, matsCurveUtils, matsPlotUtils, matsTypes} from 'meteor/randyp:mats-common';
import {moment} from 'meteor/momentjs:moment';
/*
Referring to the Session variable plotResultKey here causes the html template to get re-rendered with the current graph data
(which is in the Results collection).
 */
var fillStr = "---";

var times = [];

// I don't think this is used anymore, but I'm not certain, so I'm leaving it here for now.
const getDataForTime = function (data, time) {
    if (data === undefined) {
        return undefined;
    }
    for (var i = 0; i < data.length; i++) {
        if (data[i][0] == Number(time)) {
            return data[i] === null ? undefined : data[i];
        }
    }
    return undefined;
};

// fetches the data back from where the query routine stored it.
const getDataForCurve = function (curve) {
    if (Session.get("plotResultKey") == undefined || matsCurveUtils.getPlotResultData() === undefined) {
        return undefined;
    }
    if (matsCurveUtils.getPlotResultData() === null) {
        return [];
    }
    if (Session.get("plotType") === matsTypes.PlotTypes.scatter2d) {
        return matsCurveUtils.getPlotResultData()[curve.label];
    } else {
        return matsCurveUtils.getPlotResultData().data[curve.label];
    }
};

Template.textOutput.onRendered(function () {
    const settings = matsCollections.Settings.findOne({}, {fields: {NullFillString: 1}});
    if (settings === undefined) {
        fillStr = "---";
    } else {
        fillStr = settings.NullFillString;
    }
});

Template.textOutput.helpers({
    notScatter: function () {
        return Session.get("plotType") !== matsTypes.PlotTypes.scatter2d;
    },

    // get the table header for the summary stats at the top of the text page
    statHeaders: function () {
        var header = "";
        switch (Session.get('plotType')) {
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.profile:
                header += "<th>label</th>\
                    <th>mean</th>\
                    <th>standard deviation</th>\
                    <th>n</th>\
                    <th>standard error</th>\
                    <th>lag1</th>\
                    <th>minimum</th>\
                    <th>maximum</th>";
                break;
            case matsTypes.PlotTypes.dieoff:
            case matsTypes.PlotTypes.threshold:
            case matsTypes.PlotTypes.validtime:
            case matsTypes.PlotTypes.gridscale:
                header += "<th>label</th>\
                    <th>mean</th>\
                    <th>standard deviation</th>\
                    <th>n</th>\
                    <th>minimum</th>\
                    <th>maximum</th>";
                break;
            case matsTypes.PlotTypes.reliability:
                header += "<th>label</th>\
                    <th>sample climatology</th>";
                break;
            case matsTypes.PlotTypes.roc:
                header += "<th>label</th>\
                    <th>area under the ROC curve</th>";
                break;
            case matsTypes.PlotTypes.map:
                header += "<th>label</th>\
                    <th>mean</th>\
                    <th>standard deviation</th>\
                    <th>n</th>\
                    <th>minimum time</th>\
                    <th>maximum time</th>";
                break;
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.ensembleHistogram:
                header += "<th>label</th>\
                    <th>mean</th>\
                    <th>standard deviation</th>\
                    <th>n</th>\
                    <th>minimum</th>\
                    <th>maximum</th>";
                break;
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
                header += "<th>label</th>\
                    <th>mean stat</th>\
                    <th>n</th>\
                    <th>minimum time</th>\
                    <th>maximum time</th>";
                break;
            case matsTypes.PlotTypes.scatter2d:
                // no stat for scatter
                break;
            default:
                break;
        }
        return header;
    },

    // get the table header for each curve's data
    elementHeaders: function (curve) {
        var header = "";
        switch (Session.get('plotType')) {
            case matsTypes.PlotTypes.timeSeries:
                header += "<th>" + curve.label + " time</th>\
                        <th>raw stat from query</th>\
                        <th>mean stat</th>\
                        <th>std dev</th>\
                        <th>std error</th>\
                        <th>lag1</th>\
                        <th>n</th>";
                break;
            case matsTypes.PlotTypes.dailyModelCycle:
                header += "<th>" + curve.label + " time</th>\
                        <th>raw stat from query</th>\
                        <th>mean stat</th>\
                        <th>std dev</th>\
                        <th>n</th>";
                break;
            case matsTypes.PlotTypes.profile:
                header += "<th>" + curve.label + " level</th>\
                        <th>raw stat from query</th>\
                        <th>mean stat</th>\
                        <th>std dev</th>\
                        <th>std error</th>\
                        <th>lag1</th>\
                        <th>n</th>";
                break;
            case matsTypes.PlotTypes.dieoff:
                header += "<th>" + curve.label + " forecast lead time</th>\
                        <th>raw stat from query</th>\
                        <th>mean stat</th>\
                        <th>std dev</th>\
                        <th>n</th>";
                break;
            case matsTypes.PlotTypes.threshold:
                header += "<th>" + curve.label + " threshold</th>\
                        <th>raw stat from query</th>\
                        <th>mean stat</th>\
                        <th>std dev</th>\
                        <th>n</th>";
                break;
            case matsTypes.PlotTypes.validtime:
                header += "<th>" + curve.label + " hour of day</th>\
                        <th>raw stat from query</th>\
                        <th>mean stat</th>\
                        <th>std dev</th>\
                        <th>n</th>";
                break;
            case matsTypes.PlotTypes.gridscale:
                header += "<th>" + curve.label + " grid scale</th>\
                        <th>raw stat from query</th>\
                        <th>mean stat</th>\
                        <th>std dev</th>\
                        <th>n</th>";
                break;
            case matsTypes.PlotTypes.reliability:
                header += "<th>" + curve.label + " probability bin</th>\
                        <th>hit rate</th>\
                        <th>oy</th>\
                        <th>on</th>";
                break;
            case matsTypes.PlotTypes.roc:
                header += "<th>" + curve.label + " threshold</th>\
                        <th>probability of detection</th>\
                        <th>false alarm rate</th>\
                        ";
                break;
            case matsTypes.PlotTypes.map:
                header += "<th>Site Name</th>\
                        <th>Number of Times</th>\
                        <th>Start Date</th>\
                        <th>End Date</th>\
                        <th>Stat</th>";
                break;
            case matsTypes.PlotTypes.histogram:
                header += "<th>" + curve.label + "  bin range</th>\
                        <th>bin n</th>\
                        <th>bin rel freq</th>\
                        <th>bin lower bound</th>\
                        <th>bin upper bound</th>\
                        <th>bin mean</th>\
                        <th>bin std dev</th>";
                break;
            case matsTypes.PlotTypes.ensembleHistogram:
                header += "<th>" + curve.label + "  bin number</th>\
                        <th>bin n</th>\
                        <th>bin rel freq</th>";
                break;
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
                header += "<th>X Value</th>\
                        <th>Y Value</th>\
                        <th>Stat</th>\
                        <th>Number</th>\
                        <th>Start Date</th>\
                        <th>End Date</th>";
                break;
            case matsTypes.PlotTypes.scatter2d:
                header += "<th>" + curve.label + " x axis</th>\
                        <th>" + curve.label + " y axis</th>\
                        <th>best fit</th>";
                break;
            default:
                break;
        }
        return header;
    },
    elements: function (curve) {
        Session.get('textLoaded'); // monitor for data changres like previous / next
        return getDataForCurve(curve);
    },
    curves: function () {
        Session.get('textLoaded');
        Session.get("plotResultKey"); // make sure we re-render when data changes
        return Session.get('Curves');
    },
    curveLabel: function (curve) {
        switch (Session.get('plotType')) {
            case matsTypes.PlotTypes.timeSeries:
                return curve.label + " time";
                break;
            case matsTypes.PlotTypes.profile:
                return curve.label + " level";
                break;
            case matsTypes.PlotTypes.dieoff:
                return curve.label + " forecast lead time";
            default:
                return curve.label;
                break;
        }
    },
    curveText: function () {
        const text = matsPlotUtils.getCurveText(matsPlotUtils.getPlotType(), this);
        return text;
    },

    // get the table row values for each curve's data
    elementHtml: function (element) {
        var labelKey = Template.parentData().label;
        var elementLabel = "";
        var line = "";
        switch (Session.get('plotType')) {
            case matsTypes.PlotTypes.timeSeries:
                line += "<td>" + element[labelKey += " time"] + "</td>" +
                    "<td>" + (element['raw stat from query'] != undefined && element['raw stat from query'] !== null ? element['raw stat from query'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['mean stat'] != undefined && element['mean stat'] !== null ? element['mean stat'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['std dev'] != undefined && element['std dev'] !== null ? element['std dev'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['std error'] != undefined && element['std error'] !== null ? element['std error'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['lag1'] != undefined && element['lag1'] !== null ? element['lag1'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (('n' in element) && element['n'] ? element['n'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.profile:
                line += "<td>" + element[labelKey += " level"] + "</td>" +
                    "<td>" + (element['raw stat from query'] != undefined && element['raw stat from query'] !== null ? element['raw stat from query'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['mean stat'] != undefined && element['mean stat'] !== null ? element['mean stat'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['std dev'] != undefined && element['std dev'] !== null ? element['std dev'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['std error'] != undefined && element['std error'] !== null ? element['std error'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['lag1'] != undefined && element['lag1'] !== null ? element['lag1'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (('n' in element) ? element['n'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.dieoff:
                line += "<td>" + element[labelKey += " forecast lead time"] + "</td>" +
                    "<td>" + (element['raw stat from query'] != undefined && element['raw stat from query'] !== null ? element['raw stat from query'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['mean stat'] != undefined && element['mean stat'] !== null ? element['mean stat'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['std dev'] != undefined && element['std dev'] !== null ? element['std dev'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (('n' in element) ? element['n'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.threshold:
                line += "<td>" + element[labelKey += " threshold"] + "</td>" +
                    "<td>" + (element['raw stat from query'] != undefined && element['raw stat from query'] !== null ? element['raw stat from query'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['mean stat'] != undefined && element['mean stat'] !== null ? element['mean stat'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['std dev'] != undefined && element['std dev'] !== null ? element['std dev'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (('n' in element) ? element['n'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.validtime:
                line += "<td>" + element[labelKey += " hour of day"] + "</td>" +
                    "<td>" + (element['raw stat from query'] != undefined && element['raw stat from query'] !== null ? element['raw stat from query'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['mean stat'] != undefined && element['mean stat'] !== null ? element['mean stat'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['std dev'] != undefined && element['std dev'] !== null ? element['std dev'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (('n' in element) ? element['n'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.gridscale:
                line += "<td>" + element[labelKey += " grid scale"] + "</td>" +
                    "<td>" + (element['raw stat from query'] != undefined && element['raw stat from query'] !== null ? element['raw stat from query'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['mean stat'] != undefined && element['mean stat'] !== null ? element['mean stat'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['std dev'] != undefined && element['std dev'] !== null ? element['std dev'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (('n' in element) ? element['n'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.dailyModelCycle:
                line += "<td>" + element[labelKey += " time"] + "</td>" +
                    "<td>" + (element['raw stat from query'] != undefined && element['raw stat from query'] !== null ? element['raw stat from query'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['mean stat'] != undefined && element['mean stat'] !== null ? element['mean stat'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['std dev'] != undefined && element['std dev'] !== null ? element['std dev'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (('n' in element) ? element['n'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.reliability:
                line += "<td>" + element[labelKey += " probability bin"] + "</td>" +
                    "<td>" + (element['hit rate'] != undefined && element['hit rate'] !== null ? element['hit rate'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['oy'] != undefined && element['oy'] !== null ? element['oy'] : fillStr) + "</td>" +
                    "<td>" + (element['on'] != undefined && element['on'] !== null ? element['on'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.roc:
                line += "<td>" + element[labelKey += " threshold"] + "</td>" +
                    "<td>" + (element['probability of detection'] != undefined && element['probability of detection'] !== null ? element['probability of detection'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['false alarm rate'] != undefined && element['false alarm rate'] !== null ? element['false alarm rate'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.map:
                line += "<td>" + element["Site Name"] + "</td>" +
                    "<td>" + (element['Number of Times'] != undefined && element['Number of Times'] !== null ? element['Number of Times'] : fillStr) + "</td>" +
                    "<td>" + (element['Start Date'] != undefined && element['Start Date'] !== null ? element['Start Date'] : fillStr) + "</td>" +
                    "<td>" + (element['End Date'] != undefined && element['End Date'] !== null ? element['End Date'] : fillStr) + "</td>" +
                    "<td>" + (element['Stat'] != undefined && element['Stat'] !== null ? element['Stat'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.histogram:
                line += "<td>" + element[labelKey += " bin range"] + "</td>" +
                    "<td>" + (('n' in element) ? element['n'] : fillStr) + "</td>" +
                    "<td>" + (element['bin rel freq'] != undefined && element['bin rel freq'] !== null ? element['bin rel freq'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['bin lower bound'] != undefined && element['bin lower bound'] !== null ? element['bin lower bound'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['bin upper bound'] != undefined && element['bin upper bound'] !== null ? element['bin upper bound'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['bin mean'] != undefined && element['bin mean'] !== null ? element['bin mean'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['bin std dev'] != undefined && element['bin std dev'] !== null ? element['bin std dev'].toPrecision(4) : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.ensembleHistogram:
                line += "<td>" + element[labelKey += " bin"] + "</td>" +
                    "<td>" + (('n' in element) ? element['n'] : fillStr) + "</td>" +
                    "<td>" + (element['bin rel freq'] != undefined && element['bin rel freq'] !== null ? element['bin rel freq'].toPrecision(4) : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
                line += "<td>" + element["xVal"] + "</td>" +
                    "<td>" + element["yVal"] + "</td>" +
                    "<td>" + (element['stat'] != undefined && element['stat'] !== null ? element['stat'] : fillStr) + "</td>" +
                    "<td>" + (element['N'] != undefined && element['N'] !== null ? element['N'] : fillStr) + "</td>" +
                    "<td>" + (element['Start Date'] != undefined && element['Start Date'] !== null ? element['Start Date'] : fillStr) + "</td>" +
                    "<td>" + (element['End Date'] != undefined && element['End Date'] !== null ? element['End Date'] : fillStr) + "</td>";
                break;
            case matsTypes.PlotTypes.scatter2d:
                line += "<td>" + (element['xAxis'] != undefined && element['xAxis'] !== null ? element['xAxis'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['yAxis'] != undefined && element['yAxis'] !== null ? element['yAxis'].toPrecision(4) : fillStr) + "</td>" +
                    "<td>" + (element['best fit'] != undefined && element['best fit'] !== null ? element['best fit'] : fillStr) + "</td>";
                break;
            default:
                break;
        }
        return line;
    },

    // get the table row values for the summary stats at the top of the text page
    stats: function (curve) {
        if (Session.get("plotResultKey") === undefined) {
            return [];
        }
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return [];
        }
        var cindex;
        for (cindex = 0; cindex < curves.length; cindex++) {
            if (curves[cindex].label == curve.label) {
                break;
            }
        }
        if (matsCurveUtils.getPlotResultData() === null ||
            matsCurveUtils.getPlotResultData() === undefined ||
            matsCurveUtils.getPlotResultData().stats === undefined ||
            matsCurveUtils.getPlotResultData().stats[curves[cindex].label] === undefined) {
            return "";
        }
        const stats = matsCurveUtils.getPlotResultData().stats[curves[cindex].label];

        var line = "";
        switch (Session.get('plotType')) {
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.profile:
            case matsTypes.PlotTypes.dailyModelCycle:
                line += "<td>" + curve['label'] + "</td>" +
                    "<td>" + (stats['mean'] != undefined && stats['mean'] !== null ? stats['mean'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['standard deviation'] != undefined && stats['standard deviation'] !== null ? stats['standard deviation'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['n']).toString() + "</td>" +
                    "<td>" + (stats['standard error'] != undefined && stats['standard error'] != null ? stats['standard error'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['lag1'] != undefined && stats['lag1'] != null ? stats['lag1'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['minimum'] != undefined && stats['minimum'] != null ? stats['minimum'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['maximum'] != undefined && stats['maximum'] != null ? stats['maximum'].toPrecision(4) : "undefined").toString() + "</td>";
                break;
            case matsTypes.PlotTypes.dieoff:
            case matsTypes.PlotTypes.threshold:
            case matsTypes.PlotTypes.validtime:
            case matsTypes.PlotTypes.gridscale:
                line += "<td>" + curve['label'] + "</td>" +
                    "<td>" + (stats['mean'] != undefined && stats['mean'] !== null ? stats['mean'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['standard deviation'] != undefined && stats['standard deviation'] !== null ? stats['standard deviation'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['n']).toString() + "</td>" +
                    "<td>" + (stats['minimum'] != undefined && stats['minimum'] != null ? stats['minimum'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['maximum'] != undefined && stats['maximum'] != null ? stats['maximum'].toPrecision(4) : "undefined").toString() + "</td>";
                break;
            case matsTypes.PlotTypes.reliability:
                line += "<td>" + curve['label'] + "</td>" +
                    "<td>" + (stats['sample climo'] != undefined && stats['sample climo'] !== null ? stats['sample climo'].toPrecision(4) : "undefined").toString() + "</td>";
                break;
            case matsTypes.PlotTypes.roc:
                line += "<td>" + curve['label'] + "</td>" +
                    "<td>" + (stats['auc'] != undefined && stats['auc'] !== null ? stats['auc'].toPrecision(4) : "undefined").toString() + "</td>";
                break;
            case matsTypes.PlotTypes.map:
                line += "<td>" + curve['label'] + "</td>" +
                    "<td>" + (stats['mean difference'] != undefined && stats['mean difference'] !== null ? stats['mean difference'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['standard deviation'] != undefined && stats['standard deviation'] !== null ? stats['standard deviation'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['total number of obs'] != undefined && stats['total number of obs'] !== null ? stats['total number of obs'] : "undefined").toString() + "</td>" +
                    "<td>" + (stats['minimum time'] != undefined && stats['minimum time'] != null ? stats['minimum time'] : "undefined").toString() + "</td>" +
                    "<td>" + (stats['maximum time'] != undefined && stats['maximum time'] != null ? stats['maximum time'] : "undefined").toString() + "</td>";
                break;
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.ensembleHistogram:
                line += "<td>" + curve['label'] + "</td>" +
                    "<td>" + (stats['mean'] != undefined && stats['mean'] !== null ? stats['mean'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['standard deviation'] != undefined && stats['standard deviation'] != null ? stats['standard deviation'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['n']).toString() + "</td>" +
                    "<td>" + (stats['minimum'] != undefined && stats['minimum'] != null ? stats['minimum'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['maximum'] != undefined && stats['maximum'] != null ? stats['maximum'].toPrecision(4) : "undefined").toString() + "</td>";
                break;
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
                line += "<td>" + curve['label'] + "</td>" +
                    "<td>" + (stats['mean stat'] != undefined && stats['mean stat'] !== null ? stats['mean stat'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['total number of points'] != undefined && stats['total number of points'] !== null ? stats['total number of points'] : "undefined").toString() + "</td>" +
                    "<td>" + (stats['minimum time'] != undefined && stats['minimum time'] != null ? stats['minimum time'] : "undefined").toString() + "</td>" +
                    "<td>" + (stats['maximum time'] != undefined && stats['maximum time'] != null ? stats['maximum time'] : "undefined").toString() + "</td>";
                break;
            case matsTypes.PlotTypes.scatter2d:
                line += "<td>" + curve['label'] + "</td>" +
                    "<td>" + (stats['mean'] != undefined && stats['mean'] !== null ? stats['mean'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['standard deviation'] != undefined && stats['standard deviation'] !== null ? stats['standard deviation'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['n']).toString() + "</td>" +
                    "<td>" + (stats['standard error'] != undefined && stats['standard error'] != null ? stats['standard error'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['lag1'] != undefined && stats['lag1'] != null ? stats['lag1'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['minimum'] != undefined && stats['minimum'] != null ? stats['minimum'].toPrecision(4) : "undefined").toString() + "</td>" +
                    "<td>" + (stats['maximum'] != undefined && stats['maximum'] != null ? stats['maximum'].toPrecision(4) : "undefined").toString() + "</td>";
                break;
            default:
                break;
        }
        return line;
    }
});

Template.textOutput.events({
    'click .export': function () {
        var plotType = Session.get('plotType');
        var key = Session.get('plotResultKey');
        // open a new window with
        window.open(window.location + "/CSV/" + Session.get("graphFunction") + "/" + Session.get("plotResultKey") + "/" + Session.get('plotParameter') + "/" + matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title);
    }
});
