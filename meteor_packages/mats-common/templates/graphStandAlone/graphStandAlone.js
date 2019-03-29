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
                    resizeOptions = options;

                    // initial plot
                    $("#legendContainer").empty();
                    $("#placeholder").empty();

                    // need a slight delay for plotly to load
                    setTimeout(function () {
                        Plotly.newPlot($("#placeholder")[0], dataset, options, {showLink: false});
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
                    }, 100);

                    // append annotations
                    if (plotType !== matsTypes.PlotTypes.map) {
                        annotation = "";
                        for (var i = 0; i < dataset.length; i++) {
                            if (plotType !== matsTypes.PlotTypes.histogram && dataset[i].curveId !== undefined) {
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
            var plotType = Session.get('plotType');
            switch (plotType) {
                case matsTypes.PlotTypes.timeSeries:
                    return "TimeSeries " + p.dates + " : " + format;
                case matsTypes.PlotTypes.profile:
                    return "Profile: " + format;
                case matsTypes.PlotTypes.dieoff:
                    return "DieOff: " + format;
                case matsTypes.PlotTypes.dailyModelCycle:
                    return "DailyModelCycle " + p.dates + " : " + format;
                case matsTypes.PlotTypes.threshold:
                    return "Threshold: " + format;
                case matsTypes.PlotTypes.validtime:
                    return "ValidTime: " + format;
                case matsTypes.PlotTypes.map:
                    return "Map " + p.dates + " ";
                case matsTypes.PlotTypes.histogram:
                    return "Histogram: " + format;
                case matsTypes.PlotTypes.reliability:
                    return "Reliability: " + p.dates + " : " + format;
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
    annotateButtonText: function () {
        var sval = this.label + "annotateButtonText";
        if (Session.get(sval) === undefined) {
            Session.set(sval, 'hide annotation');
        }
        return Session.get(sval);
    },
    annotateShowHideDisplay: function () {
        var plotType = Session.get('plotType');
        if (plotType === matsTypes.PlotTypes.map || plotType === matsTypes.PlotTypes.histogram) {
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

