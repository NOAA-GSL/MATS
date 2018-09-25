import {Meteor} from 'meteor/meteor';
import {Hooks} from 'meteor/differential:event-hooks';
import {
    matsCollections,
    matsCurveUtils,
    matsGraphUtils,
    matsMethods,
    matsParamUtils,
    matsPlotUtils,
    matsTypes
} from 'meteor/randyp:mats-common';
import domtoimage from 'dom-to-image';

var pageIndex = 0;

Template.graph.onRendered(function () {
    if (matsPlotUtils.getPlotType() === matsTypes.PlotTypes.map) {
        document.getElementById('graph-touch-controls').style.display = "none";
    }
});

Template.graph.onCreated(function () {
    $(window).resize(function () {
        switch (Session.get('graphViewMode')) {
            case matsTypes.PlotView.graph:
                matsGraphUtils.setGraphView();
                break;
            case matsTypes.PlotView.textSeries:
                matsGraphUtils.setTextView("textSeriesView");
                break;
            case matsTypes.PlotView.textProfile:
                matsGraphUtils.setTextView("textProfileView");
                break;
            case matsTypes.PlotView.textDieoff:
                matsGraphUtils.setTextView("textDieOffView");
                break;
            case matsTypes.PlotView.textThreshold:
                matsGraphUtils.setTextView("textThresholdView");
                break;
            case matsTypes.PlotView.textDailyModelCycle:
                matsGraphUtils.etTextView("textDailyModelCycleView");
                break;
            case matsTypes.PlotView.textMap:
                matsGraphUtils.setTextView("textMapView");
                break;
            case matsTypes.PlotView.textHistogram:
                matsGraphUtils.setTextView("textHistogramView");
                break;
            case matsTypes.PlotView.textScatter:
                matsGraphUtils.setTextView("textScatter2dView");
                break;
            default:
                matsGraphUtils.setGraphView();
        }
    });

    $(document).keyup(function (event) {
        if (Session.get("printMode") && event.keyCode == 27) { // escape key maps to keycode `27`
            document.getElementById('graph-control').style.display = 'block';
            document.getElementById('showAdministration').style.display = 'block';
            document.getElementById('navbar').style.display = 'block';
            document.getElementById('footnav').style.display = 'block';
            var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
            for (var i = 0; i < ctbgElems.length; i++) {
                ctbgElems[i].style.display = 'block';
            }
            document.getElementById('plotType').style.display = 'block';
            Session.set("printMode", false);
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
            eval(graphFunction)(Session.get('Curves'));
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
        return matsGraphUtils.width();
    },
    height: function () {
        return matsGraphUtils.height();
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
            return matsPlotUtils.getCurveText(plotType, this);
        } else {
            return this.label + ":  Difference";
        }
    },
    confidenceDisplay: function () {
        if (Session.get('plotParameter') === "matched" && Session.get('plotType') !== matsTypes.PlotTypes.map) {
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
            if ((Session.get("plotType") === undefined) || Session.get("plotType") === matsTypes.PlotTypes.timeSeries) {
                return "TimeSeries " + p.dates + " : " + format;
            } else if (Session.get("plotType") === matsTypes.PlotTypes.profile) {
                return "Profile: " + format;
            } else if (Session.get("plotType") === matsTypes.PlotTypes.dieoff) {
                return "DieOff: " + format;
            } else if (Session.get("plotType") === matsTypes.PlotTypes.threshold) {
                return "Threshold: " + format;
            } else if (Session.get("plotType") === matsTypes.PlotTypes.validtime) {
                return "ValidTime: " + format;
            } else if (Session.get("plotType") === matsTypes.PlotTypes.dailyModelCycle) {
                return "DailyModelCycle " + p.dates + " : " + format;
            } else if (Session.get("plotType") === matsTypes.PlotTypes.map) {
                return "Map " + p.dates + " ";
            } else if (Session.get("plotType") === matsTypes.PlotTypes.histogram) {
                return "Histogram: " + format;
            } else {
                return "Scatter: " + p.dates + " : " + format;
            }
        } else {
            return "no plot params";
        }
    },
    color: function () {
        return this.color;
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
    isMap: function () {
        return (Session.get('plotType') === matsTypes.PlotTypes.map)
    },
    isProfile: function () {
        return (Session.get('plotType') === matsTypes.PlotTypes.profile);
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
    }
});

Template.graph.events({
    'click .back': function () {
        matsPlotUtils.enableActionButtons();
        matsGraphUtils.setDefaultView();
        matsCurveUtils.resetPlotResultData();
        return false;
    },
    'click .new': function () {
        window.open(location);
        return false;
    },
    'click .header': function (event) {
        document.getElementById('graph-control').style.display = 'block';
        document.getElementById('showAdministration').style.display = 'block';
        document.getElementById('navbar').style.display = 'block';
        document.getElementById('footnav').style.display = 'block';

        var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
        for (var i = 0; i < ctbgElems.length; i++) {
            ctbgElems[i].style.display = 'block';
        }
    },
    'click .preview': function () {
        matsCurveUtils.showSpinner();
        Session.set("printMode", true);
        document.getElementById('graph-control').style.display = 'none';
        var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
        for (var i = 0; i < ctbgElems.length; i++) {
            ctbgElems[i].style.display = 'none';
        }
        var node = document.getElementById("graph-container");
        domtoimage.toPng(node)
            .then(function (dataUrl) {
                document.getElementById('graph-control').style.display = 'block';
                var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
                for (var i = 0; i < ctbgElems.length; i++) {
                    ctbgElems[i].style.display = 'block';
                }
                var img = new Image();
                img.src = dataUrl;
                img.onload = function () {
                    var width = img.width;
                    var height = img.height;
                    const ratio = height / width;
                    width = width * 0.5;
                    height = width * ratio;
                    var canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    const newDataUrl = canvas.toDataURL("image/png");
                    const wind = window.open("image", "_blank", "left=0, location=0, menubar=0,top=0, resizable=1, scrollbars=1, status=0, titlebar=0, height=" + height + ",width=" + width * 1.05);
                    wind.document.write("<html><head><title>Plot</title></head>" +
                        "<body><iframe width='100%' height='100%' src='" + newDataUrl + "'></iframe></body></html>");
                    document.getElementById('graph-control').style.display = 'block';
                    var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
                    for (var i = 0; i < ctbgElems.length; i++) {
                        ctbgElems[i].style.display = 'block';
                    }
                    setTimeout(function () {
                        wind.dispatchEvent(new Event('resize'));
                        ;
                    }, 1000);
                    matsCurveUtils.hideSpinner();
                }
            })
            .catch(function (error) {
                console.error('Graph.preview error, ', error);
                document.getElementById('graph-control').style.display = 'block';
                var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
                for (var i = 0; i < ctbgElems.length; i++) {
                    ctbgElems[i].style.display = 'block';
                }
                matsCurveUtils.hideSpinner();
            });
    },
    'click .publish': function () {
        matsCurveUtils.showSpinner();
        Session.set("printMode", true);
        document.getElementById('graph-control').style.display = 'none';
        var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
        for (var i = 0; i < ctbgElems.length; i++) {
            ctbgElems[i].style.display = 'none';
        }
        var node = document.getElementById("graph-container");
        domtoimage.toPng(node)
            .then(function (dataUrl) {
                document.getElementById('graph-control').style.display = 'block';
                var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
                for (var i = 0; i < ctbgElems.length; i++) {
                    ctbgElems[i].style.display = 'block';
                }
                var img = new Image();
                img.src = dataUrl;
                img.onload = function () {
                    var width = img.width;
                    var height = img.height;
                    var canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    const newDataUrl = canvas.toDataURL("image/png");
                    const wind = window.open("image", "_blank", "left=0, location=0, menubar=0,top=0, resizable=1, scrollbars=1, status=0, titlebar=0, height=" + height + ",width=" + width * 1.05);
                    wind.document.write("<html><head><title>Plot</title></head>" +
                        "<body><iframe width='100%' height='100%' src='" + newDataUrl + "'></iframe></body></html>");
                    document.getElementById('graph-control').style.display = 'block';
                    var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
                    for (var i = 0; i < ctbgElems.length; i++) {
                        ctbgElems[i].style.display = 'block';
                    }
                    setTimeout(function () {
                        wind.dispatchEvent(new Event('resize'));
                        ;
                    }, 1000);
                    matsCurveUtils.hideSpinner();
                }
            })
            .catch(function (error) {
                console.error('Graph.publish error, ', error);
                document.getElementById('graph-control').style.display = 'block';
                var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
                for (var i = 0; i < ctbgElems.length; i++) {
                    ctbgElems[i].style.display = 'block';
                }
                matsCurveUtils.hideSpinner();
            });
    },
    'click .reload': function () {
        var dataset = Session.get('dataset');
        var options = Session.get('options');
        var graphFunction = Session.get('graphFunction');
        window[graphFunction](dataset, options);
    },
    'click .plotButton': function () {
        matsGraphUtils.setGraphView();
        var graphView = document.getElementById('graphView');
        Session.set('graphViewMode', matsTypes.PlotView.graph);
        matsCurveUtils.hideSpinner();
    },
    'click .textButton': function () {
        switch (matsPlotUtils.getPlotType()) {
            case matsTypes.PlotTypes.timeSeries:
                Session.set('graphViewMode', matsTypes.PlotView.textSeries);
                matsGraphUtils.setTextView("textSeriesView");
                break;
            case matsTypes.PlotTypes.profile:
                Session.set('graphViewMode', matsTypes.PlotView.textProfile);
                matsGraphUtils.setTextView("textProfileView");
                break;
            case matsTypes.PlotTypes.dieoff:
                Session.set('graphViewMode', matsTypes.PlotView.textDieoff);
                matsGraphUtils.setTextView("textDieOffView");
                break;
            case matsTypes.PlotTypes.threshold:
                Session.set('graphViewMode', matsTypes.PlotView.textThreshold);
                matsGraphUtils.setTextView("textThresholdView");
                break;
            case matsTypes.PlotTypes.validtime:
                Session.set('graphViewMode', matsTypes.PlotView.textValidTime);
                matsGraphUtils.setTextView("textValidTimeView");
                break;
            case matsTypes.PlotTypes.dailyModelCycle:
                Session.set('graphViewMode', matsTypes.PlotView.textDailyModelCycle);
                matsGraphUtils.setTextView("textDailyModelCycleView");
                break;
            case matsTypes.PlotTypes.map:
                Session.set('graphViewMode', matsTypes.PlotView.textMap);
                matsGraphUtils.setTextView("textMapView");
                break;
            case matsTypes.PlotTypes.histogram:
                Session.set('graphViewMode', matsTypes.PlotView.textHistogram);
                matsGraphUtils.setTextView("textHistogramView");
                break;
            case matsTypes.PlotTypes.scatter2d:
                Session.set('graphViewMode', matsTypes.PlotView.textScatter);
                matsGraphUtils.setTextView("textScatter2dView");
                break;
            default:
                console.log("Error: no plot type detected");
                Session.set('graphViewMode', matsTypes.PlotView.graph);
        };
        Session.set("pageIndex", 0);
        Session.set("newPageIndex", 1);
        matsCurveUtils.setPlotResultData();
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
        $("#dataModal").modal('show');
    },
    'click .axisLimitButton': function () {
        $("#axisLimitModal").modal('show');
    },
    'click .previousPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        Session.set("newPageIndex", pageIndex - 1);
        matsCurveUtils.setPlotResultData();
    },
    'click .previousTenPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        Session.set("newPageIndex", pageIndex - 10);
        matsCurveUtils.setPlotResultData();
    },
    'click .nextPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        Session.set("newPageIndex", pageIndex + 1);
        matsCurveUtils.setPlotResultData();
    },
    'click .nextTenPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        Session.set("newPageIndex", pageIndex + 10);
        matsCurveUtils.setPlotResultData();
    },
    'click .allPageButton': function () {
        Session.set("newPageIndex", -1000);
        matsCurveUtils.setPlotResultData();
    },
    'click .firstPageButton': function () {
        Session.set("pageIndex", 0);
        Session.set("newPageIndex", 1);
        matsCurveUtils.setPlotResultData();
    },
    'click .replotZoomButton': function () {
        var xaxis = $("#placeholder").data().plot.getAxes().xaxis;
        var params = Session.get('params');
        var min = Math.round(xaxis.min);
        var max = Math.round(xaxis.max);
        var newDateRange = moment.utc(min).format('M/DD/YYYY HH:mm') + " - " + moment.utc(max).format('M/DD/YYYY HH:mm');
        document.getElementById('controlButton-dates-value').innerHTML = newDateRange;
        var actionId = "plotUnmatched";
        if (params.plotAction === "matched") {
            actionId = plotMatched;
        }
        document.getElementById("plot-curves").click();
    },
});
