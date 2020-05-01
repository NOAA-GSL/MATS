/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';
import {Info} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';


/*
 global dataset variable - container for graph dataset.
 This (plotResult) is very important. It isn't "var" because it needs to be a meteor global scope.
 The page is rendered whe the graph page comes up, but the data from the data processing callback
 in plotList.js or curveList.js may not have set the global variable
 PlotResult.
 */

//var plotResultData = null; -- this was the global variable for the text output data, but now it is set elsewhere
var graphResult = null;     // this is the global variable for the data on the graph
var plot;

const sizeof = function (_1) {
    var _2 = [_1];
    var _3 = 0;
    for (var _4 = 0; _4 < _2.length; _4++) {
        switch (typeof _2[_4]) {
            case "boolean":
                _3 += 4;
                break;
            case "number":
                _3 += 8;
                break;
            case "string":
                _3 += 2 * _2[_4].length;
                break;
            case "object":
                if (Object.prototype.toString.call(_2[_4]) != "[object Array]") {
                    for (var _5 in _2[_4]) {
                        _3 += 2 * _5.length;
                    }
                }
                for (var _5 in _2[_4]) {
                    var _6 = false;
                    for (var _7 = 0; _7 < _2.length; _7++) {
                        if (_2[_7] === _2[_4][_5]) {
                            _6 = true;
                            break;
                        }
                    }
                    if (!_6) {
                        _2.push(_2[_4][_5]);
                    }
                }
        }
    }
    return _3;
};

// Retrieves the globally stored plotResultData for the text output and other things.
// Re-sets the plotResultData if the requested page range has changed, or if it has not been previously set.
const getPlotResultData = function () {
    var pageIndex = Session.get("pageIndex");
    var newPageIndex = Session.get("newPageIndex");
    if (plotResultData === undefined || plotResultData === null || Session.get('textRefreshNeeded') === true) {
        setPlotResultData();
    }
    return plotResultData;
};

// Sets the global plotResultData variable for the text output to the requested range from the Results data stored in mongo, via a MatsMethod.
const setPlotResultData = function () {
    var pageIndex = Session.get("pageIndex");
    var newPageIndex = Session.get("newPageIndex");

    if (Session.get('textRefreshNeeded') === true) {
        showSpinner();
        matsMethods.getPlotResult.call({
            resultKey: Session.get("plotResultKey"),
            pageIndex: pageIndex,
            newPageIndex: newPageIndex
        }, function (error, result) {
            if (error !== undefined) {
                setError(new Error("matsMethods.getPlotResult failed : error: " + error));
                Session.set('textRefreshNeeded', false);
            }
            if (result == undefined) {
                plotResultData = undefined;
                Session.set('textRefreshNeeded', false);
                hideSpinner();
                return;
            }
            plotResultData = result;
            Session.set("pageIndex", result.dsiRealPageIndex);
            Session.set("pageTextDirection", result.dsiTextDirection);
            Session.set('textLoaded', new Date());
            console.log("size of plotResultData is ", sizeof(plotResultData));
            Session.set('textRefreshNeeded', false);
            hideSpinner();
        });
    }
};

// resets the global plotResultData variable for the text output to null
const resetPlotResultData = function () {
    plotResultData = null;
    Session.set('textLoaded', new Date());
};

// gets the global graphResult variable, which is the data object for the (possibly downsampled) data on the graph
const getGraphResult = function () {
    if (graphResult === undefined || graphResult === null) {
        return [];
    }
    return graphResult;
};

// sets the global graphResult variable to the (possibly downsampled) data object returned from MatsMethods, in order to make the graph
const setGraphResult = function (result) {
    graphResult = result;
    Session.set('graphDataLoaded', new Date());
    console.log("size of graphResultData is", sizeof(graphResult));
};

// resets the global graphResult variable to null
const resetGraphResult = function () {
    graphResult = null;
    Session.set('graphDataLoaded', new Date());
};

/*
 Curve utilities - used to determine curve labels and colors etc.
 */
const getUsedLabels = function () {
    if (Session.get('UsedLabels') === undefined) {
        return [];
    }
    return Session.get('UsedLabels');
};

const getNextCurveLabel = function () {
    if (Session.get('NextCurveLabel') === undefined) {
        setNextCurveLabel();
    }
    return Session.get('NextCurveLabel');
};

