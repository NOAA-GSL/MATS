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

var annotation = "";

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
        var options = matsCurveUtils.getGraphResult().options;
        Plotly.newPlot($("#placeholder")[0], dataset, options, {showLink:true});
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
                $("#legendContainer").empty();
                $("#placeholder").empty();
                if (dataset === undefined) {
                    return false;
                }
                // make sure to capture the options (layout) from the old graph - which were stored in graph.js
                matsMethods.getLayout.call({resultKey: key,}, function (error, ret) {
                    if (error !== undefined) {
                        setError(error);
                        return false;
                    }
                    options = ret.layout;
                    if (plotType === matsTypes.PlotTypes.map) {
                        options.mapbox.zoom = 2.75;
                    }
                    // initial plot
                    Plotly.newPlot($("#placeholder")[0], dataset, options, {showLink:true});

                    if (plotType !== matsTypes.PlotTypes.map) {
                        // append annotations
                        annotation = "";
                        for (var i = 0; i < dataset.length; i++) {
                            if (plotType !== matsTypes.PlotTypes.histogram && plotType !== matsTypes.PlotTypes.profile && dataset[i].curveId !== undefined) {
                                annotation = annotation + "<div id='" + dataset[i].curveId + "-annotation' style='color:" + dataset[i].annotateColor + "'>" + dataset[i].annotation + " </div>";
                            }
                        }
                        $("#legendContainer").append("<div id='annotationContainer' style='font-size:smaller'>" + annotation + "</div>");
                    }
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
            } else if (Session.get("plotType") === matsTypes.PlotTypes.contour) {
                return "Contour: " + format;
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
    'click .exportpdf': function (e) {
        $(".previewCurveButtons").each(function (i, obj) {
            obj.style.display = "none";
        });
        //const filename  = 'MATSPlot' + moment(new Date()).format("DD-MM-YYYY-hh:mm:ss") + '.pdf';
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
    }
});

