import {matsTypes} from "meteor/randyp:mats-common";
import {matsCollections} from "meteor/randyp:mats-common";
import {matsMethods} from "meteor/randyp:mats-common";
import {matsCurveUtils} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';

Template.curveList.helpers({
    displayPlotUnMatched: function() {
        // scatter plots can't match
        if (Session.get('plotType') === matsTypes.PlotTypes.scatter2d) {
            return "none";
        }
        // don't allow plotting when editing
        const mode = Session.get("editMode");
        if (mode === undefined || mode === "") {
            return "block";
        } else {
            return "none";
        }
    },
    displayPlotMatched: function() {
        // don't allow plotting when editing
        const mode = Session.get("editMode");
        if (mode === undefined || mode === "") {
            return "block";
        } else {
            return "none";
        }
    },
    displaySaveSettings: function() {
        // don't allow saving settings when editing
        const mode = Session.get("editMode");
        if (mode === undefined || mode === "") {
            return "block";
        } else {
            return "none";
        }
    },
    curves: function () {
        return Session.get('Curves');
    },
    displayCurves: function () {
        if (Session.get('Curves') === undefined || Session.get('Curves').length === 0) {
            return "none";
        } else {
            return "block";
        }
    },
    log: function () {
        console.log(this);
    },
    averagesDisabled: function () {
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0 || (Session.get('plotType') !== matsTypes.PlotTypes.timeSeries)) {
            return "";
        }
        var average = curves[0].average;
        for (var i = 0; i < curves.length; i++) {
            if (average != curves[i].average) {
                return "disabled";
            }
        }
    },
    disabledPlotsHidden: function () {
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0 || (Session.get('plotType') !== matsTypes.PlotTypes.timeSeries)) {
            return "none";
        }
        var average = curves[0].average;
        for (var i = 0; i < curves.length; i++) {
            if (average != curves[i].average) {
                return "block";
            }
        }
        return "none"
    },
    identicalContourDisabled: function () {
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0 || (Session.get('plotType') !== matsTypes.PlotTypes.contour)) {
            return "";
        }
        var xAxis = curves[0]['x-axis-parameter'];
        var yAxis = curves[0]['y-axis-parameter'];
        if (xAxis === yAxis) {
            return "disabled";
        }
        return "";
    },
    identicalContourHidden: function () {
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0 || (Session.get('plotType') !== matsTypes.PlotTypes.contour)) {
            return "none";
        }
        var xAxis = curves[0]['x-axis-parameter'];
        var yAxis = curves[0]['y-axis-parameter'];
        if (xAxis === yAxis) {
            return "block";
        }
        return "none"
    },
    editMode: function() {
        if (Session.get('editMode') === '') {
            return '';
        } else {
            return "Changing " + Session.get('editMode');
        }
    },
    matchedLabel: function() {
        if (Session.get('matchName'  === undefined)) {
            if (setMatchName) {
                setMatchName();
            } else {
                Session.set('matchName','plot matched');
            }
        } else {
            Session.set('matchName','plot matched');
        }
        return Session.get('matchName');
    }
});

Template.curveList.events({
    'click .remove-all': function () {
        if (Session.get("confirmRemoveAll")) {
            matsCurveUtils.clearAllUsed();
            matsParamUtils.setAllParamsToDefault();
            Session.set("editMode", "");
            Session.set("paramWellColor", "#f5f5f5");  // default grey
            Session.set("lastUpdate", Date.now());
            Session.set("confirmRemoveAll","");
            return false;
        } else {
            if (Session.get("Curves").length > 0 ) {
                $("#modal-confirm-remove-all").modal();
            }
        }
    },
    'click .confirm-remove-all': function () {
        Session.set("confirmRemoveAll", Date.now());
        $("#remove-all").trigger('click');
    },
    'click .plot-curves-unmatched': function (event) {
        document.getElementById("spinner").style.display = "block";
        matsPlotUtils.disableActionButtons();
        event.preventDefault();
        // trigger the submit on the plot_list plot_list.js - click .submit-params
        Session.set('plotParameter', matsTypes.PlotActions.unmatched);
        document.getElementById("plot-curves").click();
        return false;
    },
    'click .plot-curves-matched': function (event) {
        document.getElementById("spinner").style.display = "block";
        matsPlotUtils.disableActionButtons();
        event.preventDefault();
        // trigger the submit on the plot_list plot_list.js - click .submit-params
        Session.set('plotParameter', matsTypes.PlotActions.matched);
        document.getElementById("plot-curves").click();
        return false;
    },
    'click .save-settings': function (event) {
        event.preventDefault();
        document.getElementById("save-settings").click();
        return false;
    }
});