// determine the next curve Label and set it in the session
// private, not exported
const setNextCurveLabel = function () {
    const usedLabels = Session.get('UsedLabels');
    const settings = matsCollections.Settings.findOne({}, {fields: {LabelPrefix: 1}});
    if (settings === undefined) {
        return false;
    }
    const labelPrefix = settings.LabelPrefix;
    // find all the labels that start with our prefix (some could be custom)
    const prefixLabels = _.filter(usedLabels, function (l) {
        return (l && (l.lastIndexOf(labelPrefix, 0) === 0) && (l.match(new RegExp(labelPrefix, 'g')).length) == 1);
    });
    const lastUsedLabel = _.last(prefixLabels);
    var lastLabelNumber = -1;

    if (lastUsedLabel !== undefined) {
        const minusPrefix = lastUsedLabel.replace(labelPrefix, '');
        const tryNum = parseInt(minusPrefix, 10);
        if (!isNaN(tryNum)) {
            lastLabelNumber = tryNum;
        }
    }
    var newLabelNumber = lastLabelNumber + 1;
    var nextCurveLabel = labelPrefix + newLabelNumber;
    // the label might be one from a removed curve so the next ones might be used
    while (_.indexOf(usedLabels, nextCurveLabel) != -1) {
        newLabelNumber++;
        nextCurveLabel = labelPrefix + newLabelNumber;
    }
    Session.set('NextCurveLabel', nextCurveLabel);
};

// determine the next curve color and set it in the session
// private - not exported
const setNextCurveColor = function () {
    var usedColors = Session.get('UsedColors');
    var colors = matsCollections.ColorScheme.findOne({}, {fields: {colors: 1}}).colors;
    var lastUsedIndex = -1;
    if (usedColors !== undefined) {
        lastUsedIndex = _.indexOf(colors, _.last(usedColors));
    }
    var nextCurveColor;
    if (lastUsedIndex !== undefined && lastUsedIndex != -1) {
        if (lastUsedIndex < colors.length - 1) {
            var newIndex = lastUsedIndex + 1;
            nextCurveColor = colors[newIndex];
            // the color might be one from a removed curve so the next ones might be used
            while (_.indexOf(usedColors, nextCurveColor) != -1) {
                newIndex++;
                nextCurveColor = colors[newIndex];
            }
        } else {
            // out of defaults
            var rint = Math.round(0xffffff * Math.random());
            nextCurveColor = 'rgb(' + (rint >> 16) + ',' + (rint >> 8 & 255) + ',' + (rint & 255) + ')';
        }
    } else {
        nextCurveColor = colors[0];
    }
    Session.set('NextCurveColor', nextCurveColor);
};

// get the next curve color from the session
// private - not exported
const getNextCurveColor = function () {
    if (Session.get('NextCurveColor') === undefined) {
        setNextCurveColor();
    }
    return Session.get('NextCurveColor');
};

// clear a used label and set the nextCurveLabel to the one just cleared
const clearUsedLabel = function (label) {
    var usedLabels = Session.get('UsedLabels');
    var newUsedLabels = _.reject(usedLabels, function (l) {
        return l == label;
    });
    Session.set('UsedLabels', newUsedLabels);
    Session.set('NextCurveLabel', label);
};

// clear a used color and set the nextCurveColor to the one just cleared
const clearUsedColor = function (color) {
    var usedColors = Session.get('UsedColors');
    var newUsedColors = _.reject(usedColors, function (c) {
        return c == color;
    });
    Session.set('UsedColors', newUsedColors);
    Session.set('NextCurveColor', color);
};

// clear all the used colors and labels and set the nextCurve values
// to the first in the scheme and the first of the labelPrefix.
// This is used by the removeAll
const clearAllUsed = function () {
    Session.set('UsedColors', undefined);
    var colors = matsCollections.ColorScheme.findOne({}, {fields: {colors: 1}}).colors;
    Session.set('NextCurveColor', colors[0]);
    Session.set('UsedLabels', undefined);
    var labelPrefix = matsCollections.Settings.findOne({}, {fields: {LabelPrefix: 1}}).LabelPrefix;
    Session.set('NextCurveLabel', labelPrefix + 0);
    Session.set('Curves', []);
};

// use curves in session to determine which defaults are already used
// and to set the usedColors in the session
// this is used on restore settings to set up the usedColors
// private - not exported
//setUsedDefaults = function() {
const setUsedColors = function () {
    var curves = Session.get('Curves');
    var usedColors = [];
    for (var i = 0; i < curves.length; i++) {
        var color = curves[i].color;
        usedColors.push(color);
    }
    Session.set('UsedColors', usedColors);
    setNextCurveColor();
};

