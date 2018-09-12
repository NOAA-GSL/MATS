
Template.topNav.events({
    'click .matshome' : function(event) {
        event.preventDefault();
        var appref = Session.get("app").appref;
        var homeref = appref.substring(0, appref.lastIndexOf("/"));
        window.location.replace(homeref);
        return false;
    },
    'click .about' : function() {
        $("#modal-display-about").modal();
        return false;
    }
});