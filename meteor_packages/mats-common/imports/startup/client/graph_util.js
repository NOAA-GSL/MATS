const setNoDataLabels = function (dataset) {
// set the label for the hide show buttons (NO DATA) for the initial time here
    for (var c = 0; c < dataset.length; c++) {
        if (dataset[c].data.length === 0) {
            Session.set(dataset[c].curveId + "hideButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style["background-color"] = "red";
            }
            Session.set(dataset[c].curveId + "pointsButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-points')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style["background-color"] = "red";
            }
            Session.set(dataset[c].curveId + "errorBarButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-errorbars')) {
                document.getElementById(dataset[c].curveId + '-curve-errorbars').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-errorbars').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-errorbars').style["background-color"] = "red";
            }
            Session.set(dataset[c].curveId + "barChartButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-bar')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bar').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bar').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bar').style["background-color"] = "red";
            }
            Session.set(dataset[c].curveId + "annotateButtonText", 'NO DATA');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').value = 'NO DATA';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').disabled = true;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').style["background-color"] = "red";
            }
        } else {
            Session.set(dataset[c].curveId + "hideButtonText", 'hide curve');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide').value = 'hide curve';
                document.getElementById(dataset[c].curveId + '-curve-show-hide').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide').style["background-color"] = dataset[c].color;
            }
            Session.set(dataset[c].curveId + "pointsButtonText", 'hide points');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-points')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').value = 'hide points';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-points').style["background-color"] = dataset[c].color;
            }
            Session.set(dataset[c].curveId + "errorBarButtonText", 'hide error bars');
            if (document.getElementById(dataset[c].curveId + '-curve-errorbars')) {
                document.getElementById(dataset[c].curveId + '-curve-errorbars').value = 'hide error bars';
                document.getElementById(dataset[c].curveId + '-curve-errorbars').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-errorbars').style["background-color"] = dataset[c].color;
            }
            Session.set(dataset[c].curveId + "barChartButtonText", 'hide bars');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-bar')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bar').value = 'hide bars';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bar').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-bar').style["background-color"] = dataset[c].color;
            }
            Session.set(dataset[c].curveId + "annotateButtonText", 'hide annotation');
            if (document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate')) {
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').value = 'hide annotation';
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').disabled = false;
                document.getElementById(dataset[c].curveId + '-curve-show-hide-annotate').style["background-color"] = dataset[c].color;
            }
        }
    }
};

const drawMap = function () {
    var defaultPoint = this.data.defaultMapView.point;
    var defaultZoomLevel = this.data.defaultMapView.zoomLevel;
    var minZoomLevel = this.data.defaultMapView.minZoomLevel;
    var maxZoomLevel = this.data.defaultMapView.maxZoomLevel;
    var peerName = this.data.peerName;

    var targetElement = document.getElementsByName(peerName)[0];
    if (!targetElement) {
        return;
    }
    var targetId = '#' + targetElement.id;
    var markers = this.data.optionsMap;   // from app startup
    var markerFeatures = {};
    var map = L.map(this.data.name + "-" + this.data.type, {
        doubleClickZoom: false,
        scrollWheelZoom: false,
        trackResize:true,
        zoomControl:true,
        minZoom: minZoomLevel,
        maxZoom: maxZoomLevel,
        wheelPxPerZoomLevel: 3
    }).setView(defaultPoint, defaultZoomLevel);
    // visit https://leaflet-extras.github.io/leaflet-providers/preview/ if you want to choose something different
//    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
//        attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
//        maxZoom: 16}).addTo(map);
//    L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.{ext}', {
//        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
//        subdomains: 'abcd',
//        minZoom: 0,
//        maxZoom: 20,
//        ext: 'png'
//    }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(map);
    L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';
    if (!markerFeatures) {
        markerFeatures = {};
    }
}

const normalizeYAxis = function (ranges, nOptions) {
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
        if (ranges[yaxisRangesKeys[i]] && nOptions.yaxes[i]) {
            nOptions.yaxes[i].min = ranges[yaxisRangesKeys[i]].from;
            nOptions.yaxes[i].max = ranges[yaxisRangesKeys[i]].to;
        }
    }
    nOptions.xaxes[0].min = ranges.xaxis.from;
    nOptions.xaxes[0].max = ranges.xaxis.to;
    return nOptions;
};