// private - not exported
const setUsedLabels = function () {
    var curves = Session.get('Curves');
    var usedLabels = [];
    for (var i = 0; i < curves.length; i++) {
        var label = curves[i].label;
        usedLabels.push(label);
    }
    Session.set('UsedLabels', usedLabels);
    setNextCurveLabel();
};

const setUsedColorsAndLabels = function () {
    setUsedColors();
    setUsedLabels();
};

const resetScatterApply = function () {
    if (matsPlotUtils.getPlotType() == matsTypes.PlotTypes.scatter2d) {
        Session.set('axisCurveIcon', 'fa-asterisk');
        Session.set('xaxisCurveText', 'XAXIS NOT YET APPLIED');
        Session.set('yaxisCurveText', 'YAXIS NOT YET APPLIED');
        Session.set('xaxisCurveColor', 'red');
        Session.set('yaxisCurveColor', 'red');
        if (document.getElementById('Fit-Type-radioGroup-none') !== null) {
            document.getElementById('Fit-Type-radioGroup-none').checked = true;
        }
    }
};

// add the difference curves
// private - not exported
const addDiffs = function () {
    var curves = Session.get('Curves');
    var newCurves = Session.get('Curves');
    // diffs is checked -- have to add diff curves
    var curvesLength = curves.length;
    if (curvesLength <= 1) {
        setInfo("You cannot difference less than two curves!");
        return false;
    }

    switch (matsPlotUtils.getPlotFormat()) {
        case matsTypes.PlotFormats.matching:
            var baseIndex = 0; // This will probably not default to curve 0 in the future
            for (var ci = 1; ci < curves.length; ci++) {
                var newCurve = $.extend(true, {}, curves[ci]);
                newCurve.label = curves[ci].label + "-" + curves[0].label;
                newCurve.color = getNextCurveColor();
                newCurve.diffFrom = [ci, baseIndex];
                // do not create extra diff if it already exists
                if (_.findWhere(curves, {label: newCurve.label}) === undefined) {
                    newCurves.push(newCurve);
                    Session.set('Curves', newCurves);
                    setUsedColorsAndLabels();
                }
            }
            break;
        case matsTypes.PlotFormats.pairwise:
            var baseIndex = 0; // This will probably not default to curve 0 in the future
            for (var ci = 1; ci < curves.length; ci++) {
                if (ci % 2 != 0) {  // only diff on odd curves against previous curve
                    baseIndex = ci - 1;
                    var newCurve = $.extend(true, {}, curves[ci]);
                    newCurve.label = curves[ci].label + "-" + curves[baseIndex].label;
                    newCurve.color = getNextCurveColor();
                    newCurve.diffFrom = [ci, baseIndex];
                    // do not create extra diff if it already exists
                    if (_.findWhere(curves, {label: newCurve.label}) === undefined) {
                        newCurves.push(newCurve);
                        Session.set('Curves', newCurves);
                        setUsedColorsAndLabels();
                    }
                }
            }
            break;
        case matsTypes.PlotFormats.absolute:
            var baseIndex = 0; // This will probably not default to curve 0 in the future
            for (var ci = 1; ci < curves.length; ci++) {
                var newCurve = $.extend(true, {}, curves[ci]);
                newCurve.label = curves[ci].label + "-" + curves[0].label;
                newCurve.color = getNextCurveColor();
                newCurve.diffFrom = [ci, baseIndex];
                // do not create extra diff if it already exists
                if (_.findWhere(curves, {label: newCurve.label}) === undefined) {
                    newCurves.push(newCurve);
                    Session.set('Curves', newCurves);
                    setUsedColorsAndLabels();
                }
            }
            break;
    }
};


// remove difference curves
// private - not exported
const removeDiffs = function () {
    var curves = Session.get('Curves');
    var newCurves = _.reject(curves, function (curve) {
        return curve.diffFrom != null
    });
    Session.set('Curves', newCurves);
    setUsedColorsAndLabels();
};

// resolve the difference curves
// (used after adding or removing a curve while the show diffs box is checked)
const checkDiffs = function () {
    var curves = Session.get('Curves');
    if (matsPlotUtils.getPlotType() == matsTypes.PlotTypes.scatter2d) {
        // scatter plots have no concept of difference curves.
        return;
    }
    var plotFormat = matsPlotUtils.getPlotFormat();
    if (curves.length > 1) {
        if (plotFormat !== matsTypes.PlotFormats.none) {
            removeDiffs();
            addDiffs();
        } else {
            removeDiffs();
        }
    }
};

