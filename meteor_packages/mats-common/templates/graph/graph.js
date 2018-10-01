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

var pageIndex = 0;
var annotation = "";
var errorTypes = {};

var yAxisLength = 0;
var yAxisTranslate = {};
var yAxisNumber = 0;
var yidx;

var originalXaxisLabel = "";
var originalXaxisMin = "";
var originalXaxisMax = "";
var originalYaxisLabels = [];
var originalYaxisMins = [];
var originalYaxisMaxs = [];

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
            eval(graphFunction)(Session.get('plotResultKey'));
            var plotType = Session.get('plotType');
            var dataset = matsCurveUtils.getGraphResult().data;
            var options = matsCurveUtils.getGraphResult().options;

            if (plotType !== matsTypes.PlotTypes.map) {
                // append annotations and get errorbar types
                annotation = "";
                for (var i = 0; i < dataset.length; i++) {
                    if (plotType !== matsTypes.PlotTypes.histogram && plotType !== matsTypes.PlotTypes.profile) {
                        annotation = annotation + "<div id='" + dataset[i].curveId + "-annotation' style='color:" + dataset[i].color + "'>" + dataset[i].annotation + " </div>";
                    }
                    errorTypes[dataset[i].curveId] = dataset[i].points.errorbars;
                }

                // figure out how many y axes there are
                yAxisLength = 0;
                yAxisTranslate = {};
                yAxisNumber = 0;
                var currentAxisKey;
                var axisKeys = [];
                yAxisLength = options.yaxes.length;
                for (yidx = 0; yidx < yAxisLength; yidx++) {
                    currentAxisKey = options.yaxes[yidx].axisLabel;
                    if (axisKeys.indexOf(currentAxisKey) === -1) {
                        axisKeys.push(currentAxisKey);
                        yAxisNumber++;
                    }
                    yAxisTranslate[yidx] = axisKeys.indexOf(currentAxisKey);
                }

                originalXaxisLabel = "";
                originalXaxisMin = "";
                originalXaxisMax = "";
                originalYaxisLabels = [];
                originalYaxisMins = [];
                originalYaxisMaxs = [];
                // store information about the axes, for use when redrawing the plot
                if (options.xaxes && options.xaxes[0]) {
                    originalXaxisLabel = options.xaxes[0].axisLabel;
                    originalXaxisMin = options.xaxes[0].min;
                    originalXaxisMax = options.xaxes[0].max;
                }
                for (yidx = 0; yidx < yAxisLength; yidx++) {
                    if (options.yaxes && options.yaxes[yidx]) {
                        originalYaxisLabels[yidx] = options.yaxes[yidx].axisLabel;
                        originalYaxisMins[yidx] = options.yaxes[yidx].min;
                        originalYaxisMaxs[yidx] = options.yaxes[yidx].max;
                    }
                }

                // selection zooming
                var zooming = false;
                $("#placeholder").bind("plotselected", function (event, ranges) {
                    zooming = true;
                    event.preventDefault();
                    $("#placeholder").data().plot.getOptions().selection.mode = 'xy';
                    $("#placeholder").data().plot.getOptions().pan.interactive = false;
                    $("#placeholder").data().plot.getOptions().zoom.interactive = false;
                    $("#placeholder").data().plot = matsGraphUtils.drawGraph(ranges, dataset, options, $("#placeholder"));
                    zooming = false;
                });
                $("#placeholder").bind('plotclick', function (event, pos, item) {
                    if (zooming) {
                        zooming = false;
                        return;
                    }
                    if (item && item.series.data[item.dataIndex][3]) {
                        Session.set("data", item.series.data[item.dataIndex][3]);
                        $("#dataModal").modal('show');
                    }
                });
                // draw the plot for the first time
                $("#placeholder").data().plot = $.plot($("#placeholder"), dataset, options);
                $("#placeholder").append("<div id='annotationContainer' style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
            }
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
        if (Session.get('plotParameter') === "matched" && Session.get('plotType') !== matsTypes.PlotTypes.map && Session.get('plotType') !== matsTypes.PlotTypes.scatter2d && Session.get('plotType') !== matsTypes.PlotTypes.histogram) {
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
    yAxes: function () {
        Session.get('PlotResultsUpDated');
        var yAxes = [];
        for (var yidx = 0; yidx < yAxisNumber; yidx++) {
            yAxes.push(yidx);
        }
        return yAxes;
    },
    isMap: function () {
        return (Session.get('plotType') === matsTypes.PlotTypes.map)
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
    curveShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram) {
            return 'none';
        } else {
            return 'block';
        }
    },
    pointsShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram) {
            return 'none';
        } else {
            return 'block';
        }
    },
    errorbarsShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        var isMatched = Session.get('plotParameter') === "matched";
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram) {
            return 'none';
        } else if (plotType !== matsTypes.PlotTypes.scatter2d && isMatched) {
            return 'block';
        } else {
            return 'none';
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
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram || plotType === matsTypes.PlotTypes.profile) {
            return 'none';
        } else {
            return 'block';
        }
    },
    xAxisControlsNumberVisibility: function () {
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle) {
            return "none";
        } else {
            return "block";
        }
    },
    xAxisControlsTextVisibility: function () {
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle) {
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
        var plotType = Session.get('plotType');
        if (plotType !== matsTypes.PlotTypes.map) {
            // store axes so current zoom is preserved
            var axes = $("#placeholder").data().plot.getAxes();
            var key = Session.get('plotResultKey');
            matsMethods.setNewAxes.call({resultKey: key, axes: axes}, function (error) {
                if (error !== undefined) {
                    setError(error);
                }
            });
        }
        // open a new window with a standAlone graph of the current graph
        var h = Math.max(document.documentElement.clientHeight, window.innerWidth || 0) * .5;
        var w = h * 1.3;
        var wind = window.open(window.location + "/preview/" + Session.get("graphFunction") + "/" + Session.get("plotResultKey") + "/" + Session.get('plotParameter'), "_blank", "status=no,titlebar=no,toolbar=no,scrollbars=no,menubar=no,resizable=yes", "height=" + h + ",width=" + w);
        setTimeout(function () {
            wind.resizeTo(w, h);
            ;
        }, 100);
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
        }
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
    'click .firstPageButton': function () {
        Session.set("pageIndex", 0);
        Session.set("newPageIndex", 1);
        matsCurveUtils.setPlotResultData();
    },
    'click .previousTenPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        var pageTextDirection = Session.get("pageTextDirection");
        // if the navigation direction is changing, you have to increment the page index an additional time,
        // or you just move to the other end of the current page, and nothing appears to change.
        if (pageTextDirection !== undefined && pageTextDirection === -1) {
            Session.set("pageIndex", pageIndex - 9);
            Session.set("newPageIndex", pageIndex - 10);
        } else {
            Session.set("pageIndex", pageIndex - 10);
            Session.set("newPageIndex", pageIndex - 11);
        }
        matsCurveUtils.setPlotResultData();
    },
    'click .previousPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        var pageTextDirection = Session.get("pageTextDirection");
        // if the navigation direction is changing, you have to increment the page index an additional time,
        // or you just move to the other end of the current page, and nothing appears to change.
        if (pageTextDirection !== undefined && pageTextDirection === -1) {
            Session.set("newPageIndex", pageIndex - 1);
        } else {
            Session.set("newPageIndex", pageIndex - 2);
        }
        matsCurveUtils.setPlotResultData();
    },
    'click .nextPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        var pageTextDirection = Session.get("pageTextDirection");
        // if the navigation direction is changing, you have to increment the page index an additional time,
        // or you just move to the other end of the current page, and nothing appears to change.
        if (pageTextDirection !== undefined && pageTextDirection === 1) {
            Session.set("newPageIndex", pageIndex + 1);
        } else {
            Session.set("newPageIndex", pageIndex + 2);
        }
        matsCurveUtils.setPlotResultData();
    },
    'click .nextTenPageButton': function () {
        var pageIndex = Session.get("pageIndex");
        var pageTextDirection = Session.get("pageTextDirection");
        // if the navigation direction is changing, you have to increment the page index an additional time,
        // or you just move to the other end of the current page, and nothing appears to change.
        if (pageTextDirection !== undefined && pageTextDirection === 1) {
            Session.set("pageIndex", pageIndex + 9);
            Session.set("newPageIndex", pageIndex + 10);
        } else {
            Session.set("pageIndex", pageIndex + 10);
            Session.set("newPageIndex", pageIndex + 11);
        }
        matsCurveUtils.setPlotResultData();
    },
    'click .lastPageButton': function () {
        Session.set("newPageIndex", -1000);
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
    'click .curveVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide', '');
        const myData = dataset.find(function (d) {
            return d.curveId === label;
        });

        myData.lines.show = !myData.lines.show;
        if (myData.lines.show) {
            myData.points.show = true;
            myData.points.errorbars = errorTypes[myData.curveId];
            if (myData.data.length > 0) {
                $('#' + label + "-curve-show-hide")[0].value = "hide curve";
                $('#' + label + "-curve-show-hide-points")[0].value = "hide points";
                $('#' + label + "-curve-show-hide-errorbars")[0].value = "hide error bars";
            }
        } else {
            myData.points.show = false;
            myData.points.errorbars = undefined;
            if (myData.data.length > 0) {
                $('#' + label + "-curve-show-hide")[0].value = "show curve";
                $('#' + label + "-curve-show-hide-points")[0].value = "show points";
                $('#' + label + "-curve-show-hide-errorbars")[0].value = "show error bars";
            }
        }
        $("#placeholder").data().plot = $.plot($("#placeholder"), dataset, options);
        $("#placeholder").append("<div id='annotationContainer' style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    },
    'click .pointsVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-points', '');
        const myData = dataset.find(function (d) {
            return d.curveId === label;
        });
        myData.points.show = !myData.points.show;
        if (myData.data.length > 0) {
            if (myData.points.show == true) {
                $('#' + label + "-curve-show-hide-points")[0].value = "hide points";
            } else {
                $('#' + label + "-curve-show-hide-points")[0].value = "show points";
            }
        }
        $("#placeholder").data().plot = $.plot($("#placeholder"), dataset, options);
        $("#placeholder").append("<div id='annotationContainer' style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    },
    'click .errorBarVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-errorbars', '');
        const myData = dataset.find(function (d) {
            return d.curveId === label;
        });
        if (myData.points.errorbars === undefined) {
            myData.points.errorbars = errorTypes[myData.curveId];
            if (myData.data.length > 0) {
                $('#' + label + "-curve-show-hide-errorbars")[0].value = "hide error bars";
            }
        } else {
            myData.points.errorbars = undefined;
            if (myData.data.length > 0) {
                $('#' + label + "-curve-show-hide-errorbars")[0].value = "show error bars";
            }
        }
        $("#placeholder").data().plot = $.plot($("#placeholder"), dataset, options);
        $("#placeholder").append("<div id='annotationContainer' style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    },
    'click .barVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-bars', '');
        const myData = dataset.find(function (d) {
            return d.curveId === label;
        });
        myData.bars.show = !myData.bars.show;
        if (myData.data.length > 0) {
            if (myData.bars.show == true) {
                $('#' + label + "-curve-show-hide-bars")[0].value = "hide bars";
            } else {
                $('#' + label + "-curve-show-hide-bars")[0].value = "show bars";
            }
        }
        $("#placeholder").data().plot = $.plot($("#placeholder"), dataset, options);
        $("#placeholder").append("<div id='annotationContainer' style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    },
    'click .annotateVisibility': function (event) {
        event.preventDefault();
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-annotate', '');
        if ($('#' + label + "-annotation")[0].hidden) {
            $('#' + label + "-annotation").show();
            $('#' + label + "-curve-show-hide-annotate")[0].value = "hide annotation";
            $('#' + label + "-annotation")[0].hidden = false;
        } else {
            $('#' + label + "-annotation").hide();
            $('#' + label + "-curve-show-hide-annotate")[0].value = "show annotation";
            $('#' + label + "-annotation")[0].hidden = true;
        }
        annotation = $('#annotationContainer')[0].innerHTML;
    },
    // add zoom out button
    'click #zoom-out': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.zoomOut();
    },

    // add zoom in button
    'click #zoom-in': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.zoom();
    },
    // add horizontal zoom out button
    'click #zoom-out-left-right': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.zoomOutHorizontal();
    },
    // add horizontal zoom in button
    'click #zoom-in-left-right': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.zoomHorizontal();
    },
    // add vertical zoom out button
    'click #zoom-out-up-down': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.zoomOutVertical();
    },
    // add vertical zoom in button
    'click #zoom-in-up-down': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.zoomVertical();
    },
    // pan-left
    'click #pan-left': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.pan({left: -100});
    },
    // pan-right
    'click #pan-right': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.pan({left: 100});
    },
    // pan-up
    'click #pan-up': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.pan({top: -100});
    },
    // pan-down
    'click #pan-down': function (event) {
        event.preventDefault();
        $("#placeholder").data().plot.pan({top: 100});
    },
    // add refresh button
    'click #refresh-plot': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;

        // restore original axis limits and labels to options map
        if (originalXaxisLabel !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].axisLabel = originalXaxisLabel;
        }
        if (originalXaxisMin !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].min = originalXaxisMin;
        }
        if (originalXaxisMax !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].max = originalXaxisMax;
        }
        for (yidx = 0; yidx < yAxisLength; yidx++) {
            if (originalYaxisLabels[yidx] !== undefined && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].axisLabel = originalYaxisLabels[yidx];
            }
            if (originalYaxisMins[yidx] !== undefined && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].min = originalYaxisMins[yidx];
            }
            if (originalYaxisMaxs[yidx] !== undefined && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].max = originalYaxisMaxs[yidx];
            }
        }
        $("#placeholder").data().plot = $.plot($("#placeholder"), dataset, options);
        $("#placeholder").append("<div id='annotationContainer' style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
    },

    // add axis customization modal submit button
    'click #axisSubmit': function (event) {
        event.preventDefault();
        var plotType = Session.get('plotType');
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;

        // get input axis limits and labels
        var ylabels = [];
        var ymins = [];
        var ymaxs = [];
        var yidxTranslated;
        for (yidx = 0; yidx < yAxisLength; yidx++) {
            yidxTranslated = yAxisTranslate[yidx];
            ylabels.push(document.getElementById("y" + yidxTranslated + "AxisLabel").value);
            if (plotType === matsTypes.PlotTypes.profile) {
                // the actual y ticks are from 0 to -1100
                var yminRaw = document.getElementById("y" + yidxTranslated + "AxisMax").value;
                var ymaxRaw = document.getElementById("y" + yidxTranslated + "AxisMin").value;
                var ymin = yminRaw !== "" ? yminRaw * -1 : "";
                var ymax = ymaxRaw !== "" ? ymaxRaw * -1 : "";
                ymins.push(ymin);
                ymaxs.push(ymax);
            } else {
                ymins.push(document.getElementById("y" + yidxTranslated + "AxisMin").value);
                ymaxs.push(document.getElementById("y" + yidxTranslated + "AxisMax").value);
            }
        }

        var xlabel = document.getElementById("xAxisLabel").value;
        var xmin;
        var xmax;
        if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle) {
            const xminRaw = document.getElementById("xAxisMinText").value;
            const xmaxRaw = document.getElementById("xAxisMaxText").value;
            xmin = xminRaw !== "" ? moment.utc(xminRaw).valueOf() : "";
            xmax = xmaxRaw !== "" ? moment.utc(xmaxRaw).valueOf() : "";
        } else {
            xmin = document.getElementById("xAxisMin").value;
            xmax = document.getElementById("xAxisMax").value;
        }

        // set new limits and labels in options map
        if (xlabel !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].axisLabel = xlabel;
        }
        if (xmin !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].min = xmin;
        }
        if (xmax !== "" && options.xaxes && options.xaxes[0]) {
            options.xaxes[0].max = xmax;
        }
        for (yidx = 0; yidx < yAxisLength; yidx++) {
            if (ylabels[yidx] !== "" && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].axisLabel = ylabels[yidx];
            }
            if (ymins[yidx] !== "" && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].min = ymins[yidx];
            }
            if (ymaxs[yidx] !== "" && options.yaxes && options.yaxes[yidx]) {
                options.yaxes[yidx].max = ymaxs[yidx];
            }
        }
        $("#placeholder").data().plot = $.plot($("#placeholder"), dataset, options);
        $("#placeholder").append("<div id='annotationContainer' style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
        $("#axisLimitModal").modal('hide');
    }
});
