import { matsCollections } from 'meteor/randyp:mats-common';

Template.version.helpers({
    version: function() {
        if (matsCollections.Settings.findOne()) {
            var versions = JSON.parse(matsCollections.Settings.findOne().version);
            return "development: " + versions.development + "," + " production: " + versions.production;
        } else {
            return "unknown";
        }
    }
});