Template.spinner.helpers({
    image: function () {
        var img = Session.get("spinner_img");
        if (img == undefined) {
            img = "building_spinner.gif";
            Session.set("spinner_img", "building_spinner.gif");
        }
        return img;
    }
});