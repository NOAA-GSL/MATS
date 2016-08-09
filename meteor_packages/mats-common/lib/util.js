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
getUsedLabels = function () {
    if (Session.get('UsedLabels') === undefined) {
        return [];
    }
    return Session.get('UsedLabels');
};

getNextCurveLabel = function () {
    if (Session.get('NextCurveLabel') === undefined) {
        setNextCurveLabel();
    }
    return Session.get('NextCurveLabel');
};

//determine the next curve Label and set it in the session
setNextCurveLabel = function () {
    var usedLabels = Session.get('UsedLabels');
    var settings = Settings.findOne({}, {fields: {LabelPrefix: 1}});
    if (settings === undefined) {
        return false;
    }
    var labelPrefix = settings.LabelPrefix;
    // find all the labels that start with our prefix (some could be custom)
    var prefixLabels = _.filter(usedLabels, function (l) {
        return ((l.lastIndexOf(labelPrefix, 0) === 0) && (l.match(new RegExp(labelPrefix, 'g')).length) == 1);
    });
    var lastUsedLabel = _.last(prefixLabels);
    var lastLabelNumber = -1;
    if (lastUsedLabel !== undefined) {
        lastLabelNumber = Number(lastUsedLabel.replace(labelPrefix, ''));
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
setNextCurveColor = function () {
    var usedColors = Session.get('UsedColors');
    var colors = ColorScheme.findOne({}, {fields: {colors: 1}}).colors;
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

getNextCurveColor = function () {
    if (Session.get('NextCurveColor') === undefined) {
        setNextCurveColor();
    }
    return Session.get('NextCurveColor');
};

//clearUsedDefaultByLabel = function(label) {
// clear a used label and set the nextCurveLabel to the one just cleared
clearUsedLabel = function (label) {
    var usedLabels = Session.get('UsedLabels');
    var newUsedLabels = _.reject(usedLabels, function (l) {
        return l == label;
    });
    Session.set('UsedLabels', newUsedLabels);
    Session.set('NextCurveLabel', label);
};

//clear a used color and set the nextCurveColor to the one just cleared
clearUsedColor = function (color) {
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
clearAllUsed = function () {
    Session.set('UsedColors', []);
    var colors = ColorScheme.findOne({}, {fields: {colors: 1}}).colors;
    Session.set('NextCurveColor', colors[0]);
    Session.set('UsedLabels', []);
    var labelPrefix = Settings.findOne({}, {fields: {LabelPrefix: 1}}).LabelPrefix;
    Session.set('NextCurveLabel', labelPrefix + 1);
};

// use curves in session to determine which defaults are already used
// and to set the usedColors in the session
// this is used on restore settings to set up the usedColors
//setUsedDefaults = function() {
setUsedColors = function () {
    var curves = Session.get('Curves');
    var usedColors = [];
    for (var i = 0; i < curves.length; i++) {
        var color = curves[i].color;
        usedColors.push(color);
    }
    Session.set('UsedColors', usedColors);
    setNextCurveColor();
};

setUsedLabels = function () {
    var curves = Session.get('Curves');
    var usedLabels = [];
    for (var i = 0; i < curves.length; i++) {
        var label = curves[i].label;
        usedLabels.push(label);
    }
    Session.set('UsedLabels', usedLabels);
    setNextCurveLabel();
};

setUsedColorsAndLabels = function () {
    setUsedColors();
    setUsedLabels();
};


/*
generic Math Functions
 */
 isNum = function (args)
{
    if (args == null || args == undefined) {
        return false;
    }
    args = args.toString();
    if (args.length == 0) return false;

    for (var i = 0;  i<args.length;  i++)
    {
        if ((args.substring(i,i+1) < "0" || args.substring(i, i+1) > "9") && args.substring(i, i+1) != "."&& args.substring(i, i+1) != "-")
        {
            return false;
        }
    }

    return true;
};

mean = function (arr)
{
    var len = 0;
    var sum = 0;

    for(var i=0;i<arr.length;i++)
    {
        if (arr[i] == ""){}
        else if (!isNum(arr[i]))
        {
            //alert(arr[i] + " is not number!");
            console.log("Error: value at position: " + i + " is not number! Mean Calculation failed!" );
            return 0;
        }
        else
        {
            len = len + 1;
            sum = sum + parseFloat(arr[i]);
        }
    }
    return sum / len;
};

variance = function (arr)
{
    var len = 0;
    var sum=0;
    for(var i=0;i<arr.length;i++)
    {
        if (arr[i] == ""){}
        else if (!isNum(arr[i]))
        {
            //alert(arr[i] + " is not number, Variance Calculation failed!");
            console.log ("value at position " + i + " is not number, Variance Calculation failed!");
            return 0;
        }
        else
        {
            len = len + 1;
            sum = sum + parseFloat(arr[i]);
        }
    }

    var v = 0;
    if (len > 1)
    {
        var mean = sum / len;
        for(var i=0;i<arr.length;i++)
        {
            if (arr[i] == ""){}
            else
            {
                v = v + (arr[i] - mean) * (arr[i] - mean);
            }
        }

        return v / len;
    }
    else
    {
        return 0;
    }
};


median = function (arr)
{
    arr.sort(function(a,b){return a-b});

    var median = 0;

    if (arr.length % 2 == 1)
    {
        median = arr[(arr.length+1)/2 - 1];
    }
    else
    {
        median = (1 * arr[arr.length/2 - 1] + 1 * arr[arr.length/2] )/2;
    }

    return median
};


// add the difference curves
addDiffs = function () {
    var curves = Session.get('Curves');
    var newCurves = Session.get('Curves');
    // diffs is checked -- have to add diff curves
    var curvesLength = curves.length;
    if (curvesLength <= 1) {
        alert("You cannot difference less than two curves!");
        return false;
    }

    switch (getPlotFormat()) {
        case PlotFormats.matching:
            var baseIndex = 0; // This will probably not default to curve 0 in the future
            for (var ci = 1; ci < curves.length; ci++) {
                var newCurve = jQuery.extend(true, {}, curves[ci]);
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
        case PlotFormats.pairwise:
            var baseIndex = 0; // This will probably not default to curve 0 in the future
            for (var ci = 1; ci < curves.length; ci++) {
                if (ci % 2 != 0) {  // only diff on odd curves against previous curve
                    base_index = ci - 1;

                    var newCurve = jQuery.extend(true, {}, curves[ci]);
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
        case PlotFormats.absolute:
            var baseIndex = 0; // This will probably not default to curve 0 in the future
            for (var ci = 1; ci < curves.length; ci++) {
                var newCurve = jQuery.extend(true, {}, curves[ci]);
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


/*
Curve differencing utilities
 */
//remove difference curves
removeDiffs = function () {
    var curves = Session.get('Curves');
    var newCurves = _.reject(curves, function (curve) {
        return curve.diffFrom != null
    });
    Session.set('Curves', newCurves);
    setUsedColorsAndLabels();
};

// resolve the difference curves
// (used after adding or removing a curve while the show diffs box is checked)
checkDiffs = function () {
    var curves = Session.get('Curves');
    if (getPlotType() == PlotTypes.scatter2d) {
        // scatter plots have no concept of difference curves.
        return;
    }
    var plotFormat = getPlotFormat();
    if (curves.length > 1) {
        if (plotFormat !== PlotFormats.none) {
            removeDiffs();
            addDiffs();
        } else {
            removeDiffs();
        }
    }
};

/*
various document utilities
 */

// determine the axisText (used in scatter_axis.js for example)
// according to the Scatter Axis Text Patterns Pattern defined in
// ScatterAxisTextPatterns according to plotType - and derived from
// currently selected inputs in the document.

getAxisText = function(plotType) {
    var scatterAxisTextPattern = ScatterAxisTextPattern.findOne({plotType:getPlotType()}).textPattern;
    if (scatterAxisTextPattern === undefined) {
        return "";
    }
    var text = "";
    for (var i = 0; i < scatterAxisTextPattern.length; i++) {
        var pName = scatterAxisTextPattern[i][0];
        var delimiter = scatterAxisTextPattern[i][1];
        var value = getValueForParamName(pName);
        text += value += delimiter;
    }
    return text;
};

// determine the curveText (used in curveItem for example) for a given curve (from Session.get('curves'))
// that has already been added
getCurveText = function(plotType, curve){
    var curveTextPattern = CurveTextPatterns.findOne({plotType:plotType}).textPattern;
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
getPlotType = function () {
    var buttons = document.getElementsByName('plot-type');
    for (var i = 0, len = buttons.length; i < len; i++) {
        if (buttons[i].checked) {
            return buttons[i].value;
        }
    }
    return "";    // error condition actually - shouldn't ever happen
};

// determine which plotFormat radio button is checked
getPlotFormat = function() {
    var buttons = document.getElementsByName('plotFormat');
    var optionsMap = PlotParams.findOne({name:'plotFormat'}).optionsMap;
    for (var i = 0, len = buttons.length; i < len; i++) {
        if (buttons[i].checked) {
            return _.invert(optionsMap)[buttons[i].value];
        }
    }
    return "";  // error condition actually - shouldn't ever happen
};

// Determine which BestFit radio button is checked
getBestFit = function() {
    var buttons = document.getElementsByName('scatter2d-best-fit');
    var optionsMap = PlotParams.findOne({name:'bestFit'}).optionsMap;
    for (var i = 0, len = buttons.length; i < len; i++) {
        if (buttons[i].checked) {
            return _.invert(optionsMap)[buttons[i].value];
        }
    }
    return "";  // error condition actually - shouldn't ever happen
};

// get the document id for the control button element that corresponds to the param name
getControlButtonIdForParamName = function(paramName) {
    var param = CurveParams.findOne({name: paramName});
    if (param !== undefined) {
        var id = "controlButton-" + param.name;
        return id;
    }
};

// get the control Button Element fthat corresponds to the param name
getControlElementForParamName = function(paramName) {
    return document.getElementById(getControlButtonIdForParamName(paramName));
};

// get the document element that corresponds to the param name
getValueElementForParamName = function(paramName) {
    return document.getElementById(getValueIdForParamName(paramName));
};

// get the current selected value in the document element that corresponds to the param name
// Note that the value should be reflected in the adjoining control button value textContent.
getValueForParamName = function(paramName){
    return getValueElementForParamName(paramName).textContent;
};


// get the VALUE BOX id for the element that corresponds to the param name
getValueIdForParamName = function(paramName) {
    return "controlButton-" + paramName + "-value";
};

// set the VALUE BOX text for the element that corresponds to the param name
setValueTextForParamName = function(paramName, text) {
    try {
        var text = text;
        var value = text;
        var param = CurveParams.findOne({name: paramName});
        if (param === undefined) {
            param = PlotParams.findOne({name: paramName});
        }
        if (param === undefined) {
            return;
        }
        if (param.type === InputTypes.dateRange) {
            value = document.getElementById(name + '-' + type).value;
            text = value;
        } else if (param.multiple) {
            // .... if multi selected  get the first .. last
            var selection = getInputElementForParamName(paramName).selectedOptions;
            if (selection.length == 0) {
                text = "";
            } else if (selection.length == 1) {
                text = selection[0].textContent;
            } else {
                text = selection[0].textContent + " .. " + selection[selection.length - 1].textContent;
            }
            value = [];
            for(var i = 0; i < selection.length; i++) {
                value.push(selection[i].textContent);
            }
        }
        getValueElementForParamName(paramName).textContent = text;
        var elem = document.getElementById(InputTypes.controlButton + "-" + paramName + '-value');
        elem.setAttribute("data-mats-currentValue", value);
    } catch(error){
        console.log ("Error: could not find param: " + paramName);
    }
};

// get the document id for the element that corresponds to the param name
getInputIdForParamName = function(paramName) {
    var param = CurveParams.findOne({name: paramName});
    if (param !== undefined) {
        var id = param.name + "-" + param.type;
        return id;
    }
};

// get the document element that corresponds to the param name
getInputElementForParamName = function(paramName) {
    return document.getElementById(getInputIdForParamName(paramName));
};

// set the input for the element that corresponds to the param name
setInputForParamName = function(paramName) {
    var id = getInputIdForParamName(paramName);
    // set the element ... type dependent
    //FIX ME - NOT COMPLETE
};

// set the data for the element that corresponds to the param name
// setElementDataForParamName = function (paramName, value) {
//     var elem = document.getElementById(InputTypes.controlButton + "-" + paramName + '-value');
//
//     elem.setAttribute("data-mats-currentValue", value);
// };

getElementDataForParamName = function(paramName) {
    var elem = document.getElementById(InputTypes.controlButton + "-" + paramName + '-value');
    return elem.getAttribute("data-mats-currentValue");
};

