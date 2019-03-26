
Template.topNav.events({
    'click .matshome' : function(event) {
        event.preventDefault();
        var homeref = document.referrer;
        if (homeref === "" || homeref === undefined) {
            var r = document.location.href;
            if (r.split(":").length >= 2) {
                // has a port - don't change it
                homeref = r;
            } else {
                // doesn't have a port - strip the appreference
                homeref = r.split("://")[0] + "://" + r.split("://")[1].split(".").splice(1, 10).join(".")
            }
        }
        console.log("window.location.assign(homeref)");
        window.location.assign(homeref);
        return false;
    },
    'click .about' : function() {
        $("#modal-display-about").modal();
        return false;
    }
});