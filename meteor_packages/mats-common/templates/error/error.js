Template.error.helpers({
   errorMessage: function() {
       return getError();
   }
});

Template.error.events({
    'click .clear-error': function() {
        clearError();
        return false;
    }
});