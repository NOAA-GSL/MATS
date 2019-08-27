/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {Hooks} from 'meteor/differential:event-hooks';
import {
    matsCollections,
    matsCurveUtils,
    matsGraphUtils,
    matsMethods,
    matsPlotUtils,
    matsTypes
} from 'meteor/randyp:mats-common';

var pageIndex = 0;
var annotation = "";
var openWindows = [];
var xAxes = [];
var yAxes = [];
var curveOpsUpdate = [];

Template.graph.onCreated(function () {
    // the window resize event needs to also resize the graph
    $(window).resize(function () {
        matsGraphUtils.resizeGraph(matsPlotUtils.getPlotType());
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        if (dataset !== undefined && options !== undefined) {
            Plotly.newPlot($("#placeholder")[0], dataset, options, {showLink: true});
        }
    });
});

Template.graph.helpers({
    /**
     * @return {string}
     * @return {string}
     */
    graphFunction: function () {
        // causes graph display routine to be processed
        Session.get('PlotResultsUpDated');
        var graphFunction = Session.get('graphFunction');
        if (graphFunction) {
            eval(graphFunction)(Session.get('plotResultKey'));
            var plotType = Session.get('plotType');
            var dataset = matsCurveUtils.getGraphResult().data;
            var options = matsCurveUtils.getGraphResult().options;
            Session.set('options', options);

            // need to save some curve options so that the reset button can undo Plotly.restyle
            switch (plotType) {
                case matsTypes.PlotTypes.contour:
                case matsTypes.PlotTypes.contourDiff:
                    //saved curve options for contours
                    Session.set('colorbarResetOpts', {
                        'name': dataset[0].name,
                        'colorbar.title': dataset[0].colorbar.title,
                        'autocontour': dataset[0].autocontour,
                        'ncontours': dataset[0].ncontours,
                        'contours.start': dataset[0].contours.start,
                        'contours.end': dataset[0].contours.end,
                        'contours.size': dataset[0].contours.size,
                        'reversescale': dataset[0].reversescale,
                        'connectgaps': dataset[0].connectgaps,
                        'colorscale': JSON.stringify(dataset[0].colorscale)
                    });
                    break;
                case matsTypes.PlotTypes.timeSeries:
                case matsTypes.PlotTypes.profile:
                case matsTypes.PlotTypes.dieoff:
                case matsTypes.PlotTypes.threshold:
                case matsTypes.PlotTypes.validtime:
                case matsTypes.PlotTypes.dailyModelCycle:
                case matsTypes.PlotTypes.reliability:
                case matsTypes.PlotTypes.roc:
                    // saved curve options for line graphs
                    var lineTypeResetOpts = [];
                    for (var lidx = 0; lidx < dataset.length; lidx++) {
                        if (Object.values(matsTypes.ReservedWords).indexOf(dataset[lidx].label) === -1) {
                            lineTypeResetOpts.push({
                                'name': dataset[lidx].name,
                                'visible': dataset[lidx].visible,
                                'mode': dataset[lidx].mode,
                                'error_y': dataset[lidx].error_y,
                                'error_x': dataset[lidx].error_x,
                                'line.dash': dataset[lidx].line.dash,
                                'line.width': dataset[lidx].line.width,
                                'marker.symbol': dataset[lidx].marker.symbol,
                            });
                        } else {
                            break;
                        }
                    }
                    Session.set('lineTypeResetOpts', lineTypeResetOpts);
                    break;
                case matsTypes.PlotTypes.histogram:
                    // saved curve options for maps
                    var barTypeResetOpts = [];
                    for (var bidx = 0; bidx < dataset.length; bidx++) {
                        if (Object.values(matsTypes.ReservedWords).indexOf(dataset[bidx].label) === -1) {
                            barTypeResetOpts.push({
                                'name': dataset[bidx].name,
                                'visible': dataset[bidx].visible,
                            });
                        } else {
                            break;
                        }
                    }
                    Session.set('barTypeResetOpts', barTypeResetOpts);
                    break;
                case matsTypes.PlotTypes.map:
                    // saved curve options for maps
                    var mapResetOpts = [];
                    mapResetOpts[0] = {
                        'marker.opacity': dataset[0].marker.opacity,
                    };
                    for (var midx = 1; midx < dataset.length; midx++) {
                        mapResetOpts.push({
                            'name': dataset[midx].name,
                            'visible': dataset[midx].visible,
                        });
                    }
                    Session.set('mapResetOpts', mapResetOpts);
                    break;
                case matsTypes.PlotTypes.scatter2d:
                default:
                    break;
            }
            curveOpsUpdate = [];

            // initial plot
            $("#placeholder").empty();
            if (!dataset || !options) {
                return false;
            }
            Plotly.newPlot($("#placeholder")[0], dataset, options, {showLink: true});

            // append annotations
            var localAnnotation;
            for (var i = 0; i < dataset.length; i++) {
                if (Object.values(matsTypes.ReservedWords).indexOf(dataset[i].label) >= 0) {
                    continue; // don't process the zero or max curves
                }
                switch (plotType) {
                    case matsTypes.PlotTypes.timeSeries:
                    case matsTypes.PlotTypes.profile:
                    case matsTypes.PlotTypes.dieoff:
                    case matsTypes.PlotTypes.threshold:
                    case matsTypes.PlotTypes.validtime:
                    case matsTypes.PlotTypes.dailyModelCycle:
                    case matsTypes.PlotTypes.scatter2d:
                        localAnnotation = "<div id='" + dataset[i].curveId + "-annotation' style='color:" + dataset[i].annotateColor + "'>" + dataset[i].annotation + " </div>";
                        break;
                    case matsTypes.PlotTypes.map:
                    case matsTypes.PlotTypes.reliability:
                    case matsTypes.PlotTypes.roc:
                    case matsTypes.PlotTypes.histogram:
                    case matsTypes.PlotTypes.contour:
                    case matsTypes.PlotTypes.contourDiff:
                    default:
                        localAnnotation = "";
                        break;
                }
                $("#legendContainer" + dataset[i].curveId).empty().append(localAnnotation);

                // store the existing axes.
                Object.keys($("#placeholder")[0].layout).filter(function (k) {
                    if (k.startsWith('xaxis')) {
                        xAxes.push(k);
                    }
                    if (k.startsWith('yaxis')) {
                        yAxes.push(k);
                    }
                });
            }
            annotation = $("#curves")[0].innerHTML;
            matsCurveUtils.hideSpinner();
        }
        return graphFunction;
    },
    Title: function () {
        if (matsCollections.Settings === undefined || matsCollections.Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
            return "";
        } else {
            return matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title;
        }
    },
    width: function () {
        return matsGraphUtils.width(matsPlotUtils.getPlotType());
    },
    height: function () {
        return matsGraphUtils.height(matsPlotUtils.getPlotType());
    },
    curves: function () {
        return Session.get('Curves');
    },
    plotName: function () {
        return (Session.get('PlotParams') === [] || Session.get('PlotParams').plotAction === undefined) || Session.get('plotType') === matsTypes.PlotTypes.map ? "" : Session.get('PlotParams').plotAction.toUpperCase();
    },
    curveText: function () {
        if (this.diffFrom === undefined) {
            var plotType = Session.get('plotType');
            if (plotType === undefined) {
                pfuncs = matsCollections.PlotGraphFunctions.find({}).fetch();
                for (var i = 0; i < pfuncs.length; i++) {
                    if (pfuncs[i].checked === true) {
                        Session.set('plotType', pfuncs[i].plotType);
                    }
                }
                plotType = Session.get('plotType');
            }
            if (plotType === matsTypes.PlotTypes.profile) {
                return matsPlotUtils.getCurveTextWrapping(plotType, this);
            } else {
                return matsPlotUtils.getCurveText(plotType, this);
            }
        } else {
            return this.label + ":  Difference";
        }
    },
    confidenceDisplay: function () {
        if (Session.get('plotParameter') === "matched") {
            var plotType = Session.get('plotType');
            switch (plotType) {
                case matsTypes.PlotTypes.timeSeries:
                case matsTypes.PlotTypes.profile:
                case matsTypes.PlotTypes.dieoff:
                case matsTypes.PlotTypes.threshold:
                case matsTypes.PlotTypes.validtime:
                case matsTypes.PlotTypes.dailyModelCycle:
                    return "block";
                case matsTypes.PlotTypes.reliability:
                case matsTypes.PlotTypes.roc:
                case matsTypes.PlotTypes.map:
                case matsTypes.PlotTypes.histogram:
                case matsTypes.PlotTypes.scatter2d:
                case matsTypes.PlotTypes.contour:
                case matsTypes.PlotTypes.contourDiff:
                default:
                    return "none";
            }
        } else {
            return "none";
        }
    },
    mvSpanDisplay: function () {
        var updated = Session.get("MvResultsUpDated");
        if (Session.get("mvResultKey") != null || Session.get('plotParams')['metexpress-mode'] == "matsmv") {
            return "block";
        } else {
            return "none";
        }
    },

    plotText: function () {
        var p = Session.get('PlotParams');
        if (p !== undefined) {
            var format = p.plotFormat;
            if (matsCollections.PlotParams.findOne({name: 'plotFormat'}) &&
                matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap &&
                matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap[p.plotFormat] !== undefined) {
                format = matsCollections.PlotParams.findOne({name: 'plotFormat'}).optionsMap[p.plotFormat];
            }
            if (format === undefined) {
                format = "Unmatched";
            }
            var plotType = Session.get('plotType');
            switch (plotType) {
                case matsTypes.PlotTypes.timeSeries:
                    return "TimeSeries " + p.dates + " : " + format;
                case matsTypes.PlotTypes.profile:
                    return "Profile: " + format;
                case matsTypes.PlotTypes.dieoff:
                    return "DieOff: " + format;
                case matsTypes.PlotTypes.threshold:
                    return "Threshold: " + format;
                case matsTypes.PlotTypes.validtime:
                    return "ValidTime: " + format;
                case matsTypes.PlotTypes.dailyModelCycle:
                    return "DailyModelCycle " + p.dates + " : " + format;
                case matsTypes.PlotTypes.reliability:
                    return "Reliability: " + p.dates + " : " + format;
                case matsTypes.PlotTypes.roc:
                    return "ROC Curve: " + p.dates + " : " + format;
                case matsTypes.PlotTypes.map:
                    return "Map " + p.dates + " ";
                case matsTypes.PlotTypes.histogram:
                    return "Histogram: " + format;
                case matsTypes.PlotTypes.contour:
                    return "Contour " + p.dates + " : " + format;
                case matsTypes.PlotTypes.contourDiff:
                    return "ContourDiff " + p.dates + " : " + format;
                case matsTypes.PlotTypes.scatter2d:
                    break;
                default:
                    return "Scatter: " + p.dates + " : " + format;
            }
        } else {
            return "no plot params";
        }
    },
    color: function () {
        return this.color;
    },
    xAxes: function () {
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
        // create an array like [0,1,2...] for each unique xaxis
        // by getting the xaxis keys - filtering them to be unique, then using an Array.apply on the resulting array
        // to assign a number to each value
        var xaxis = {};
        if ($("#placeholder")[0] === undefined || $("#placeholder")[0].layout === undefined || plotType === matsTypes.PlotTypes.map) {
            return;
        }
        Object.keys($("#placeholder")[0].layout).filter(function (k) {
            if (k.startsWith('xaxis')) {
                xaxis[k] = $("#placeholder")[0].layout[k];
            }
        });
        return Array.apply(null, {length: Object.keys(xaxis).length}).map(Number.call, Number);
    },
    yAxes: function () {
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
        // create an array like [0,1,2...] for each unique yaxis
        // by getting the yaxis keys - filtering them to be unique, then using an Array.apply on the resulting array
        // to assign a number to each value
        var yaxis = {};
        if ($("#placeholder")[0] === undefined || $("#placeholder")[0].layout === undefined || plotType === matsTypes.PlotTypes.map) {
            return;
        }
        Object.keys($("#placeholder")[0].layout).filter(function (k) {
            if (k.startsWith('yaxis')) {
                yaxis[k] = $("#placeholder")[0].layout[k];
            }
        });
        return Array.apply(null, {length: Object.keys(yaxis).length}).map(Number.call, Number);
    },
    isProfile: function () {
        return (Session.get('plotType') === matsTypes.PlotTypes.profile)
    },
    isLinePlot: function () {
        var plotType = Session.get('plotType');
        switch (plotType) {
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.profile:
            case matsTypes.PlotTypes.dieoff:
            case matsTypes.PlotTypes.threshold:
            case matsTypes.PlotTypes.validtime:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.reliability:
            case matsTypes.PlotTypes.roc:
                return true;
            case matsTypes.PlotTypes.map:
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.scatter2d:
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
            default:
                return false;
        }
    },
    isContour: function () {
        return (Session.get('plotType') === matsTypes.PlotTypes.contour || Session.get('plotType') === matsTypes.PlotTypes.contourDiff)
    },
    isContourDiff: function () {
        return (Session.get('plotType') === matsTypes.PlotTypes.contourDiff)
    },
    isNotMap: function () {
        return (Session.get('plotType') !== matsTypes.PlotTypes.map)
    },
    sentAddresses: function () {
        var addresses = [];
        var a = matsCollections.SentAddresses.find({}, {fields: {address: 1}}).fetch();
        for (var i = 0; i < a.length; i++) {
            addresses.push(a[i].address);
        }
        return addresses;
    },
    btnColSize: function () {
        var plotType = Session.get('plotType');
        switch (plotType) {
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.profile:
            case matsTypes.PlotTypes.dieoff:
            case matsTypes.PlotTypes.threshold:
            case matsTypes.PlotTypes.validtime:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.reliability:
                return "col-sm-2";
            case matsTypes.PlotTypes.map:
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.scatter2d:
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
            default:
                return "col-sm-8";
        }
    },
    hideButtonText: function () {
        var sval = this.label + "hideButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval, 'hide curve');
        }
        return Session.get(sval);
    },
    pointsButtonText: function () {
        var sval = this.label + "pointsButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval, 'hide points');
        }
        return Session.get(sval);
    },
    errorBarButtonText: function () {
        var sval = this.label + "errorBarButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval, 'hide error bars');
        }
        return Session.get(sval);
    },
    barChartButtonText: function () {
        var sval = this.label + "barChartButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval, 'hide bars');
        }
        return Session.get(sval);
    },
    annotateButtonText: function () {
        var sval = this.label + "annotateButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval, 'hide annotation');
        }
        return Session.get(sval);
    },
    heatMapButtonText: function () {
        var sval = this.label + "heatMapButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval, 'show heat map');
        }
        return Session.get(sval);
    },
    curveShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        switch (plotType) {
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.profile:
            case matsTypes.PlotTypes.dieoff:
            case matsTypes.PlotTypes.threshold:
            case matsTypes.PlotTypes.validtime:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.reliability:
            case matsTypes.PlotTypes.roc:
            case matsTypes.PlotTypes.scatter2d:
                return "block";
            case matsTypes.PlotTypes.map:
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
            default:
                return "none";
        }
    },
    pointsShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        switch (plotType) {
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.profile:
            case matsTypes.PlotTypes.dieoff:
            case matsTypes.PlotTypes.threshold:
            case matsTypes.PlotTypes.validtime:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.reliability:
            case matsTypes.PlotTypes.roc:
            case matsTypes.PlotTypes.scatter2d:
                return "block";
            case matsTypes.PlotTypes.map:
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
            default:
                return "none";
        }
    },
    errorbarsShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        var isMatched = Session.get('plotParameter') === "matched";
        if (isMatched) {
            switch (plotType) {
                case matsTypes.PlotTypes.timeSeries:
                case matsTypes.PlotTypes.profile:
                case matsTypes.PlotTypes.dieoff:
                case matsTypes.PlotTypes.threshold:
                case matsTypes.PlotTypes.validtime:
                case matsTypes.PlotTypes.dailyModelCycle:
                    return "block";
                case matsTypes.PlotTypes.reliability:
                case matsTypes.PlotTypes.roc:
                case matsTypes.PlotTypes.map:
                case matsTypes.PlotTypes.histogram:
                case matsTypes.PlotTypes.scatter2d:
                case matsTypes.PlotTypes.contour:
                case matsTypes.PlotTypes.contourDiff:
                default:
                    return "none";
            }
        } else {
            return "none";
        }
    },
    barsShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.histogram) {
            return 'block';
        } else {
            return 'none';
        }
    },
    annotateShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram) {
            return 'none';
        } else {
            return 'block';
        }
    },
    heatMapShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        if (plotType !== matsTypes.PlotTypes.map) {
            return 'none';
        } else {
            return 'block';
        }
    },
    xAxisControlsNumberVisibility: function () {
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle ||
            ((plotType === matsTypes.PlotTypes.contour || plotType === matsTypes.PlotTypes.contourDiff) && ($("#placeholder")[0].layout.xaxis.title.text).indexOf("Date") > -1)) {
            return "none";
        } else {
            return "block";
        }
    },
    xAxisControlsTextVisibility: function () {
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle ||
            ((plotType === matsTypes.PlotTypes.contour || plotType === matsTypes.PlotTypes.contourDiff) && ($("#placeholder")[0].layout.xaxis.title.text).indexOf("Date") > -1)) {
            return "block";
        } else {
            return "none";
        }
    },
    yAxisControlsNumberVisibility: function () {
        Session.get('PlotResultsUpDated');
        if ((plotType === matsTypes.PlotTypes.contour || plotType === matsTypes.PlotTypes.contourDiff) && ($("#placeholder")[0].layout.yaxis.title.text).indexOf("Date") > -1) {
            return "none";
        } else {
            return "block";
        }
    },
    yAxisControlsTextVisibility: function () {
        Session.get('PlotResultsUpDated');
        if ((plotType === matsTypes.PlotTypes.contour || plotType === matsTypes.PlotTypes.contourDiff) && ($("#placeholder")[0].layout.yaxis.title.text).indexOf("Date") > -1) {
            return "block";
        } else {
            return "none";
        }
    },
    displayReplotZoom: function () {
        // the replot to zoom function is only really appropriate for downsampled graphs which are
        // only possible in timeseries or dailymodelcycle plots
        Session.get("PlotParams");
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle) {
            return "block";
        } else {
            return "none";
        }
    },
    metApp: function () {
        Session.get("PlotParams");
        Session.get('PlotResultsUpDated');
        if (matsCollections.Settings.findOne({}) && matsCollections.Settings.findOne({}).appType && matsCollections.Settings.findOne({}).appType === matsTypes.AppTypes.metexpress && Session.get('PlotParams')['metexpress-mode'] == "matsmv") {
            return "block";
        } else {
            return "none";
        }
    },
    mvFiles: function () {
        var updated = Session.get('MvResultsUpDated');
        var key = Session.get('mvResultKey');
        var mvs = Session.get('mvs');
        if (mvs != null) {
            return mvs;
        } else {
            return [];
        }
    },
    mvDisabled: function () {
        var updated = Session.get('MvResultsUpDated');
        if (Session.get('mvs') == null || Session.get('PlotParams')['metexpress-mode'] == "mats") {
            return "none";
        } else {
            return "block";
        }
    },
    mvLoading: function () {
        var updated = Session.get('MvResultsUpDated');
        if (Session.get('mvs') == null && Session.get('PlotParams')['metexpress-mode'] == "matsmv") {
            return "block";
        } else {
            return "none";
        }
    }
});

