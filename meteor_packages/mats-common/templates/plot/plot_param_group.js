/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsCollections } from 'meteor/randyp:mats-common';
import { plotParamHandler } from 'meteor/randyp:mats-common';
Template.plotParamGroup.helpers({
    PlotParams: function (num) {
            var params = matsCollections.PlotParams.find({displayGroup:num},{sort:["displayOrder", "asc"]}).fetch();
            return params;
        },
    displayGroup: function() {
        return "block";
    },
    log: function() {
        console.log(this);
    }
});

Template.plotParamGroup.events({
    'click': function(event) {
        if (plotParamHandler !== undefined) {
            plotParamHandler (event);  // call app specific handler with event.
        }
    }
});