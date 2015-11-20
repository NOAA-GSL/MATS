Template.plotParamGroup.helpers({
    PlotParams: function (num) {
            var params = PlotParams.find({displayGroup:num},{sort:["displayOrder", "asc"]}).fetch();
            return params;
        },
    displayGroup: function() {
        return "block";
    },
    log: function() {
        console.log(this);
    }
});