Template.graph.events({
    'click .mvCtrlButton': function () {
        var mvWindow = window.open(this.url, "mv", "height=200,width=200");
        setTimeout(function () {
            mvWindow.reload();
        }, 500);

    },
    'click .back': function () {
        const plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.contourDiff) {
            const oldCurves = Session.get('oldCurves');
            Session.set('Curves', oldCurves);
        }
        matsPlotUtils.enableActionButtons();
        matsGraphUtils.setDefaultView();
        matsCurveUtils.resetPlotResultData();
        return false;
    },

    'click .header': function (event) {
        document.getElementById('graph-control').style.display = 'block';
        // document.getElementById('showAdministration').style.display = 'block';
        document.getElementById('navbar').style.display = 'block';
        document.getElementById('footnav').style.display = 'block';

        var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
        for (var i = 0; i < ctbgElems.length; i++) {
            ctbgElems[i].style.display = 'block';
        }
    },
    'click .preview': function () {
        // capture the layout
        const layout = $("#placeholder")[0].layout;
        var key = Session.get('plotResultKey');
        matsMethods.saveLayout.call({
            resultKey: key,
            layout: layout,
            curveOpsUpdate: {curveOpsUpdate: curveOpsUpdate},
            annotation: annotation
        }, function (error) {
            if (error !== undefined) {
                setError(error);
            }
        });
        // open a new window with a standAlone graph of the current graph
        var h = Math.max(document.documentElement.clientHeight, window.innerWidth || 0) * .65;
        var w = h * 1.3;
        var wind = window.open(window.location + "/preview/" + Session.get("graphFunction") + "/" + Session.get("plotResultKey") + "/" + Session.get('plotParameter') + "/" + matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title, "_blank", "status=no,titlebar=no,toolbar=no,scrollbars=no,menubar=no,resizable=yes", "height=" + h + ",width=" + w);
        setTimeout(function () {
            wind.resizeTo(w, h);
        }, 100);
        openWindows.push(wind);
    },
    'click .closeapp': function () {
        for (var widx = 0; widx < openWindows.length; widx++) {
            openWindows[widx].close();
        }
        openWindows = [];
    },
    'click .reload': function () {
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        var graphFunction = Session.get('graphFunction');
        window[graphFunction](dataset, options);
    },
    'click .plotButton': function () {
        matsGraphUtils.setGraphView(Session.get('plotType'));
        var graphView = document.getElementById('graphView');
        Session.set('graphViewMode', matsTypes.PlotView.graph);
        matsCurveUtils.hideSpinner();
    },
    'click .textButton': function () {
        matsGraphUtils.setTextView(Session.get('plotType'));
        Session.set('graphViewMode', matsTypes.PlotView.text);
        Session.set("pageIndex", 0);
        Session.set("newPageIndex", 1);
        Session.set('textRefreshNeeded', true);
    },
    'click .export': function () {
        document.getElementById('text_export').click();
    },
    'click .sentAddresses': function (event) {
        var address = event.currentTarget.options[event.currentTarget.selectedIndex].value;
        document.getElementById("sendAddress").value = address;
    },
    'click .share': function () {
        // show address modal
        if (!Meteor.user()) {
            setError(new Error("You must be logged in to use the 'share' feature"));
            return false;
        }
        $("#sendModal").modal('show');
    },
    'click .basis': function () {
        window.open(window.location + "/JSON/" + Session.get("graphFunction") + "/" + Session.get("plotResultKey") + "/" + Session.get('plotParameter') + "/" + matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title, "_blank", "resizable=yes");
    },
    'click .axisLimitButton': function () {
        $("#axisLimitModal").modal('show');
    },
    'click .lineTypeButton': function () {
        $("#lineTypeModal").modal('show');
    },
    'click .legendTextButton': function () {
        $("#legendTextModal").modal('show');
    },
    'click .colorbarButton': function () {
        $("#colorbarModal").modal('show');
    },
    'click .axisYScale': function () {
        // get all yaxes and change their scales
        var newOpts = {};
        var yAxis;
        for (var k = 0; k < yAxes.length; k++) {
            yAxis = yAxes[k];
            newOpts[yAxis + '.type'] = $("#placeholder")[0].layout[yAxis].type === 'linear' ? 'log' : 'linear';
        }
        Plotly.relayout($("#placeholder")[0], newOpts);
    },
    'click .firstPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        // if pageIndex is NaN, it means we only have one page and these buttons shouldn't do anything
        if (!Number.isNaN(pageIndex)) {
            Session.set("pageIndex", 0);
            Session.set("newPageIndex", 1);
            Session.set('textRefreshNeeded', true);
        }
    },
    'click .previousTenPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        // if pageIndex is NaN, it means we only have one page and these buttons shouldn't do anything
        if (!Number.isNaN(pageIndex)) {
            var pageTextDirection = Session.get("pageTextDirection");
            // if the navigation direction is changing, you have to increment the page index an additional time,
            // or you just move to the other end of the current page, and nothing appears to change.
            if (pageTextDirection !== undefined && pageTextDirection === -1) {
                Session.set("newPageIndex", pageIndex - 10);
            } else {
                Session.set("newPageIndex", pageIndex - 11);
            }
            Session.set('textRefreshNeeded', true);
        }
    },
    'click .previousPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        // if pageIndex is NaN, it means we only have one page and these buttons shouldn't do anything
        if (!Number.isNaN(pageIndex)) {
            var pageTextDirection = Session.get("pageTextDirection");
            // if the navigation direction is changing, you have to increment the page index an additional time,
            // or you just move to the other end of the current page, and nothing appears to change.
            if (pageTextDirection !== undefined && pageTextDirection === -1) {
                Session.set("newPageIndex", pageIndex - 1);
            } else {
                Session.set("newPageIndex", pageIndex - 2);
            }
            Session.set('textRefreshNeeded', true);
        }
    },
    'click .nextPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        // if pageIndex is NaN, it means we only have one page and these buttons shouldn't do anything
        if (!Number.isNaN(pageIndex)) {
            var pageTextDirection = Session.get("pageTextDirection");
            // if the navigation direction is changing, you have to increment the page index an additional time,
            // or you just move to the other end of the current page, and nothing appears to change.
            if (pageTextDirection !== undefined && pageTextDirection === 1) {
                Session.set("newPageIndex", pageIndex + 1);
            } else {
                Session.set("newPageIndex", pageIndex + 2);
            }
            Session.set('textRefreshNeeded', true);
        }
    },
    'click .nextTenPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        // if pageIndex is NaN, it means we only have one page and these buttons shouldn't do anything
        if (!Number.isNaN(pageIndex)) {
            var pageTextDirection = Session.get("pageTextDirection");
            // if the navigation direction is changing, you have to increment the page index an additional time,
            // or you just move to the other end of the current page, and nothing appears to change.
            if (pageTextDirection !== undefined && pageTextDirection === 1) {
                Session.set("newPageIndex", pageIndex + 10);
            } else {
                Session.set("newPageIndex", pageIndex + 11);
            }
            Session.set('textRefreshNeeded', true);
        }
    },
    'click .lastPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        // if pageIndex is NaN, it means we only have one page and these buttons shouldn't do anything
        if (!Number.isNaN(pageIndex)) {
            Session.set("newPageIndex", -2000);
            Session.set('textRefreshNeeded', true);
        }
    },
    'click .replotZoomButton': function () {
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle) {
            var newDateRange = moment.utc($("#placeholder")[0].layout['xaxis'].range[0]).format('M/DD/YYYY HH:mm') + " - " + moment.utc($("#placeholder")[0].layout['xaxis'].range[1]).format('M/DD/YYYY HH:mm');
            console.log(newDateRange);
            document.getElementById('controlButton-dates-value').innerHTML = newDateRange;
            var params = Session.get('params');
            var actionId = "plotUnmatched";
            if (params.plotAction === "matched") {
                actionId = plotMatched;
            }
            document.getElementById("plot-curves").click();
        }
    },
    'click .reCacheButton': function () {
        var plotType = Session.get('plotType');
        var params = Session.get('params');
        var actionId = "plotUnmatched";
        if (params.plotAction === "matched") {
            actionId = plotMatched;
        }
        Session.set('expireKey', true);
        document.getElementById("plot-curves").click();
    },
    'click .curveVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide', '');
        const myDataIdx = dataset.findIndex(function (d) {
            return d.curveId === label;
        });
        if (dataset[myDataIdx].x.length > 0) {
            var update;
            if (dataset[myDataIdx].visible) {
                if (dataset[myDataIdx].mode === "lines") {                  // in line mode, lines are visible, so make nothing visible
                    update = {
                        visible: !dataset[myDataIdx].visible
                    };
                    $('#' + label + "-curve-show-hide")[0].value = "show curve";
                } else if (dataset[myDataIdx].mode === "lines+markers") {   // in line and point mode, lines and points are visible, so make nothing visible
                    update = {
                        visible: !dataset[myDataIdx].visible
                    };
                    $('#' + label + "-curve-show-hide")[0].value = "show curve";
                    $('#' + label + "-curve-show-hide-points")[0].value = "show points";
                } else if (dataset[myDataIdx].mode === "markers") {         // in point mode, points are visible, so make lines and points visible
                    update = {
                        mode: "lines+markers"
                    };
                    $('#' + label + "-curve-show-hide")[0].value = "hide curve";
                }
            } else {
                if (dataset[myDataIdx].mode === "lines") {                  // in line mode, nothing is visible, so make lines visible
                    update = {
                        visible: !dataset[myDataIdx].visible
                    };
                    $('#' + label + "-curve-show-hide")[0].value = "hide curve";
                } else if (dataset[myDataIdx].mode === "lines+markers") {   // in line and point mode, nothing is visible, so make lines and points visible
                    update = {
                        visible: !dataset[myDataIdx].visible
                    };
                    $('#' + label + "-curve-show-hide")[0].value = "hide curve";
                    $('#' + label + "-curve-show-hide-points")[0].value = "hide points";
                }
            }
        }
        Plotly.restyle($("#placeholder")[0], update, myDataIdx);
        // save the updates in case we want to pass them to a pop-out window.
        curveOpsUpdate[myDataIdx] = curveOpsUpdate[myDataIdx] === undefined ? {} : curveOpsUpdate[myDataIdx];
        var updatedKeys = Object.keys(update);
        for (var kidx = 0; kidx < updatedKeys.length; kidx++) {
            var updatedKey = updatedKeys[kidx];
            // json doesn't like . to be in keys, so replace it with a placeholder
            var jsonHappyKey = updatedKey.split(".").join("____");
            curveOpsUpdate[myDataIdx][jsonHappyKey] = update[updatedKey];
        }
    },
    'click .pointsVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-points', '');
        const myDataIdx = dataset.findIndex(function (d) {
            return d.curveId === label;
        });
        if (dataset[myDataIdx].x.length > 0) {
            var update;
            if (dataset[myDataIdx].visible) {
                if (dataset[myDataIdx].mode === "lines") {                  // lines are visible, so make lines and points visible
                    update = {
                        mode: "lines+markers"
                    };
                    $('#' + label + "-curve-show-hide-points")[0].value = "hide points";
                } else if (dataset[myDataIdx].mode === "lines+markers") {   // lines and points are visible, so make only lines visible
                    update = {
                        mode: "lines"
                    };
                    $('#' + label + "-curve-show-hide-points")[0].value = "show points";
                } else if (dataset[myDataIdx].mode === "markers") {         // points are visible, so make nothing visible
                    update = {
                        visible: !dataset[myDataIdx].visible,
                        mode: "lines"
                    };
                    $('#' + label + "-curve-show-hide-points")[0].value = "show points";
                }
            } else {                                                        // nothing is visible, so make points visible
                update = {
                    visible: !dataset[myDataIdx].visible,
                    mode: "markers"
                };
                $('#' + label + "-curve-show-hide-points")[0].value = "hide points";
            }
        }
        Plotly.restyle($("#placeholder")[0], update, myDataIdx);
        // save the updates in case we want to pass them to a pop-out window.
        curveOpsUpdate[myDataIdx] = curveOpsUpdate[myDataIdx] === undefined ? {} : curveOpsUpdate[myDataIdx];
        var updatedKeys = Object.keys(update);
        for (var kidx = 0; kidx < updatedKeys.length; kidx++) {
            var updatedKey = updatedKeys[kidx];
            // json doesn't like . to be in keys, so replace it with a placeholder
            var jsonHappyKey = updatedKey.split(".").join("____");
            curveOpsUpdate[myDataIdx][jsonHappyKey] = update[updatedKey];
        }
    },
    'click .errorBarVisibility': function (event) {
        event.preventDefault();
        var plotType = Session.get('plotType');
        var dataset = matsCurveUtils.getGraphResult().data;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-errorbars', '');
        const myDataIdx = dataset.findIndex(function (d) {
            return d.curveId === label;
        });
        if (dataset[myDataIdx].x.length > 0) {
            var update;
            if (plotType !== matsTypes.PlotTypes.profile) {
                update = {
                    error_y: dataset[myDataIdx].error_y
                };
                update.error_y.visible = !update.error_y.visible;
                if (update.error_y.visible) {
                    $('#' + label + "-curve-show-hide-errorbars")[0].value = "hide error bars";
                } else {
                    $('#' + label + "-curve-show-hide-errorbars")[0].value = "show error bars";
                }
            } else {
                update = {
                    error_x: dataset[myDataIdx].error_x
                };
                update.error_x.visible = !update.error_x.visible;
                if (update.error_x.visible) {
                    $('#' + label + "-curve-show-hide-errorbars")[0].value = "hide error bars";
                } else {
                    $('#' + label + "-curve-show-hide-errorbars")[0].value = "show error bars";
                }
            }
        }
        Plotly.restyle($("#placeholder")[0], update, myDataIdx);
        // save the updates in case we want to pass them to a pop-out window.
        curveOpsUpdate[myDataIdx] = curveOpsUpdate[myDataIdx] === undefined ? {} : curveOpsUpdate[myDataIdx];
        var updatedKeys = Object.keys(update);
        for (var kidx = 0; kidx < updatedKeys.length; kidx++) {
            var updatedKey = updatedKeys[kidx];
            // json doesn't like . to be in keys, so replace it with a placeholder
            var jsonHappyKey = updatedKey.split(".").join("____");
            curveOpsUpdate[myDataIdx][jsonHappyKey] = update[updatedKey];
        }
    },
    'click .barVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-bars', '');
        const myDataIdx = dataset.findIndex(function (d) {
            return d.curveId === label;
        });
        if (dataset[myDataIdx].x.length > 0) {
            var update = {
                visible: !dataset[myDataIdx].visible
            };
            if (update.visible) {
                $('#' + label + "-curve-show-hide-bars")[0].value = "hide bars";
            } else {
                $('#' + label + "-curve-show-hide-bars")[0].value = "show bars";
            }
        }
        Plotly.restyle($("#placeholder")[0], update, myDataIdx);
        // save the updates in case we want to pass them to a pop-out window.
        curveOpsUpdate[myDataIdx] = curveOpsUpdate[myDataIdx] === undefined ? {} : curveOpsUpdate[myDataIdx];
        var updatedKeys = Object.keys(update);
        for (var kidx = 0; kidx < updatedKeys.length; kidx++) {
            var updatedKey = updatedKeys[kidx];
            // json doesn't like . to be in keys, so replace it with a placeholder
            var jsonHappyKey = updatedKey.split(".").join("____");
            curveOpsUpdate[myDataIdx][jsonHappyKey] = update[updatedKey];
        }
    },
    'click .annotateVisibility': function (event) {
        event.preventDefault();
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-annotate', '');
        if ($("#legendContainer" + label)[0].hidden) {
            $("#legendContainer" + label)[0].style.display = "block";
            $('#' + label + "-curve-show-hide-annotate")[0].value = "hide annotation";
            $("#legendContainer" + label)[0].hidden = false;
        } else {
            $("#legendContainer" + label)[0].style.display = "none";
            $('#' + label + "-curve-show-hide-annotate")[0].value = "show annotation";
            $("#legendContainer" + label)[0].hidden = true;
        }
        annotation = $("#curves")[0].innerHTML;
    },
    'click .heatMapVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        if (dataset[0].lat.length > 0) {
            var update;
            var didx;
            if (dataset[0].marker.opacity === 0) {
                update = {
                    'marker.opacity': 1
                };
                Plotly.restyle($("#placeholder")[0], update, 0);
                // save the updates in case we want to pass them to a pop-out window.
                curveOpsUpdate[0] = curveOpsUpdate[0] === undefined ? {} : curveOpsUpdate[0];
                curveOpsUpdate[0]['marker____opacity'] = update['marker.opacity'];
                update = {
                    'visible': false
                };
                for (didx = 1; didx < dataset.length; didx++) {
                    Plotly.restyle($("#placeholder")[0], update, didx);
                    // save the updates in case we want to pass them to a pop-out window.
                    curveOpsUpdate[didx] = curveOpsUpdate[didx] === undefined ? {} : curveOpsUpdate[didx];
                    curveOpsUpdate[didx]['visible'] = update['visible'];
                }
                $('#' + label + "-curve-show-hide-heatmap")[0].value = "hide heat map";
            } else {
                update = {
                    'marker.opacity': 0
                };
                Plotly.restyle($("#placeholder")[0], update, 0);
                // save the updates in case we want to pass them to a pop-out window.
                curveOpsUpdate[0] = curveOpsUpdate[0] === undefined ? {} : curveOpsUpdate[0];
                curveOpsUpdate[0]['marker____opacity'] = update['marker.opacity'];
                update = {
                    'visible': true
                };
                for (didx = 1; didx < dataset.length; didx++) {
                    Plotly.restyle($("#placeholder")[0], update, didx);
                    // save the updates in case we want to pass them to a pop-out window.
                    curveOpsUpdate[didx] = curveOpsUpdate[didx] === undefined ? {} : curveOpsUpdate[didx];
                    curveOpsUpdate[didx]['visible'] = update['visible'];
                }
                $('#' + label + "-curve-show-hide-heatmap")[0].value = "show heat map";

            }
        }
    },
    // add refresh button
    'click #refresh-plot': function (event) {
        event.preventDefault();
        var plotType = Session.get('plotType');
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = Session.get('options');
        if (curveOpsUpdate.length === 0) {
            // we just need a relayout
            Plotly.relayout($("#placeholder")[0], options);
        } else {
            // we need both a relayout and a restyle
            curveOpsUpdate = [];
            switch (plotType) {
                case matsTypes.PlotTypes.contour:
                case matsTypes.PlotTypes.contourDiff:
                    // restyle for contour plots
                    Plotly.restyle($("#placeholder")[0], Session.get('colorbarResetOpts'), 0);
                    break;
                case matsTypes.PlotTypes.timeSeries:
                case matsTypes.PlotTypes.profile:
                case matsTypes.PlotTypes.dieoff:
                case matsTypes.PlotTypes.threshold:
                case matsTypes.PlotTypes.validtime:
                case matsTypes.PlotTypes.dailyModelCycle:
                case matsTypes.PlotTypes.reliability:
                case matsTypes.PlotTypes.roc:
                    // restyle for line plots
                    const lineTypeResetOpts = Session.get('lineTypeResetOpts');
                    for (var lidx = 0; lidx < lineTypeResetOpts.length; lidx++) {
                        Plotly.restyle($("#placeholder")[0], lineTypeResetOpts[lidx], lidx);
                        $('#' + dataset[lidx].label + "-curve-show-hide")[0].value = "hide curve";
                        $('#' + dataset[lidx].label + "-curve-show-hide-points")[0].value = "hide points";
                        $('#' + dataset[lidx].label + "-curve-show-hide-errorbars")[0].value = "hide error bars";
                    }
                    break;
                case matsTypes.PlotTypes.histogram:
                    // restyle for bar plots
                    const barTypeResetOpts = Session.get('barTypeResetOpts');
                    for (var bidx = 0; bidx < barTypeResetOpts.length; bidx++) {
                        Plotly.restyle($("#placeholder")[0], barTypeResetOpts[bidx], bidx);
                        $('#' + dataset[bidx].label + "-curve-show-hide-bars")[0].value = "hide bars";
                    }
                    break;
                case matsTypes.PlotTypes.map:
                    // restyle for maps
                    const mapResetOpts = Session.get('mapResetOpts');
                    for (var midx = 0; midx < mapResetOpts.length; midx++) {
                        Plotly.restyle($("#placeholder")[0], mapResetOpts[midx], midx);
                    }
                    $('#' + dataset[0].label + "-curve-show-hide-heatmap")[0].value = "show heat map";
                    break;
                case matsTypes.PlotTypes.scatter2d:
                default:
                    break;
            }
            Plotly.relayout($("#placeholder")[0], options);
        }
    },
    // add axis customization modal submit button
    'click #axisSubmit': function (event) {
        event.preventDefault();
        var plotType = Session.get('plotType');
        var changeYScaleBack = false;
        var newOpts = {};
        // get input axis limits and labels
        $("input[id^=x][id$=AxisLabel]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.title'] = elem.value;
            }
        });
        if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle ||
            ((plotType === matsTypes.PlotTypes.contour || plotType === matsTypes.PlotTypes.contourDiff) && ($("#placeholder")[0].layout.xaxis.title.text).indexOf("Date") > -1)) {
            $("input[id^=x][id$=AxisMinText]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.range[0]'] = elem.value;
                }
            });
            $("input[id^=x][id$=AxisMaxText]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.range[1]'] = elem.value;
                }
            });
        } else {
            $("input[id^=x][id$=AxisMin]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.range[0]'] = elem.value;
                }
            });
            $("input[id^=x][id$=AxisMax]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.range[1]'] = elem.value;
                }
            });
        }
        $("input[id^=y][id$=AxisLabel]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.title'] = elem.value;
            }
        });
        if ((plotType === matsTypes.PlotTypes.contour || plotType === matsTypes.PlotTypes.contourDiff) && ($("#placeholder")[0].layout.xaxis.title.text).indexOf("Date") > -1) {
            $("input[id^=y][id$=AxisMinText]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[0]'] = elem.value;
                }
            });
            $("input[id^=y][id$=AxisMaxText]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[1]'] = elem.value;
                }
            });
        } else {
            $("input[id^=y][id$=AxisMin]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    if (plotType === matsTypes.PlotTypes.profile) {
                        newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[1]'] = elem.value;
                        // plotly can't seem to set axis limits on a log axis, so this needs to be changed to linear
                        if ($("#placeholder")[0].layout['yaxis' + (index === 0 ? "" : index + 1)].type === 'log') {
                            $("#axisYScale").click();
                            changeYScaleBack = true;
                        }
                    } else {
                        newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[0]'] = elem.value;
                    }
                }
            });
            $("input[id^=y][id$=AxisMax]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    if (plotType === matsTypes.PlotTypes.profile) {
                        newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[0]'] = elem.value;
                        // plotly can't seem to set axis limits on a log axis, so this needs to be changed to linear
                        if ($("#placeholder")[0].layout['yaxis' + (index === 0 ? "" : index + 1)].type === 'log') {
                            $("#axisYScale").click();
                            changeYScaleBack = true;
                        }
                    } else {
                        newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[1]'] = elem.value;
                    }
                }
            });
        }
        Plotly.relayout($("#placeholder")[0], newOpts);
        // if needed, restore the log axis
        if (changeYScaleBack) {
            $("#axisYScale").click();
        }
        $("#axisLimitModal").modal('hide');
    },
    // add line style modal submit button
    'click #lineTypeSubmit': function (event) {
        event.preventDefault();
        var plotType = Session.get('plotType');
        var updates = [];
        // get input line style change
        $("[id$=LineStyle]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                updates[index] = updates[index] === undefined ? {} : updates[index];
                updates[index]['line.dash'] = elem.value;
            }
        });
        $("input[id$=LineWeight]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                updates[index] = updates[index] === undefined ? {} : updates[index];
                updates[index]['line.width'] = elem.value;
            }
        });
        $("[id$=LineMarker]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                updates[index] = updates[index] === undefined ? {} : updates[index];
                updates[index]['marker.symbol'] = elem.value;
            }
        });
        for (var uidx = 0; uidx < updates.length; uidx++) {
            // apply new settings
            Plotly.restyle($("#placeholder")[0], updates[uidx], uidx);
        }
        $("#lineTypeModal").modal('hide');
        // save the updates in case we want to pass them to a pop-out window.
        for (uidx = 0; uidx < updates.length; uidx++) {
            curveOpsUpdate[uidx] = curveOpsUpdate[uidx] === undefined ? {} : curveOpsUpdate[uidx];
            var updatedKeys = Object.keys(updates[uidx]);
            for (var kidx = 0; kidx < updatedKeys.length; kidx++) {
                var updatedKey = updatedKeys[kidx];
                // json doesn't like . to be in keys, so replace it with a placeholder
                var jsonHappyKey = updatedKey.split(".").join("____");
                curveOpsUpdate[uidx][jsonHappyKey] = updates[uidx][updatedKey];
            }
        }
    },
    // add legend text modal submit button
    'click #legendTextSubmit': function (event) {
        event.preventDefault();
        var updates = [];
        // get input line style change
        $("[id$=LegendText]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                updates[index] = {};
                updates[index]['name'] = elem.value;
            }
        });
        for (var uidx = 0; uidx < updates.length; uidx++) {
            // apply new settings
            Plotly.restyle($("#placeholder")[0], updates[uidx], uidx);
        }
        $("#legendTextModal").modal('hide');
        // save the updates in case we want to pass them to a pop-out window.
        for (uidx = 0; uidx < updates.length; uidx++) {
            curveOpsUpdate[uidx] = curveOpsUpdate[uidx] === undefined ? {} : curveOpsUpdate[uidx];
            curveOpsUpdate[uidx]['name'] = updates[uidx]['name'];
        }
    },
    // add colorbar customization modal submit button
    'click #colorbarSubmit': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var update = {};
        // get new formatting
        $("input[id=colorbarLabel]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                update['colorbar.title'] = elem.value;
                update['colorbar.titleside'] = 'right';
                update['colorbar.titlefont'] = {size: 16, family: 'Arial, sans-serif'};
            }
        });
        $("input[id=colorbarMin]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                update['autocontour'] = false;
                update['contours.start'] = elem.value;
            }
        });
        $("input[id=colorbarMax]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                update['autocontour'] = false;
                update['contours.end'] = elem.value;
            }
        });
        $("input[id=colorbarNumber]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                update['autocontour'] = false;
                update['ncontours'] = elem.value;   // sadly plotly regards this as a "less than or equal to" value, so we have to manually set contour size
                const isStartDefined = update['contours.start'] !== undefined;
                const isEndDefined = update['contours.end'] !== undefined;
                const startVal = isStartDefined ? update['contours.start'] : dataset[0].zmin+(dataset[0].zmax-dataset[0].zmin)/16;
                const endVal = isEndDefined ? update['contours.end'] : dataset[0].zmax-(dataset[0].zmax-dataset[0].zmin)/16;
                update['contours.size'] = (endVal - startVal) / (Number(update['ncontours']) - 1);
            }
        });
        $("input[id=colorbarStep]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                if (update['ncontours'] === undefined) {
                    update['autocontour'] = false;
                    update['contours.size'] = elem.value;
                }
            }
        });
        $("input[id=colorbarReverse]").get().forEach(function (elem, index) {
            if (elem && elem.checked) {
                update['reversescale'] = true;
            } else {
                update['reversescale'] = false;
            }
        });
        $("input[id=nullSmooth]").get().forEach(function (elem, index) {
            if (elem && elem.checked) {
                update['connectgaps'] = true;
            } else {
                update['connectgaps'] = false;
            }
        });
        var elem = document.getElementById("colormapSelect");
        if (elem !== undefined && elem.value !== undefined) {
            update['colorscale'] = elem.value;
        }
        // apply new settings
        Plotly.restyle($("#placeholder")[0], update, 0);
        $("#colorbarModal").modal('hide');
        // save the updates in case we want to pass them to a pop-out window.
        curveOpsUpdate[0] = curveOpsUpdate[0] === undefined ? {} : curveOpsUpdate[0];
        const updatedKeys = Object.keys(update);
        for (var uidx = 0; uidx < updatedKeys.length; uidx++) {
            var updatedKey = updatedKeys[uidx];
            // json doesn't like . to be in keys, so replace it with a placeholder
            var jsonHappyKey = updatedKey.split(".").join("____");
            curveOpsUpdate[0][jsonHappyKey] = update[updatedKey];
        }
    }
});

