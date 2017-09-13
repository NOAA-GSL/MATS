const setNoDataLabels = function (dataset) {
// set the label for the hide show buttons (NO DATA) for the initial time here
    for (var c = 0; c < dataset.length; c++) {
        if (dataset[c].data.length === 0) {
            Session.set(dataset[c].label + "pointsButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].label + '-curve-show-hide')) {
                document.getElementById(dataset[c].label + '-curve-show-hide').value = 'NO DATA';
                document.getElementById(dataset[c].label + '-curve-show-hide').disabled = true;
                document.getElementById(dataset[c].label + '-curve-show-hide').style = "background-color:red";
            }
            Session.set(dataset[c].label + "hideButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].label + '-curve-show-hide-points')) {
                document.getElementById(dataset[c].label + '-curve-show-hide-points').value = 'NO DATA';
                document.getElementById(dataset[c].label + '-curve-show-hide-points').disabled = true;
                document.getElementById(dataset[c].label + '-curve-show-hide-points').style = "background-color:red";
            }
            Session.set(dataset[c].label + "errorBarButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].label + '-curve-errorbars')) {
                document.getElementById(dataset[c].label + '-curve-errorbars').value = 'NO DATA';
                document.getElementById(dataset[c].label + '-curve-errorbars').disabled = true;
                document.getElementById(dataset[c].label + '-curve-errorbars').style = "background-color:red";
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

export default matsGraphUtils = {
    setNoDataLabels: setNoDataLabels,
    normalizeYAxis:normalizeYAxis,
    drawErrorCaps:drawErrorCaps,
    lSquareCap:lSquareCap,
    uSquareCap:uSquareCap
};