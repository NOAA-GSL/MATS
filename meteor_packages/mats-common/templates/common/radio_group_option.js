/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsTypes } from 'meteor/randyp:mats-common'; 
Template.radioGroup.helpers({
    checkedByDefault: function (def) {
        if (def == this) {
            return "checked";
        } else {
            return "";
        }
    },
    labelValue: function (optionsMap) {
        return optionsMap[this];
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

