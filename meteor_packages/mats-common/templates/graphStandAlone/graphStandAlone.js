import {Meteor} from 'meteor/meteor';
import {
    matsCollections,
    matsCurveUtils,
    matsGraphUtils,
    matsMethods,
    matsParamUtils,
    matsPlotUtils,
    matsTypes
} from 'meteor/randyp:mats-common';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './graphStandAlone.html';

var pageIndex = 0;
var annotation = "";
var errorTypes = {};

Template.GraphStandAlone.onCreated(function () {
    console.log("GraphStandAlone.onCreated");
    Session.set('route', FlowRouter.getRouteName());
    Session.set("graphFunction",FlowRouter.getParam('graphFunction'));
    Session.set("plotResultKey",FlowRouter.getParam('key'));
});

Template.GraphStandAlone.onRendered(function () {
    $(window).resize(function () {
        matsGraphUtils.standAloneSetGraphView();
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
            Session.set('Curves',ret.result.basis.plotParams.curves);
            Session.set('graphFunction', graphFunction);
            Session.set('PlotResultsUpDated', new Date());
            var ptypes = Object.keys(ret.result.basis.plotParams.plotTypes);
            for (var i=0; i < ptypes.length; i++) {
                if (ret.result.basis.plotParams.plotTypes[ptypes[i]] === true) {
                    Session.set('plotType', ptypes[i]);
                    break;
                }
            }
            delete ret;
            $("#placeholder").show();
            $("#graph-container").show();
            if (graphFunction) {
                eval(graphFunction)(key);
                var plotType = Session.get('plotType');
                var dataset = matsCurveUtils.getGraphResult().data;

                // append annotations and get errorbar types
                annotation = "";
                for (var i = 0; i < dataset.length; i++) {
                    if (plotType !== matsTypes.PlotTypes.histogram && plotType !== matsTypes.PlotTypes.profile) {
                        annotation = annotation + "<div id='" + dataset[i].curveId + "-annotation' style='color:" + dataset[i].color + "'>" + dataset[i].annotation + " </div>";
                    }
                    errorTypes[dataset[i].curveId] = dataset[i].points.errorbars;
                }
            }
            $("#placeholder").append("<div id='annotationContainer' style='position:absolute;left:100px;top:20px;font-size:smaller'>" + annotation + "</div>");
        });
    },
    graphFunctionDispay: function() {
        return Session.get('route') === "publish" ? "none" : "block";
    },
    Title: function () {
        return "StandAlone Graph";
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
        var isMatched = Session.get('plotParameter') === "matched";
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram || Session.get('route') === "publish") {
            return 'none';
        } else {
            return 'block';
        }
    },
    pointsShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        var isMatched = Session.get('plotParameter') === "matched";
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram || Session.get('route') === "publish") {
            return 'none';
        } else {
            return 'block';
        }
    },
    errorbarsShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        var isMatched = Session.get('plotParameter') === "matched";
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram || Session.get('route') === "publish") {
            return 'none';
        } else if (plotType !== matsTypes.PlotTypes.scatter2d && isMatched) {
            return 'block';
        } else {
            return 'none';
        }
    },
    barsShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        var isMatched = Session.get('plotParameter') === "matched";
        var barChHideElems = $('*[id$="-curve-show-hide-bar"]');
        if (plotType === matsTypes.PlotTypes.histogram && Session.get('route') !== "publish") {
            return 'block';
        } else {
            return 'none';
        }
    },
    annotateShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        var isMatched = Session.get('plotParameter') === "matched";
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram || plotType === matsTypes.PlotTypes.profile || Session.get('route') === "publish") {
            return 'none';
        } else {
            return 'block';
        }
    }
});

Template.GraphStandAlone.events({
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
    'click .curveVisibility' : function(event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide', '');
        const myData = dataset.find(function(d) {
            return d.curveId === label;
        });

        myData.lines.show = !myData.lines.show;
        if (myData.lines.show) {
            myData.points.show  = true;
            myData.points.errorbars = errorTypes[myData.curveId];
            if (myData.data.length > 0) {
                $('#' + label + "-curve-show-hide")[0].value = "hide curve";
                $('#' + label + "-curve-show-hide-points")[0].value = "hide points";
                $('#' + label + "-curve-show-hide-errorbars")[0].value = "hide error bars";
            }
        } else {
            myData.points.show  = false;
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
    'click .pointsVisibility' : function(event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-points', '');
        const myData = dataset.find(function(d) {
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
    'click .errorBarVisibility' : function(event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-errorbars', '');
        const myData = dataset.find(function(d) {
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
    'click .barVisibility' : function(event) {
        event.preventDefault();
        var dataset = matsCurveUtils.getGraphResult().data;
        var options = matsCurveUtils.getGraphResult().options;
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-bars', '');
        const myData = dataset.find(function(d) {
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
    'click .annotateVisibility' : function(event) {
        event.preventDefault();
        const id = event.target.id;
        const label = id.replace('-curve-show-hide-annotate', '');
        if ($('#'+label+"-annotation")[0].hidden) {
            $('#'+label+"-annotation").show();
            $('#'+label+"-curve-show-hide-annotate")[0].value = "hide annotation";
            $('#'+label+"-annotation")[0].hidden = false;
        } else {
            $('#'+label+"-annotation").hide();
            $('#'+label+"-curve-show-hide-annotate")[0].value = "show annotation";
            $('#'+label+"-annotation")[0].hidden = true;
        }
        annotation = $('#annotationContainer')[0].innerHTML;
    }
});
