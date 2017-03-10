import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from  'meteor/randyp:mats-common';
import {matsParamUtils } from 'meteor/randyp:mats-common';
import {matsCollections } from 'meteor/randyp:mats-common';

Template.item.helpers({
    textValue: function() {
        Session.get('lastUpdate');
        if (this.name === "label") {  // label is handled specially
            return;
        }
        if (matsParamUtils.getInputElementForParamName(this.name)) {
            // This helper is for initialization. If I already have an element just return "" and let the event handling take care of the value
            return '';
        }
        if (this.name === 'dates' || this.name == 'curve-dates') {
            var today = new Date();
            var thenDate = new Date(today.getTime() - 30*24*60*60*1000);
            var thenyr = thenDate.getFullYear();
            var thenday = thenDate.getDate();
            var thenmonth = thenDate.getMonth() + 1;
            var then =  thenmonth + '/' + thenday + "/" + thenyr;

            var yr = today.getFullYear();
            var day = today.getDate();
            var month = today.getMonth() + 1;
            var now = month + '/' + day + "/" + yr;
            this.default = then + " to " + now;
            this.value = then + " to " + now;
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
            return "none";
        }
        if (this.displayPriority !== undefined && this.displayPriority > Session.get('displayPriority')){
            return "none";
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
                    if (s.options && s.selectedIndex >= 0) {
                        s.options[s.selectedIndex].scrollIntoView();
                    }
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
        if (this.displayPriority !== undefined) {
            Session.set('displayPriority', this.displayPriority + 1);
        }
        var formats = Object.keys(matsTypes.PlotFormats);
        if ($.inArray(this,formats) !== -1){
            Session.set('diffStatus',this);
        }
        matsParamUtils.collapseParam(this.name);
    },
    'change .data-input': function (event) {
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

Template.textInput.events({
    'click, change, blur': function (event) {
        try {
            // label is handled differently - special case because of NextCurveLabel stored in Session
            const text = event.currentTarget.value;
            if (event.target.name == "label" && Session.get('NextCurveLabel') == text) {
            } else {
                matsParamUtils.setValueTextForParamName(event.target.name, text);
            }
        } catch (error){
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
    }
});

Template.select.events({
    'change, blur' : function (event) {
        try {
            var text = event.currentTarget.value;
            if (this.type === matsTypes.InputTypes.select && (text === "" || text === undefined || text === null) &&
                (this.default === -1 || this.default === undefined || this.default === null || event.currentTarget.selectedIndex == -1)) {
                text = matsTypes.InputTypes.unused;
            }
            matsParamUtils.setValueTextForParamName(event.target.name, text);
        } catch (error){
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
    }
});

Template.numberSpinner.events({
    'change, blur': function (event) {
        try {
            event.target.checkValidity();
            var text = event.currentTarget.value;
            matsParamUtils.setValueTextForParamName(event.target.name,text);
        } catch (error){
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
    }
});


// Currently have no radioGroup params - this is undoubtedly broken - FIX ME
Template.radioGroup.events({
    'change, blur': function (event) {
        try {
            var text = event.currentTarget.value;
            matsParamUtils.setValueTextForParamName(event.target.name,text);
        } catch (error){
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
    }
});

// Currently have no checkboxGroup params - this is undoubtedly broken - FIX ME
Template.checkboxGroup.events({
    'change, blur': function (event) {
        try {
            var text = event.currentTarget.value;
            matsParamUtils.setValueTextForParamName(event.target.name, text);
        } catch (error) {
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
    }
});


