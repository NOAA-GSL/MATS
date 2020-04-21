/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsTypes } from "meteor/randyp:mats-common";
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import { matsSelectUtils } from 'meteor/randyp:mats-common';

label;
Template.curveItem.onRendered(function() {
    // the value used for the colorpicker (l) MUST match the returned value in the colorpick helper
    label = this.data.label;
    $(function () {
        var l = '.' + label + '-colorpick';
        $(l).colorpicker({format: "rgb", align:"left"});
    });
});

Template.curveItem.helpers({
    removeCurve: function() {
      var confirmRemoveCurve = Session.get("confirmRemoveCurve");
      return confirmRemoveCurve ? confirmRemoveCurve.label : null;
    },
    displayEditXaxis: function() {
        if (Session.get('plotType') === matsTypes.PlotTypes.scatter2d) {
            return "block";
        }
        return "none";
    },
    displayEditYaxis: function() {
        if (Session.get('plotType') === matsTypes.PlotTypes.scatter2d) {
            return "block";
        }
        return "none";
    },
    displayEdit: function() {
        if (Session.get('plotType') === matsTypes.PlotTypes.scatter2d) {
            return "none";
        }
        return "block";
    },
    colorpick: function() {
        var l = this.label + '-colorpick';
        return l;
    },
    text: function () {
        if (this.diffFrom === undefined) {
            var plotType = Session.get('plotType');
            if (plotType === undefined) {
                var pfuncs = matsCollections.PlotGraphFunctions.find({}).fetch();
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
    color: function() {
      return this.color;
    },
    label: function() {
        return this.label;
    },
    defaultColor: function() {
        var curves = Session.get('Curves');
        var label = this.label;
        for (var i = 0; i < curves.length; i++) {
            if (curves[i].label === label) {
                return curves[i].color;
            }
        }
    },
    curveNumber: function() {
        const label = this.label;
        const curves = Session.get("Curves");
        const index = curves.findIndex(
            function(obj){
                return obj.label === label;
            }
        );
        return index;
    },
    log: function() {
        console.log(this);
    },
    DBcurve: function() {
        return (this.diffFrom === undefined);
    },
    editingThis: function() {
        return (Session.get('editMode') === this.label);
    },
    editCurve: function() {
        return Session.get('editMode');
    },
    editTarget: function() {
        return Session.get("eventTargetCurve");
    }
});

const setParamsToAxis = function(newAxis, currentParams) {
    // reset scatter plot apply stuff
    matsCurveUtils.resetScatterApply();
    // set param values to this curve
    // reset the form parameters for the superiors first
    var currentParamName;
    var params = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : true }}).fetch();
    for (var p  = 0; p < params.length; p++) {
        var plotParam = params[p];
        // do any date parameters - there are no axis date params in a scatter plot
        if (plotParam.type === matsTypes.InputTypes.dateRange) {
            if (currentParams[plotParam.name] === undefined) {
                continue;   // just like continue
            }
            const dateArr = currentParams[plotParam.name].split(' - ');
            const from = dateArr[0];
            const to = dateArr[1];
            const idref = "#" + plotParam.name + "-item";
            $(idref).data('daterangepicker').setStartDate(moment.utc(from, 'MM-DD-YYYY HH:mm'));
            $(idref).data('daterangepicker').setEndDate(moment.utc(to, 'MM-DD-YYYY HH:mm'));
            matsParamUtils.setValueTextForParamName(plotParam.name,currentParams[plotParam.name]);
        } else {
            currentParamName = currentParams[newAxis + "-" + plotParam.name] === undefined ?  plotParam.name : newAxis + "-" + plotParam.name;
            const val =  currentParams[currentParamName] === null ||
            currentParams[currentParamName] === undefined ? matsTypes.InputTypes.unused : currentParams[currentParamName];
            matsParamUtils.setInputForParamName(plotParam.name, val);
        }
    }
    // now reset the form parameters for the dependents
    params = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : false }}).fetch();
    for (var p  = 0; p < params.length; p++) {
        var plotParam = params[p];
        // do any plot date parameters
        currentParamName = currentParams[newAxis + "-" + plotParam.name] === undefined ?  plotParam.name : newAxis + "-" + plotParam.name;
        if (plotParam.type === matsTypes.InputTypes.dateRange) {
            if (currentParams[currentParamName] === undefined) {
                continue;   // just like continue
            }
            const dateArr = currentParams[currentParamName].split(' - ');
            const from = dateArr[0];
            const to = dateArr[1];
            const idref = "#" + plotParam.name + "-item";
            $(idref).data('daterangepicker').setStartDate(moment.utc(from, 'MM-DD-YYYY HH:mm'));
            $(idref).data('daterangepicker').setEndDate(moment.utc(to, 'MM-DD-YYYY HH:mm'));
            matsParamUtils.setValueTextForParamName(plotParam.name,currentParams[currentParamName]);
        } else {
            const val =  currentParams[currentParamName] === null ||
            currentParams[currentParamName] === undefined ? matsTypes.InputTypes.unused : currentParams[currentParamName];
            matsParamUtils.setInputForParamName(plotParam.name, val);
        }
    }
    // reset the scatter parameters
    params = matsCollections.Scatter2dParams.find({}).fetch();
    for (var p  = 0; p < params.length; p++) {
        var plotParam = params[p];
        currentParamName = currentParams[newAxis + "-" + plotParam.name] === undefined ?  plotParam.name : newAxis + "-" + plotParam.name;
        const val =  currentParams[currentParamName] === null ||
        currentParams[currentParamName] === undefined ? matsTypes.InputTypes.unused : currentParams[currentParamName];
        matsParamUtils.setInputForParamName(plotParam.name, val);
    }
    matsParamUtils.collapseParams();
    return false;


};

