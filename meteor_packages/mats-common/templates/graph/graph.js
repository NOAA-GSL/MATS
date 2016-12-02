import {Meteor} from 'meteor/meteor';
import {Hooks} from 'meteor/differential:event-hooks';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsCurveUtils} from 'meteor/randyp:mats-common';

var width = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw, vph);
    if (min < 400) {
        return (.9 * min).toString() + "px";
    } else {
        return (.7 * min).toString() + "px";
    }
};
var height = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw, vph);
    if (min < 400) {
        return (.9 * min).toString() + "px";
    } else {
        return (.7 * min).toString() + "px";
    }
};

//$(window).on('resize orientationChange', function(event) {
Template.graph.onCreated(function () {
    $(window).resize(function () {
        //console.log($(window).height());
        document.getElementById('placeholder').style.width = width();
        document.getElementById('placeholder').style.heigth = height();
        document.getElementById("plotButton").style.display = "none";
        document.getElementById("textButton").style.display = "block";
        document.getElementById("plot-buttons-grp").style.display = "block";
        document.getElementById("curves").style.display = "block";
        document.getElementById("graphView").style.display = "block";
        document.getElementById("textSeriesView").style.display = "none";
        document.getElementById("textProfileView").style.display = "none";
        document.getElementById("textScatter2dView").style.display = "none";
    });

    $(document).keyup(function(event) {
        if (Session.get("printMode") && event.keyCode == 27) { // escape key maps to keycode `27`
            document.getElementById('graph-control').style.display = 'block';
            document.getElementById('showAdministration').style.display = 'block';
            document.getElementById('navbar').style.display = 'block';
            document.getElementById('footnav').style.display = 'block';
            document.getElementById('curve-text-buttons-grp').style.display = 'block';
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
    Title: function () {
        if (matsCollections.Settings === undefined || matsCollections.Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
            return "";
        } else {
            return matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title;
        }
    },
    width: function () {
        return width();
    },
    height: function () {
        return height();
    },
    curves: function () {
        return Session.get('Curves');
    },
    plotName: function () {
        return '';
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
            this.regionName = this.region.split(' ')[0];
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
    displayErrorBarButton: function () {
        if ((Session.get("plotType") === undefined) || Session.get("plotType").toLowerCase() === matsTypes.PlotTypes.timeSeries) {
            return "none";
        } else {
            return "block";
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
            Session.set(sval, 'no error bars');
        }
        return Session.get(sval);
    },
    errorBarsAllowed: function () {
        return (matsPlotUtils.getPlotType() === matsTypes.PlotTypes.profile);
    }
});


Template.graph.events({
    'click .back': function () {
        if (document.getElementById('graph-container')) {
            document.getElementById('graph-container').style.display = 'none';
        }
        if (document.getElementById('paramList')) {
            document.getElementById('paramList').style.display = 'block';
        }
        if (document.getElementById('plotList')) {
            document.getElementById('plotList').style.display = 'block';
        }
        if (document.getElementById('curveList')) {
            document.getElementById('curveList').style.display = 'block';
        }
        if (document.getElementById("plotTypeContainer")) {
            document.getElementById("plotTypeContainer").style.display="block";
        }

        if (document.getElementById("scatter2d")) {
            document.getElementById("scatter2d").style.display = "block";
        }
        return false;
    },
    'click .new': function () {
        window.open(location);
        return false;
    },
    'click .header': function(event){
        document.getElementById('graph-control').style.display = 'block';
        document.getElementById('showAdministration').style.display = 'block';
        document.getElementById('navbar').style.display = 'block';
        document.getElementById('footnav').style.display = 'block';
        document.getElementById('curve-text-buttons-grp').style.display = 'block';
    },
    'click .print': function () {
        Session.set("printMode", true);
        document.getElementById('graph-control').style.display = 'none';
        document.getElementById('showAdministration').style.display = 'none';
        document.getElementById('navbar').style.display = 'none';
        document.getElementById('footnav').style.display = 'none';
        document.getElementById('curve-text-buttons-grp').style.display = 'none';
        document.getElementById('plotType').style.display = 'none';
    },
    'click .reload': function () {
        var dataset = Session.get('dataset');
        var options = Session.get('options');
        var graphFunction = Session.get('graphFunction');
        window[graphFunction](dataset, options);
    },
    'click .plotButton': function () {
        document.getElementById("plotButton").style.display = "none";
        document.getElementById("textButton").style.display = "block";
        document.getElementById("plot-buttons-grp").style.display = "block";
        document.getElementById("curves").style.display = "block";
        document.getElementById("graphView").style.display = "block";
        document.getElementById("textSeriesView").style.display = "none";
        document.getElementById("textProfileView").style.display = "none";
        document.getElementById("textScatter2dView").style.display = "none";

        var graphView = document.getElementById('graphView');
        Blaze.render(Template.graph, graphView);
    },
    'click .textButton': function () {
        document.getElementById("plot-buttons-grp").style.display = "block";
        document.getElementById("plotButton").style.display = "block";
        document.getElementById("textButton").style.display = "none";
        document.getElementById("curves").style.display = "none";
        document.getElementById("graphView").style.display = "none";
        switch (matsPlotUtils.getPlotType()) {
            case matsTypes.PlotTypes.timeSeries:
                document.getElementById("textSeriesView").style.display = "block";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "none";
                break;
            case matsTypes.PlotTypes.profile:
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "block";
                document.getElementById("textScatter2dView").style.display = "none";
                break;
            case matsTypes.PlotTypes.scatter2d:
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "block";
                break;
            default:
                console.log("Error: no plot type detected");
        }
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
            setError("You must be logged in to use the 'share' feature");
            return false;
        }
        $("#sendModal").modal('show');
    },
    'click .basis': function () {
        Session.set("data",matsCurveUtils.PlotResult.basis);
        $("#dataModal").modal('show');
    }
});
