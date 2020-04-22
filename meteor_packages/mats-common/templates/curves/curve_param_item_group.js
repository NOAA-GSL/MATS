/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

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
            case matsTypes.PlotTypes.profile:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.profile});
                break;
            case matsTypes.PlotTypes.dieoff:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.dieoff});
                break;
            case matsTypes.PlotTypes.threshold:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.threshold});
                break;
            case matsTypes.PlotTypes.validtime:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.validtime});
                break;
            case matsTypes.PlotTypes.gridscale:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.gridscale});
                break;
            case matsTypes.PlotTypes.dailyModelCycle:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.dailyModelCycle});
                break;
            case matsTypes.PlotTypes.reliability:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.reliability});
                break;
            case matsTypes.PlotTypes.roc:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.roc});
                break;
            case matsTypes.PlotTypes.map:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.map});
                break;
            case matsTypes.PlotTypes.histogram:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.histogram});
                break;
            case matsTypes.PlotTypes.ensembleHistogram:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.ensembleHistogram});
                break;
            case matsTypes.PlotTypes.contour:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.contour});
                break;
            case matsTypes.PlotTypes.contourDiff:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.contourDiff});
                break;
            case matsTypes.PlotTypes.scatter2d:
                pattern = matsCollections.CurveTextPatterns.findOne({plotType: matsTypes.PlotTypes.scatter2d});
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
        var groupParams = [];
        var pvi = 0;
        while (pvi < pValues.length) {
            if (pValues[pvi] && (pValues[pvi].name == 'xaxis' || pValues[pvi].name == 'yaxis')) {
                if (groupParams.length > 0) {
                    // finish the old group and make a new group for 'xaxis' or 'yaxis'
                    pGroups.push(groupParams);
                }
                groupParams = [];
            }
            pValues[pvi] && groupParams.push(pValues[pvi]);
            if (groupParams.length >= groupSize) {
                pGroups.push(groupParams);
                groupParams = [];
            }
            pvi++;
        }
        // check for a partial last group
        if (groupParams.length > 0) {
            pGroups.push(groupParams);
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
        if (matsPlotUtils.getPlotType() === matsTypes.PlotTypes.scatter2d) {
            const pNameArr = elem.name.match(/([xy]axis-)(.*)/);
            if (pNameArr === null) {
                return elem.name.toUpperCase();
            }
            const prefix = pNameArr[1];
            const pName = pNameArr[2];
            const p = matsCollections.CurveParams.findOne({name:pName});
            if (p.controlButtonText) {
                return (prefix + p.controlButtonText).toUpperCase();
            } else {
                return elem.name.toUpperCase();
            }
        } else {
            const p = matsCollections.CurveParams.findOne({name:elem.name});
            if (p.controlButtonText) {
                return p.controlButtonText.toUpperCase();
            } else {
                return elem.name.toUpperCase();
            }
        }
        // should never get here
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
            if (curve!== undefined && visibilityControllingParam !== undefined && curve[visibilityControllingParam.name] !== undefined && curve[visibilityControllingParam.name] === hideOtherFor) {
                return "none";
            }
        }
        return "block";
    }
});

