 import { matsCollections } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';

// determine the axisText (used in scatter_axis.js for example)
// according to the Scatter Axis Text Patterns Pattern defined in
// ScatterAxisTextPatterns according to plotType - and derived from
// currently selected inputs in the document.

var getAxisText = function(plotType) {
    var scatterAxisTextPattern = matsCollections.ScatterAxisTextPattern.findOne({plotType:getPlotType()}).textPattern;
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
var getCurveText = function(plotType, curve){
    var curveTextPattern = matsCollections.CurveTextPatterns.findOne({plotType:plotType}).textPattern;
    var text = "";
    for (var i = 0; i < curveTextPattern.length; i++) {
        var a = curveTextPattern[i];
        text += a[0];
        if (curve[a[1]] instanceof Array && (curve[a[1]].length > 2)) {
            text += curve[a[1]][0] +  ".." + curve[a[1]][curve[a[1]].length -1];
        } else {
            text += curve[a[1]];
        }
        text += a[2];
    }
    return text;
};

// determine which plotType radio button is checked
var getPlotType = function () {
    var buttons = document.getElementsByName('plot-type');
    for (var i = 0, len = buttons.length; i < len; i++) {
        if (buttons[i].checked) {
            return buttons[i].value;
        }
    }
    return "";    // error condition actually - shouldn't ever happen
};

// determine which plotFormat radio button is checked
var getPlotFormat = function() {
    var buttons = document.getElementsByName('plotFormat');
    var optionsMap = matsCollections.PlotParams.findOne({name:'plotFormat'}).optionsMap;
    for (var i = 0, len = buttons.length; i < len; i++) {
        if (buttons[i].checked) {
            return _.invert(optionsMap)[buttons[i].value];
        }
    }
    return "";  // error condition actually - shouldn't ever happen
};

// Determine which BestFit radio button is checked
var getBestFit = function() {
    var buttons = document.getElementsByName('scatter2d-best-fit');
    var optionsMap = matsCollections.PlotParams.findOne({name:'bestFit'}).optionsMap;
    for (var i = 0, len = buttons.length; i < len; i++) {
        if (buttons[i].checked) {
            return _.invert(optionsMap)[buttons[i].value];
        }
    }
    return "";  // error condition actually - shouldn't ever happen
};

export default matsPlotUtils = {
    getAxisText:getAxisText,
    getCurveText:getCurveText,
    getPlotType:getPlotType,
    getPlotFormat:getPlotFormat,
    getBestFit:getBestFit
};