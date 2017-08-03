import { matsTypes } from 'meteor/randyp:mats-common';
 import { matsCollections } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
var allGroups = {};
Template.curveParamItemGroup.helpers({
    curveParamGroups: function (c) {
        const label = c.label;
        const curves = Session.get("Curves");
        const index = curves.findIndex(
           function(obj){
               return obj.label === label;
           }
        );

        // create a set of groups each with an array of 6 params for display
        const lastUpdate = Session.get('lastUpdate');
        const plotType = matsPlotUtils.getPlotType();
        var elmementValues = matsParamUtils.getElementValues().curveParams;
        // derive the sorted pValues, xpValues, and ypValues from the sorted params and the elementValues
        var pValues = [];
        var pattern;
        switch (plotType) {
            case matsTypes.PlotTypes.scatter2d:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.scatter2d});
                break;
            case matsTypes.PlotTypes.profile:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.profile});
                break;
            case matsTypes.PlotTypes.dieoff:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.dieoff});
                break;
            case matsTypes.PlotTypes.timeSeries:
            default:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.timeSeries});
                break;
        }
        const groupSize = pattern.groupSize;
        const displayParams = pattern.displayParams;
        for (var di=0; di < displayParams.length;di++) {
            pValues.push({name: displayParams[di], value: c[displayParams[di]], color:c.color, curve:c.label, index:index});
        }
        // create array of parameter value display groups each of groupSize
        var pGroups = [];
        var gi = 0;
        const groupsLength = Math.floor(pValues.length / groupSize) + 1;
        while (gi < groupsLength) {
            var groupParams = [];
            var pi = gi * groupSize;
            const piend = pi + groupSize;
            while (pi < piend && pi < pValues.length) {
                if (pValues[pi]) {
                    groupParams.push(pValues[pi]);
                }
                pi++;
            }
            if (groupParams.length > 0) {
                pGroups.push(groupParams);
            }
            gi++;
        }
        allGroups[c.label] = pGroups;
        return pGroups;
    },
    curveNumber: function(elem) {
        return elem.index;
    },
    curveParams: function(paramGroup) {
      return paramGroup;
    },
    label: function(elem) {
        const p = matsCollections.CurveParams.findOne({name:elem.name});
        if (p.controlButtonText) {
            return p.controlButtonText.toUpperCase();
        }
        return elem.name.toUpperCase();
    },
    name: function(elem){
        return elem.name;
    },
    id: function(elem){
        return elem.name;
    },
    buttonId: function(elem) {
        const name = new String(elem.name);
        const upperName = name.toUpperCase();
        const curveNumber = elem.index;
        const spanId = upperName + "-curve-" + curveNumber + "-Button";
        return spanId;
    },
    spanId: function(elem) {
        const name = new String(elem.name);
        const upperName = name.toUpperCase();
        const curveNumber = elem.index;
        const spanId = upperName + "-curve-" + curveNumber + "-Item";
        return spanId;
    },
    value: function(elem){
        // have to get this from the session
        const curve = Session.get("Curves")[elem.index];
        if (curve === undefined) {
            return "";
        }
        var value = curve[elem.name];
        var text = "";
        if ( Object.prototype.toString.call( value ) === '[object Array]' ) {
            if (value.length === 1) {
                text = value[0];
            } else if (value.length > 1){
                text = value[0] + " .. " + value[value.length -1];
            }
        } else {
            text = value;
        }
        return text;
    },
    defaultColor: function(elem){
        return elem.color;
    },
    border: function(elem) {
        var elementChanged = Session.get("elementChanged");
        const name = elem.name; // for xaxis params
        const curve = elem.curve;
        const adb = (name === Session.get("activeDisplayButton"));
        const isEditMode = (curve === Session.get("editMode"));
        const inputElemIsVisible = matsParamUtils.isInputElementVisible(name);
        if (adb && isEditMode &&  inputElemIsVisible) {
            return "solid";
        }
        return "";
    },
    editCurve: function() {
        return Session.get('editMode');
    },
    editTarget: function() {
        return Session.get("eventTargetCurve");
    },
    displayParam: function(elem) {
        if (elem.name === "label") {
            return "none";
        }
        // it isn't good enough to just check the item control button. Need to evaluate the hideOtherFor functionality with
        // respect to this particular curve item
        // First - determine if my visibility is controlled by another
        const visibilityControllingParam = matsParamUtils.visibilityControllerForParam(elem.name);
        // Second - Check the hide/show state based on the parameter hideOtherFor map in the parameter nad the state of this particular curve
        if (visibilityControllingParam !== undefined) {
            const curve = Session.get("Curves")[elem.index];
            const hideOtherFor = visibilityControllingParam.hideOtherFor[elem.name][0];
            if (curve[visibilityControllingParam.name] === undefined || curve[visibilityControllingParam.name] === hideOtherFor) {
                return "none";
            }
        }
        return "block";
    }
});

