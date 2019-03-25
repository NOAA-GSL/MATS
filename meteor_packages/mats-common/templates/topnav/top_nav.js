
Template.topNav.events({
    'click .matshome' : function(event) {
        event.preventDefault();
        var homeref = document.referrer;
        if (homeref === "" || homeref === undefined) {
            var r = document.loaction.href;
            homeref = r.split("://")[0] + "://" + r.split("://")[1].split(".").splice(1,10).join(".")
        }
        window.location.replace(homeref);
        return false;
    },
    'click .about' : function() {
        $("#modal-display-about").modal();
        return false;
    }
});