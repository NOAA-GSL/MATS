import { matsCurveUtils } from 'meteor/randyp:mats-common';
Template.textInput.helpers({
    defaultLabel: function() {
        return Session.get('NextCurveLabel');
    }
});

