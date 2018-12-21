import { matsCollections } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { plotParamHandler } from 'meteor/randyp:mats-common';

Template.QCParamGroup.helpers({
    completenessNumber: function () {
        var appType = matsCollections.Settings.findOne({}).appType;
        if (appType === 'anomalycor' || appType === matsTypes.AppTypes.metexpress) {
            return '0';
        } else {
            return '75';
        }
    },
    noQC: function () {
        var appType = matsCollections.Settings.findOne({}).appType;
        return appName === 'anomalycor' || appType === matsTypes.AppTypes.metexpress
    }
});

Template.QCParamGroup.events({

});