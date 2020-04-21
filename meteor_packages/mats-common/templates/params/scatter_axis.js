/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsTypes } from 'meteor/randyp:mats-common'; 
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';

const isEditing = function() {
    const mode = Session.get('editMode');
    return !( mode === "" || mode === undefined || mode === null);
};
const setAxisText = function(axis) {
    Session.set(axis + 'CurveText', axis + " " + matsPlotUtils.getAxisText(matsPlotUtils.getPlotType()));
    Session.set(axis + 'CurveColor', 'green');
    Session.set('axisCurveIcon', "fa-check");
};

Template.scatter2d.helpers({
    modeText: function() {
        return isEditing() ? "Editing the curve " + Session.get('editMode') + " (" + Session.get('axis') + ")": "Creating a new curve";
    },
    creating: function() {
        if (isEditing()) {
            return "none";
        } else {
            return "block";
        }
    },
    editing: function() {
        if (isEditing()) {
            return "block";
        } else {
            return "none";
        }
    },
    xaxisCurveText: function() {
        if (isEditing()) {
            setAxisText("xaxis");
        }
        const t = Session.get('xaxisCurveText');
        if (t){
            return t;
        } else {
            Session.set('xaxisCurveText', 'XAXIS NOT YET APPLIED');
            return 'XAXIS NOT YET APPLIED';
        }
    },
    yaxisCurveText: function() {
        if (isEditing()) {
            setAxisText("yaxis");
        }
        const t = Session.get('yaxisCurveText');
        if (t || isEditing()){
            return t;
        } else {
            Session.set('yaxisCurveText', 'YAXIS NOT YET APPLIED');
            return 'YAXIS NOT YET APPLIED';
        }
    },
    yApplyEnabled: function() {
        const c = Session.get('xaxisCurveColor');
        if (c === 'red' && !isEditing()){
            return "disabled";
        } else {
            return"";
        }
    },

    xaxisCurveColor: function() {
        const t = Session.get('xaxisCurveColor');
        if (t){
            return t;
        } else {
            Session.set('xaxisCurveColor', 'red');
            return 'red';
        }
    },
    yaxisCurveColor: function() {
        const t = Session.get('yaxisCurveColor');
        if (t){
            return t;
        } else {
            Session.set('yaxisCurveColor', 'red');
            return 'red';
        }
    },
    curveIcon: function() {
        const t = Session.get('axisCurveIcon');
        if (t){
            return t;
        } else {
            Session.set('axisCurveIcon', 'fa-asterisk');
            return 'fa-asterisk';
        }
    },
    title: function() {
        return "Scatter Plot parameters"
    },
    scatter2dParams: function () {
        const params = matsCollections.Scatter2dParams.find({}).fetch();
        return params;
    },
    scatter2dOptions: function() {
        const options = this.options;
        return options;
    },
    name: function(param) {
        //console.log("name: " + param.name);
        const name = param.name.replace(/ /g,'-');
        return name;
    },
    className: function(param) {
        //console.log("name: " + param.name);
        const cname = param.name.replace(/ /g,'-') + "-" + param.type;
        return cname;
    },
    
    type: function(param) {
        switch (param.type) {
            case matsTypes.InputTypes.checkBoxGroup:
                return "checkbox";
                break;
            case matsTypes.InputTypes.radioGroup:
                return "radio";
                break;
            case matsTypes.InputTypes.select:
                return "select";
                break;
            case matsTypes.InputTypes.numberSpinner:
                return "number";
                break;
            default:
                return "text";
        }
    },
    default: function() {
        return this.default;
    },
    idOption: function(param) {
        var id = param.name + "-" + param.type + "-" + this;
        id = id.replace(/ /g,'-');
        return id;
    },
    idParam: function() {
        var id = this.name + "-" + this.type;
        id = id.replace(/ /g,'-');
        return id;
    },
    plotType : function() {
      return matsTypes.PlotTypes.scatter2d;  
    },
    isDefault: function (param) {
        const def = param.default;
        if (def == this) {
            return "checked";
        } else {
            return "";
        }
    },
    displayScatter2d: function() {
        if (matsPlotUtils.getPlotType() == matsTypes.PlotTypes.scatter2d) {
            return "block";
        } else {
            return "none";
        }
    },
    label: function(param, parent) {
        if (parent.name === "Fit Type") {
            return parent.optionsMap[this];
        } else {
            return this;
        }
    },
    labelParam: function() {
            return this.name;
    },
    log: function() {
        console.log(this);
    },
    axis: function(param) {
        var axis = Session.get('axis');
        if (axis === undefined) {
            if (param) {
                return param.default;
            } else {
                return 'xaxis';
            }
        }
        return axis;
    },
    isNumberSpinner: function(param) {
        return param.type === matsTypes.InputTypes.numberSpinner;
    },
    hasHelp: function() {
        return this.help !== undefined;
    }
});

