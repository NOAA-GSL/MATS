import { matsCurveUtils } from 'meteor/randyp:mats-common';
Template.textInput.helpers({
    defaultLabel: function() {
        if (Session.get('NextCurveLabel') === undefined) {
            Session.set('NextCurveLabel',matsCurveUtils.getNextCurveLabel());
        }
        return Session.get('NextCurveLabel');
    }
});

