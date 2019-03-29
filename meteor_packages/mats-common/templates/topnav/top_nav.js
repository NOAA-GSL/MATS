
Template.topNav.events({
    'click .matshome' : function(event) {
        event.preventDefault();
        var homeref = document.referrer;
        if (homeref === "" || homeref === undefined) {
            var r = document.location.href;
            var rparts = r.split(":");
            if (rparts.length >= 2) {
                // has a port - remove the port part
                rparts.pop
                homeref = rparts.join(":");
            } else {
                // doesn't have a port - strip the appreference
                var appref = Session.get("app").appref;
                homeref = appref.substring(0, appref.lastIndexOf("/"));
//                homeref = r.split("://")[0] + "://" + r.split("://")[1].split(".").splice(1, 10).join(".")
            }
        }
        window.location.replace(homeref);
        return false;
    },
    'click .about' : function() {
        $("#modal-display-about").modal();
        return false;
    }
});