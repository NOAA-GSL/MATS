Template.item.helpers({
    value: function() {
        if (this.name === "label") {
            return getNextCurveLabel();
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
        return this.value?this.value:this.default;
    },
    hasHelp: function() {
      return this.help !== undefined;
    },
    isSelect: function () {
        return ((typeof this.type !== 'undefined') && (this.type == InputTypes.select));
    },
    isSelectMap: function () {
        return ((typeof this.type !== 'undefined') && (this.type == InputTypes.selectMap));
    },
    isInput: function () {
        return ((typeof this.type !== 'undefined')  && (this.type == InputTypes.textInput));
    },
    isSpinner: function () {
        return ((typeof this.type !== 'undefined') && (this.type == InputTypes.numberSpinner));
    },
    isDateRange: function () {
        return ((typeof this.type !== 'undefined') && (this.type == InputTypes.dateRange));
    },
    isCheckBoxGroup: function () {
        return ((typeof this.type !== 'undefined') && (this.type == InputTypes.checkBoxGroup));
    },
    isRadioGroup: function () {
        return ((typeof this.type !== 'undefined') && (this.type == InputTypes.radioGroup));
    },
    controlButton: function() {
        return InputTypes.controlButton + "-" + this.name;
    },
    resetButton: function() {
        return InputTypes.resetButton + "-" + this.type;
    },
    element: function() {
        return InputTypes.element + "-" + this.name;
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
        var elem = document.getElementById(InputTypes.element + "-" + this.name);
        if (elem === undefined) {
            return false;
        }
        if (elem !== null && elem.style.display === "block") {
            elem.style.display = "none";
        } else {
            if (elem !== null) {
                elem.style.display = "block";
                if (this.type == "selectMap") {
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
        var formats = Object.keys(PlotFormats);
        if ($.inArray(this,formats) !== -1){
            Session.set('diffStatus',this);
        }
    },
    'change .data-input': function (event) {
        if (this.type !== InputTypes.numberSpinner) {
            var elem = document.getElementById(InputTypes.element + "-" + this.name);
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
        if (this.type === InputTypes.numberSpinner) {
            var elem = document.getElementById(InputTypes.element + "-" + this.name);
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
        $("#matshelp").load("/help/" + this.help + " #matshelp");
        $("#helpModal").modal('show');
    }
});

Template.textInput.events({
    'change, blur': function (event) {
        try {
            var text = event.currentTarget.value;
            setValueTextForParamName(event.target.name,text);
        } catch (error){
            setValueTextForParamName(event.target.name, "");
        }
    }
});

Template.select.events({
    'change, blur' : function (event) {
        try {
            var text = event.currentTarget.value;
            setValueTextForParamName(event.target.name, text);
        } catch (error){
            setValueTextForParamName(event.target.name, "");
        }
    }
});

Template.numberSpinner.events({
    'change, blur': function (event) {
        try {
            var text = event.currentTarget.value;
            setValueTextForParamName(event.target.name,text);
            console.log("elementData is:", getElementDataForParamName(event.target.name));
        } catch (error){
            setValueTextForParamName(event.target.name, "");
        }
    }
});


// Currently have no radioGroup params - this is undoubtedly broken - FIX ME
Template.radioGroup.events({
    'change, blur': function (event) {
        try {
            var text = event.currentTarget.value;
            setValueTextForParamName(event.target.name,text);
            console.log("elementData is:", getElementDataForParamName(event.target.name));
        } catch (error){
            setValueTextForParamName(event.target.name, "");
        }
    }
});

// Currently have no checkboxGroup params - this is undoubtedly broken - FIX ME
Template.checkboxGroup.events({
    'change, blur': function (event) {
        try {
            var text = event.currentTarget.value;
            setValueTextForParamName(event.target.name, text);
            console.log("elementData is:", getElementDataForParamName(event.target.name));
        } catch (error) {
            setValueTextForParamName(event.target.name, "");
        }
        console.log("elementData is:", getElementDataForParamName(event.target.name));
    }
});

Template.dateRange.events({
    'change, blur': function (event) {
        try {
            var text = event.currentTarget.value;
            setValueTextForParamName(event.target.name,text);
        } catch (error){
            setValueTextForParamName(event.target.name, "");
        }
    }
});

