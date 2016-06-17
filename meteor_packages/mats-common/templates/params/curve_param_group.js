filterParams = function(params) {
/*
If the plottype is a 2d scatter plot we need to basically create a new set of parameters (except for the label)
for each axis. The double set of parameters will get sent back to the backend.
 */
    if (getPlotType() === PlotTypes.scatter2d) {
        var xparams = [];
        var yparams = [];
        var newParams = [];
        for (var i = 0; i < params.length;i++) {
            if (params[i].name === 'label') {
                newParams.push(params[i]);
            } else {
                    var xp = {};
                    xp = $.extend(xp, params[i]);
                    xp.name = "xaxis-" + params[i].name;
                    xparams.push(xp);
                    var yp = {};
                    yp = $.extend(yp, params[i]);
                    yp.name = "yaxis-" + params[i].name;
                    yparams.push(yp);
            }
        }
         newParams = newParams.concat(xparams);
         newParams = newParams.concat(yparams);
         return newParams;
    } else {
        return params;
    }
};

Template.curveParamGroup.helpers({
    CurveParams: function (num) {
            var lastUpdate = Session.get('lastUpdate');
            var params = CurveParams.find({displayGroup:num},{sort:["displayOrder", "asc"]}).fetch();
            params = filterParams(params);
            return params;
        },
    displayGroup: function() {
        return "block";
    },
    log: function() {
        console.log(this);
    }
});