import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common'
Template.textInput.helpers({
    defaultTextInput: function() {
        if (this.name == 'label') {   // labels are handled specially
            var label;
            var input = document.getElementById('label-textInput');
            var value = document.getElementById('controlButton-label-value');
            if (input && value) {
                if (label !== input.value || label != value.textContent) {
                    if (!Session.get('NextCurveLabel')) {
                        label = matsCurveUtils.getNextCurveLabel();
                    } else {
                        label = Session.get('NextCurveLabel');
                    }
                    input.value = label;
                    value.textContent = label;
                    return label;
                }
            } else {
                // must be initialization
                label = matsCurveUtils.getNextCurveLabel();
            return label;
            }
        } else {
            return this.default;
        }
    }
});

