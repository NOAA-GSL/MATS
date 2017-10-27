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
        if (document.getElementById('Fit-Type-radioGroup-none') !== null) {
            document.getElementById('Fit-Type-radioGroup-none').checked = true;
        }
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
        elem = document.getElementById('forecast-length-item');
        if (elem && elem.style) {
            elem.style.display = "block";
        }
        elem = document.getElementById('dieoff-forecast-length-item');
        if (elem && elem.style) {
            elem.style.display = "none";
        }
        Session.set('plotType', matsTypes.PlotTypes.profile);
        matsParamUtils.setAllParamsToDefault();
        Session.set('lastUpdate', Date.now());
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
        elem = document.getElementById('forecast-length-item');
        if (elem && elem.style) {
            elem.style.display = "block";
        }
        elem = document.getElementById('dieoff-forecast-length-item');
        if (elem && elem.style) {
            elem.style.display = "none";
        }
        Session.set('plotType', matsTypes.PlotTypes.timeSeries);
        matsParamUtils.setAllParamsToDefault();
        Session.set('lastUpdate', Date.now());
    }
};


const showDieOffFace = function() {
    // move dates selector to plot parameters - one date range for all curves
    if (document.getElementById('plot-type-' + matsTypes.PlotTypes.dieoff).checked === true) {
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
            elem.style.display = "none";
        }
        elem = document.getElementById('forecast-length-item');
        if (elem && elem.style) {
            elem.style.display = "none";
        }
        elem = document.getElementById('dieoff-forecast-length-item');
        if (elem && elem.style) {
            elem.style.display = "block";
        }
        Session.set('plotType', matsTypes.PlotTypes.dieoff);
        matsParamUtils.setAllParamsToDefault();
        Session.set('lastUpdate', Date.now());
    }
};

const showScatterFace = function() {
    if (document.getElementById('plot-type-' + matsTypes.PlotTypes.scatter2d).checked === true) {
        var elem = document.getElementById(matsTypes.PlotTypes.scatter2d);
        if (elem && elem.style) {
            elem.style.display = "block";
        }
        elem = document.getElementById('forecast-length-item');
        if (elem && elem.style) {
            elem.style.display = "block";
        }
        elem = document.getElementById('dieoff-forecast-length-item');
        if (elem && elem.style) {
            elem.style.display = "none";
        }
        Session.set('plotType', matsTypes.PlotTypes.scatter2d);
        Session.set('lastUpdate', Date.now());   // force curveParams to re-render
        matsParamUtils.setAllParamsToDefault();
        Session.set('lastUpdate', Date.now());
    }
};

