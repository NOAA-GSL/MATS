import {Meteor} from 'meteor/meteor';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    matsCollections,
    matsCurveUtils,
    matsGraphUtils,
    matsMethods,
    matsParamUtils,
    matsPlotUtils,
    matsTypes
} from 'meteor/randyp:mats-common';
import {Template} from 'meteor/templating';
import {FlowRouter} from 'meteor/ostrio:flow-router-extra';
import './graphStandAlone.html';
import Plotly from "../../imports/startup/client/lib/plotly-latest.min";

var pageIndex = 0;
var annotation = "";
var errorTypes = {};

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
    // set view options for this new graph window
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
            $("#placeholder").show();
            $("#graph-container").show();
            if (graphFunction) {
                eval(graphFunction)(key);
                var plotType = Session.get('plotType');
                var dataset = matsCurveUtils.getGraphResult().data;
                var options = matsCurveUtils.getGraphResult().options;

                if (plotType !== matsTypes.PlotTypes.map) {
                    // make sure to capture the options (layout) from the old graph - which were stored in graph.js
                    matsMethods.getLayout.call({resultKey: key,}, function (error, ret) {
                        if (error !== undefined) {
                            setError(error);
                            return false;
                        }
                        options = ret.layout;
                    $("#placeholder").data().plot = Plotly.newPlot($("#placeholder")[0], dataset, options);
                        document.getElementById("gsaSpinner").style.display = "none";
                    });
                }
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
    matsplotFilemname: function () {
        return "matsplot-" + moment(new Date()).format("DD-MM-YYYY-hh:mm:ss")
    },
    image: function () {
        var img = Session.get("spinner_img");
        if (img == undefined) {
            img = "spinner.gif";
            Session.set("spinner_img", "../../../../../image/spinner.gif");
        }
        return img;
    }
});

Template.GraphStandAlone.events({
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
        $("#placeholder").data().plot = Plotly.newPlot($("#placeholder")[0], dataset, options);
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
        $("#placeholder").data().plot = Plotly.newPlot($("#placeholder")[0], dataset, options);
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
        $("#placeholder").data().plot = Plotly.newPlot($("#placeholder")[0], dataset, options);
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
        $("#placeholder").data().plot = Plotly.newPlot($("#placeholder")[0], dataset, options);
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
    'click .exportpdf': function (e) {
        $(".previewCurveButtons").each(function (i, obj) {
            obj.style.display = "none";
        });
        //const filename  = 'MATSPlot' + moment(new Date()).format("DD-MM-YYYY-hh:mm:ss") + '.pdf';
        html2canvas(document.querySelector('#graph-container'), {scale: 3.0}).then(canvas => {

            var h = 419.53;
            var w = 595.28
            var filename = document.getElementById("exportFileName").value;
            let pdf = new jsPDF('letter', 'pt', 'a5');
            pdf.addImage(canvas.toDataURL('image/jpeg'), 'JPEG', 0, 0, w, h);
            pdf.save(filename);
            $(".previewCurveButtons").each(function (i, obj) {
                obj.style.display = "block";
            });
        });
    }
});

