/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsParamUtils } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
var refresh = function(name) {
    const paramData = matsCollections.CurveParams.findOne({name: name}, {dependentNames: 1, peerName: 1});
    const optionsMap = paramData.optionsMap;
    var superiorNames = paramData.superiorNames;
    var ref = paramData.name + '-' + paramData.type;
    var refValueDisplay = "controlButton-" + paramData.name + "-value";
    var dispElem = document.getElementById(refValueDisplay);
    var elem = document.getElementById(ref);
    var dispDefault = paramData.default;
    var min = paramData.min;
    var step = paramData.step === undefined ? "any" : paramData.step;
    var max = paramData.max;
    for (var si =0; si < superiorNames.length; si++) {
        var superiorElement = matsParamUtils.getInputElementForParamName(superiorNames[si]);
        var selectedSuperiorValue = superiorElement.options[superiorElement.selectedIndex] && superiorElement.options[superiorElement.selectedIndex].text;
        const options = optionsMap[selectedSuperiorValue];
        if (options === undefined) {
            continue;
        }
        min = Number(options.min) < Number(min) ? options.min : min;
        max = Number(options.max) > Number(max) ? options.max : max;
        if (step !== "any" && options.step !== "any") {
            step = Number(options.step) < Number(step) ? options.step : step;
        }
        dispDefault = options.default !== undefined ? options.default : dispDefault;
    }
    elem.setAttribute("min", min);
    elem.setAttribute("max",max);
    elem.setAttribute("step",step);
    elem.value = dispDefault;
};

Template.numberSpinner.helpers({
    defaultValue: function() {
        return this.default;
    },
    min: function() {
        //default
        return this.min;
    },
    max: function() {
        //default
        return this.max;
    },
    step: function() {
        //default
        return this.step;
    }
});

Template.numberSpinner.onRendered(function () {
// register an event listener so that the select.js can ask the map div to refresh after a selection
    const ref = this.data.name + '-' + this.data.type;
    const elem = document.getElementById(ref);
    if (ref.search('axis') === 1) {
        // this is a "brother" (hidden) scatterplot param. There is no need to refresh it or add event listeners etc.
        return;
    }
    elem.addEventListener('refresh', function (e) {
        refresh(this.name);
    });
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

