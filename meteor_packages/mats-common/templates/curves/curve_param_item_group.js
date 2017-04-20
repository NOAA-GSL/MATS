import { matsTypes } from 'meteor/randyp:mats-common';
 import { matsCollections } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
var allGroups = {};
Template.curveParamItemGroup.helpers({
    curveParamGroups: function (c) {
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
            case matsTypes.PlotTypes.timeSeries:
            default:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.timeSeries});
                break;
        }
        const groupSize = pattern.groupSize;
        const displayParams = pattern.displayParams;
        for (var di=0; di < displayParams.length;di++) {
            pValues.push({name: displayParams[di], value: c[displayParams[di]], color:c.color, curve:c.label});
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
    curveParams: function(paramGroup) {
      return paramGroup;
    },
    label: function(elem) {
        return elem.name.toUpperCase();
    },
    name: function(elem){
        return elem.name;
    },
    id: function(elem){
        return elem.name;
    },
    value: function(elem){
        // have to get this from the session
        // what is my curve?
        return elem.value;
    },
    defaultColor: function(elem){
        return elem.color;
    },
    border: function(elem) {
        var elementChanged = Session.get("elementChanged");
        const name = elem.name;
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
    }
});

