/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsPlotUtils} from 'meteor/randyp:mats-common';

Template.info.helpers({
   infoMessage: function() {
       return getInfo();
   }
});

Template.info.events({
    'click .clear-info': function() {
        clearInfo();
        matsPlotUtils.enableActionButtons();
        return false;
    }
});