const drawGraph = function(ranges, dataset, options, placeholder) {
    var dOptions = $.extend(true, {}, options);
    var zOptions = $.extend(true, {}, dOptions, normalizeYAxis(ranges,dOptions));
    return $.plot(placeholder, dataset, zOptions);
};

const drawXErrorCaps = function (ctx, lowerx, upperx, y, radius) {
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

const lXSquareCap = function (ctx, x, y, radius) {
    lowerx = x;
    // this is where you would make the xradius vary by the size of the error
    var xradius = radius;
    var yradius = radius;
   drawXErrorCaps(ctx, lowerx, upperx, y, radius);
};

var uXSquareCap = function (ctx, x, y, radius) {
    // upper gets called first -- see drawError in flot
    upperx = x;
};

const drawYErrorCaps = function (ctx, lowery, uppery, x, radius) {
    // ctx is CanvasRenferingContext2d
    //lowery and uppery are reversed for some reason and I can't figure out why, so just know that lowery is really the upper y limit and uppery is really the upper y limit
    ctx.beginPath();
    var r2 = radius / 2;
    var minHeight = 20;  // sort of arbitrary, really
    var height = ((lowery - uppery) <= minHeight) ? 1 : ((lowery - uppery) - minHeight) / 2;
    ctx.fillStyle = 'white';
    ctx.rect(x - r2, lowery - height, radius, height);
    ctx.stroke();
    ctx.fill();
    ctx.rect(x - r2, uppery, radius, height);
    ctx.stroke();
    ctx.fill();

};

const lYSquareCap = function (ctx, x, y, radius) {
    //lowery and uppery are reversed for some reason and I can't figure out why, so just know that lowery is really the upper y limit and uppery is really the upper y limit
    lowery = y;
    // this is where you would make the xradius vary by the size of the error
    var xradius = radius;
    var yradius = radius;
    drawYErrorCaps(ctx, lowery, uppery, x, radius);
};

var uYSquareCap = function (ctx, x, y, radius) {
    //lowery and uppery are reversed for some reason and I can't figure out why, so just know that lowery is really the upper y limit and uppery is really the upper y limit
    // upper gets called first -- see drawError in flot
    uppery = y;
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

var width = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    if (vpw < 400) {
        return (.9 * vpw).toString() + "px";
    } else {
        return (.8 * vpw).toString() + "px";
    }
};
var height = function () {
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    if (vph < 400) {
        return (.8 * vph).toString() + "px";
    } else {
        return (.6 * vph).toString() + "px";
    }
};

var setTextView = function (textViewType) {
    //shows text page and proper text output, hides everything else
    document.getElementById('placeholder').style.width = width();
    document.getElementById('placeholder').style.heigth = height();
    document.getElementById("text-page-button-group").style.display = "block";
    document.getElementById("plot-page-button-group").style.display = "none";
    document.getElementById("curves").style.display = "none";
    document.getElementById("graphView").style.display = "none";
    document.getElementById("textSeriesView").style.display = textViewType === "textSeriesView" ? "block" : "none";
    document.getElementById("textProfileView").style.display = textViewType === "textProfileView" ? "block" : "none";
    document.getElementById("textScatter2dView").style.display = textViewType === "textScatter2dView" ? "block" : "none";
    document.getElementById("textDieOffView").style.display = textViewType === "textDieOffView" ? "block" : "none";
    document.getElementById("textThresholdView").style.display = textViewType === "textThresholdView" ? "block" : "none";
    document.getElementById("textValidTimeView").style.display = textViewType === "textValidTimeView" ? "block" : "none";
    document.getElementById("textDailyModelCycleView").style.display = textViewType === "textDailyModelCycleView" ? "block" : "none";
    document.getElementById("textMapView").style.display = textViewType === "textMapView" ? "block" : "none";
    document.getElementById("textHistogramView").style.display = textViewType === "textHistogramView" ? "block" : "none";
    document.getElementById('graph-touch-controls').style.display = "none";
    document.getElementById('plot-control-button-group').style.display = "none";
};
var setGraphView = function () {
    //shows graph page, hides everything else
    document.getElementById('graph-container').style.display = 'block';
    document.getElementById('plotType').style.display = 'none';
    document.getElementById('paramList').style.display = 'none';
    document.getElementById('plotList').style.display = 'none';
    document.getElementById('curveList').style.display = 'none';
    if (document.getElementById("plotTypeContainer")) {
        document.getElementById("plotTypeContainer").style.display="none";
    }
    if (document.getElementById("scatter2d")){
        document.getElementById("scatter2d").style.display = "none";
    }
    if (document.getElementById("scatterView")) {
        document.getElementById("scatterView").style.display="none";
    }
    document.getElementById('placeholder').style.width = width();
    document.getElementById('placeholder').style.heigth = height();
    document.getElementById("text-page-button-group").style.display = "none";
    document.getElementById("plot-page-button-group").style.display = "block";
    document.getElementById("curves").style.display = "block";
    document.getElementById("graphView").style.display = "block";
    document.getElementById("textSeriesView").style.display = "none";
    document.getElementById("textProfileView").style.display = "none";
    document.getElementById("textScatter2dView").style.display = "none";
    document.getElementById("textDieOffView").style.display = "none";
    document.getElementById("textThresholdView").style.display = "none";
    document.getElementById("textValidTimeView").style.display = "none";
    document.getElementById("textDailyModelCycleView").style.display = "none";
    document.getElementById("textMapView").style.display = "none";
    document.getElementById("textHistogramView").style.display = "none";
    if (Session.get('plotType') !== matsTypes.PlotTypes.map) {
        document.getElementById('graph-touch-controls').style.display = "block";
        document.getElementById('plot-control-button-group').style.display = "block";
    } else {
        document.getElementById('graph-touch-controls').style.display = "none";
        document.getElementById('plot-control-button-group').style.display = "none";
    }
};
var setDefaultView = function() {
    // show elements of the main page
    if (document.getElementById('paramList')) {
        document.getElementById('paramList').style.display = 'block';
    }
    if (document.getElementById('plotList')) {
        document.getElementById('plotList').style.display = 'block';
    }
    if (document.getElementById('curveList')) {
        document.getElementById('curveList').style.display = 'block';
    }
    if (document.getElementById("plotTypeContainer")) {
        document.getElementById("plotTypeContainer").style.display = "block";
    }
    if (document.getElementById("scatterView")) {
        document.getElementById("scatterView").style.display = "block";
    }
    if (document.getElementById("scatter2d")) {
        document.getElementById("scatter2d").style.display = "block";
    }
    // hide graph page
    if (document.getElementById('graph-container')) {
        document.getElementById('graph-container').style.display = 'none';
    }
    document.getElementById("plot-page-button-group").style.display = "block";
    document.getElementById('graph-touch-controls').style.display = "block";
    document.getElementById('plot-control-button-group').style.display = "block";
    // hide text page
    document.getElementById("textSeriesView").style.display = "none";
    document.getElementById("textProfileView").style.display = "none";
    document.getElementById("textDieOffView").style.display = "none";
    document.getElementById("textThresholdView").style.display = "none";
    document.getElementById("textValidTimeView").style.display = "none";
    document.getElementById("textDailyModelCycleView").style.display = "none";
    document.getElementById("textScatter2dView").style.display = "none";
    document.getElementById("textMapView").style.display = "none";
    document.getElementById("textHistogramView").style.display = "none";
};

export default matsGraphUtils = {
    setNoDataLabels: setNoDataLabels,
    normalizeYAxis:normalizeYAxis,
    drawGraph:drawGraph,
    drawMap:drawMap,
    drawXErrorCaps:drawXErrorCaps,
    drawYErrorCaps:drawYErrorCaps,
    lXSquareCap:lXSquareCap,
    uXSquareCap:uXSquareCap,
    lYSquareCap:lYSquareCap,
    uYSquareCap:uYSquareCap,
    draw2dGraph:draw2dGraph,
    normalize2dYAxis:normalize2dYAxis,
    width:width,
    height:height,
    setTextView:setTextView,
    setGraphView:setGraphView,
    setDefaultView:setDefaultView
};