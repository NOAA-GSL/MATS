import { matsCollections } from 'meteor/randyp:mats-common';

Template.version.helpers({
    version: function() {
       return matsCollections.Settings.findOne().version;
    }
});