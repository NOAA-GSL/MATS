/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
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
import {moment} from 'meteor/momentjs:moment'

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
                        'showlegend': dataset[0].showlegend,
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
                case matsTypes.PlotTypes.gridscale:
                case matsTypes.PlotTypes.dailyModelCycle:
                case matsTypes.PlotTypes.reliability:
                case matsTypes.PlotTypes.roc:
                    // saved curve options for line graphs
                    var lineTypeResetOpts = [];
                    for (var lidx = 0; lidx < dataset.length; lidx++) {
                        lineTypeResetOpts.push({
                            'name': dataset[lidx].name,
                            'visible': dataset[lidx].visible,
                            'showlegend': dataset[lidx].showlegend,
                            'mode': dataset[lidx].mode,
                            'x': [dataset[lidx].x],
                            'error_y': dataset[lidx].error_y,
                            'error_x': dataset[lidx].error_x,
                            'line.dash': dataset[lidx].line.dash,
                            'line.width': dataset[lidx].line.width,
                            'line.color': dataset[lidx].line.color,
                            'marker.symbol': dataset[lidx].marker.symbol,
                            'marker.size': dataset[lidx].marker.size,
                            'marker.color': dataset[lidx].marker.color
                        });
                    }
                    Session.set('lineTypeResetOpts', lineTypeResetOpts);
                    break;
                case matsTypes.PlotTypes.histogram:
                case matsTypes.PlotTypes.ensembleHistogram:
                    // saved curve options for histograms
                    var barTypeResetOpts = [];
                    for (var bidx = 0; bidx < dataset.length; bidx++) {
                        barTypeResetOpts.push({
                            'name': dataset[bidx].name,
                            'visible': dataset[bidx].visible,
                            'showlegend': dataset[0].showlegend,
                            'marker.color': dataset[bidx].marker.color
                        });
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
            Session.set('thresholdEquiX', false);

            // initial plot
            $("#placeholder").empty();
            if (!dataset || !options) {
                return false;
            }
            Plotly.newPlot($("#placeholder")[0], dataset, options, {showLink: true});

            // append annotations and other setup
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
                    case matsTypes.PlotTypes.gridscale:
                    case matsTypes.PlotTypes.dailyModelCycle:
                    case matsTypes.PlotTypes.scatter2d:
                        localAnnotation = "<div id='" + dataset[i].curveId + "-annotation' style='color:" + dataset[i].annotateColor + "'>" + dataset[i].annotation + " </div>";
                        break;
                    case matsTypes.PlotTypes.map:
                    case matsTypes.PlotTypes.reliability:
                    case matsTypes.PlotTypes.roc:
                    case matsTypes.PlotTypes.histogram:
                    case matsTypes.PlotTypes.ensembleHistogram:
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

                // enable colorpickers on curve styles modal
                var l = dataset[i].label + 'LineColor';
                if (document.getElementById(l) !== undefined) {
                    $('#' + l).colorpicker({format: "rgb", align: "left"});
                }
            }

            if (plotType === matsTypes.PlotTypes.contour || plotType === matsTypes.PlotTypes.contourDiff) {
                // enable colorpicker on colorbar modal, if applicable. Otherwise hide the selection field.
                const lastCurveIndex = dataset.length - 1;
                if (dataset[lastCurveIndex].label === matsTypes.ReservedWords.contourSigLabel && dataset[lastCurveIndex].x.length > 0) {
                    $('#sigDotColor').colorpicker({format: "rgb", align: "left"});
                    $('#sigDotContainer')[0].style.display = "block";
                } else {
                    $('#sigDotContainer')[0].style.display = "none";
                }

                // make default colorbar selection actually match what is on the graph
                const colorscale = JSON.stringify(dataset[0].colorscale);
                let elem = document.getElementById("colormapSelect");
                elem.value = colorscale;
            }

            // enable colorpickers on axes modal, if applicable.
            if (plotType !== matsTypes.PlotTypes.map) {
                $('#gridColor').colorpicker({format: "rgb", align: "left"});
                $('#legendFontColor').colorpicker({format: "rgb", align: "left"});
            }

            // store annotation
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
                var pfuncs = matsCollections.PlotGraphFunctions.find({}).fetch();
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
                case matsTypes.PlotTypes.gridscale:
                case matsTypes.PlotTypes.dailyModelCycle:
                    return "block";
                case matsTypes.PlotTypes.reliability:
                case matsTypes.PlotTypes.roc:
                case matsTypes.PlotTypes.map:
                case matsTypes.PlotTypes.histogram:
                case matsTypes.PlotTypes.ensembleHistogram:
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
                case matsTypes.PlotTypes.gridscale:
                    return "GridScale: " + format;
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
                case matsTypes.PlotTypes.ensembleHistogram:
                    const ensembleType = p["histogram-type-controls"] !== undefined ? p["histogram-type-controls"] : "Ensemble Histogram";
                    return ensembleType + ": " + format;
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
    isThreshold: function () {
        return (Session.get('plotType') === matsTypes.PlotTypes.threshold)
    },
    isLinePlot: function () {
        var plotType = Session.get('plotType');
        switch (plotType) {
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.profile:
            case matsTypes.PlotTypes.dieoff:
            case matsTypes.PlotTypes.threshold:
            case matsTypes.PlotTypes.validtime:
            case matsTypes.PlotTypes.gridscale:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.reliability:
            case matsTypes.PlotTypes.roc:
                return true;
            case matsTypes.PlotTypes.map:
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.ensembleHistogram:
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
    legendButtonText: function () {
        var sval = this.label + "legendButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval, 'hide legend');
        }
        return Session.get(sval);
    },
    heatMapButtonText: function () {
        var sval = this.label + "heatMapButtonText";
        const appName = matsCollections.appName.findOne({}).app;
        if (Session.get(sval) === undefined) {
            if (appName !== undefined && (appName.includes("ceiling") || appName.includes("visibility"))) {
                Session.set(sval, 'hide heat map');
            } else {
                Session.set(sval, 'show heat map');
            }
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
            case matsTypes.PlotTypes.gridscale:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.reliability:
            case matsTypes.PlotTypes.roc:
            case matsTypes.PlotTypes.scatter2d:
                return "block";
            case matsTypes.PlotTypes.map:
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.ensembleHistogram:
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
            case matsTypes.PlotTypes.gridscale:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.reliability:
            case matsTypes.PlotTypes.roc:
            case matsTypes.PlotTypes.scatter2d:
                return "block";
            case matsTypes.PlotTypes.map:
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.ensembleHistogram:
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
                case matsTypes.PlotTypes.gridscale:
                case matsTypes.PlotTypes.dailyModelCycle:
                    return "block";
                case matsTypes.PlotTypes.reliability:
                case matsTypes.PlotTypes.roc:
                case matsTypes.PlotTypes.map:
                case matsTypes.PlotTypes.histogram:
                case matsTypes.PlotTypes.ensembleHistogram:
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
        if (plotType.includes("Histogram") || plotType.includes("histogram")) {
            return 'block';
        } else {
            return 'none';
        }
    },
    annotateShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        switch (plotType) {
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.profile:
            case matsTypes.PlotTypes.dieoff:
            case matsTypes.PlotTypes.threshold:
            case matsTypes.PlotTypes.validtime:
            case matsTypes.PlotTypes.gridscale:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.scatter2d:
                return 'block';
            case matsTypes.PlotTypes.map:
            case matsTypes.PlotTypes.reliability:
            case matsTypes.PlotTypes.roc:
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.ensembleHistogram:
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
            default:
                return 'none';
        }
    },
    legendShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        switch (plotType) {
            case matsTypes.PlotTypes.timeSeries:
            case matsTypes.PlotTypes.profile:
            case matsTypes.PlotTypes.dieoff:
            case matsTypes.PlotTypes.threshold:
            case matsTypes.PlotTypes.validtime:
            case matsTypes.PlotTypes.gridscale:
            case matsTypes.PlotTypes.dailyModelCycle:
            case matsTypes.PlotTypes.reliability:
            case matsTypes.PlotTypes.roc:
            case matsTypes.PlotTypes.histogram:
            case matsTypes.PlotTypes.ensembleHistogram:
            case matsTypes.PlotTypes.contour:
            case matsTypes.PlotTypes.contourDiff:
                return 'block';
            case matsTypes.PlotTypes.map:
            case matsTypes.PlotTypes.scatter2d:
            default:
                return 'none';
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
        var plotType = Session.get('plotType');
        if ((plotType === matsTypes.PlotTypes.contour || plotType === matsTypes.PlotTypes.contourDiff) && ($("#placeholder")[0].layout.yaxis.title.text).indexOf("Date") > -1) {
            return "none";
        } else {
            return "block";
        }
    },
    yAxisControlsTextVisibility: function () {
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
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
    xAxisTitle: function (xAxis) {
        Session.get('PlotResultsUpDated');
        var options = Session.get('options');
        const xAxisKey = 'xaxis' + (xAxis === 0 ? "" : xAxis + 1);
        if (options !== undefined && options[xAxisKey] !== undefined && options[xAxisKey].title !== undefined) {
            return options[xAxisKey].title;
        } else {
            return ""
        }
    },
    xAxisTitleFont: function (xAxis) {
        Session.get('PlotResultsUpDated');
        var options = Session.get('options');
        const xAxisKey = 'xaxis' + (xAxis === 0 ? "" : xAxis + 1);
        if (options !== undefined && options[xAxisKey] !== undefined && options[xAxisKey].titlefont !== undefined && options[xAxisKey].titlefont.size !== undefined) {
            return options[xAxisKey].titlefont.size;
        } else {
            return ""
        }
    },
    xAxisMin: function (xAxis) {
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
        var options = Session.get('options');
        const xAxisKey = 'xaxis' + (xAxis === 0 ? "" : xAxis + 1);
        if (options !== undefined && options[xAxisKey] !== undefined && options[xAxisKey].range !== undefined) {
            try {
                return options[xAxisKey].range[0].toPrecision(4);
            } catch {
                return options[xAxisKey].range[0];
            }
        } else {
            return ""
        }
    },
    xAxisMax: function (xAxis) {
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
        var options = Session.get('options');
        const xAxisKey = 'xaxis' + (xAxis === 0 ? "" : xAxis + 1);
        if (options !== undefined && options[xAxisKey] !== undefined && options[xAxisKey].range !== undefined) {
            try {
                return options[xAxisKey].range[1].toPrecision(4);
            } catch {
                return options[xAxisKey].range[1];
            }
        } else {
            return ""
        }
    },
    xAxisTickFont: function (xAxis) {
        Session.get('PlotResultsUpDated');
        var options = Session.get('options');
        const xAxisKey = 'xaxis' + (xAxis === 0 ? "" : xAxis + 1);
        if (options !== undefined && options[xAxisKey] !== undefined && options[xAxisKey].tickfont !== undefined && options[xAxisKey].tickfont.size !== undefined) {
            return options[xAxisKey].tickfont.size;
        } else {
            return ""
        }
    },
    yAxisTitle: function (yAxis) {
        Session.get('PlotResultsUpDated');
        var options = Session.get('options');
        const yAxisKey = 'yaxis' + (yAxis === 0 ? "" : yAxis + 1);
        if (options !== undefined && options[yAxisKey] !== undefined && options[yAxisKey].title !== undefined) {
            return options[yAxisKey].title;
        } else {
            return ""
        }
    },
    yAxisTitleFont: function (yAxis) {
        Session.get('PlotResultsUpDated');
        var options = Session.get('options');
        const yAxisKey = 'yaxis' + (yAxis === 0 ? "" : yAxis + 1);
        if (options !== undefined && options[yAxisKey] !== undefined && options[yAxisKey].titlefont !== undefined && options[yAxisKey].titlefont.size !== undefined) {
            return options[yAxisKey].titlefont.size;
        } else {
            return ""
        }
    },
    yAxisMin: function (yAxis) {
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
        var options = Session.get('options');
        const yAxisKey = 'yaxis' + (yAxis === 0 ? "" : yAxis + 1);
        if (options !== undefined && options[yAxisKey] !== undefined && options[yAxisKey].range !== undefined) {
            if (plotType === matsTypes.PlotTypes.profile) {
                try {
                    return options[yAxisKey].range[1].toPrecision(4);
                } catch {
                    return options[yAxisKey].range[1];
                }
            } else {
                try {
                    return options[yAxisKey].range[0].toPrecision(4);
                } catch {
                    return options[yAxisKey].range[0];
                }
            }
        } else {
            return ""
        }
    },
    yAxisMax: function (yAxis) {
        Session.get('PlotResultsUpDated');
        var plotType = Session.get('plotType');
        var options = Session.get('options');
        const yAxisKey = 'yaxis' + (yAxis === 0 ? "" : yAxis + 1);
        if (options !== undefined && options[yAxisKey] !== undefined && options[yAxisKey].range !== undefined) {
            if (plotType === matsTypes.PlotTypes.profile) {
                try {
                    return options[yAxisKey].range[0].toPrecision(4);
                } catch {
                    return options[yAxisKey].range[0];
                }
            } else {
                try {
                    return options[yAxisKey].range[1].toPrecision(4);
                } catch {
                    return options[yAxisKey].range[1];
                }
            }
        } else {
            return ""
        }
    },
    yAxisTickFont: function (yAxis) {
        Session.get('PlotResultsUpDated');
        var options = Session.get('options');
        const yAxisKey = 'yaxis' + (yAxis === 0 ? "" : yAxis + 1);
        if (options !== undefined && options[yAxisKey] !== undefined && options[yAxisKey].tickfont !== undefined && options[yAxisKey].tickfont.size !== undefined) {
            return options[yAxisKey].tickfont.size;
        } else {
            return ""
        }
    },
    legendFontSize: function () {
        Session.get('PlotResultsUpDated');
        var options = Session.get('options');
        if (options !== undefined && options.legend !== undefined && options.legend.font !== undefined && options.legend.font.size !== undefined) {
            return options.legend.font.size;
        } else {
            return ""
        }
    },
    gridWeight: function () {
        Session.get('PlotResultsUpDated');
        var options = Session.get('options');
        if (options !== undefined && options.xaxis !== undefined && options.xaxis.gridwidth !== undefined) {
            return options.xaxis.gridwidth;
        } else {
            return ""
        }
    },
    /**
     * @return {string}
     */
    RdWhBuTriplet: function () {
        // rgb values for custom RdWhBu colormap
        return '[[0,"rgb(5,10,172)"],[0.35,"rgb(106,137,247)"],[0.45,"rgb(255,255,255)"],[0.55,"rgb(255,255,255)"],[0.6,"rgb(220,170,132)"],[0.7,"rgb(230,145,90)"],[1,"rgb(178,10,28)"]]';
    },
    /**
     * @return {string}
     */
    MPL_BrBGTriplet: function () {
        // rgb values for custom MPL_BrBG colormap
        return '[[0,"rgb(86,49,5)"],[0.008,"rgb(91,52,6)"],[0.016,"rgb(95,54,6)"],[0.023,"rgb(99,57,6)"],[0.031,"rgb(104,60,7)"],[0.039,"rgb(108,62,7)"],[0.047,"rgb(113,65,8)"],[0.055,"rgb(117,67,8)"],[0.063,"rgb(121,70,8)"],[0.070,"rgb(124,71,9)"],[0.078,"rgb(130,75,9)"],[0.086,"rgb(132,76,9)"],[0.094,"rgb(139,80,10)"],[0.102,"rgb(141,82,11)"],[0.109,"rgb(147,88,15)"],[0.117,"rgb(149,89,16)"],[0.125,"rgb(155,95,20)"],[0.133,"rgb(159,99,23)"],[0.141,"rgb(161,101,24)"],[0.148,"rgb(167,106,29)"],[0.156,"rgb(171,110,31)"],[0.164,"rgb(175,114,34)"],[0.172,"rgb(177,116,35)"],[0.180,"rgb(183,121,40)"],[0.188,"rgb(187,125,42)"],[0.195,"rgb(191,129,45)"],[0.203,"rgb(192,132,48)"],[0.211,"rgb(196,139,58)"],[0.219,"rgb(199,144,64)"],[0.227,"rgb(201,149,70)"],[0.234,"rgb(202,152,73)"],[0.242,"rgb(206,160,83)"],[0.250,"rgb(209,165,89)"],[0.258,"rgb(211,170,95)"],[0.266,"rgb(214,175,101)"],[0.273,"rgb(216,180,108)"],[0.281,"rgb(219,185,114)"],[0.289,"rgb(220,188,117)"],[0.297,"rgb(223,195,126)"],[0.305,"rgb(225,198,132)"],[0.313,"rgb(227,201,137)"],[0.320,"rgb(229,204,143)"],[0.328,"rgb(231,207,148)"],[0.336,"rgb(232,210,154)"],[0.344,"rgb(234,213,159)"],[0.352,"rgb(235,214,162)"],[0.359,"rgb(238,219,170)"],[0.367,"rgb(240,222,176)"],[0.375,"rgb(241,225,181)"],[0.383,"rgb(243,228,187)"],[0.391,"rgb(245,231,192)"],[0.398,"rgb(246,233,197)"],[0.406,"rgb(246,234,201)"],[0.414,"rgb(246,234,203)"],[0.422,"rgb(246,236,209)"],[0.430,"rgb(246,237,213)"],[0.438,"rgb(246,238,217)"],[0.445,"rgb(245,239,220)"],[0.453,"rgb(245,240,224)"],[0.461,"rgb(245,241,228)"],[0.469,"rgb(245,242,232)"],[0.477,"rgb(245,242,234)"],[0.484,"rgb(245,244,240)"],[0.492,"rgb(245,245,244)"],[0.500,"rgb(242,244,244)"],[0.508,"rgb(239,243,243)"],[0.516,"rgb(235,243,242)"],[0.523,"rgb(231,242,240)"],[0.531,"rgb(228,241,239)"],[0.539,"rgb(224,240,238)"],[0.547,"rgb(221,239,237)"],[0.555,"rgb(217,238,235)"],[0.563,"rgb(213,237,234)"],[0.570,"rgb(210,237,233)"],[0.578,"rgb(206,236,232)"],[0.586,"rgb(204,235,231)"],[0.594,"rgb(199,234,229)"],[0.602,"rgb(193,232,226)"],[0.609,"rgb(188,229,223)"],[0.617,"rgb(182,227,221)"],[0.625,"rgb(177,225,218)"],[0.633,"rgb(171,223,215)"],[0.641,"rgb(166,220,212)"],[0.648,"rgb(160,218,209)"],[0.656,"rgb(154,216,206)"],[0.664,"rgb(149,214,204)"],[0.672,"rgb(143,211,201)"],[0.680,"rgb(138,209,198)"],[0.688,"rgb(132,207,195)"],[0.695,"rgb(127,204,192)"],[0.703,"rgb(121,200,188)"],[0.711,"rgb(118,198,186)"],[0.719,"rgb(109,191,180)"],[0.727,"rgb(103,187,176)"],[0.734,"rgb(97,183,172)"],[0.742,"rgb(91,179,168)"],[0.750,"rgb(85,174,165)"],[0.758,"rgb(79,170,161)"],[0.766,"rgb(74,166,157)"],[0.773,"rgb(68,162,153)"],[0.781,"rgb(62,157,149)"],[0.789,"rgb(56,153,145)"],[0.797,"rgb(51,149,141)"],[0.805,"rgb(47,145,137)"],[0.813,"rgb(43,141,133)"],[0.820,"rgb(39,138,130)"],[0.828,"rgb(35,134,126)"],[0.836,"rgb(33,132,124)"],[0.844,"rgb(26,126,118)"],[0.852,"rgb(22,122,114)"],[0.859,"rgb(18,118,110)"],[0.867,"rgb(14,114,106)"],[0.875,"rgb(10,111,103)"],[0.883,"rgb(6,107,99)"],[0.891,"rgb(2,103,95)"],[0.898,"rgb(1,100,91)"],[0.906,"rgb(1,96,88)"],[0.914,"rgb(1,93,84)"],[0.922,"rgb(1,90,80)"],[0.930,"rgb(1,86,77)"],[0.938,"rgb(1,83,73)"],[0.945,"rgb(0,80,70)"],[0.953,"rgb(0,76,66)"],[0.961,"rgb(0,75,64)"],[0.969,"rgb(0,70,59)"],[0.977,"rgb(0,67,55)"],[0.984,"rgb(0,63,52)"],[1,"rgb(0,60,48)"]]';
    },
    /**
     * @return {string}
     */
    MPL_BrBWGTriplet: function () {
        // rgb values for custom MPL_BrBG colormap
        return '[[0,"rgb(86,49,5)"],[0.008,"rgb(91,52,6)"],[0.016,"rgb(95,54,6)"],[0.023,"rgb(99,57,6)"],[0.031,"rgb(104,60,7)"],[0.039,"rgb(108,62,7)"],[0.047,"rgb(113,65,8)"],[0.055,"rgb(117,67,8)"],[0.063,"rgb(121,70,8)"],[0.070,"rgb(124,71,9)"],[0.078,"rgb(130,75,9)"],[0.086,"rgb(132,76,9)"],[0.094,"rgb(139,80,10)"],[0.102,"rgb(141,82,11)"],[0.109,"rgb(147,88,15)"],[0.117,"rgb(149,89,16)"],[0.125,"rgb(155,95,20)"],[0.133,"rgb(159,99,23)"],[0.141,"rgb(161,101,24)"],[0.148,"rgb(167,106,29)"],[0.156,"rgb(171,110,31)"],[0.164,"rgb(175,114,34)"],[0.172,"rgb(177,116,35)"],[0.180,"rgb(183,121,40)"],[0.188,"rgb(187,125,42)"],[0.195,"rgb(191,129,45)"],[0.203,"rgb(192,132,48)"],[0.211,"rgb(196,139,58)"],[0.219,"rgb(199,144,64)"],[0.227,"rgb(201,149,70)"],[0.234,"rgb(202,152,73)"],[0.242,"rgb(206,160,83)"],[0.250,"rgb(209,165,89)"],[0.258,"rgb(211,170,95)"],[0.266,"rgb(214,175,101)"],[0.273,"rgb(216,180,108)"],[0.281,"rgb(219,185,114)"],[0.289,"rgb(220,188,117)"],[0.297,"rgb(223,195,126)"],[0.305,"rgb(225,198,132)"],[0.313,"rgb(227,201,137)"],[0.320,"rgb(229,204,143)"],[0.328,"rgb(231,207,148)"],[0.336,"rgb(232,210,154)"],[0.344,"rgb(234,213,159)"],[0.352,"rgb(235,214,162)"],[0.359,"rgb(238,219,170)"],[0.367,"rgb(240,222,176)"],[0.375,"rgb(241,225,181)"],[0.383,"rgb(243,228,187)"],[0.391,"rgb(245,231,192)"],[0.398,"rgb(246,233,197)"],[0.406,"rgb(246,234,201)"],[0.414,"rgb(246,234,203)"],[0.422,"rgb(246,236,209)"],[0.430,"rgb(246,237,213)"],[0.438,"rgb(246,238,217)"],[0.445,"rgb(255,255,255)"],[0.555,"rgb(255,255,255)"],[0.563,"rgb(213,237,234)"],[0.570,"rgb(210,237,233)"],[0.578,"rgb(206,236,232)"],[0.586,"rgb(204,235,231)"],[0.594,"rgb(199,234,229)"],[0.602,"rgb(193,232,226)"],[0.609,"rgb(188,229,223)"],[0.617,"rgb(182,227,221)"],[0.625,"rgb(177,225,218)"],[0.633,"rgb(171,223,215)"],[0.641,"rgb(166,220,212)"],[0.648,"rgb(160,218,209)"],[0.656,"rgb(154,216,206)"],[0.664,"rgb(149,214,204)"],[0.672,"rgb(143,211,201)"],[0.680,"rgb(138,209,198)"],[0.688,"rgb(132,207,195)"],[0.695,"rgb(127,204,192)"],[0.703,"rgb(121,200,188)"],[0.711,"rgb(118,198,186)"],[0.719,"rgb(109,191,180)"],[0.727,"rgb(103,187,176)"],[0.734,"rgb(97,183,172)"],[0.742,"rgb(91,179,168)"],[0.750,"rgb(85,174,165)"],[0.758,"rgb(79,170,161)"],[0.766,"rgb(74,166,157)"],[0.773,"rgb(68,162,153)"],[0.781,"rgb(62,157,149)"],[0.789,"rgb(56,153,145)"],[0.797,"rgb(51,149,141)"],[0.805,"rgb(47,145,137)"],[0.813,"rgb(43,141,133)"],[0.820,"rgb(39,138,130)"],[0.828,"rgb(35,134,126)"],[0.836,"rgb(33,132,124)"],[0.844,"rgb(26,126,118)"],[0.852,"rgb(22,122,114)"],[0.859,"rgb(18,118,110)"],[0.867,"rgb(14,114,106)"],[0.875,"rgb(10,111,103)"],[0.883,"rgb(6,107,99)"],[0.891,"rgb(2,103,95)"],[0.898,"rgb(1,100,91)"],[0.906,"rgb(1,96,88)"],[0.914,"rgb(1,93,84)"],[0.922,"rgb(1,90,80)"],[0.930,"rgb(1,86,77)"],[0.938,"rgb(1,83,73)"],[0.945,"rgb(0,80,70)"],[0.953,"rgb(0,76,66)"],[0.961,"rgb(0,75,64)"],[0.969,"rgb(0,70,59)"],[0.977,"rgb(0,67,55)"],[0.984,"rgb(0,63,52)"],[1,"rgb(0,60,48)"]]';
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
    'click .showHideButton': function () {
        $("#showHideModal").modal('show');
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
    'click .axisXSpace': function (event) {
        // equally space the x values, or restore them.
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        const thresholdEquiX = Session.get('thresholdEquiX');   // boolean that has the current state of the axes
        var newOpts = {};
        var updates = [];
        var origX = [];
        var tickvals = [];
        var ticktext = [];
        var didx;
        newOpts['xaxis.range[0]'] = Number.MAX_VALUE;      // placeholder xmin
        newOpts['xaxis.range[1]'] = -1 * Number.MAX_VALUE;      // placeholder xmax
        const reservedWords = Object.values(matsTypes.ReservedWords);
        if (!thresholdEquiX) {
            // axes are not equally spaced, so make them so
            for (didx = 0; didx < dataset.length; didx++) {
                // save the original x values
                origX.push(dataset[didx].x);

                // create new array of equally-space x values
                var newX = [];
                if (reservedWords.indexOf(dataset[didx].label) >= 0) {
                    // for zero or max curves, the two x points should be the axis min and max
                    newX.push(newOpts['xaxis.range[0]']);
                    newX.push(newOpts['xaxis.range[1]']);
                } else {
                    // otherwise just use the first n integers
                    for (var xidx = 0; xidx < dataset[didx].x.length; xidx++) {
                        newX.push(xidx);
                    }
                }

                // redraw the curves with equally-spaced x values
                updates[didx] = updates[didx] === undefined ? {} : updates[didx];
                updates[didx]['x'] = [newX];
                Plotly.restyle($("#placeholder")[0], updates[didx], didx);

                // save the updates in case we want to pass them to a pop-out window.
                curveOpsUpdate[didx] = curveOpsUpdate[didx] === undefined ? {} : curveOpsUpdate[didx];
                curveOpsUpdate[didx]['x'] = [newX];

                // store the new xmax and xmin from this curve
                newOpts['xaxis.range[0]'] = newOpts['xaxis.range[0]'] < newX[0] ? newOpts['xaxis.range[0]'] : newX[0];
                newOpts['xaxis.range[1]'] = newOpts['xaxis.range[1]'] > newX[newX.length - 1] ? newOpts['xaxis.range[1]'] : newX[newX.length - 1];

                // store previous and new x values to craft consistent tick marks
                tickvals = _.union(tickvals, newX);
                ticktext = _.union(ticktext, origX[didx]);
            }
            Session.set('thresholdEquiX', true);
            Session.set('origX', origX);
        } else {
            // axes not equally spaced, so make them not
            origX = Session.get('origX');   // get the original x values back out of the session
            for (didx = 0; didx < dataset.length; didx++) {
                // redraw the curves with the original x values
                updates[didx] = updates[didx] === undefined ? {} : updates[didx];
                updates[didx]['x'] = [origX[didx]];
                Plotly.restyle($("#placeholder")[0], updates[didx], didx);

                // store the new xmax and xmin from this curve
                newOpts['xaxis.range[0]'] = newOpts['xaxis.range[0]'] < origX[didx][0] ? newOpts['xaxis.range[0]'] : origX[didx][0];
                newOpts['xaxis.range[1]'] = newOpts['xaxis.range[1]'] > origX[didx][origX[didx].length - 1] ? newOpts['xaxis.range[1]'] : origX[didx][origX[didx].length - 1];

                // store previous and new x values to craft consistent tick marks
                tickvals = _.union(tickvals, origX[didx]);
                ticktext = _.union(ticktext, origX[didx]);

                // remove new formatting that would have been passed to pop-out windows
                delete (curveOpsUpdate[didx]['x']);
            }
            Session.set('thresholdEquiX', false);
        }
        // redraw the plot with the new axis options
        newOpts['xaxis.tickvals'] = tickvals.sort(function (a, b) {
            return a - b
        });
        newOpts['xaxis.ticktext'] = ticktext.sort(function (a, b) {
            return a - b
        }).map(String);
        const xPad = ((newOpts['xaxis.range[1]'] - newOpts['xaxis.range[0]']) * 0.025) !== 0 ? (newOpts['xaxis.range[1]'] - newOpts['xaxis.range[0]']) * 0.025 : 0.025;
        newOpts['xaxis.range[0]'] = newOpts['xaxis.range[0]'] - xPad;
        newOpts['xaxis.range[1]'] = newOpts['xaxis.range[1]'] + xPad;
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
            document.getElementById("plot-curves").click();
        }
    },
    'click .reCacheButton': function () {
        var plotType = Session.get('plotType');
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
                    $('#' + id)[0].value = "show curve";
                } else if (dataset[myDataIdx].mode === "lines+markers") {   // in line and point mode, lines and points are visible, so make nothing visible
                    update = {
                        visible: !dataset[myDataIdx].visible
                    };
                    $('#' + id)[0].value = "show curve";
                    $('#' + id + "-points")[0].value = "show points";
                } else if (dataset[myDataIdx].mode === "markers") {         // in point mode, points are visible, so make lines and points visible
                    update = {
                        mode: "lines+markers"
                    };
                    $('#' + id)[0].value = "hide curve";
                }
            } else {
                if (dataset[myDataIdx].mode === "lines") {                  // in line mode, nothing is visible, so make lines visible
                    update = {
                        visible: !dataset[myDataIdx].visible
                    };
                    $('#' + id)[0].value = "hide curve";
                } else if (dataset[myDataIdx].mode === "lines+markers") {   // in line and point mode, nothing is visible, so make lines and points visible
                    update = {
                        visible: !dataset[myDataIdx].visible
                    };
                    $('#' + id)[0].value = "hide curve";
                    $('#' + id + "-points")[0].value = "hide points";
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
                    $('#' + id)[0].value = "hide points";
                } else if (dataset[myDataIdx].mode === "lines+markers") {   // lines and points are visible, so make only lines visible
                    update = {
                        mode: "lines"
                    };
                    $('#' + id)[0].value = "show points";
                } else if (dataset[myDataIdx].mode === "markers") {         // points are visible, so make nothing visible
                    update = {
                        visible: !dataset[myDataIdx].visible,
                        mode: "lines"
                    };
                    $('#' + id)[0].value = "show points";
                }
            } else {                                                        // nothing is visible, so make points visible
                update = {
                    visible: !dataset[myDataIdx].visible,
                    mode: "markers"
                };
                $('#' + id)[0].value = "hide points";
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
                    $('#' + id)[0].value = "hide error bars";
                } else {
                    $('#' + id)[0].value = "show error bars";
                }
            } else {
                update = {
                    error_x: dataset[myDataIdx].error_x
                };
                update.error_x.visible = !update.error_x.visible;
                if (update.error_x.visible) {
                    $('#' + id)[0].value = "hide error bars";
                } else {
                    $('#' + id)[0].value = "show error bars";
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
                $('#' + id)[0].value = "hide bars";
            } else {
                $('#' + id)[0].value = "show bars";
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
        const legendContainer = $("#legendContainer" + label);
        if (legendContainer[0].hidden) {
            legendContainer[0].style.display = "block";
            $('#' + label + "-curve-show-hide-annotate")[0].value = "hide annotation";
            legendContainer[0].hidden = false;
        } else {
            legendContainer[0].style.display = "none";
            $('#' + label + "-curve-show-hide-annotate")[0].value = "show annotation";
            legendContainer[0].hidden = true;
        }
        annotation = $("#curves")[0].innerHTML;
    },
    'click .legendVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-legend', '');
        const myDataIdx = dataset.findIndex(function (d) {
            return d.curveId === label;
        });
        if (dataset[myDataIdx].x.length > 0) {
            var update = {
                showlegend: !dataset[myDataIdx].showlegend
            };
            if (update.showlegend) {
                $('#' + id)[0].value = "hide legend";
            } else {
                $('#' + id)[0].value = "show legend";
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
    'click .heatMapVisibility': function (event) {
        event.preventDefault();
        const id = event.target.id;
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
                    'visible': 'legendonly'
                };
                for (didx = 1; didx < dataset.length; didx++) {
                    Plotly.restyle($("#placeholder")[0], update, didx);
                    // save the updates in case we want to pass them to a pop-out window.
                    curveOpsUpdate[didx] = curveOpsUpdate[didx] === undefined ? {} : curveOpsUpdate[didx];
                    curveOpsUpdate[didx]['visible'] = update['visible'];
                }
                $('#' + id)[0].value = "hide heat map";
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
                $('#' + id)[0].value = "show heat map";

            }
        }
    },
    // add refresh button
    'click #refresh-plot': function (event) {
        event.preventDefault();
        var plotType = Session.get('plotType');
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = Session.get('options');
        Session.set('thresholdEquiX', false);
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
                    // deal with sig dots that some of the difference contours have
                    const lastCurveIndex = dataset.length - 1;
                    if (dataset[lastCurveIndex].label === matsTypes.ReservedWords.contourSigLabel && dataset[lastCurveIndex].x.length > 0) {
                        const sigDotReset = {'marker.color': 'rgb(0,0,0)'};
                        Plotly.restyle($("#placeholder")[0], sigDotReset, lastCurveIndex);
                    }
                    break;
                case matsTypes.PlotTypes.timeSeries:
                case matsTypes.PlotTypes.profile:
                case matsTypes.PlotTypes.dieoff:
                case matsTypes.PlotTypes.threshold:
                case matsTypes.PlotTypes.validtime:
                case matsTypes.PlotTypes.gridscale:
                case matsTypes.PlotTypes.dailyModelCycle:
                case matsTypes.PlotTypes.reliability:
                case matsTypes.PlotTypes.roc:
                    // restyle for line plots
                    const lineTypeResetOpts = Session.get('lineTypeResetOpts');
                    for (var lidx = 0; lidx < lineTypeResetOpts.length; lidx++) {
                        Plotly.restyle($("#placeholder")[0], lineTypeResetOpts[lidx], lidx);
                        if (Object.values(matsTypes.ReservedWords).indexOf(dataset[lidx].label) === -1) {
                            $('#' + dataset[lidx].label + "-curve-show-hide")[0].value = "hide curve";
                            $('#' + dataset[lidx].label + "-curve-show-hide-points")[0].value = "hide points";
                            $('#' + dataset[lidx].label + "-curve-show-hide-errorbars")[0].value = "hide error bars";
                            $('#' + dataset[lidx].label + "-curve-show-hide-legend")[0].value = "hide legend";

                            // revert the annotation to the original colors
                            const thisAnnotation = $("#legendContainer" + dataset[lidx].label);
                            const annotationCurrentlyHidden = thisAnnotation[0].hidden;
                            const localAnnotation = "<div id='" + dataset[lidx].label + "-annotation' style='color:" + lineTypeResetOpts[lidx]["line.color"] + "'>" + dataset[lidx].annotation + " </div>";
                            thisAnnotation.empty().append(localAnnotation);
                            thisAnnotation[0].hidden = annotationCurrentlyHidden;
                            thisAnnotation[0].style.display = thisAnnotation[0].hidden ? "none" : "block";
                            annotation = $("#curves")[0].innerHTML;
                        }
                    }
                    break;
                case matsTypes.PlotTypes.histogram:
                case matsTypes.PlotTypes.ensembleHistogram:
                    // restyle for bar plots
                    const barTypeResetOpts = Session.get('barTypeResetOpts');
                    for (var bidx = 0; bidx < barTypeResetOpts.length; bidx++) {
                        Plotly.restyle($("#placeholder")[0], barTypeResetOpts[bidx], bidx);
                        if (Object.values(matsTypes.ReservedWords).indexOf(dataset[bidx].label) === -1) {
                            $('#' + dataset[bidx].label + "-curve-show-hide-bars")[0].value = "hide bars";
                            $('#' + dataset[bidx].label + "-curve-show-hide-legend")[0].value = "hide legend";
                        }
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
        $("input[id^=x][id$=AxisFont]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.titlefont.size'] = elem.value;
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
            $("input[id^=x][id$=TickFontText]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.tickfont.size'] = elem.value;
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
            $("input[id^=x][id$=TickFont]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.tickfont.size'] = elem.value;
                }
            });
        }
        $("input[id^=y][id$=AxisLabel]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.title'] = elem.value;
            }
        });
        $("input[id^=y][id$=AxisFont]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.titlefont.size'] = elem.value;
            }
        });
        if ((plotType === matsTypes.PlotTypes.contour || plotType === matsTypes.PlotTypes.contourDiff) && ($("#placeholder")[0].layout.yaxis.title.text).indexOf("Date") > -1) {
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
            $("input[id^=y][id$=TickFontText]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.tickfont.size'] = elem.value;
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
            $("input[id^=y][id$=TickFont]").get().forEach(function (elem, index) {
                if (elem.value !== undefined && elem.value !== "") {
                    newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.tickfont.size'] = elem.value;
                }
            });
        }
        $("[id$=legendFontSize]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['legend.font.size'] = elem.value;
            }
        });
        $("[id$=legendFontColor]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['legend.font.color'] = elem.value;
            }
        });
        $("[id$=gridWeight]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.gridwidth'] = elem.value;
                newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.gridwidth'] = elem.value;
            }
        });
        $("[id$=gridColor]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.gridcolor'] = elem.value;
                newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.gridcolor'] = elem.value;
            }
        });
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
        var dataset = matsCurveUtils.getGraphResult().data;
        var updates = [];
        // get input line style change
        $("[id$=LineColor]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                updates[index] = updates[index] === undefined ? {} : updates[index];
                switch (plotType) {
                    case matsTypes.PlotTypes.timeSeries:
                    case matsTypes.PlotTypes.profile:
                    case matsTypes.PlotTypes.dieoff:
                    case matsTypes.PlotTypes.threshold:
                    case matsTypes.PlotTypes.validtime:
                    case matsTypes.PlotTypes.gridscale:
                    case matsTypes.PlotTypes.dailyModelCycle:
                    case matsTypes.PlotTypes.reliability:
                    case matsTypes.PlotTypes.roc:
                        // options for line plots
                        updates[index]['line.color'] = elem.value;
                        updates[index]['marker.color'] = elem.value;
                        if (dataset[index].error_x !== undefined && dataset[index].error_x !== null && dataset[index].error_x.color !== undefined) {
                            updates[index]['error_x.color'] = elem.value;
                        }
                        if (dataset[index].error_y !== undefined && dataset[index].error_y !== null && dataset[index].error_y.color !== undefined) {
                            updates[index]['error_y.color'] = elem.value;
                        }

                        // update the annotation with the new color
                        const thisAnnotation = $("#legendContainer" + dataset[index].curveId);
                        const annotationCurrentlyHidden = thisAnnotation[0].hidden;
                        const localAnnotation = "<div id='" + dataset[index].curveId + "-annotation' style='color:" + elem.value + "'>" + dataset[index].annotation + " </div>";
                        thisAnnotation.empty().append(localAnnotation);
                        thisAnnotation[0].hidden = annotationCurrentlyHidden;
                        thisAnnotation[0].style.display = thisAnnotation[0].hidden ? "none" : "block";
                        annotation = $("#curves")[0].innerHTML;
                        break;
                    case matsTypes.PlotTypes.histogram:
                    case matsTypes.PlotTypes.ensembleHistogram:
                        // options for bar plots
                        updates[index]['marker.color'] = elem.value;
                        break;
                    case matsTypes.PlotTypes.contour:
                    case matsTypes.PlotTypes.contourDiff:
                    case matsTypes.PlotTypes.map:
                    case matsTypes.PlotTypes.scatter2d:
                    default:
                        break;
                }
            }
        });
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
        $("[id$=MarkerWeight]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                updates[index] = updates[index] === undefined ? {} : updates[index];
                updates[index]['marker.size'] = elem.value;
            }
        });
        for (var uidx = 0; uidx < updates.length; uidx++) {
            // apply new settings
            Plotly.restyle($("#placeholder")[0], updates[uidx], uidx);
        }

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
        $("#lineTypeModal").modal('hide');
    },
    // add show/hide modal submit button
    'click #showHideSubmit': function (event) {
        event.preventDefault();
        $("#showHideModal").modal('hide');
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

        // save the updates in case we want to pass them to a pop-out window.
        for (uidx = 0; uidx < updates.length; uidx++) {
            curveOpsUpdate[uidx] = curveOpsUpdate[uidx] === undefined ? {} : curveOpsUpdate[uidx];
            curveOpsUpdate[uidx]['name'] = updates[uidx]['name'];
        }
        $("#legendTextModal").modal('hide');
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
                const startVal = isStartDefined ? update['contours.start'] : dataset[0].zmin + (dataset[0].zmax - dataset[0].zmin) / 16;
                const endVal = isEndDefined ? update['contours.end'] : dataset[0].zmax - (dataset[0].zmax - dataset[0].zmin) / 16;
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

        // save the updates in case we want to pass them to a pop-out window.
        curveOpsUpdate[0] = curveOpsUpdate[0] === undefined ? {} : curveOpsUpdate[0];
        const updatedKeys = Object.keys(update);
        for (var uidx = 0; uidx < updatedKeys.length; uidx++) {
            var updatedKey = updatedKeys[uidx];
            // json doesn't like . to be in keys, so replace it with a placeholder
            var jsonHappyKey = updatedKey.split(".").join("____");
            curveOpsUpdate[0][jsonHappyKey] = update[updatedKey];
        }

        // deal with sig dots that some of the difference contours have
        const lastCurveIndex = dataset.length - 1;
        if (dataset[lastCurveIndex].label === matsTypes.ReservedWords.contourSigLabel && dataset[lastCurveIndex].x.length > 0) {
            $("[id$=sigDotColor]").get().forEach(function (elem, index) {
                update = {};
                if (elem.value !== undefined && elem.value !== "") {
                    update['marker.color'] = elem.value;
                }
            });
            Plotly.restyle($("#placeholder")[0], update, lastCurveIndex);
        }

        // save the update in case we want to pass it to a pop-out window.
        curveOpsUpdate[lastCurveIndex] = curveOpsUpdate[lastCurveIndex] === undefined ? {} : curveOpsUpdate[lastCurveIndex];
        curveOpsUpdate[lastCurveIndex]['marker____color'] = update['marker.color'];
        $("#colorbarModal").modal('hide');
    }
});

