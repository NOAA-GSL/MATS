Template.textInput.helpers({
    defaultLabel: function() {
        if (Session.get('NextCurveLabel') === undefined) {
            Session.set('NextCurveLabel',getNextCurveLabel());
        }
        return Session.get('NextCurveLabel');
    }
});

