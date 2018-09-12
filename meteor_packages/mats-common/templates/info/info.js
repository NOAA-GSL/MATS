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