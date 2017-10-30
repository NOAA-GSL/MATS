import {Meteor} from 'meteor/meteor';
import {Hooks} from 'meteor/differential:event-hooks';
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsCurveUtils} from 'meteor/randyp:mats-common';
import domtoimage from 'dom-to-image';

var width = function () {
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    if (vpw < 400) {
        return (.9 * vpw).toString() + "px";
    } else {
        return (.8 * vpw).toString() + "px";
    }
};
var height = function () {
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    if (vph < 400) {
        return (.8 * vph).toString() + "px";
    } else {
        return (.6 * vph).toString() + "px";
    }
};

Template.graph.onCreated(function () {
    $(window).resize(function () {
        console.log ("graph resizng now");
        switch (Session.get('graphViewMode')) {
            case matsTypes.PlotView.graph:
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
                document.getElementById("textDieOffView").style.display = "none";
                document.getElementById('graph-touch-controls').style.display = "block";
                break;
            case matsTypes.PlotView.textSeries:
                document.getElementById('placeholder').style.width = width();
                document.getElementById('placeholder').style.heigth = height();
                document.getElementById("plotButton").style.display = "block";
                document.getElementById("textButton").style.display = "none";
                document.getElementById("plot-buttons-grp").style.display = "block";
                document.getElementById("curves").style.display = "none";
                document.getElementById("graphView").style.display = "none";
                document.getElementById("textSeriesView").style.display = "block";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "none";
                document.getElementById("textDieOffView").style.display = "none";
                document.getElementById('graph-touch-controls').style.display = "none";
            break;
            case matsTypes.PlotView.textDieoff:
                document.getElementById('placeholder').style.width = width();
                document.getElementById('placeholder').style.heigth = height();
                document.getElementById("plotButton").style.display = "block";
                document.getElementById("textButton").style.display = "none";
                document.getElementById("plot-buttons-grp").style.display = "block";
                document.getElementById("curves").style.display = "none";
                document.getElementById("graphView").style.display = "none";
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "none";
                document.getElementById("textDieOffView").style.display = "block";
                document.getElementById('graph-touch-controls').style.display = "none";
                break;
            case matsTypes.PlotView.textProfile:
                document.getElementById('placeholder').style.width = width();
                document.getElementById('placeholder').style.heigth = height();
                document.getElementById("plotButton").style.display = "block";
                document.getElementById("textButton").style.display = "none";
                document.getElementById("plot-buttons-grp").style.display = "block";
                document.getElementById("curves").style.display = "none";
                document.getElementById("graphView").style.display = "none";
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "block";
                document.getElementById("textScatter2dView").style.display = "none";
                document.getElementById("textDieOffView").style.display = "none";
                document.getElementById('graph-touch-controls').style.display = "none";
                break;
            case matsTypes.PlotView.textScatter:
                document.getElementById('placeholder').style.width = width();
                document.getElementById('placeholder').style.heigth = height();
                document.getElementById("plotButton").style.display = "block";
                document.getElementById("textButton").style.display = "none";
                document.getElementById("plot-buttons-grp").style.display = "block";
                document.getElementById("curves").style.display = "none";
                document.getElementById("graphView").style.display = "none";
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "block";
                document.getElementById("textDieOffView").style.display = "none";
                document.getElementById('graph-touch-controls').style.display = "none";
                break;
            default:
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
                document.getElementById("textDieOffView").style.display = "none";
                document.getElementById('graph-touch-controls').style.display = "block";
        }
    });

    $(document).keyup(function(event) {
        if (Session.get("printMode") && event.keyCode == 27) { // escape key maps to keycode `27`
            document.getElementById('graph-control').style.display = 'block';
            document.getElementById('showAdministration').style.display = 'block';
            document.getElementById('navbar').style.display = 'block';
            document.getElementById('footnav').style.display = 'block';
            var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
            for (var i=0; i < ctbgElems.length; i++){
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
        return (Session.get('PlotParams') === [] || Session.get('PlotParams').plotAction === undefined) ? "" :  Session.get('PlotParams').plotAction.toUpperCase();
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
            if (this.region) {
                this.regionName = this.region.split(' ')[0];
            }
            return matsPlotUtils.getCurveText(plotType, this);
        } else {
            return this.label + ":  Difference";
        }
    },
    confidenceDisplay: function() {
        if (Session.get('plotType') === matsTypes.PlotTypes.profile) {
            return "block";
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
            Session.set(sval, 'hide error bars');
        }
        return Session.get(sval);
    },
    errorBarsAllowed: function () {
        return (matsPlotUtils.getPlotType() === matsTypes.PlotTypes.profile);
    },
    isProfile: function() {
        return (Session.get('plotType') == matsTypes.PlotTypes.profile);
    }
});

imgPopUp = function (dataUrl, res) {
    document.getElementById('graph-control').style.display = 'block';
    var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
    for (var i=0; i < ctbgElems.length; i++){
        ctbgElems[i].style.display = 'block';
    }
    var img = new Image();
    img.src=dataUrl;
    img.onload = function() {
        var width = img.width;
        var height = img.height;
        const ratio = height / width;
        width = width * res;
        height = width * ratio;
        var canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const newDataUrl = canvas.toDataURL("image/png");
        const wind = window.open("image","_blank","left=0, location=0, menubar=0,top=0, resizable=1, scrollbars=1, status=0, titlebar=0, height=" + height + ",width=" + width * 1.05);
        wind.document.write("<html><head><title>Plot</title></head>" +
            "<body><iframe width='100%' height='100%' src='" + newDataUrl + "'></iframe></body></html>");
        document.getElementById('graph-control').style.display = 'block';
        var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
        for (var i=0; i < ctbgElems.length; i++){
            ctbgElems[i].style.display = 'block';
        }
        setTimeout(function() { wind.dispatchEvent(new Event('resize'));; }, 1000);
        matsCurveUtils.hideSpinner();
    }
};

Template.graph.events({
    'click .back': function () {
        matsPlotUtils.enableActionButtons();
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
        if (document.getElementById("scatterView")) {
            document.getElementById("scatterView").style.display="block";
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

        var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
        for (var i=0; i < ctbgElems.length; i++){
            ctbgElems[i].style.display = 'block';
        }
    },
    'click .publish': function () {
        matsCurveUtils.showSpinner();
        Session.set("printMode", true);
        document.getElementById('graph-control').style.display = 'none';
        var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
        for (var i=0; i < ctbgElems.length; i++){
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
                for (var i=0; i < ctbgElems.length; i++){
                    ctbgElems[i].style.display = 'block';
                }
                matsCurveUtils.hideSpinner();
            });
    },
    'click .preview': function () {
        matsCurveUtils.showSpinner();
        Session.set("printMode", true);
        document.getElementById('graph-control').style.display = 'none';
        var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
        for (var i=0; i < ctbgElems.length; i++){
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
                console.error('Graph.prviw error, ', error);
                document.getElementById('graph-control').style.display = 'block';
                var ctbgElems = $('*[id^="curve-text-buttons-grp"]');
                for (var i=0; i < ctbgElems.length; i++){
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
        document.getElementById("plotButton").style.display = "none";
        document.getElementById("textButton").style.display = "block";
        document.getElementById("plot-buttons-grp").style.display = "block";
        document.getElementById("curves").style.display = "block";
        document.getElementById("graphView").style.display = "block";
        document.getElementById("textSeriesView").style.display = "none";
        document.getElementById("textProfileView").style.display = "none";
        document.getElementById("textScatter2dView").style.display = "none";
        document.getElementById("textDieOffView").style.display = "none";
        document.getElementById('graph-touch-controls').style.display = "block";

        var graphView = document.getElementById('graphView');
        Session.set('graphViewMode',matsTypes.PlotView.graph);
        Blaze.render(Template.graph, graphView);
    },
    'click .textButton': function () {
        document.getElementById("plot-buttons-grp").style.display = "block";
        document.getElementById("plotButton").style.display = "block";
        document.getElementById("textButton").style.display = "none";
        document.getElementById("curves").style.display = "none";
        document.getElementById("graphView").style.display = "none";
        document.getElementById('graph-touch-controls').style.display = "none";
        switch (matsPlotUtils.getPlotType()) {
            case matsTypes.PlotTypes.timeSeries:
                Session.set('graphViewMode',matsTypes.PlotView.textSeries);
                document.getElementById("textDieOffView").style.display = "none";
                document.getElementById("textSeriesView").style.display = "block";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "none";
                break;
            case matsTypes.PlotTypes.profile:
                Session.set('graphViewMode',matsTypes.PlotView.textProfile);
                document.getElementById("textDieOffView").style.display = "none";
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "block";
                document.getElementById("textScatter2dView").style.display = "none";
                break;
            case matsTypes.PlotTypes.scatter2d:
                Session.set('graphViewMode',matsTypes.PlotView.textScatter);
                document.getElementById("textDieOffView").style.display = "none";
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "block";
                break;
            case matsTypes.PlotTypes.dieoff:
                Session.set('graphViewMode',matsTypes.PlotView.textDieoff);
                document.getElementById("textSeriesView").style.display = "none";
                document.getElementById("textProfileView").style.display = "none";
                document.getElementById("textScatter2dView").style.display = "none";
                document.getElementById("textDieOffView").style.display = "block";
                break;
            default:
                console.log("Error: no plot type detected");
                Session.set('graphViewMode',matsTypes.PlotView.graph);
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
            setError(new Error("You must be logged in to use the 'share' feature"));
            return false;
        }
        $("#sendModal").modal('show');
    },
    'click .basis': function () {
        Session.set("data",matsCurveUtils.PlotResult.basis);
        $("#dataModal").modal('show');
    }
});
