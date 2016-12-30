Template.checkboxGroup.helpers({
    checkedByDefault: function (def) {
        if (def == this) {
            return "checked";
        } else {
           return "";
        }
    }
});