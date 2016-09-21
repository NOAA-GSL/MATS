import { matsTypes } from 'meteor/randyp:mats-common'; 
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';

Template.scatter2d.helpers({
    xaxisCurveText: function() {
        var t = Session.get('xaxisCurveText');
        if (t){
            return t;
        } else {
            Session.set('xaxisCurveText', 'XAXIS NOT YET APPLIED');
            return 'XAXIS NOT YET APPLIED';
        }
    },
    yaxisCurveText: function() {
        var t = Session.get('yaxisCurveText');
        if (t){
            return t;
        } else {
            Session.set('yaxisCurveText', 'YAXIS NOT YET APPLIED');
            return 'YAXIS NOT YET APPLIED';
        }
    },
    xaxisCurveColor: function() {
        var t = Session.get('xaxisCurveColor');
        if (t){
            return t;
        } else {
            Session.set('xaxisCurveColor', 'red');
            return 'red';
        }
    },
    yaxisCurveColor: function() {
        var t = Session.get('yaxisCurveColor');
        if (t){
            return t;
        } else {
            Session.set('yaxisCurveColor', 'red');
            return 'red';
        }
    },
    curveIcon: function() {
        var t = Session.get('axisCurveIcon');
        if (t){
            return t;
        } else {
            Session.set('axisCurveIcon', 'fa-asterisk');
            return 'fa-asterisk';
        }
    },
    title: function() {
        return "2d Scatter Plot Axis Selection"
    },
    scatter2dParams: function () {
        var params = matsCollections.Scatter2dParams.find({}).fetch();
        return params;
    },
    scatter2dOptions: function() {
        var options = this.options;
        return options;
    },
    name: function(param) {
        //console.log("name: " + param.name);
        var name = param.name.replace(/ /g,'-');
        return name;
    },
    className: function(param) {
        //console.log("name: " + param.name);
        var cname = param.name.replace(/ /g,'-') + "-" + param.type;
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
        var def = param.default;
        if (def == this) {
            return "checked";
        } else {
            return "";
        }
    },
    isAxis: function(param) {
      return param.name === 'axis-selector';
    },
    displayScatter2d: function() {
        if (matsPlotUtils.getPlotType() == matsTypes.PlotTypes.scatter2d) {
            return "block";
        } else {
            return "none";
        }
    },
    label: function(param, parent) {
        if (parent.name === "scatter2d-best-fit") {
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

Template.scatter2d.events({
    'click .apply-params-to-axis': function(event) {
        var axis = document.querySelector('input[name="axis-selector"]:checked').value;
        var elems = document.getElementsByClassName("data-input");
        var curveParams = matsCollections.CurveParams.find({}, {fields: {name: 1}}).fetch();
        var curveNames = _.pluck(curveParams, "name");
        var param_elems = _.filter(elems, function (elem) {
            return _.contains(curveNames, elem.name);
        });
        var l = param_elems.length;
        for (var i = 0; i < l; i++) {
            var pelem = param_elems[i];
            var elem_id = pelem.id;
            var target_id = axis + "-" + elem_id;
            var telem = document.getElementById(target_id);
            if (pelem.type === "select-multiple") {
                var selectedOptions = $(pelem.selectedOptions).map(function(){return(this.value)}).get();
                for (var x =0; x < telem.options.length; x++) {
                    if ($.inArray(telem.options[x].value, selectedOptions) !== -1) {
                        telem.options[x].selected = true;
                    } else {
                        telem.options[x].selected = false;
                    }
                }
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
        var axisCurveId = axis + "-curve";
        var span = document.getElementById(axisCurveId);
        Session.set(axis + 'CurveText', axis + " " + matsPlotUtils.getAxisText(matsPlotUtils.getPlotType()));
        Session.set(axis + 'CurveColor', 'green');
        Session.set('axisCurveIcon', "fa-check");
        // select the other radio button
        if (axis === "xaxis") {
            $("#axis-selector-radioGroup-yaxis").prop("checked",true);
            Session.set('axis','yaxis');
        } else {
            $("#axis-selector-radioGroup-xaxis").prop("checked",true);
            Session.set('axis','xaxis');
        }
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
