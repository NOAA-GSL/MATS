import { Meteor } from 'meteor/meteor';


Template.reset.events({
    'click .apply_reset': function () {
        Meteor.call('reset', function (error) {
            if (error) {
                setError(error.message);
            }
        });
        $("#resetModal").modal('hide');
        return false;
    }
});


