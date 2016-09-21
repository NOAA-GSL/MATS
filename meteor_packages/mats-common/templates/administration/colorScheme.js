import { Meteor } from 'meteor/meteor';
import {matsCollections} from 'meteor/randyp:mats-common';

Template.colorScheme.helpers({
    colorOptions : function() {
        var colorScheme = matsCollections.ColorScheme.findOne({});
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
        var colors = matsCollections.ColorScheme.findOne({}).colors;
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
        }
        if (removeColor) {
            Meteor.call('removeColor', removeColor, function (error) {
                if (error) {
                    setError(error.message);
                }
            });
        }
        // reset modal
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
        document.getElementById("removeColor").value = null;
        document.getElementById("removeColor").value = "";
        document.getElementById("insertAfterColor").value = "";
        document.getElementById("colorSchemePicker").color="rgb(255,255,255)";
        document.getElementById("colorSchemePicker").value="rgb(255,255,255)";
        document.getElementById("colorSchemePickerIndicator").style.backgroundColor="rgb(255,255,255)";
    }
});


