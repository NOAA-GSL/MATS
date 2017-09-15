Template.topNav.events({
    'click .matshome' : function(event) {
        event.preventDefault();
        var matsref = Session.get("app").matsref;
        window.location.replace(matsref);
        return false;
    },
    'click .about' : function() {
        $("#modal-display-about").modal();
        return false;
    }
});