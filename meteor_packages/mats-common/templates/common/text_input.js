/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common'
import { matsTypes } from 'meteor/randyp:mats-common'
Template.textInput.helpers({
    defaultTextInput: function() {
        if (this.name == 'label') {   // labels are handled specially
            var label;
            var input = document.getElementById('label-textInput');
            var value = document.getElementById('controlButton-label-value');
            if (input && value) {
                if (label !== input.value || label != value.textContent) {
                    if (!Session.get('NextCurveLabel')) {
                        label = matsCurveUtils.getNextCurveLabel();
                    } else {
                        label = Session.get('NextCurveLabel');
                    }
                    input.value = label;
                    value.textContent = label;
                    return label;
                }
            } else {
                // must be initialization
                label = matsCurveUtils.getNextCurveLabel();
                return label;
            }
        } else {
            return this.default;
        }
    }
});

Template.textInput.events({
    'click, blur': function (event) {
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
    },
    'change': function (event) {
        try {
            // label is handled differently - special case because of NextCurveLabel stored in Session
            const text = event.currentTarget.value;
            if (Object.values(matsTypes.ReservedWords).indexOf(text) === -1) {
                matsParamUtils.setValueTextForParamName(event.target.name, text);
                Session.set("NextCurveLabel", text);
            } else {
                console.log("that curve label is not allowed");
                setTimeout(function (){
                    matsParamUtils.setValueTextForParamName(event.target.name, "LabelNotAllowed");
                }, 10);
            }
        } catch (error){
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
    }
});

