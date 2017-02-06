import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common'
Template.textInput.helpers({
    defaultLabel: function() {
        if (this.name == 'label') {
            var label = Session.get('NextCurveLabel');
            return label;
        } else {
            return this.default;
        }
    }
});

