/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';

// set the label for the hide show buttons (NO DATA) for the initial time here
const setNoDataLabels = function (dataset) {
    for (var c = 0; c < dataset.length; c++) {
        if (dataset[c].x.length === 0) {
            Session.set(dataset[c].curveId + "hideButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style["background-color"] = "red";
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style["border-color"] = "black";
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style["color"] = "white";
            }
            Session.set(dataset[c].curveId + "pointsButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-points')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style["background-color"] = "red";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style["border-color"] = "black";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style["color"] = "white";
            }
            Session.set(dataset[c].curveId + "errorBarButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').style["background-color"] = "red";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').style["border-color"] = "black";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').style["color"] = "white";
            }
            Session.set(dataset[c].curveId + "barChartButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-bars')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').style["background-color"] = "red";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').style["border-color"] = "black";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').style["color"] = "white";
            }
            Session.set(dataset[c].curveId + "annotateButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').style["background-color"] = "red";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').style["border-color"] = "black";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').style["color"] = "white";
            }
        } else {
            Session.set(dataset[c].curveId + "hideButtonText", 'hide curve');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide').value = 'hide curve';
                document.getElementById(dataset[c].curveId + '-curve-show-hide').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style["background-color"] = "white";
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style["border-color"] = dataset[c].marker.color;
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style["color"] = dataset[c].marker.color;
            }
            Session.set(dataset[c].curveId + "pointsButtonText", 'hide points');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-points')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').value = 'hide points';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style["background-color"] = "white";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style["border-color"] = dataset[c].marker.color;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style["color"] = dataset[c].marker.color;
            }
            Session.set(dataset[c].curveId + "errorBarButtonText", 'hide error bars');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').value = 'hide error bars';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').style["background-color"] = "white";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').style["border-color"] = dataset[c].marker.color;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-errorbars').style["color"] = dataset[c].marker.color;
            }
            Session.set(dataset[c].curveId + "barChartButtonText", 'hide bars');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-bars')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').value = 'hide bars';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').style["background-color"] = "white";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').style["border-color"] = dataset[c].marker.color;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bars').style["color"] = dataset[c].marker.color;
            }
            Session.set(dataset[c].curveId + "annotateButtonText", 'hide annotation');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').value = 'hide annotation';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').style["background-color"] = "white";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').style["border-color"] = dataset[c].marker.color;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').style["color"] = dataset[c].marker.color;
            }
        }
    }
};

const setNoDataLabelsMap = function (dataset) {
    for (var c = 0; c < dataset.length; c++) {
        if (dataset[c].lat.length === 0) {
            Session.set(dataset[c].curveId + "heatMapButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').style["background-color"] = "red";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').style["border-color"] = "black";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').style["color"] = "white";
            }
        } else {
            const appName = matsCollections !== undefined ? matsCollections.appName.findOne({}).app : undefined;
            var heatMapText;
            if (appName !== undefined && (appName.includes("ceiling") || appName.includes("visibility"))) {
                heatMapText = 'hide heat map';
            } else {
                heatMapText = 'show heat map';
            }
            Session.set(dataset[c].curveId + "heatMapButtonText", heatMapText);
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').value = heatMapText;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').style["background-color"] = "white";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').style["border-color"] = "red";
                document.getElementById(dataset[c].curveId + '-curve-show-hide-heatmap').style["color"] = "red";
            }
        }
    }
};

// plot width helper used in multiple places
const width = function (plotType) {
    switch (plotType) {
        case matsTypes.PlotTypes.scatter2d:
            // set the width square
            return squareWidthHeight();
            break;
        case matsTypes.PlotTypes.profile:
        case matsTypes.PlotTypes.timeSeries:
        case matsTypes.PlotTypes.dailyModelCycle:
        case matsTypes.PlotTypes.dieoff:
        case matsTypes.PlotTypes.threshold:
        case matsTypes.PlotTypes.validtime:
        case matsTypes.PlotTypes.gridscale:
        case matsTypes.PlotTypes.reliability:
        case matsTypes.PlotTypes.roc:
        case matsTypes.PlotTypes.map:
        case matsTypes.PlotTypes.histogram:
        case matsTypes.PlotTypes.ensembleHistogram:
        case matsTypes.PlotTypes.contour:
        case matsTypes.PlotTypes.contourDiff:
        default:
            // set the width wide
            return rectangleWidth();
            break;
    }
};

// plot height helper used in multiple places
const height = function (plotType) {
    switch (plotType) {
        case matsTypes.PlotTypes.scatter2d:
            // set the height square
            return squareWidthHeight();
            break;
        case matsTypes.PlotTypes.profile:
        case matsTypes.PlotTypes.timeSeries:
        case matsTypes.PlotTypes.dailyModelCycle:
        case matsTypes.PlotTypes.dieoff:
        case matsTypes.PlotTypes.threshold:
        case matsTypes.PlotTypes.validtime:
        case matsTypes.PlotTypes.gridscale:
        case matsTypes.PlotTypes.reliability:
        case matsTypes.PlotTypes.roc:
        case matsTypes.PlotTypes.map:
        case matsTypes.PlotTypes.histogram:
        case matsTypes.PlotTypes.ensembleHistogram:
        case matsTypes.PlotTypes.contour:
        case matsTypes.PlotTypes.contourDiff:
        default:
            // set the height wide
            return rectangleHeight();
            break;
    }
};

const standAloneWidth = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    return (.9 * vpw).toString() + "px";
};
const standAloneHeight = function () {
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    return (.825 * vph).toString() + "px";
};

