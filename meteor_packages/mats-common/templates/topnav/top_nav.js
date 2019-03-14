
Template.topNav.events({
    'click .matshome' : function(event) {
        event.preventDefault();
        var homeref = document.referrer;
        if (homeref === "" || homeref === undefined) {
            var appref = Session.get("app").appref;
            homeref = appref.substring(0, appref.lastIndexOf("/"));
        }
        window.location.replace(homeref);
        return false;
    },
    'click .about' : function() {
        $("#modal-display-about").modal();
        return false;
    }
});