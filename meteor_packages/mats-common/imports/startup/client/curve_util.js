import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import { Info } from 'meteor/randyp:mats-common';

/*
 global dataset variable - container for graph dataset.
 This (plotResult) is very important. It isn't "var" because it needs to be a meteor global scope.
 The page is rendered whe the graph page comes up, but the data from the data processing callback
 in plotList.js or curveList.js may not have set the global variable
 PlotResult. The callback sets the variable then sets the session variable plotResultsUpDated.
 Referring to plotResultsUpDated in the textView templates causes the template to get re-loaded with the current graph data
 (which is in the PlotResults global).
 */

PlotResult = {};

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

//determine the next curve Label and set it in the session
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
        return ((l.lastIndexOf(labelPrefix, 0) === 0) && (l.match(new RegExp(labelPrefix, 'g')).length) == 1);
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

//determine the next curve color and set it in the session
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
        if (lastUsedIndex < colors.length -1) {
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

//clear a used color and set the nextCurveColor to the one just cleared
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

//private - not exported
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

const resetScatterApply = function() {
    if (matsPlotUtils.getPlotType() == matsTypes.PlotTypes.scatter2d) {
        Session.set('axisCurveIcon', 'fa-asterisk');
        Session.set('xaxisCurveText', 'XAXIS NOT YET APPLIED');
        Session.set('yaxisCurveText', 'YAXIS NOT YET APPLIED');
        Session.set('xaxisCurveColor', 'red');
        Session.set('yaxisCurveColor', 'red');
        document.getElementById('Fit-Type-radioGroup-none').checked = true;
    }
};

// add the difference curves
//private - not exported
const addDiffs = function () {
    var curves = Session.get('Curves');
    var newCurves = Session.get('Curves');
    // diffs is checked -- have to add diff curves
    var curvesLength = curves.length;
    if (curvesLength <= 1) {
        setInfo( "You cannot difference less than two curves!" );
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
                    var base_index = ci - 1;

                    var newCurve = $.extend(true, {}, curves[ci]);
                    newCurve.label = curves[ci].label + "-" + curves[base_index].label;
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


//remove difference curves
//private - not exported
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

const showProfileFace = function() {
    // move dates selector to curve parameters - one date range for each curve
    if (document.getElementById('plot-type-' + matsTypes.PlotTypes.profile).checked === true) {
        var elem = document.getElementById(matsTypes.PlotTypes.scatter2d);
        if (elem && elem.style) {
            elem.style.display = "none";
        }
        elem = document.getElementById('curve-dates-item');
        if (elem && elem.style) {
            elem.style.display = "block";
        }
        elem = document.getElementById('dates-item');
        if (elem && elem.style) {
            elem.style.display = "none";
        }
        elem = document.getElementById('average-item');
        if (elem && elem.style) {
            elem.style.display = "none";
        }
        Session.set('plotType', matsTypes.PlotTypes.profile);
        Session.set('lastUpdate', Date.now());   // force curveParams to re-render
    }
};

const showTimeseriesFace = function() {
    // move dates selector to plot parameters - one date range for all curves
    if (document.getElementById('plot-type-' + matsTypes.PlotTypes.timeSeries).checked === true) {
        var elem = document.getElementById(matsTypes.PlotTypes.scatter2d);
        if (elem && elem.style) {
            elem.style.display = "none";
        }
        elem = document.getElementById('curve-dates-item');
        if (elem && elem.style) {
            elem.style.display = "none";
        }
        elem = document.getElementById('dates-item');
        if (elem && elem.style) {
            elem.style.display = "block";
        }
        elem = document.getElementById('average-item');
        if (elem && elem.style) {
            elem.style.display = "block";
        }
        Session.set('plotType', matsTypes.PlotTypes.timeSeries);
        Session.set('lastUpdate', Date.now());   // force curveParams to re-render
    }
};

const showScatterFace = function() {
    if (document.getElementById('plot-type-' + matsTypes.PlotTypes.scatter2d).checked === true) {
        var elem = document.getElementById(matsTypes.PlotTypes.scatter2d);
        if (elem && elem.style) {
            elem.style.display = "block";
        }
        Session.set('plotType', matsTypes.PlotTypes.scatter2d);
        Session.set('lastUpdate', Date.now());   // force curveParams to re-render
    }
};


const removeAllCurves = function() {
    // remove all curves
    document.getElementById('remove-all') && document.getElementById('remove-all').click();
    clearAllUsed();
};

export default matsCurveUtils = {
    resetScatterApply:resetScatterApply,
    getUsedLabels:getUsedLabels,
    getNextCurveLabel:getNextCurveLabel,
    getNextCurveColor:getNextCurveColor,
    clearAllUsed:clearAllUsed,
    clearUsedLabel:clearUsedLabel,
    clearUsedColor:clearUsedColor,
    setUsedLabels:setUsedLabels,
    setUsedColorsAndLabels:setUsedColorsAndLabels,
    addDiffs:addDiffs,
    removeDiffs:removeDiffs,
    checkDiffs:checkDiffs,
    showScatterFace:showScatterFace,
    showTimeseriesFace:showTimeseriesFace,
    showProfileFace:showProfileFace,
    removeAllCurves:removeAllCurves,
    PlotResult:PlotResult
};

            