Template.error.helpers({
   errorMessage: function() {
       return getError();
   },
    stackTrace: function() {
       return getStack();
    }
});

Template.error.events({
    'click .clear-error': function() {
        clearError();
        document.getElementById('stack').style.display = "none";
        return false;
    },
    'click .show-stack': function() {
        document.getElementById('stack').style.display = "block";
    },
    'click .hide-stack': function() {
        document.getElementById('stack').style.display = "none";
    }
});