const get_err = function (sVals, sSecs) {
    /* THIS IS DIFFERENT FROM THE ONE IN DATA_UTILS,
       This one does not throw away outliers and it captures minVal and maxVal
       refer to perl error_library.pl sub  get_stats
        to see the perl implementation of these statics calculations.
        These should match exactly those, except that they are processed in reverse order.
     */
    var subVals = [];
    var subSecs = [];
    var sVals = sVals;
    var sSecs = sSecs;
    var n = sVals.length;
    var n_good =0;
    var sum_d=0;
    var sum2_d =0;
    var error = "";
    var i;
    for(i=0; i< n; i++ ){
        if (sVals[i] !== null) {
            n_good = n_good + 1;
            sum_d = sum_d + sVals[i];
            sum2_d = sum2_d + sVals[i] * sVals[i];
            subVals.push(sVals[i]);
            subSecs.push(sSecs[i]);
        }
    }
    var d_mean = sum_d/n_good;
    var sd2 = sum2_d/n_good - d_mean *d_mean;
    var sd = sd2 > 0 ? Math.sqrt(sd2) : sd2;
    var sd_limit = 3*sd;
    //console.log("see error_library.pl l208 These are processed in reverse order to the perl code -  \nmean is " + d_mean + " sd_limit is +/- " + sd_limit + " n_good is " + n_good + " sum_d is" + sum_d + " sum2_d is " + sum2_d);
    // find minimum delta_time, if any value missing, set null
    var last_secs = Number.MIN_VALUE;
    var minDelta = Number.MAX_VALUE;
    var minSecs = Number.MAX_VALUE;
    var max_secs = Number.MIN_VALUE;
    var minVal = Number.MAX_VALUE;
    var maxVal = Number.MIN_VALUE;
    for(i=0; i< subSecs.length; i++){
        var secs = (subSecs[i]);
        var delta = Math.abs(secs - last_secs);
        if(delta < minDelta) {
            minDelta = delta;
        }
        if(secs < minSecs) {
            minSecs = secs;
        }
        if(secs >max_secs) {
            max_secs = secs;
        }
        last_secs = secs;
    }

    var data_wg =[];
    var n_gaps =0;
    n_good = 0;
    var sum = 0;
    var sum2 = 0;
    var loopTime =minSecs;
    if (minDelta < 0) {
        error = ("Invalid time interval - minDelta: " + minDelta);
    }
    // remove data more than $sd_limit from mean
     for (i=0; i < subVals.length; i++) {
         minVal = minVal < subVals[i] ? minVal : subVals[i];
         maxVal = maxVal > subVals[i] ? maxVal : subVals[i];
         n_good++;
     }
    //console.log("new mean after throwing away outliers is " + sd + " n_good is " + n_good + " sum is " + sum  + " sum2 is " + sum2 + " d_mean is " + d_mean);
    // look for gaps.... per Bill, we only need one gap per series of gaps...
    var lastSecond = Number.MIN_VALUE;

    for(i=0; i< subSecs.length; i++){
        var sec = subSecs[i];
        if(lastSecond >= 0) {
            if(sec - lastSecond > minDelta) {
                // insert a gap
                data_wg.push(null);
                n_gaps++;
            }
        }
        lastSecond = sec;
        data_wg.push(subVals[i]);
    }
    //console.log ("n_gaps: " + n_gaps +  " time gaps in subseries");

    //from http://www.itl.nist.gov/div898/handbook/eda/section3/eda35c.htm
    var r =[];
    for(var lag=0;lag<=1; lag++) {
        r[lag] = 0;
        var n_in_lag = 0;
        for (var t = 0; t < ((n + n_gaps) - lag); t++) {
            if (data_wg[t] != null && data_wg[t + lag] != null) {
                r[lag] +=  + (data_wg[t] - d_mean) * (data_wg[t + lag] - d_mean);
                n_in_lag++;
            }
        }
        if (n_in_lag > 0 && sd > 0) {
            r[lag] /= (n_in_lag * sd * sd);
        } else {
            r[lag] = null;
        }
        //console.log('r for lag ' + lag + " is " + r[lag] + " n_in_lag is " + n_in_lag + " n_good is " + n_good);
    }
    // Betsy Weatherhead's correction, based on lag 1
    if(r[1] >= 1) {
        r[1] = .99999;
    }
    const betsy = Math.sqrt((n_good-1)*(1 - r[1]));
    var stde_betsy;
    if(betsy != 0) {
        stde_betsy = sd/betsy;
    } else {
        stde_betsy = null;
    }
    const stats = {d_mean:d_mean, stde_betsy:stde_betsy, sd:sd, n_good:n_good, lag1:r[1], min:minSecs, max:max_secs, minVal: minVal, maxVal: maxVal, sum:sum_d};
    //console.log("stats are " + JSON.stringify(stats));
    // stde_betsy is standard error with auto correlation
    //console.log("---------\n\n");
    return stats;
};

const showSpinner = function() {
    document.getElementById("spinner").style.display = "block";
}
const hideSpinner = function() {
    document.getElementById("spinner").style.display = "none";
}

const squareWidth = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw, vph);
    if (min < 400) {
        return (.9 * min).toString() + "px";
    } else {
        return (.7 * min).toString() + "px";
    }
};
const squareHeight = function () {
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
        return (.8 * vpw).toString() + "px";
    }
};
const rectangleHeight = function () {
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    if (vph < 400) {
        return (.8 * vph).toString() + "px";
    } else {
        return (.6 * vph).toString() + "px";
    }
};

const resizeGraph = function(plotType) {
    console.log ("resizing graph type is ", plotType );
    switch (plotType) {
        case matsTypes.PlotTypes.profile:
        case matsTypes.PlotTypes.scatter2d:
            // set the width square
            document.getElementById('placeholder').style.width = squareWidth();
            document.getElementById('placeholder').style.heigth = squareHeight();
            break;
        case matsTypes.PlotTypes.timeSeries:
        case matsTypes.PlotTypes.dieoff:
            // set the width wide
            document.getElementById('placeholder').style.width = rectangleWidth();
            document.getElementById('placeholder').style.heigth = rectangleHeight();
        default:

    }
}

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
    showDieOffFace:showDieOffFace,
    get_err:get_err,
    PlotResult:PlotResult,
    showSpinner:showSpinner,
    hideSpinner:hideSpinner,
    resizeGraph:resizeGraph
};

            