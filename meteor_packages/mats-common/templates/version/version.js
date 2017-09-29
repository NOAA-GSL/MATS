import { matsCollections } from 'meteor/randyp:mats-common';

Template.version.helpers({
    version: function() {
        if (matsCollections.Settings.findOne()) {
            var settings = matsCollections.Settings.findOne({});
            var version = settings.appVersion;
            return version;
        } else {
            return "unknown";
        }
    }
});