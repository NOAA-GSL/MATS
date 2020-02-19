/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from  'meteor/randyp:mats-common';
import {matsParamUtils } from 'meteor/randyp:mats-common';
import {matsCollections } from 'meteor/randyp:mats-common';

Template.item.helpers({
    cbname: function() {
        if (this.controlButtonText !== undefined) {
            return this.controlButtonText.toUpperCase();
        }
        return this.name.toUpperCase();
    },
    textValue: function() {
        Session.get('lastUpdate');
        if (this.name === "label") {  // label is handled specially
            return;
        }
        if (matsParamUtils.getInputElementForParamName(this.name)) {
            return this.default;
        }
        if (this.value) {
            return this.value;
        } else {
            if (this.type === matsTypes.InputTypes.select && (this.default === -1 || this.default === undefined || this.default === matsTypes.InputTypes.unused)) {
                return matsTypes.InputTypes.unused;
            } else {
                return this.default;
            }
        }
    },
    hasHelp: function() {
      return this.help !== undefined;
    },
    isSelect: function () {
        /* A selectOrderEnforced differs from a select
            only in that the options - other than the default first option -
            must be chosen in order. In other words if the user attempts to select
            the second option prior to selecting the first option a validation error occurs.
         */
        return ((typeof this.type !== 'undefined') &&
            ((this.type == matsTypes.InputTypes.select) ||(this.type == matsTypes.InputTypes.selectOrderEnforced)));
    },
    isSelectMap: function () {
        return ((typeof this.type !== 'undefined') && (this.type == matsTypes.InputTypes.selectMap));
    },
    isInput: function () {
        return ((typeof this.type !== 'undefined')  && (this.type == matsTypes.InputTypes.textInput));
    },
    isSpinner: function () {
        return ((typeof this.type !== 'undefined') && (this.type == matsTypes.InputTypes.numberSpinner));
    },
    isDateRange: function () {
        return ((typeof this.type !== 'undefined') && (this.type == matsTypes.InputTypes.dateRange));
    },
    isCheckBoxGroup: function () {
        return ((typeof this.type !== 'undefined') && (this.type == matsTypes.InputTypes.checkBoxGroup));
    },
    isRadioGroup: function () {
        return ((typeof this.type !== 'undefined') && (this.type == matsTypes.InputTypes.radioGroup));
    },
    controlButton: function() {
        return matsTypes.InputTypes.controlButton + "-" + this.name;
    },
    resetButton: function() {
        return matsTypes.InputTypes.resetButton + "-" + this.type;
    },
    element: function() {
        return matsTypes.InputTypes.element + "-" + this.name;
    },
    display: function() {
        if (this.hidden) {
            return "none;margin-top: 1.5em;";
        }
        if (this.displayPriority !== undefined && this.displayPriority > Session.get('displayPriority')){
            return "none;margin-top: 1.5em;";
        }
        if (this.controlButtonVisibility !== undefined && this.controlButtonVisibility === 'none'){
            return "none;margin-top: 1.5em;";
        }
        else {
            return "block;margin-top: 1.5em;";
        }
    },
    controlButtonCovered: function() {
        if (this.controlButtonCovered) {
            return "block;";
        } else {
            return "none";
        }
    },
    elementHidden: function() {
        if (this.controlButtonCovered) {
            return "none";
        } else {
            return "block";
        }
    },
    zIndexVal: function() {
        // the difference selector keeps trying to cover the map modal, so increase the map's z-index, and decrease the difference selector's.
        if ((typeof this.type !== 'undefined') && (this.type == matsTypes.InputTypes.selectMap)) {
            return "10";
        } else if ((typeof this.type !== 'undefined') && (this.type == matsTypes.InputTypes.radioGroup)){
            return "4";
        } else {
            return "5";
        }
    }
});

Template.item.events({
    'click .control-button': function (event) {
        Session.set("elementChanged", Date.now());
        var elem = document.getElementById(matsTypes.InputTypes.element + "-" + this.name);
        if (elem === undefined) {
            return false;
        }
        if (elem !== null && elem.style.display === "block") {
            elem.style.display = "none";
        } else {
            matsParamUtils.collapseParams();
            if (elem !== null) {
                elem.style.display = "block";
                if (this.type == matsTypes.InputTypes.select) {
                    var s = document.getElementById(this.name + '-' + this.type);
                    const ref = "#" + this.name + "-" + this.type;
                    $(ref).select2("open");   // need to foricibly open the selector for the select2
                }
                if (this.type == matsTypes.InputTypes.selectMap) {
                    $("#mapModal").modal('show');
                    window.dispatchEvent(new Event('resize'));
                }
            }
        }
    },
    'click .data-input': function (event) {
        Session.set("elementChanged", Date.now());
        if (this.displayPriority !== undefined) {
            Session.set('displayPriority', this.displayPriority + 1);
        }
        var formats = Object.keys(matsTypes.PlotFormats);
        if ($.inArray(this,formats) !== -1){
            Session.set('diffStatus',this);
        }
        if (this.multiple !== true && this.type !== matsTypes.InputTypes.numberSpinner && this.type !== matsTypes.InputTypes.textInput) {
            // not too cool to collapse when trying to do a multi-select, a textInput, or a numberspinner
                matsParamUtils.collapseParam(this.name);
        }
    },
    'change .data-input': function (event) {
        Session.set("elementChanged", Date.now());
        event.target.checkValidity();
        if (this.type !== matsTypes.InputTypes.numberSpinner) {
            event.target.checkValidity();
            var elem = document.getElementById(matsTypes.InputTypes.element + "-" + this.name);
            if (elem === undefined) {
                return false;
            }
            if (elem !== null && elem.style.display === "block" && this.multiple !== true) {
                elem.style.display = "none";
            } else {
                if (elem !== null) {
                    elem.style.display = "block";
                }
            }
         }
        const curveItem = (Session.get("editMode") === undefined && Session.get("editMode") === "") ? undefined : document.getElementById("curveItem-" + Session.get("editMode"));
        if (curveItem) {
            $('#save').trigger('click');
        }

    },

    'click .help' : function() {
        var helpref = Session.get("app").helpref;
        $("#matshelp").load(helpref + "/" + this.help + " #matshelp");
        $("#helpModal").modal('show');
    },
    'invalid' : function(event) {
        if (this.type === matsTypes.InputTypes.numberSpinner) {
            const param = matsCollections.CurveParams.findOne( {name: event.currentTarget.name} );
            if (param === undefined) {
                return;
            }
            setError(new Error('invalid value (' + event.currentTarget.value + ') for ' + event.currentTarget.name + " it must be between " + event.currentTarget.min + " and " + event.currentTarget.max + " -- resetting to default value: " + default_value));
        } else {
            var errMsg = Session.get('errorMessage');
            if (errMsg === "") {
                errMsg = 'invalid value (' + event.currentTarget.value + ') for ' + event.currentTarget.name;
            }
            setError(new Error(errMsg));
        }
        const default_value = matsCollections.CurveParams.findOne( {name: event.currentTarget.name} ).default;
        event.currentTarget.value = default_value;
    }
});


