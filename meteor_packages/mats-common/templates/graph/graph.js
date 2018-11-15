import {Meteor} from 'meteor/meteor';
import {Hooks} from 'meteor/differential:event-hooks';
import Plotly from '../../imports/startup/client/lib/plotly-latest.min.js';
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
var openWindows = [];
var currentXMin = undefined;
var currentXMax = undefined;

Template.graph.onCreated(function () {
    // the window resize event needs to also resize the graph
    $(window).resize(function () {
        document.getElementById('placeholder').style.width = matsGraphUtils.width();
        document.getElementById('placeholder').style.height = matsGraphUtils.height();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        Plotly.newPlot($("#placeholder")[0], dataset, options);
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
            $("#legendContainer").empty();
            $("#placeholder").empty();
            if (dataset === undefined) {
                return false;
            }

            // initial plot
            Plotly.newPlot($("#placeholder")[0], dataset, options);

            if (plotType !== matsTypes.PlotTypes.map) {
                // append annotations
                annotation = "";
                for (var i = 0; i < dataset.length; i++) {
                    if (plotType !== matsTypes.PlotTypes.histogram && plotType !== matsTypes.PlotTypes.profile && dataset[i].curveId !== undefined) {
                        annotation = annotation + "<div id='" + dataset[i].curveId + "-annotation' style='color:" + dataset[i].annotateColor + "'>" + dataset[i].annotation + " </div>";
                    }
                }
                $("#legendContainer").append("<div id='annotationContainer' style='font-size:smaller'>" + annotation + "</div>");

                // if the layout changes, store the new x axis limits in case someone presses replot.
                currentXMin = options.xaxis.range[0];
                currentXMax = options.xaxis.range[1];
                $("#placeholder")[0].on('plotly_relayout', function (eventdata) {
                    currentXMin = eventdata['xaxis.range[0]'];
                    currentXMax = eventdata['xaxis.range[1]'];
                });
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
        var plotType = Session.get('plotType');
        // create an array like [0,1,2...] for each unique yaxis
        // by getting the yaxis keys - filtering them to be unique, then using an Array.apply on the resulting array
        // to assign a number to each value
        var yaxis = {};
        if ($("#placeholder")[0] === undefined || plotType === matsTypes.PlotTypes.map) {
            return;
        }
        Object.keys($("#placeholder")[0].layout).filter(function (k) {
            if (k.startsWith('yaxis')) {
                yaxis[k] = $("#placeholder")[0].layout[k];
            }
        });
        return Array.apply(null, {length: Object.keys(yaxis).length}).map(Number.call, Number);
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
    heatMapButtonText: function () {
        var sval = this.label + "heatMapButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval, 'show heat map');
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
    heatMapShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        if (plotType !== matsTypes.PlotTypes.map) {
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
        // capture the layout
        const layout = $("#placeholder")[0].layout;
        var key = Session.get('plotResultKey');
        matsMethods.saveLayout.call({resultKey: key, layout: layout}, function (error) {
            if (error !== undefined) {
                setError(error);
            }
        });
        // open a new window with a standAlone graph of the current graph
        var h = Math.max(document.documentElement.clientHeight, window.innerWidth || 0) * .5;
        var w = h * 1.3;
        var wind = window.open(window.location + "/preview/" + Session.get("graphFunction") + "/" + Session.get("plotResultKey") + "/" + Session.get('plotParameter') + "/" + matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title, "_blank", "status=no,titlebar=no,toolbar=no,scrollbars=no,menubar=no,resizable=yes", "height=" + h + ",width=" + w);
        setTimeout(function () {
            wind.resizeTo(w, h);
            ;
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
        matsGraphUtils.setTextView();
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
            var newDateRange = moment.utc(currentXMin).format('M/DD/YYYY HH:mm') + " - " + moment.utc(currentXMax).format('M/DD/YYYY HH:mm');
            document.getElementById('controlButton-dates-value').innerHTML = newDateRange;
            var params = Session.get('params');
            var actionId = "plotUnmatched";
            if (params.plotAction === "matched") {
                actionId = plotMatched;
            }
            document.getElementById("plot-curves").click();
        }
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
    },
    'click .errorBarVisibility': function (event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-errorbars', '');
        const myDataIdx = dataset.findIndex(function (d) {
            return d.curveId === label;
        });
        if (dataset[myDataIdx].x.length > 0) {
            var update = {
                error_y: dataset[myDataIdx].error_y
            };
            update.error_y.visible = !update.error_y.visible;
            if (dataset[myDataIdx].error_y.visible) {
                $('#' + label + "-curve-show-hide-errorbars")[0].value = "hide errorbars";
            } else {
                $('#' + label + "-curve-show-hide-errorbars")[0].value = "show errorbars";
            }
        }
        Plotly.restyle($("#placeholder")[0], update, myDataIdx);
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
            if (dataset[myDataIdx].visible) {
                $('#' + label + "-curve-show-hide-bars")[0].value = "hide bars";
            } else {
                $('#' + label + "-curve-show-hide-bars")[0].value = "show bars";
            }
        }
        Plotly.restyle($("#placeholder")[0], update, myDataIdx);
    },
    'click .annotateVisibility': function (event) {
        event.preventDefault();
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-annotate', '');
        if ($('#' + label + "-annotation")[0].hidden) {
            $('#' + label + "-annotation")[0].style.display = "block";
            $('#' + label + "-curve-show-hide-annotate")[0].value = "hide annotation";
            $('#' + label + "-annotation")[0].hidden = false;
        } else {
            $('#' + label + "-annotation")[0].style.display = "none";
            $('#' + label + "-curve-show-hide-annotate")[0].value = "show annotation";
            $('#' + label + "-annotation")[0].hidden = true;
        }
        annotation = $('#annotationContainer')[0].innerHTML;
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
                update = {
                    'visible': false
                };
                for (didx = 1; didx < dataset.length; didx++) {
                    Plotly.restyle($("#placeholder")[0], update, didx);
                }
                $('#' + label + "-curve-show-hide-heatmap")[0].value = "hide heat map";
            } else {
                update = {
                    'marker.opacity': 0
                };
                Plotly.restyle($("#placeholder")[0], update, 0);
                update = {
                    'visible': true
                };
                for (didx = 1; didx < dataset.length; didx++) {
                    Plotly.restyle($("#placeholder")[0], update, didx);
                }
                $('#' + label + "-curve-show-hide-heatmap")[0].value = "show heat map";

            }
        }
    },
    // add refresh button
    'click #refresh-plot': function (event) {
        event.preventDefault();
        var options = Session.get('options');
        Plotly.relayout($("#placeholder")[0], options);
    },
    // add axis customization modal submit button
    'click #axisSubmit': function (event) {
        event.preventDefault();
        var plotType = Session.get('plotType');
        var options = Session.get('options');
        var newOpts = {};
        // get input axis limits and labels
        $("input[id^=x][id$=AxisLabel]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                newOpts['xaxis' + (index === 0 ? "" : index + 1) + '.title'] = elem.value;
            }
        });
        if (plotType === matsTypes.PlotTypes.timeSeries || plotType === matsTypes.PlotTypes.dailyModelCycle) {
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
        $("input[id^=y][id$=AxisMin]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                if (plotType === matsTypes.PlotTypes.profile) {
                    newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[1]'] = elem.value;
                } else {
                    newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[0]'] = elem.value;
                }
            }
        });
        $("input[id^=y][id$=AxisMax]").get().forEach(function (elem, index) {
            if (elem.value !== undefined && elem.value !== "") {
                if (plotType === matsTypes.PlotTypes.profile) {
                    newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[0]'] = elem.value;
                } else {
                    newOpts['yaxis' + (index === 0 ? "" : index + 1) + '.range[1]'] = elem.value;
                }
            }
        });
        Plotly.relayout($("#placeholder")[0], newOpts);
        $("#axisLimitModal").modal('hide');
    }
});

