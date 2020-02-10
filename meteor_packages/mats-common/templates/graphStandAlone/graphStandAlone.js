/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    matsCollections,
    matsCurveUtils,
    matsGraphUtils,
    matsMethods,
    matsTypes
} from 'meteor/randyp:mats-common';
import {Template} from 'meteor/templating';
import {FlowRouter} from 'meteor/ostrio:flow-router-extra';
import './graphStandAlone.html';

var resizeOptions;

Template.GraphStandAlone.onCreated(function () {
    // get the params for what this window will contain from the route
    console.log("GraphStandAlone.onCreated");
    Session.set('route', FlowRouter.getRouteName());
    Session.set("graphFunction", FlowRouter.getParam('graphFunction'));
    Session.set("plotResultKey", FlowRouter.getParam('key'));
    Session.set("plotParameter", FlowRouter.getParam('matching'));
    Session.set("appName", FlowRouter.getParam('appName'));
});

Template.GraphStandAlone.onRendered(function () {
    // the window resize event needs to also resize the graph
    $(window).resize(function () {
        document.getElementById('placeholder').style.width = matsGraphUtils.standAloneWidth();
        document.getElementById('placeholder').style.height = matsGraphUtils.standAloneHeight();
        var dataset = matsCurveUtils.getGraphResult().data;
        Plotly.newPlot($("#placeholder")[0], dataset, resizeOptions, {showLink: true});
    });
    document.getElementById('graph-container').style.backgroundColor = 'white';
});

Template.GraphStandAlone.helpers({
    /**
     * @return {string}
     * @return {string}
     */
    graphFunction: function (params) {
        // causes graph display routine to be processed
        var graphFunction = FlowRouter.getParam('graphFunction');
        var key = FlowRouter.getParam('key');
        matsMethods.getGraphDataByKey.call({resultKey: key,}, function (error, ret) {
            if (error !== undefined) {
                setError(error);
                matsCurveUtils.resetGraphResult();
                return false;
            }
            matsCurveUtils.setGraphResult(ret.result);
            Session.set("plotResultKey", ret.key);
            Session.set('Curves', ret.result.basis.plotParams.curves);
            Session.set('graphFunction', graphFunction);
            Session.set('PlotResultsUpDated', new Date());
            Session.set('PlotParams', ret.result.basis.plotParams);
            var ptypes = Object.keys(ret.result.basis.plotParams.plotTypes);
            for (var i = 0; i < ptypes.length; i++) {
                if (ret.result.basis.plotParams.plotTypes[ptypes[i]] === true) {
                    Session.set('plotType', ptypes[i]);
                    break;
                }
            }
            delete ret;
            if (graphFunction) {
                eval(graphFunction)(key);
                var plotType = Session.get('plotType');
                var dataset = matsCurveUtils.getGraphResult().data;
                var options = matsCurveUtils.getGraphResult().options;
                if (dataset === undefined) {
                    return false;
                }
                // make sure to capture the options (layout) from the old graph - which were stored in graph.js
                matsMethods.getLayout.call({resultKey: key,}, function (error, ret) {
                    if (error !== undefined) {
                        setError(error);
                        return false;
                    }
                    var mapLoadPause = 0;
                    options = ret.layout;
                    if (plotType === matsTypes.PlotTypes.map) {
                        options.mapbox.zoom = 2.75;
                        mapLoadPause = 1000;
                    }
                    options.hovermode = false;
                    resizeOptions = options;

                    // initial plot
                    $("#legendContainer").empty();
                    $("#placeholder").empty();

                    // need a slight delay for plotly to load
                    setTimeout(function () {
                        Plotly.newPlot($("#placeholder")[0], dataset, options, {showLink: false, displayModeBar: false});
                        // update changes to the curve ops -- need to pause if we're doing a map so the map can finish loading before we try to edit it
                        setTimeout(function() {
                            const updates = ret.curveOpsUpdate.curveOpsUpdate;
                            for (var uidx = 0; uidx < updates.length; uidx++) {
                                var curveOpsUpdate = {};
                                var updatedKeys = Object.keys(updates[uidx]);
                                for (var kidx = 0; kidx < updatedKeys.length; kidx++) {
                                    var jsonHappyKey = updatedKeys[kidx];
                                    // turn the json placeholder back into .
                                    var updatedKey = jsonHappyKey.split("____").join(".");
                                    curveOpsUpdate[updatedKey] = updates[uidx][jsonHappyKey];
                                }
                                Plotly.restyle($("#placeholder")[0], curveOpsUpdate, uidx);
                            }
                        }, mapLoadPause);
                    }, 500);

                    // append annotations
                    $("#legendContainer").append(ret.annotation);
                    document.getElementById("gsaSpinner").style.display = "none";
                });
            }
        });
    },
    graphFunctionDispay: function () {
        return "block";
    },
    Title: function () {
        return Session.get('appName');
    },
    width: function () {
        return matsGraphUtils.standAloneWidth();
    },
    height: function () {
        return matsGraphUtils.standAloneHeight();
    },
    curves: function () {
        return Session.get('Curves');
    },
    plotName: function () {
        return (Session.get('PlotParams') === [] || Session.get('PlotParams').plotAction === undefined) || Session.get('plotType') === matsTypes.PlotTypes.map ? "" : Session.get('PlotParams').plotAction.toUpperCase();
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
                    return "ROC: " + p.dates + " : " + format;
                case matsTypes.PlotTypes.map:
                    return "Map " + p.dates + " ";
                case matsTypes.PlotTypes.histogram:
                    return "Histogram: " + format;
                case matsTypes.PlotTypes.ensembleHistogram:
                    return "Ensemble Histogram: " + format;
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
    matsplotFilemname: function () {
        return "newplot-" + moment(new Date()).format("DD-MM-YYYY-hh:mm:ss")
    },
    spinnerUrl: function() {
        return document.location.href.split('preview')[0] + "img/spinner.gif"
    }
});

Template.GraphStandAlone.events({
    'click .exportpdf': function (e) {
        $(".previewCurveButtons").each(function (i, obj) {
            obj.style.display = "none";
        });
        html2canvas(document.querySelector('#graph-container'), {scale: 3.0}).then(canvas => {
            var h = 419.53;
            var w = 595.28;
            var filename = document.getElementById("exportFileName").value;
            let pdf = new jsPDF('letter', 'pt', 'a5');
            pdf.addImage(canvas.toDataURL('image/jpeg'), 'JPEG', 0, 0, w, h);
            pdf.save(filename);
            $(".previewCurveButtons").each(function (i, obj) {
                obj.style.display = "block";
            });
        });
    },
    'click .exportpng': function (e) {
        $(".previewCurveButtons").each(function (i, obj) {
            obj.style.display = "none";
        });
        html2canvas(document.querySelector('#graph-container'), {scale: 3.0}).then(canvas => {
            var h = 419.53;
            var w = 595.28;
            var filename = document.getElementById("exportFileName").value;
            saveAs(canvas.toDataURL(), filename + '.png');
            $(".previewCurveButtons").each(function (i, obj) {
                obj.style.display = "block";
            });
        });

        function saveAs(uri, filename) {
            var link = document.createElement('a');
            if (typeof link.download === 'string') {
                link.href = uri;
                link.download = filename;

                //Firefox requires the link to be in the body
                document.body.appendChild(link);

                //simulate click
                link.click();

                //remove the link when done
                document.body.removeChild(link);
            } else {
                window.open(uri);
            }
        }
    }
});

