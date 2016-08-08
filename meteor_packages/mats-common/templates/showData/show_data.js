Template.showData.helpers({
    title:function() {
        return "Data";
    },
    data:function() {
        //var d = Session.get("data");
        var d = {x:{1:[1,2,4,5,3,7], 2:[4,5,2,7,6]},y:{1:[1,2,3,4,5,6,4,5,3,2],2:[3,2,4,5,6,7,4,5]}};
        var s = JSON.stringify(d, null, 4).toString();
        return s;
    }
});

