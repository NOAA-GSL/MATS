/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';

Template.footer.helpers({
    isMetexpress: function () {
       const appType = matsCollections.Settings.findOne({}).appType;
       return appType === matsTypes.AppTypes.metexpress;
    }
});
