Template.curveItem.rendered = function() {
    // the value used for the colorpicker (l) MUST match the returned value in the colorpick helper
    var label = this.data.label;
    $(function () {
        var l = '.' + label + '-colorpick';
        $(l).colorpicker({format: "rgb"});
    });
};

Template.curveItem.helpers({
    colorpick: function() {
        var l = this.label + '-colorpick';
        return l;
    },
    text: function () {
        if (this.diffFrom === undefined) {
            var plotType = Session.get('plotType');
            if (plotType === undefined) {
                var pfuncs = PlotGraphFunctions.find({}).fetch();
                for (var i = 0; i < pfuncs.length; i++) {
                    if (pfuncs[i].checked === true) {
                        Session.set('plotType', pfuncs[i].plotType);
                    }
                }
                plotType = Session.get('plotType');
            }
            this.regionName = this.region.split(' ')[0];
            return getCurveText(plotType, this);
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
    log: function() {
        console.log(this);
    }
});

Template.curveItem.events({
    'click .remove-curve': function (event) {
        var label = this.label;
        var color = this.color;
        var Curves = _.reject(Session.get('Curves'),function(item){return item.label === label});
        Session.set('Curves',Curves);
        clearUsedLabel(label);
        clearUsedColor(color);
        checkDiffs();
        return false;
    },
    'click .edit-curve': function (event) {
        Session.set('editMode', this.label);
        // reset scatter plot apply stuff
        Modules.client.util.resetScatterApply();
        // set param values to this curve
        var keys = [];
        for(var k in this) keys.push(k);
        var fElements = document.getElementById("paramForm").elements;
        for (var i =0; i < fElements.length; i++) {
            setValueTextForParamName(fElements[i].name,fElements[i].value);
        }
        var labelId = 'label-' + InputTypes.textInput;
        var label = document.getElementById(labelId);
        label.disabled = true;
        // set parameters to this ones values
        // on submit see if one exists and editMode is on.
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
    }
});