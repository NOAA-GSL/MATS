Template.radioGroup.helpers({
    isDefault: function (def) {
        if (def == this) {
            return "checked";
        } else {
            return "";
        }
    }
});