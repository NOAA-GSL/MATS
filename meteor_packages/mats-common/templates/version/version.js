/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

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