const setSelectorVisibility = function(plotType, faceOptions, selectorsToReset) {
    if (document.getElementById('plot-type-' + plotType).checked === true) {
        // reset selectors that may have been set to something invalid for the new plot type
        const resetSelectors = Object.keys(selectorsToReset);
        for (var ridx = 0; ridx < resetSelectors.length; ridx++) {
            if (matsParamUtils.getParameterForName(resetSelectors[ridx]) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange(resetSelectors[ridx], selectorsToReset[resetSelectors[ridx]]);
            }
        }
        // show/hide selectors appropriate to this plot type
        var elem;
        const faceSelectors = Object.keys(faceOptions);
        for (var fidx = 0; fidx < faceSelectors.length; fidx++) {
            elem = document.getElementById(faceSelectors[fidx] + '-item');
            if (elem && elem.style && (elem.purposelyHidden === undefined || !elem.purposelyHidden)) {
                elem.style.display = faceOptions[faceSelectors[fidx]];
            }
        }
        elem = document.getElementById(matsTypes.PlotTypes.scatter2d);
        if (elem && elem.style) {
            elem.style.display = plotType === matsTypes.PlotTypes.scatter2d ? "block" : "none";
        }
        Session.set('plotType', plotType);
        Session.set('lastUpdate', Date.now());
    }
};

