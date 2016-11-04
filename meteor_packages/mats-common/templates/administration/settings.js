import { Meteor } from 'meteor/meteor';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';
Template.settings.helpers({
    LabelPrefix: function(){
        var settings = matsCollections.Settings.findOne({});
        return settings === undefined ? "" : settings.LabelPrefix;
    },
    Title: function(){
        var settings = matsCollections.Settings.findOne({});
        return settings === undefined ? "" : settings.Title;
    },
    LineWidth: function(){
        var settings = matsCollections.Settings.findOne({});
        return settings === undefined ? "" : settings.LineWidth;
    },
    NullFillString: function(){
        var settings = matsCollections.Settings.findOne({});
        return settings === undefined ? "" : settings.NullFillString;
    },
    ResetFromCodeChecked: function(){
        var settings = matsCollections.Settings.findOne({});
        if (settings && settings.resetFromCode == true) {
            return "checked";
        } else {
            return "";
        }
    }
});
Template.settings.events({
    'click .apply_settings': function () {
        var labelPrefix = document.getElementById("LabelPrefix").value;
        var title = document.getElementById("Title").value;
        var lineWidth = document.getElementById("LineWidth").value;
        var nullFillString = document.getElementById("NullFillString").value;
        var resetFromCode = document.getElementById("ResetFromCode").checked;

        var settings = {};
        settings.labelPrefix = labelPrefix;
        settings.title = title;
        settings.lineWidth = lineWidth;
        settings.nullFillString = nullFillString;
        settings.resetFromCode = resetFromCode;
        matsMethods.setSettings.call({'settings':settings}, function (error) {
            if (error) {
                setError(error.message);
            }
        });
        //// reset modal
        //document.getElementById("LabelPrefix").value = "";
        //document.getElementById("Title").value = "";
        //document.getElementById("LineWidth").value = "";
        //document.getElementById("NullFillString").value = "";
        //document.getElementById("ResetFromCode").checked = false;
        $("#settingsModal").modal('hide');
        Session.set("adminChanged", new Date());
        return false;
    },
    'click .cancel-settings': function() {
        // reset the form
        document.getElementById("LabelPrefix").value = "";
        document.getElementById("Title").value = "";
        document.getElementById("LineWidth").value = "";
        document.getElementById("NullFillString").value = "";
        document.getElementById("ResetFromCode").checked = false;
    }
});


