import { matsCollections } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import { plotParamHandler } from 'meteor/randyp:mats-common';
Template.QCParamGroup.helpers({
    completenessNumber: function () {
        var appName = matsParamUtils.getAppName();
        if (appName === 'anomalycor' || appName.startsWith('met-')) {
            return '0';
        } else {
            return '75';
        }
    },
    noQC: function () {
        var appName = matsParamUtils.getAppName();
        return appName === 'anomalycor' || appName.startsWith('met-')
    }
});

Template.QCParamGroup.events({

});