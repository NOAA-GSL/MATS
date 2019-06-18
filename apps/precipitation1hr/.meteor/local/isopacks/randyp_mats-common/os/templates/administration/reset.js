/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsMethods } from 'meteor/randyp:mats-common';

Template.reset.events({
    'click .apply_reset': function () {
        const settings = matsCollections.Settings.findOne({});
        if (settings === undefined) {
            setError(new Error("reset failed - cannot readsettings"));
            return;
        }
        const appName = settings.Title;
        const appVersion = settings.version;
        matsMethods.reset.call({appName:appName, appVersion:appVersion},function(error){
            if (error) {
                setError(new Error("matsMethods.reset from reset.js " +error.message));
            }
        });
        $("#resetModal").modal('hide');
        return false;
    }
});


