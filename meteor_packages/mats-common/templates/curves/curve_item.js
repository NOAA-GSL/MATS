import { matsTypes } from "meteor/randyp:mats-common";
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';

Template.curveItem.onRendered(function() {
    // the value used for the colorpicker (l) MUST match the returned value in the colorpick helper
    var label = this.data.label;
    $(function () {
        var l = '.' + label + '-colorpick';
        $(l).colorpicker({format: "rgb", align:"left"});
    });
});

Template.curveItem.helpers({
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
            this.regionName = this.region.split(' ')[0];
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
    log: function() {
        console.log(this);
    },
    DBcurve: function() {
        return (this.diffFrom === undefined);
    },
    editingThis: function() {
        return (Session.get('editMode') === this.label);
    }
});

const setParamsToAxis = function(newAxis) {
    var elems = document.getElementsByClassName("data-input");
    var axis_elems = _.filter(elems, function (elem) {
        return elem.name.indexOf(newAxis) > -1;
    });
    var l = axis_elems.length;
    // first do the superiors
    const superiorParams = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : true }}).fetch();
    var superiorParamNames = [];
    for (var si = 0; si < superiorParams.length;si++) {
        superiorParamNames.push(superiorParams[si].name);
    }
    for (var i = 0; i < l; i++) {
        var aelem = axis_elems[i];
        var aelem_id = aelem.id;
        // remove the axis part at the front
        var target_id = aelem_id.substring(newAxis.length+1,aelem_id.length);
        var telem = document.getElementById(target_id);
        if (superiorParamNames.indexOf(telem.name) === -1) {
            continue;  // only do the superiors here.
        }
        // first superiors
        matsParamUtils.setInputForParamName(telem.name, aelem.value);
    }
    // now do the dependents
    const dependentParams = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : false }}).fetch();
    var dependentParamNames = [];
    for (var si = 0; si < dependentParams.length;si++) {
        dependentParamNames.push(dependentParams[si].name);
    }
    for (var i = 0; i < l; i++) {
        var aelem = axis_elems[i];
        var aelem_id = aelem.id;
        // remove the axis part at the front
        var target_id = aelem_id.substring(newAxis.length+1,aelem_id.length);
        var telem = document.getElementById(target_id);
        if (dependentParamNames.indexOf(telem.name) === -1) {
            continue;  // only do the superiors here.
        }
        matsParamUtils.setInputForParamName(telem.name, aelem.value);
    }
    matsParamUtils.collapseParams();
};

Template.curveItem.events({
    'click .save-changes' : function() {
        document.getElementById('save').click();
    },
    'click .cancel' : function() {
        document.getElementById('cancel').click();
    },
    'click .remove-curve': function (event) {
        var label = this.label;
        var color = this.color;
        var Curves = _.reject(Session.get('Curves'),function(item){return item.label === label});
        Session.set('Curves',Curves);
        matsCurveUtils.clearUsedLabel(label);
        matsCurveUtils.clearUsedColor(color);
        matsCurveUtils.checkDiffs();
        return false;
    },
    'click .edit-curve-xaxis': function(event) {
        Session.set('axis','xaxis');
        setParamsToAxis('xaxis');
    },
    'click .edit-curve-yaxis': function(event) {
        Session.set('axis','yaxis');
        setParamsToAxis('yaxis');
    },
    'click .edit-curve': function (event) {
        Session.set('editMode', this.label);
        // reset scatter plot apply stuff
        matsCurveUtils.resetScatterApply();
        // capture the current parameters from the curveItem
        var currentParams = jQuery.extend({}, this);
        // set param values to this curve
        // reset the form parameters for the superiors first
        var params = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : true }}).fetch();
        params.forEach(function(plotParam) {
            // do any curve date parameters
            if (plotParam.type === matsTypes.InputTypes.dateRange) {
                if (currentParams[plotParam.name] === undefined) {
                    return;   // just like continue
                }
                const dateArr = currentParams[plotParam.name].split(' - ');
                const from = dateArr[0];
                const to = dateArr[1];
                const idref = "#" + plotParam.name + "-item";
                $(idref).data('daterangepicker').setStartDate(moment (from, 'MM-DD-YYYY HH:mm'));
                $(idref).data('daterangepicker').setEndDate(moment (to, 'MM-DD-YYYY HH:mm'));
                matsParamUtils.setValueTextForParamName(plotParam.name,currentParams[plotParam.name]);
            } else {
                const val =  currentParams[plotParam.name] === null ||
                currentParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : currentParams[plotParam.name];
                matsParamUtils.setInputForParamName(plotParam.name, val);
            }
        });

        // now reset the form parameters for the dependents
        params = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : false }}).fetch();
        params.forEach(function(plotParam) {
            // do any plot date parameters
            if (plotParam.type === matsTypes.InputTypes.dateRange) {
                if (currentParams[plotParam.name] === undefined) {
                    return;   // just like continue
                }
                const dateArr = currentParams[plotParam.name].split(' - ');
                const from = dateArr[0];
                const to = dateArr[1];
                const idref = "#" + plotParam.name + "-item";
                $(idref).data('daterangepicker').setStartDate(moment (from, 'MM-DD-YYYY HH:mm'));
                $(idref).data('daterangepicker').setEndDate(moment (to, 'MM-DD-YYYY HH:mm'));
                matsParamUtils.setValueTextForParamName(plotParam.name,currentParams[plotParam.name]);
            } else {
                const val =  currentParams[plotParam.name] === null ||
                currentParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : currentParams[plotParam.name];
                matsParamUtils.setInputForParamName(plotParam.name, val);
            }
        });

        // reset the scatter parameters
        params = matsCollections.Scatter2dParams.find({}).fetch();
        params.forEach(function(plotParam) {
            const val =  currentParams[plotParam.name] === null ||
            currentParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : currentParams[plotParam.name];
            matsParamUtils.setInputForParamName(plotParam.name, val);
        });
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
    }
});