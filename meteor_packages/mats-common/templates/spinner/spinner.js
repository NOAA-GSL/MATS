Template.spinner.helpers({
    image: function () {
        var img = Session.get("spinner_img");
        if (img == undefined) {
            img = "spinner.gif";
            Session.set("spinner_img", "spinner.gif");
        }
        return img;
    }
});


Template.spinner.events({
    'click .cancel': function () {
        document.getElementById("spinner").style.display = "none";
    }
});