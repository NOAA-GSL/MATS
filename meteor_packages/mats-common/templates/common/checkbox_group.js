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

// Currently have no checkboxGroup params - this is undoubtedly broken - FIX ME
Template.checkboxGroup.events({
    'change, blur': function (event) {
        try {
            var text = event.currentTarget.value;
            matsParamUtils.setValueTextForParamName(event.target.name, text);
        } catch (error) {
            matsParamUtils.setValueTextForParamName(event.target.name, "");
        }
    }
});
