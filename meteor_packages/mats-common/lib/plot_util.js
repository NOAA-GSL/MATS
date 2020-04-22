/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCollections} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';
import {matsTypes} from 'meteor/randyp:mats-common';

// determine the axisText (used in scatter_axis.js for example)
// according to the Scatter Axis Text Patterns Pattern defined in
// ScatterAxisTextPatterns according to plotType - and derived from
// currently selected inputs in the document.
const getAxisText = function (plotType) {
    var scatterAxisTextPattern = matsCollections.ScatterAxisTextPattern.findOne({plotType: getPlotType()});
    var textPattern = scatterAxisTextPattern ? matsCollections.ScatterAxisTextPattern.findOne({plotType: getPlotType()}).textPattern : undefined;
    if (scatterAxisTextPattern === undefined) {
        return "";
    }
    var text = "";
    for (var i = 0; i < scatterAxisTextPattern.length; i++) {
        var pName = scatterAxisTextPattern[i][0];
        var delimiter = scatterAxisTextPattern[i][1];
        var value = matsParamUtils.getValueForParamName(pName);
        text += value += delimiter;
    }
    return text;
};

// determine the curveText (used in curveItem for example) for a given curve (from Session.get('curves'))
// that has already been added
const getCurveText = function (plotType, curve) {
    var curveTextPattern = matsCollections.CurveTextPatterns.findOne({plotType: plotType}).textPattern;
    var text = "";

    for (var i = 0; i < curveTextPattern.length; i++) {
        var a = curveTextPattern[i];
        if (a === undefined || a === null || curve[a[1]] === undefined) {
            continue;
        }
        text += a[0];
        if (curve[a[1]] instanceof Array && (curve[a[1]].length > 2)) {
            text += curve[a[1]][0] + ".." + curve[a[1]][curve[a[1]].length - 1];
        } else {
            text += curve[a[1]];
        }
        text += a[2];
    }
    return text;
};

// like getCurveText but with wrapping
const getCurveTextWrapping = function (plotType, curve) {
    var curveTextPattern = matsCollections.CurveTextPatterns.findOne({plotType: plotType}).textPattern;
    var text = "";
    var wrapLimit = 40;
    for (var i = 0; i < curveTextPattern.length; i++) {
        var a = curveTextPattern[i];
        if (a === undefined || a === null || curve[a[1]] === undefined) {
            continue;
        }
        text += a[0];
        if (curve[a[1]] instanceof Array && (curve[a[1]].length > 2)) {
            text += curve[a[1]][0] + ".." + curve[a[1]][curve[a[1]].length - 1];
        } else {
            text += curve[a[1]];
        }
        text += a[2];
        if (text.length > wrapLimit) {
            text += "<br>";
            wrapLimit = wrapLimit + 40;
        }
    }
    return text;
};

// determine which plotType radio button is checked
const getPlotType = function () {
    var buttons = document.getElementsByName('plot-type');
    for (var i = 0, len = buttons.length; i < len; i++) {
        if (buttons[i].checked) {
            return buttons[i].value;
        }
    }
    return "";    // error condition actually - shouldn't ever happen
};

// determine which plotFormat radio button is checked
const getPlotFormat = function () {
    var buttons = document.getElementsByName('plotFormat');
    if (buttons === undefined) {
        return ""; // app may not have plotFormat?
    }
    var plotFormatParam = matsCollections.PlotParams.findOne({name: 'plotFormat'});
    if (plotFormatParam === undefined) {
        return ""; // app may not have plotFormat?
    }
    var optionsMap = plotFormatParam.optionsMap;
    for (var i = 0, len = buttons.length; i < len; i++) {
        if (buttons[i].checked) {
            return buttons[i].value;
        }
    }
    return "";  // error condition actually - shouldn't ever happen
};

// Determine which BestFit radio button is checked
const getBestFit = function () {
    var buttons = document.getElementsByName('Fit Type');
    var optionsMap = matsCollections.PlotParams.findOne({name: 'bestFit'}).optionsMap;
    for (var i = 0, len = buttons.length; i < len; i++) {
        if (buttons[i].checked) {
            return buttons[i].value;
        }
    }
    return "";  // error condition actually - shouldn't ever happen
};

const containsPoint = function (pointArray, point) {
    var lat = point[0];
    var lon = point[1];
    for (var i = 0; i < pointArray.length; i++) {
        var pLat = pointArray[i][0];
        var pLon = pointArray[i][1];
        if (lat === pLat && lon === pLon) {
            return true
        }
    }
    return false;
};

// disable the action buttons while the query and plot routines are processing, then re-enable them afterwards
const disableActionButtons = function () {
    document.getElementById('plotMatched').disabled = true;
    document.getElementById('plotUnmatched').disabled = true;
    document.getElementById('add').disabled = true;
    document.getElementById('remove-all').disabled = true;
};
const enableActionButtons = function () {
    document.getElementById('plotMatched').disabled = false;
    document.getElementById('plotUnmatched').disabled = false;
    document.getElementById('add').disabled = false;
    document.getElementById('remove-all').disabled = false;
};

export default matsPlotUtils = {
    getAxisText: getAxisText,
    getCurveText: getCurveText,
    getCurveTextWrapping: getCurveTextWrapping,
    getPlotType: getPlotType,
    getPlotFormat: getPlotFormat,
    getBestFit: getBestFit,
    containsPoint: containsPoint,
    disableActionButtons: disableActionButtons,
    enableActionButtons: enableActionButtons
};