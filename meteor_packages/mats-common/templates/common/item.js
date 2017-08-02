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
        return ((typeof this.type !== 'undefined') && (this.type == matsTypes.InputTypes.select));
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
        else {
            return "block;margin-top: 1.5em;";
        }
    },
    controlButtonVisibility: function() {
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
                    var ref = this.name + '-' + this.type;
                    var m = document.getElementById(ref);
                    var data = {
                        name: this.name,
                        type: this.type
                    };
                    var resizeMapEvent = new CustomEvent("resizeMap", {
                        detail: {
                            data: data
                        }
                    });
                    m.dispatchEvent(resizeMapEvent);
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
            const default_value = matsCollections.CurveParams.findOne( {name: event.currentTarget.name} ).default;
            setError(new Error('invalid value (' + event.currentTarget.value + ') for ' + event.currentTarget.name + " it must be between " + event.currentTarget.min + " and " + event.currentTarget.max + " -- resetting to default value: " + default_value));
            event.currentTarget.value = default_value;
        } else {
            setError(new Error('invalid value (' + event.currentTarget.value + ') for ' + event.currentTarget.name ) );
        }
    }
});


