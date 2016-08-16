Template.topNav.events({
    'click .matshome' : function(event) {
        event.preventDefault();
        var matsref = Session.get("app").matsref;
        window.location.replace(matsref);
    }
});