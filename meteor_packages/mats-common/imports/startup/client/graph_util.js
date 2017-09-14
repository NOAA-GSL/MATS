const setNoDataLabels = function (dataset) {
// set the label for the hide show buttons (NO DATA) for the initial time here
    for (var c = 0; c < dataset.length; c++) {
        if (dataset[c].data.length === 0) {
            Session.set(dataset[c].curveId + "hideButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style = "background-color:red";
            }
            Session.set(dataset[c].curveId + "pointsButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-points')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style = "background-color:red";
            }
            Session.set(dataset[c].curveId + "errorBarButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-errorbars')) {
                document.getElementById(dataset[c].curveId + '-curve-errorbars').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-errorbars').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-errorbars').style = "background-color:red";
            }
        } else {
            Session.set(dataset[c].curveId + "hideButtonText", 'hide curve');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide').value = 'hide curve';
                document.getElementById(dataset[c].curveId + '-curve-show-hide').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style = "background-color:" + dataset[c].color;
            }
            Session.set(dataset[c].curveId + "pointsButtonText", 'hide points');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-points')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').value = 'hide points';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style = "background-color:" + dataset[c].color;
            }
            Session.set(dataset[c].curveId + "errorBarButtonText", 'hide error bars');
            if (document.getElementById(dataset[c].curveId + '-curve-errorbars')) {
                document.getElementById(dataset[c].curveId + '-curve-errorbars').value = 'hide error bars';
                document.getElementById(dataset[c].curveId + '-curve-errorbars').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-errorbars').style = "background-color:" + dataset[c].color;
            }
        }
    }
};

const normalizeYAxis = function (ranges, options) {
    /*
     The range object will have one or more yaxis values.
     For 1 curve it will have ranges.yaxis
     for n curves it will have yaxis - which is the leftmost curve - and yaxis2, yaxis3, .... yaxisn which are in order left to right.
     For some reason the yaxis will duplicate one of the others so the duplicated one must be skipped.

     The options object will have a yaxes array of n objects. The 0th yaxes[0] is the leftmost curve.
     The other axis are in order left to right.

     First we sort the ranges axis to get yaxis, yaxis2, yaxis3 .... skipping the duplicated one
     Then we assign the ranges from and to values to each of the options yaxes min and max values in order.
     */
    var yaxisRangesKeys = _.difference(Object.keys(ranges), ["xaxis"]); // get just the yaxis from the ranges... yaxis, yaxis2, yaxis3...., yaxisn
    // I want the yaxis first then the y1axis y2axis etc...
    yaxisRangesKeys = ["yaxis"].concat(_.difference(Object.keys(ranges),["xaxis","yaxis"]).sort());
    var yaxisFrom = ranges['yaxis'].from;
    var yaxisTo = ranges['yaxis'].to;
    for (var i =0; i < yaxisRangesKeys.length; i++) {
        // [yaxis,y2axis,y3axis ....]
        if (i !== 0) {
            // might have to skip a duplicated axis... but never yaxis
            if (yaxisFrom == ranges[yaxisRangesKeys[i]].from && yaxisTo == ranges[yaxisRangesKeys[i]].to) {
                continue; // this is duplicated with yaxis
            }
        }
        if (ranges[yaxisRangesKeys[i]] && options.yaxes[i]) {
            options.yaxes[i].min = ranges[yaxisRangesKeys[i]].from;
            options.yaxes[i].max = ranges[yaxisRangesKeys[i]].to;
        }
    }
    options.xaxes[0].min = ranges.xaxis.from;
    options.xaxes[0].max = ranges.xaxis.to;

    return options;
};

const drawGraph = function(ranges, options) {
    var zOptions = $.extend(true, {}, options, matsGraphUtils.normalizeYAxis(ranges,options));
    plot = $.plot(placeholder, dataset, zOptions);
};

const drawErrorCaps = function (ctx, lowerx, upperx, y, radius) {
    // ctx is CanvasRenferingContext2d
    ctx.beginPath();
    var r2 = radius / 2;
    var minWidth = 20;  // sort of arbitrary, really
    var width = ((upperx - lowerx) <= minWidth) ? 1 : ((upperx - lowerx) - minWidth) / 2;
    ctx.fillStyle = 'white';
    ctx.rect(lowerx, y - r2, width, radius);
    ctx.stroke();
    ctx.fill();
    ctx.rect(upperx - width, y - r2, width, radius);
    ctx.stroke();
    ctx.fill();

};

const lSquareCap = function (ctx, x, y, radius) {
    lowerx = x;
    // this is where you would make the xradius vary by the size of the error
    var xradius = radius;
    var yradius = radius;
   drawErrorCaps(ctx, lowerx, upperx, y, radius);
};

var uSquareCap = function (ctx, x, y, radius) {
    // upper gets called first -- see drawError in flot
    upperx = x;
};

const normalizeYAxisByRanges = function (ranges) {
    /*
     The way the axis work, if there is only one yaxis the yaxis must be an object
     but if there are multiple yaxis the yaxis must be an array.
     */
    var axis = {};
    var axisKeys = _.keys(ranges);
    for (var i = 0; i < axisKeys.length; i++) {
        var axisKey = axisKeys[i];
        axis[axisKey] = {};
        axis[axisKey].min = ranges[axisKey].from;
        axis[axisKey].max = ranges[axisKey].to;
    }
    return axis;
};

const drawGraphByRanges = function(ranges) {
    var zOptions = $.extend(true, {}, options, normalizeYAxisByRanges(ranges));
    plot = $.plot(placeholder, dataset, zOptions);
};

const normalize2dYAxis = function (ranges) {
    /*
     The way the axis work, if there is only one yaxis the yaxis must be an object
     but if there are multiple yaxis the yaxis must be an array.
     */
    var axis = {};
    var axisKeys = _.keys(ranges);
    for (var i = 0; i < axisKeys.length; i++) {
        var axisKey = axisKeys[i];
        axis[axisKey] = {};
        axis[axisKey].min = ranges[axisKey].from;
        axis[axisKey].max = ranges[axisKey].to;
    }
    return axis;
};

const draw2dGraph = function(ranges) {
    var normalizedOptions = normalizeYAxis(ranges);
    var zOptions = $.extend(true, {}, options, normalizedOptions);
    delete zOptions.xaxes[0].max;
    delete zOptions.xaxes[0].min;
    delete zOptions.yaxes[0].max;
    delete zOptions.yaxes[0].min;
    plot = $.plot(placeholder, dataset, zOptions);
    placeholder.append("<div style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
};

export default matsGraphUtils = {
    setNoDataLabels: setNoDataLabels,
    normalizeYAxis:normalizeYAxis,
    drawGraph:drawGraph,
    drawErrorCaps:drawErrorCaps,
    normalizeYAxisByRanges:normalizeYAxis,
    drawGraphByRanges:drawGraphByRanges,
    lSquareCap:lSquareCap,
    uSquareCap:uSquareCap,
    draw2dGraph:draw2dGraph,
    normalize2dYAxis:normalize2dYAxis
};