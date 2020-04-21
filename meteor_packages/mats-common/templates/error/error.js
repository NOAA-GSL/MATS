/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsPlotUtils} from 'meteor/randyp:mats-common';

Template.error.helpers({
   errorMessage: function() {
       return getError();
   },
    stackTrace: function() {
       return getStack();
    }
});

Template.error.events({
    'click .clear-error': function() {
        clearError();
        document.getElementById('stack').style.display = "none";
        matsPlotUtils.enableActionButtons();
        return false;
    },
    'click .show-stack': function() {
        document.getElementById('stack').style.display = "block";
    },
    'click .hide-stack': function() {
        document.getElementById('stack').style.display = "none";
    }
});