const squareWidthHeight = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw, vph);
    if (min < 400) {
        return (.9 * min).toString() + "px";
    } else {
        return (.7 * min).toString() + "px";
    }
};
const rectangleWidth = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    if (vpw < 400) {
        return (.9 * vpw).toString() + "px";
    } else {
        return (.9 * vpw).toString() + "px";
    }
};
const rectangleHeight = function () {
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    if (vph < 400) {
        return (.8 * vph).toString() + "px";
    } else {
        return (.7 * vph).toString() + "px";
    }
};

const resizeGraph = function (plotType) {
    document.getElementById('placeholder').style.width = width(plotType);
    document.getElementById('placeholder').style.height = height(plotType);
};

// helper to bring up the text page
const setTextView = function (plotType) {
    //shows text page and proper text output, hides everything else
    document.getElementById('placeholder').style.width = width(plotType);
    document.getElementById('placeholder').style.height = height(plotType);
    document.getElementById('graph-container').style.display = 'block';
    document.getElementById('plotType').style.display = 'none';
    document.getElementById('paramList').style.display = 'none';
    document.getElementById('plotList').style.display = 'none';
    document.getElementById('curveList').style.display = 'none';
    if (document.getElementById("plotTypeContainer")) {
        document.getElementById("plotTypeContainer").style.display = "none";
    }
    if (document.getElementById("scatter2d")) {
        document.getElementById("scatter2d").style.display = "none";
    }
    if (document.getElementById("scatterView")) {
        document.getElementById("scatterView").style.display = "none";
    }
    document.getElementById("text-page-button-group").style.display = "block";
    document.getElementById("plot-page-button-group").style.display = "none";
    document.getElementById("curves").style.display = "none";
    document.getElementById("graphView").style.display = "none";
    document.getElementById("textView").style.display = "block";
    document.getElementById('plot-control-button-group').style.display = "none";
};

// helper to bring up the graph page
const setGraphView = function (plotType) {
    //shows graph page, hides everything else
    document.getElementById('placeholder').style.width = width(plotType);
    document.getElementById('placeholder').style.height = height(plotType);
    document.getElementById('graph-container').style.display = 'block';
    document.getElementById('plotType').style.display = 'none';
    document.getElementById('paramList').style.display = 'none';
    document.getElementById('plotList').style.display = 'none';
    document.getElementById('curveList').style.display = 'none';
    if (document.getElementById("plotTypeContainer")) {
        document.getElementById("plotTypeContainer").style.display = "none";
    }
    if (document.getElementById("scatter2d")) {
        document.getElementById("scatter2d").style.display = "none";
    }
    if (document.getElementById("scatterView")) {
        document.getElementById("scatterView").style.display = "none";
    }
    document.getElementById("text-page-button-group").style.display = "none";
    document.getElementById("plot-page-button-group").style.display = "block";
    document.getElementById("curves").style.display = "block";
    document.getElementById("graphView").style.display = "block";
    document.getElementById("textView").style.display = "none";
    document.getElementById('plot-control-button-group').style.display = "block";
};

// helper to bring up the graph page in a pop-up window
const standAloneSetGraphView = function () {
    //shows graph page, hides everything else
    document.getElementById('placeholder').style.width = standAloneWidth();
    document.getElementById('placeholder').style.height = standAloneHeight();
    document.getElementById('graph-container').style.display = 'block';
    document.getElementById("curves").style.display = "block";
    document.getElementById("graphView").style.display = "block";
};

// helper to bring up the main selector page
const setDefaultView = function () {
    // show elements of the main page
    document.getElementById('graph-container').style.display = 'none';
    document.getElementById('plotType').style.display = 'block';
    document.getElementById('paramList').style.display = 'block';
    document.getElementById('plotList').style.display = 'block';
    document.getElementById('curveList').style.display = 'block';
    if (document.getElementById("plotTypeContainer")) {
        document.getElementById("plotTypeContainer").style.display = "block";
    }
    if (document.getElementById("scatter2d")) {
        document.getElementById("scatter2d").style.display = "block";
    }
    if (document.getElementById("scatterView")) {
        document.getElementById("scatterView").style.display = "block";
    }
    document.getElementById("text-page-button-group").style.display = "none";
    document.getElementById("plot-page-button-group").style.display = "block";
    document.getElementById('plot-control-button-group').style.display = "block";
    document.getElementById("curves").style.display = "none";
    document.getElementById("graphView").style.display = "none";
    document.getElementById("textView").style.display = "none";
};


const downloadFile = function (fileURL, fileName) {
    // for non-IE
    if (!window.ActiveXObject) {
        var save = document.createElement('a');
        save.href = fileURL;
        save.target = '_blank';
        var filename = fileURL.substring(fileURL.lastIndexOf('/') + 1);
        save.download = fileName || filename;
        if (navigator.userAgent.toLowerCase().match(/(ipad|iphone|safari)/) && navigator.userAgent.search("Chrome") < 0) {
            document.location = save.href;
        // window event not working here
        } else {
            var evt = new MouseEvent('click', {
                'view': window,
                'bubbles': true,
                'cancelable': false
            });
            save.dispatchEvent(evt);
            (window.URL || window.webkitURL).revokeObjectURL(save.href);
        }
    }

    // for IE < 11
    else if (!!window.ActiveXObject && document.execCommand) {
        var _window = window.open(fileURL, '_blank');
        _window.document.close();
        _window.document.execCommand('SaveAs', true, fileName || fileURL)
        _window.close();
    }
};

export default matsGraphUtils = {
    setNoDataLabels: setNoDataLabels,
    setNoDataLabelsMap: setNoDataLabelsMap,
    width: width,
    height: height,
    standAloneWidth: standAloneWidth,
    standAloneHeight: standAloneHeight,
    resizeGraph: resizeGraph,
    setTextView: setTextView,
    setGraphView: setGraphView,
    standAloneSetGraphView: standAloneSetGraphView,
    setDefaultView: setDefaultView,
    downloadFile: downloadFile
};