const apply = function(axis) {
    const elems = document.getElementsByClassName("data-input");
    const curveParams = matsCollections.CurveParams.find({}, {fields: {name: 1}}).fetch();
    const curveNames = _.pluck(curveParams, "name");
    const param_elems = _.filter(elems, function (elem) {
        return _.contains(curveNames, elem.name);
    });
    var l = param_elems.length;
    for (var i = 0; i < l; i++) {
        var pelem = param_elems[i];
        //console.log("pelem.type is " + pelem.type);
        var elem_id = pelem.id;
        var target_id = axis + "-" + elem_id;
        var telem = document.getElementById(target_id);
        // Notice that these types are not matsTypes these are javascript types
        if (pelem.type === "select-multiple") {
            var $options = $("#" + elem_id + " > option").clone();
            $("#" + target_id).empty().append($options);
            var selectedOptions = $(pelem.selectedOptions).map(function(){return(this.value)}).get();
            for (var x =0; x < telem.options.length; x++) {
                if ($.inArray(telem.options[x].value, selectedOptions) !== -1) {
                    telem.options[x].selected = true;
                } else {
                    telem.options[x].selected = false;
                }
            }
        } else if (pelem.type === "select-one") {
            var $options = $("#" + elem_id + " > option").clone();
            $("#" + target_id).empty().append($options);
            telem.selectedIndex = pelem.selectedIndex;
        } else if (pelem.type === "radio") {
            // NOT SURE THIS IS RIGHT
            //console.log(pelem.name + " is " + $('input[name="' + pelem.name + '"]:checked').val());
            $('input[name="' + telem.name + '"]:checked');
        } else if (pelem.type === "button") {
            telem.value = pelem.value;
        } else {
            telem.value = pelem.value;
        }
    }
    setAxisText(axis);
};

Template.scatter2d.events({
    'click .apply-params-to-xaxis': function(event) {
        apply('xaxis');
    },
    'click .apply-params-to-yaxis': function(event) {
        apply('yaxis');
    },
    'change .axis-selector-radioGroup' : function(event) {
        var newAxis = event.currentTarget.value;
        Session.set('axis',newAxis);
        var elems = document.getElementsByClassName("data-input");
        var axis_elems = _.filter(elems, function (elem) {
            return elem.name.indexOf(newAxis) > -1;
        });
        var l = axis_elems.length;
        for (var i = 0; i < l; i++) {
            var aelem = axis_elems[i];
            var aelem_id = aelem.id;
            // remove the axis part at the front
            var target_id = aelem_id.substring(newAxis.length+1,aelem_id.length);
            var telem = document.getElementById(target_id);
            if (aelem.type === "select-multiple") {
                $(telem).val($(aelem.selectedOptions).map(function(){return(this.value)}).get());
            } else if (aelem.type === "radio") {
                // NOT SURE THIS IS RIGHT
                //console.log(pelem.name + " is " + $('input[name="' + pelem.name + '"]:checked').val());
                $('input[name="' + telem.name + '"]:checked');
            } else if (aelem.type === "button") {
                telem.value = aelem.value;
            } else {
                telem.value = aelem.value;
            }
            telem.dispatchEvent(new CustomEvent("axisRefresh"));
        }
    },
    'click .axishelp' : function() {
        $("#matshelp").load("/help/scatter-help.html #matshelp");
        $("#helpModal").modal('show');
    },
    'click .help' : function() {
        $("#matshelp").load("/help/" + this.help + " #matshelp");
        $("#helpModal").modal('show');
    }
});

