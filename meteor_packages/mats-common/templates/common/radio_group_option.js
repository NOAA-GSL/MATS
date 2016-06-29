Template.radioGroup.helpers({
    isDefault: function (def) {
        if (def == this) {
            return "checked";
        } else {
            return "";
        }
    },
    value: function(p) {
        return p.optionsMap[this];
    }
});