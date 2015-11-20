Template.colorScheme.helpers({
    colorOptions : function() {
        var colorScheme = ColorScheme.findOne({});
        if (colorScheme === undefined) {return false;}
        var colors = colorScheme.colors;
        var colorOptions = [];
        for (var i = 0; i < colors.length; i++) {
            colorOptions.push({color:colors[i]});
        }
        return colorOptions;
    }
});

Template.colorScheme.events({
    'click .apply-color-scheme': function () {
        var removeColor = document.getElementById("removeColor").value;
        var insertAfterColor = document.getElementById("insertAfterColor").value;
        var newColor = document.getElementById("colorSchemePicker").value;
        var colors = ColorScheme.findOne({}).colors;
        if (newColor) {
            var insertAfterIndex = 0;
            if (insertAfterColor) {
                insertAfterIndex = colors.indexOf(insertAfterColor);
            }
            Meteor.call('insertColor', newColor, insertAfterIndex, function (error) {
                if (error) {
                    setError(error.message);
                }
            });
            colors = ColorScheme.findOne({}).colors;
        }
        if (removeColor) {
            Meteor.call('removeColor', removeColor, function (error) {
                if (error) {
                    setError(error.message);
                }
            });
        }
        // reset modal
        removeColor = null;
        insertAfterColor = null;
        newColor = null;
        document.getElementById("removeColor").value = "";
        document.getElementById("insertAfterColor").value = "";
        document.getElementById("colorSchemePicker").color="rgb(255,255,255)";
        document.getElementById("colorSchemePicker").value="rgb(255,255,255)";
        document.getElementById("colorSchemePickerIndicator").style.backgroundColor="rgb(255,255,255)";
        $("#colorSchemeModal").modal('hide');
        return false;
    },
    'click .cancel-color-scheme': function() {
        // reset the form
        removeColor = null;
        insertAfterColor = null;
        newColor = null;
        document.getElementById("removeColor").value = "";
        document.getElementById("insertAfterColor").value = "";
        document.getElementById("colorSchemePicker").color="rgb(255,255,255)";
        document.getElementById("colorSchemePicker").value="rgb(255,255,255)";
        document.getElementById("colorSchemePickerIndicator").style.backgroundColor="rgb(255,255,255)";
    }
});