// method to display the appropriate selectors for a timeseries curve
const showTimeseriesFace = function () {
    const plotType = matsTypes.PlotTypes.timeSeries;
    const faceOptions = {
        'curve-dates': 'none',
        'dates': 'block',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'block',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a profile curve
const showProfileFace = function () {
    const plotType = matsTypes.PlotTypes.profile;
    var faceOptions = {
        'curve-dates': 'block',
        'dates': 'none',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'block',
        'level': 'none',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a dieoff curve
const showDieOffFace = function () {
    const plotType = matsTypes.PlotTypes.dieoff;
    var faceOptions = {
        'curve-dates': 'block',
        'dates': 'none',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'none',
        'dieoff-type': 'block',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {};
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a threshold curve
const showThresholdFace = function () {
    const appName = matsCollections.appName.findOne({}).app;
    const plotType = matsTypes.PlotTypes.threshold;
    var faceOptions = {
        'curve-dates': 'block',
        'dates': 'none',
        'statistic': 'block',
        'threshold': 'none',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    // ctc thresholds need to have the region be in predefined mode
    if (appName !== undefined && (appName.includes("ceiling") || appName.includes("visibility")) && matsParamUtils.getParameterForName('region-type') !== undefined) {
        faceOptions['region-type'] = 'none';
        selectorsToReset['region-type'] = 'Predefined region';
    }
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a valid time curve
const showValidTimeFace = function () {
    const plotType = matsTypes.PlotTypes.validtime;
    var faceOptions = {
        'curve-dates': 'block',
        'dates': 'none',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'none',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a grid scale curve
const showGridScaleFace = function () {
    const plotType = matsTypes.PlotTypes.gridscale;
    var faceOptions = {
        'curve-dates': 'block',
        'dates': 'none',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'none',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a daily model cycle curve
const showDailyModelCycleFace = function () {
    const plotType = matsTypes.PlotTypes.dailyModelCycle;
    var faceOptions = {
        'curve-dates': 'none',
        'dates': 'block',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'none',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'none',
        'utc-cycle-start': 'block',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a reliability curve
const showReliabilityFace = function () {
    const plotType = matsTypes.PlotTypes.reliability;
    var faceOptions = {
        'curve-dates': 'none',
        'dates': 'block',
        'statistic': 'none',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a ROC curve
const showROCFace = function () {
    const plotType = matsTypes.PlotTypes.roc;
    var faceOptions = {
        'curve-dates': 'none',
        'dates': 'block',
        'statistic': 'none',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a map
const showMapFace = function () {
    const plotType = matsTypes.PlotTypes.map;
    var faceOptions = {
        'curve-dates': 'none',
        'dates': 'block',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'none',
        'region-type' : 'none',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    // maps need to have the region be station-select mode
    if (matsParamUtils.getParameterForName('region-type') !== undefined) {
        if (matsParamUtils.getOptionsForParam('region-type').indexOf('Select stations (bias only)') !== -1) {
            selectorsToReset['region-type'] = 'Select stations (bias only)';
        } else {
            selectorsToReset['region-type'] = 'Select stations';
        }
    }
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a histogram
const showHistogramFace = function () {
    const appName = matsCollections.appName.findOne({}).app;
    const plotType = matsTypes.PlotTypes.histogram;
    var faceOptions = {
        'curve-dates': 'block',
        'dates': 'none',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'block',
        'histogram-yaxis-controls': 'block',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    // ctc histograms need to have the region be in predefined mode
    if (appName !== undefined && (appName.includes("ceiling") || appName.includes("visibility")) && matsParamUtils.getParameterForName('region-type') !== undefined) {
        faceOptions['region-type'] = 'none';
        selectorsToReset['region-type'] = 'Predefined region';
    }
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a histogram
const showEnsembleHistogramFace = function () {
    const plotType = matsTypes.PlotTypes.ensembleHistogram;
    var faceOptions = {
        'curve-dates': 'block',
        'dates': 'none',
        'statistic': 'none',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'block',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'block',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a contour plot
const showContourFace = function () {
    const plotType = (document.getElementById('plot-type-' + matsTypes.PlotTypes.contour) !== null && document.getElementById('plot-type-' + matsTypes.PlotTypes.contour).checked) ? matsTypes.PlotTypes.contour : matsTypes.PlotTypes.contourDiff;
    var faceOptions = {
        'curve-dates': 'none',
        'dates': 'block',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'none',
        'x-axis-parameter': 'block',
        'y-axis-parameter': 'block',
        'significance': plotType === matsTypes.PlotTypes.contourDiff ? 'block' : 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    // contours need to have the region be in predefined mode
    if (matsParamUtils.getParameterForName('region-type') !== undefined) {
        selectorsToReset['region-type'] = 'Predefined region';
    }
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

// method to display the appropriate selectors for a scatter plot
const showScatterFace = function () {
    const plotType = matsTypes.PlotTypes.scatter2d;
    var faceOptions = {
        'curve-dates': 'none',
        'dates': 'block',
        'statistic': 'block',
        'threshold': 'block',
        'scale': 'block',
        'level': 'block',
        'forecast-length': 'block',
        'dieoff-type': 'none',
        'average': 'none',
        'valid-time': 'block',
        'utc-cycle-start': 'none',
        'histogram-type-controls': 'none',
        'histogram-bin-controls': 'none',
        'histogram-yaxis-controls': 'none',
        'bin-number': 'none',
        'bin-start': 'none',
        'bin-stride': 'none',
        'bin-pivot': 'none',
        'bin-bounds': 'none',
        'truth': 'block',
        'region-type' : 'block',
        'x-axis-parameter': 'none',
        'y-axis-parameter': 'none',
        'significance': 'none'
    };
    const selectorsToReset = {
        'dieoff-type': 'Dieoff'
    };
    setSelectorVisibility(plotType, faceOptions, selectorsToReset);
    return selectorsToReset;
};

const showSpinner = function () {
    if (document.getElementById("spinner")) {
        document.getElementById("spinner").style.display = "block";
    }
};
const hideSpinner = function () {
    if (document.getElementById("spinner")) {
        document.getElementById("spinner").style.display = "none";
    }
};

export default matsCurveUtils = {
    addDiffs: addDiffs,
    checkDiffs: checkDiffs,
    clearAllUsed: clearAllUsed,
    clearUsedColor: clearUsedColor,
    clearUsedLabel: clearUsedLabel,
    getGraphResult: getGraphResult,
    getNextCurveColor: getNextCurveColor,
    getNextCurveLabel: getNextCurveLabel,
    getPlotResultData: getPlotResultData,
    getUsedLabels: getUsedLabels,
    hideSpinner: hideSpinner,
    removeDiffs: removeDiffs,
    resetGraphResult: resetGraphResult,
    resetPlotResultData: resetPlotResultData,
    resetScatterApply: resetScatterApply,
    setGraphResult: setGraphResult,
    setUsedColorsAndLabels: setUsedColorsAndLabels,
    setUsedLabels: setUsedLabels,
    showSpinner: showSpinner,
    showTimeseriesFace: showTimeseriesFace,
    showProfileFace: showProfileFace,
    showDieOffFace: showDieOffFace,
    showThresholdFace: showThresholdFace,
    showValidTimeFace: showValidTimeFace,
    showGridScaleFace: showGridScaleFace,
    showDailyModelCycleFace: showDailyModelCycleFace,
    showReliabilityFace: showReliabilityFace,
    showROCFace: showROCFace,
    showMapFace: showMapFace,
    showHistogramFace: showHistogramFace,
    showEnsembleHistogramFace: showEnsembleHistogramFace,
    showContourFace: showContourFace,
    showScatterFace: showScatterFace,
};

            