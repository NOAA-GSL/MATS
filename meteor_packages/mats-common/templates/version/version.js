import { matsCollections } from 'meteor/randyp:mats-common';

Template.version.helpers({
    version: function() {
        if (matsCollections.Settings.findOne()) {
            return matsCollections.Settings.findOne().version;
        } else {
            return "unknown";
        }
    }
});