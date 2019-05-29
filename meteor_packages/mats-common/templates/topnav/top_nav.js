
/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

Template.topNav.events({
    'click .matshome' : function(event) {
        event.preventDefault();
        var homeref = document.referrer;
        if (typeof Meteor.settings.public !== "undefined" && typeof Meteor.settings.public.home != "undefined") {
            homeref = Meteor.settings.public.home;
        } else {
            if (homeref === "" || typeof homeref === "undefined") {
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
                }
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
