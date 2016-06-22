Template.scatter2d.helpers({
    title: function() {
        return "2d Scatter Plot Axis Selection"
    },
    scatter2dParams: function () {
        var params = Scatter2dParams.find({}).fetch();
        return params;
    },
    scatter2dOptions: function() {
        var options = this.options;
        return options;
    },
    name: function(param) {
        //console.log("name: " + param.name);
        return param.name;
    },
    default: function(param) {
        //console.log("default: " + param.default);
        return param.default;
    },
    type: function(param) {
        //console.log("type: " + param.type);
        return param.type;
    },
    id: function(param) {
        //console.log("type: " + param.type);
        return param.name + "-" + param.type;
    },
    plotType : function() {
      return PlotTypes.scatter2d;  
    },
    isDefault: function (param) {
        var def = param.default;
        if (def == this) {
            return "checked";
        } else {
            return "";
        }
    },
    displayScatter2d: function() {
        if (getPlotType() == PlotTypes.scatter2d) {
            return "block";
        } else {
            return "none";
        }
    },
    log: function() {
        console.log(this);
    }
});

Template.scatter2d.events({
    'click .apply-params-to-axis': function(event) {
        var axis = document.querySelector('input[name="scatter2d"]:checked').value;
        var elems = document.getElementsByClassName("data-input");
        var curveParams = CurveParams.find({}, {fields: {name: 1}}).fetch();
        var curveNames = _.pluck(curveParams, "name");
        var param_elems = _.filter(elems, function (elem) {
            return _.contains(curveNames, elem.name);
        });
        var l = param_elems.length;
        for (var i = 0; i < l; i++) {
            var pelem = param_elems[i];
            var elem_id = pelem.id;
            var target_id = axis + "-" + elem_id;
            var telem = document.getElementById(target_id);
            if (pelem.type === "radio") {
                // NOT SURE THIS IS RIGHT
                //console.log(pelem.name + " is " + $('input[name="' + pelem.name + '"]:checked').val());
                $('input[name="' + telem.name + '"]:checked');
            } else if (pelem.type === "button") {
                telem.value = pelem.value;
            } else {
                telem.value = pelem.value;
            }

        }
    },
    'change .radio-group' : function(event) {
        var newAxis = event.currentTarget.value;
        var elems = document.getElementsByClassName("data-input");
        var axis_elems = _.filter(elems, function (elem) {
            return elem.name.indexOf(newAxis) > -1;
        });
        var l = axis_elems.length;
        for (var i = 0; i < l; i++) {
            var aelem = axis_elems[i];
            var aelem_id = aelem.id;
            // remove the axis part at the front
            var target_id = aelem_id.substring(newAxis.length+1,aelem_id.length);
            var telem = document.getElementById(target_id);
            if (aelem.type === "radio") {
                // NOT SURE THIS IS RIGHT
                //console.log(pelem.name + " is " + $('input[name="' + pelem.name + '"]:checked').val());
                $('input[name="' + telem.name + '"]:checked');
            } else if (aelem.type === "button") {
                telem.value = aelem.value;
            } else {
                telem.value = aelem.value;
            }
        }
    }
});
