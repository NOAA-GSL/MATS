import { matsTypes } from 'meteor/randyp:mats-common'; 
Template.checkboxGroup.helpers({
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