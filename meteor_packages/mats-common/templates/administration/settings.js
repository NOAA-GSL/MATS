Template.settings.helpers({
    LabelPrefix: function(){
        var settings = Settings.findOne({});
        return settings === undefined ? "" : settings.LabelPrefix;
    },
    Title: function(){
        var settings = Settings.findOne({});
        return settings === undefined ? "" : settings.Title;
    },
    LineWidth: function(){
        var settings = Settings.findOne({});
        return settings === undefined ? "" : settings.LineWidth;
    },
    NullFillString: function(){
        var settings = Settings.findOne({});
        return settings === undefined ? "" : settings.NullFillString;
    },
    ResetFromCode: function(){
        var settings = Settings.findOne({});
        return settings === undefined ? "" : settings.resetFromCode;
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
        Meteor.call('setSettings', settings, function (error) {
            if (error) {
                setError(error.message);
            }
        });
        // reset modal
        document.getElementById("LabelPrefix").value = "";
        document.getElementById("Title").value = "";
        document.getElementById("LineWidth").value = "";
        document.getElementById("NullFillString").value = "";
        document.getElementById("ResetFromCode").value = "";
        $("#settingsModal").modal('hide');
        return false;
    },
    'click .cancel-settings': function() {
        // reset the form
        document.getElementById("LabelPrefix").value = "";
        document.getElementById("Title").value = "";
        document.getElementById("LineWidth").value = "";
        document.getElementById("NullFillString").value = "";
        document.getElementById("ResetFromCode").value = "";
    }
});


