Template.info.helpers({
   infoMessage: function() {
       return getInfo();
   }
});

Template.info.events({
    'click .clear-info': function() {
        clearInfo();
        return false;
    }
});