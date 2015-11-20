Template.curveParamGroup.helpers({
    CurveParams: function (num) {
            var lastUpdate = Session.get('lastUpdate');
            var params = CurveParams.find({displayGroup:num},{sort:["displayOrder", "asc"]}).fetch();
            return params;
        },
    displayGroup: function() {
        return "block";
    },
    log: function() {
        console.log(this);
    }
});