Template.paramList.helpers({
    CurveParamGroups: function() {
        var lastUpdate = Session.get('lastUpdate');
        var groupNums = [];
        var params = CurveParams.find({}).fetch();
        params = filterParams(params);
        for (var i = 0; i < params.length; i++) {
            groupNums.push(params[i].displayGroup);
        }
        var res = _.uniq(groupNums).sort();
        return res;
    },
    isEdit: function() {
        return Session.get('editMode') != '';
    },
    editMode: function() {
        if (Session.get('editMode') === '') {
            return '';
        } else {
            return "Changing " + Session.get('editMode');
        }
    },
    log: function() {
        console.log(this);
    }
});

Template.paramList.events({
    'click .edit-cancel': function() {
        Session.set('editMode','');
        var labelId = 'label-' + InputTypes.textInput;
        var label = document.getElementById(labelId);
        label.disabled = false;
    },
    'click .reset': function(event,template) {
        //location.reload();
        event.preventDefault();
        var view = document.getElementById('paramList');
        Blaze.remove(Blaze.getView(view));
        Blaze.render(Template.paramList,document.getElementById('paramView'));
    },

    // restore settings
    'click .restore-settings': function(event) {
        event.preventDefault();
        document.getElementById("restore-settings").click();
        return false;
    },
    // add curve
    'submit form': function (event, template) {
        event.preventDefault();
            var curves = Session.get('Curves');
            var p = {};
            var elems = event.target.valueOf().elements;
            var curveParams = CurveParams.find({}, {fields: {name: 1}}).fetch();
            var curveNames = _.pluck(curveParams, "name");
            if (getPlotType() === PlotTypes.scatter2d) {
                var scatterCurveNames = [];
                for (var i=0; i<curveNames.length;i++) {
                    scatterCurveNames.push(curveNames[i]);
                    scatterCurveNames.push("xaxis-" + curveNames[i]);
                    scatterCurveNames.push("yaxis-" + curveNames[i]);
                }
                curveNames = scatterCurveNames;
            }
            var param_elems = _.filter(elems, function (elem) {
                return _.contains(curveNames, elem.name);
            });
            var l = param_elems.length;

            if (Session.get('editMode')) {
                Session.set('editMode', '');
                var labelId = 'label-' + InputTypes.textInput;
                var label = document.getElementById(labelId);
                label.disabled = false;

                for (var i = 0; i < l; i++) {
                    if (param_elems[i].type === "radio") {
                        p[param_elems[i].name] = $('input[name="' + param_elems[i].name + '"]:checked').val();
                    } else if (param_elems[i].type === "button") {
                        p[param_elems[i].id] = param_elems[i].value;
                    } else {
                        p[param_elems[i].name] = (param_elems[i]).value;
                    }
                }
                var index = -1;
                for (var i = 0; i < curves.length; i++) {
                    if (curves[i].label === p.label) {
                        index = i;
                        p.color = curves[i].color;
                    }
                }
                if (index != -1) {
                    curves[index] = p;
                }
            } else {
                for (var i = 0; i < l; i++) {
                    if (param_elems[i].type === "radio") {
                        p[param_elems[i].name] = $('input[name="' + param_elems[i].name + '"]:checked').val();
                    } else if (param_elems[i].type === "button") {
                        p[param_elems[i].id] = param_elems[i].value;
                    } else {
                        p[param_elems[i].name] = (param_elems[i]).value;
                    }
                    if (param_elems[i].name === 'label') {
                        if (_.indexOf(getUsedLabels(), (param_elems[i]).value) != -1) {
                            setError('labels need to be unique - change ' + (param_elems[i]).value + " to something else");
                            return false;
                        }
                    }
                }
                p.color = getNextCurveColor();
                curves.push(p);
                var elem = document.getElementById("curveList");
                elem.style.display = "block";
            }

            document.getElementById("controlButton-label-value").textContent = "";
            Session.set('Curves', curves);
            setUsedColorsAndLabels(); // we have used a color and label so we have to set the next one
            checkDiffs();
        return false;
    }

});

Template.paramList.onRendered(function(){
    Session.set('displayPriority', 1);
    Session.set('editMode', '');
});