// set the label for the hide show buttons (NO DATA) for the initial time here
const setNoDataLabels = function (dataset) {
    console.log("From setNoDataLabels");
    console.log(dataset);
    for (var c = 0; c < dataset.length; c++) {
        if (dataset[c].x.length === 0) {
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

// plot width helper used in multiple places
var width = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    if (vpw < 400) {
        return (.9 * vpw).toString() + "px";
    } else {
        return (.9 * vpw).toString() + "px";
    }
};

// plot height helper used in multiple places
var height = function () {
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    if (vph < 400) {
        return (.8 * vph).toString() + "px";
    } else {
        return (.7 * vph).toString() + "px";
    }
};

var standAloneWidth = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    return (.9 * vpw).toString() + "px";
};
var standAloneHeight = function () {
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    return (.825 * vph).toString() + "px";
};

// helper to bring up the text page
var setTextView = function () {
    //shows text page and proper text output, hides everything else
    document.getElementById('placeholder').style.width = width();
    document.getElementById('placeholder').style.height = height();
    document.getElementById("text-page-button-group").style.display = "block";
    document.getElementById("plot-page-button-group").style.display = "none";
    document.getElementById("curves").style.display = "none";
    document.getElementById("graphView").style.display = "none";
    document.getElementById("textView").style.display = "block";
    document.getElementById('plot-control-button-group').style.display = "none";
};

// helper to bring up the graph page
var setGraphView = function () {
    //shows graph page, hides everything else
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
    document.getElementById('placeholder').style.width = width();
    document.getElementById('placeholder').style.height = height();
    document.getElementById("text-page-button-group").style.display = "none";
    document.getElementById("plot-page-button-group").style.display = "block";
    document.getElementById("curves").style.display = "block";
    document.getElementById("graphView").style.display = "block";
    document.getElementById("textView").style.display = "none";
    if (Session.get('plotType') !== matsTypes.PlotTypes.map) {
        document.getElementById('plot-control-button-group').style.display = "block";
    } else {
        document.getElementById('plot-control-button-group').style.display = "none";
    }
};

// helper to bring up the graph page in a pop-up window
var standAloneSetGraphView = function () {
    //shows graph page, hides everything else
    document.getElementById('graph-container').style.display = 'block';
    document.getElementById('placeholder').style.width = width();
    document.getElementById('placeholder').style.height = height();
    document.getElementById("curves").style.display = "block";
    document.getElementById("graphView").style.display = "block";
};

// helper to bring up the main selector page
var setDefaultView = function () {
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
    document.getElementById('plot-control-button-group').style.display = "block";
    // hide text page
    document.getElementById("textView").style.display = "none";
};

export default matsGraphUtils = {
    setNoDataLabels: setNoDataLabels,
    width: width,
    height: height,
    standAloneWidth: standAloneWidth,
    standAloneHeight: standAloneHeight,
    setTextView: setTextView,
    setGraphView: setGraphView,
    standAloneSetGraphView: standAloneSetGraphView,
    setDefaultView: setDefaultView
};