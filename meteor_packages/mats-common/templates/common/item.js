import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from  'meteor/randyp:mats-common';
import {matsParamUtils } from 'meteor/randyp:mats-common';

Template.item.helpers({
    value: function() {
        if (this.name === "label") {
            return matsCurveUtils.getNextCurveLabel();
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
            if (this.type === matsTypes.InputTypes.select && this.default === -1) {
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
    },
    'change .data-input': function (event) {
        if (this.type !== matsTypes.InputTypes.numberSpinner) {
            var elem = document.getElementById(matsTypes.InputTypes.element + "-" + this.name);
            if (elem === undefined) {
                return false;
            }
            if (elem !== null && elem.style.display === "block" && this.multiple == false) {
                elem.style.display = "none";
            } else {
                if (elem !== null) {
                    elem.style.display = "block";
                }
            }
        }
    },

    'blur .data-input': function () {
        if (this.type === matsTypes.InputTypes.numberSpinner) {
            var elem = document.getElementById(matsTypes.InputTypes.element + "-" + this.name);
            if (elem === undefined) {
                return false;
            }
            if (elem !== null && elem.style.display === "block") {
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
    }
});

Template.textInput.events({
    'change, blur': function (event) {
        try {
            var text = event.currentTarget.value;
            matsParamUtils.setValueTextForParamName(event.target.name,text);
        } catch (error){
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
    }
});

Template.select.events({
    'change, blur' : function (event) {
        try {
            var text = event.currentTarget.value;
            matsParamUtils.setValueTextForParamName(event.target.name, text);
        } catch (error){
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
    }
});

Template.numberSpinner.events({
    'change, blur': function (event) {
        try {
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