const correlateEditPanelToCurveItems = function(params, currentParams, doCheckHideOther) {
    for (var p = 0; p < params.length; p++) {
        var plotParam = params[p];
        // do any plot date parameters
        if (plotParam.type === matsTypes.InputTypes.dateRange) {
            if (currentParams[plotParam.name] === undefined) {
                continue;   // just like continue
            }
            const dateArr = currentParams[plotParam.name].split(' - ');
            const from = dateArr[0];
            const to = dateArr[1];
            const idref = "#" + plotParam.name + "-item";
            $(idref).data('daterangepicker').setStartDate(moment.utc(from, 'MM-DD-YYYY HH:mm'));
            $(idref).data('daterangepicker').setEndDate(moment.utc(to, 'MM-DD-YYYY HH:mm'));
            matsParamUtils.setValueTextForParamName(plotParam.name, currentParams[plotParam.name]);
        } else {
            var val = currentParams[plotParam.name] === null ||
            currentParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : currentParams[plotParam.name];
            matsParamUtils.setInputForParamName(plotParam.name, val);
        }
        if (doCheckHideOther) {
            matsSelectUtils.checkHideOther(plotParam, false);
        }
    }
};

var curveListEditNode;  // used to pass the edit button to the modal continue
Template.curveItem.events({
    'click .save-changes' : function() {
        $(".displayBtn").css({border:""}); // clear any borders from any display buttons
        document.getElementById('save').click();
        Session.set("paramWellColor","#f5f5f5");
    },
    'click .cancel' : function() {
        $(".displayBtn").css({border: ""}); // clear any borders from any display buttons
        document.getElementById('cancel').click();
        Session.set("paramWellColor","#f5f5f5");
    },
    'click .remove-curve': function (event) {
        var removeCurve = Session.get("confirmRemoveCurve");
        if (removeCurve && removeCurve.confirm) {
            var label = removeCurve.label;
            var color = removeCurve.color;
            var Curves = _.reject(Session.get('Curves'), function (item) {
                return item.label === label
            });
            Session.set('Curves', Curves);
            matsCurveUtils.clearUsedLabel(label);
            matsCurveUtils.clearUsedColor(color);
            matsCurveUtils.checkDiffs();
            Session.set("confirmRemoveCurve","");
            Session.set("lastUpdate", Date.now());
            if (Curves.length === 0) {
                location.reload(true);
            }
            return false;
        } else{
            Session.set("confirmRemoveCurve",{label:this.label,color:this.color});
            $("#modal-confirm-remove-curve").modal();
        }
    },
    'click .confirm-remove-curve': function () {
        var confirmCurve = Session.get("confirmRemoveCurve");
        Session.set("confirmRemoveCurve", {label:confirmCurve.label,color:confirmCurve.color,confirm:true});
        $("#curve-list-remove").trigger('click');
    },
    'click .edit-curve-xaxis': function(event) {
        Session.set('axis','xaxis');
        Session.set('editMode', this.label);
        var currentParams = jQuery.extend({}, this);
        setParamsToAxis('xaxis', currentParams);
    },
    'click .edit-curve-yaxis': function(event) {
        Session.set('axis','yaxis');
        Session.set('editMode', this.label);
        var currentParams = jQuery.extend({}, this);
        setParamsToAxis('yaxis',currentParams);
    },
    'click .edit-curve': function (event) {
        const srcEditButton = event.currentTarget;
        const name = srcEditButton.name;
        const editingCurve = Session.get('editMode');
        curveListEditNode = $(event.currentTarget.parentNode.parentNode.parentNode.parentNode).find("#curve-list-edit");
        const eventTargetCurve = $(event.currentTarget.parentNode.parentNode.parentNode).find(".displayItemLabelSpan").text().trim();
        Session.set("eventTargetCurve",eventTargetCurve);
        Session.set("intendedActiveDisplayButton",name);
        Session.set("activeDisplayButton",name);
        if(editingCurve !== undefined && editingCurve !== "" && editingCurve !== eventTargetCurve) {
            // editing a different curve // have to do the modal for confirmation
            $("#confirm-lost-edits").modal();
            return;
        }
        Session.set('editMode', this.label);
        // reset scatter plot apply stuff
        matsCurveUtils.resetScatterApply();
        // capture the current parameters from the curveItem
        var currentParams = jQuery.extend({}, this);
        // set param values to this curve
        // reset the form parameters for the superiors first
        var params = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : true }}).fetch();
        for (var p  = 0; p < params.length; p++) {
            var plotParam = params[p];
            // do any curve date parameters
            if (plotParam.type === matsTypes.InputTypes.dateRange) {
                if (currentParams[plotParam.name] === undefined) {
                    continue;   // just like continue
                }
                const dateArr = currentParams[plotParam.name].split(' - ');
                const from = dateArr[0];
                const to = dateArr[1];
                const idref = "#" + plotParam.name + "-item";
                $(idref).data('daterangepicker').setStartDate(moment.utc(from, 'MM-DD-YYYY HH:mm'));
                $(idref).data('daterangepicker').setEndDate(moment.utc(to, 'MM-DD-YYYY HH:mm'));
                matsParamUtils.setValueTextForParamName(plotParam.name,currentParams[plotParam.name]);
            } else {
                var val =  currentParams[plotParam.name] === null ||
                currentParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : currentParams[plotParam.name];
                matsParamUtils.setInputForParamName(plotParam.name, val);
                // refresh its dependents
                matsSelectUtils.refreshDependents(null,plotParam);
            }
        }
        // now reset the form parameters for anything with hide/disable controls
        params = matsCollections.CurveParams.find({"$and" : [{ "dependentNames" : { "$exists" : false }}, {"$or" : [{ "hideOtherFor" : { "$exists" : true }}, { "disableOtherFor" : { "$exists" : true }}]}]}).fetch();
        correlateEditPanelToCurveItems(params, currentParams, true);

        // now reset the form parameters for everything else
        params = matsCollections.CurveParams.find({"$and" : [{ "dependentNames" : { "$exists" : false }}, {"$and" : [{ "hideOtherFor" : { "$exists" : false }}, { "disableOtherFor" : { "$exists" : false }}]}]}).fetch();
        correlateEditPanelToCurveItems(params, currentParams, false);

        // reset the scatter parameters
        params = matsCollections.Scatter2dParams.find({}).fetch();
        for (var p  = 0; p < params.length; p++) {
            var plotParam = params[p];
            const val =  currentParams[plotParam.name] === null ||
            currentParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : currentParams[plotParam.name];
            matsParamUtils.setInputForParamName(plotParam.name, val);
        }
        matsParamUtils.collapseParams();
        return false;
    },
    'hidePicker': function() {
        var Curves = Session.get('Curves');
        var label = this.label;
        for (var i = 0; i < Curves.length; i++) {
            if (label === Curves[i].label) {
                Curves[i].color = document.getElementById(label + "-color-value").value;
            }
        }
        Session.set('Curves',Curves);
        return false;
    },
    'click .displayBtn': function (event) {
        const srcDisplayButton = event.currentTarget;
        const name = srcDisplayButton.name;
        const inputElem = matsParamUtils.getInputElementForParamName(name);
        const controlElem = matsParamUtils.getControlElementForParamName(name);
        const editingCurve = Session.get('editMode');
        if (name.startsWith('xaxis')) {
            curveListEditNode = $(event.currentTarget.parentNode.parentNode.parentNode.parentNode).find("#curve-list-edit-xaxis");
        } else if (name.startsWith('yaxis')) {
            curveListEditNode = $(event.currentTarget.parentNode.parentNode.parentNode.parentNode).find("#curve-list-edit-yaxis");
        } else {
            if (matsPlotUtils.getPlotType() === matsTypes.PlotTypes.scatter2d) {
                // for a scatter param that is not axis specific we still have to choos an axis - just choose x
                curveListEditNode = $(event.currentTarget.parentNode.parentNode.parentNode.parentNode).find("#curve-list-edit-xaxis");
            } else {
                curveListEditNode = $(event.currentTarget.parentNode.parentNode.parentNode.parentNode).find("#curve-list-edit");
            }
        }
        const eventTargetCurve = $(event.currentTarget.parentNode.parentNode.parentNode).find(".displayItemLabelSpan").text().trim();
        Session.set("eventTargetCurve",eventTargetCurve);
        Session.set("intendedActiveDisplayButton",name);
        Session.set("activeDisplayButton",name);
        if(editingCurve !== undefined && editingCurve !== "" && editingCurve !== eventTargetCurve) {
            // editing a different curve // have to do the modal for confirmation
            $("#confirm-lost-edits").modal();
            return;
        }
        inputElem && inputElem.focus();
        curveListEditNode.click();
        controlElem && controlElem.click();
        Session.set("elementChanged", Date.now());
    },
    'click .continue-lose-edits': function() {
        const intendedName = Session.get("intendedActiveDisplayButton");
        var activeDisplayButton = Session.set("activeDisplayButton", intendedName);
        document.getElementById('cancel').click();
        Session.set("paramWellColor", "#f5f5f5");
        const controlElem = matsParamUtils.getControlElementForParamName(intendedName);
        const inputElem = matsParamUtils.getInputElementForParamName(intendedName);
        inputElem && inputElem.focus();
        curveListEditNode.click();
        controlElem && controlElem.click();
        Session.set("elementChanged", Date.now());
    },
    'click .cancle-lose-edits': function() {
        // don't change the active button
        const name = Session.get("activeDisplayButton");
        const controlElem = matsParamUtils.getControlElementForParamName(name);
        const inputElem = matsParamUtils.getInputElementForParamName(name);
        inputElem && inputElem.focus();
        controlElem && controlElem.click();
        Session.set("elementChanged", Date.now());
    },
    'click .fa-paint-brush': function() {
        $("#" + this.label + "-color-value").trigger('click');
    }
});