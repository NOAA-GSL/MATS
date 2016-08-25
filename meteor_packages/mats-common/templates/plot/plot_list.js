Template.plotList.helpers({
    Title: function() {
       return Settings.findOne({},{fields:{Title:1}}).Title;
    } ,
    PlotParamGroups: function () {
        var groupNums = [];
        var params = CurveParams.find({},{fields:{displayGroup:1}}).fetch();
        for (var i = 0; i < params.length; i++) {
            groupNums.push(params[i].displayGroup);
        }
        var res = _.uniq(groupNums).sort();
        return res;
    },
    curves: function () {
        return Session.get('Curves');
    },
    privateRestoreNames: function() {
        var names = [];
        var l = CurveSettings.find({},{fields:{name:1,owner:1,permission:1}}).fetch();
        for (var i = 0; i < l.length; i++) {
            if (l[i].owner === Meteor.userId() && l[i].permission === "private") {
                names.push(l[i].name);
            }
        }
        return names;
    },
    publicRestoreNames: function() {
        var names = [];
        var l = CurveSettings.find({},{fields:{name:1,owner:1,permission:1}}).fetch();
        for (var i = 0; i < l.length; i++) {
            if (l[i].permission === "public") {
                names.push(l[i].name);
            }
        }
        return names;
    },
    isOwner: function() {
        return  this.owner === Meteor.userId();
    }
});

Template.plotList.events({
    'click .cancel-restore' : function() {
        document.getElementById('restore_from_public').value = "";
        document.getElementById('restore_from_private').value = "";
    },
    'click .cancel-save' : function() {
        document.getElementById('save_as').value = "";
        document.getElementById('save_to').value = "";
    },
    'click .delete-selected' : function() {
        var deleteThis = document.getElementById('save_to').value;
        if (deleteThis !== undefined && deleteThis !== "") {
            Meteor.call('deleteSetting',deleteThis, function(error){
                if (error) {
                    setError(error.message);
                }
            });
        }
    },

    // catch a click on a diff plotFormat radio button.
    'click .data-input' : function() {
        var formats = Object.keys(PlotFormats);
        if ($.inArray(this.toString(),formats) !== -1) {
                checkDiffs();
        }
    },
    'click .restore-from-private' : function() {
        document.getElementById('restore_from_public').value = "";
    },
    'click .restore-from-public' : function() {
        document.getElementById('restore_from_private').value = "";
    },
    'click .submit-params': function (event, template) {
        var plotAction = Session.get('plotParameter');
        Session.set("spinner_img", "building_spinner.gif");
        document.getElementById("spinner").style.display="block";
        event.preventDefault();
        var action = event.currentTarget.name;
        var p = {};
        var curves = Session.get('Curves');
        if (curves == 0 && action !== "restore") {
            //alert ("No Curves To plot");
            setError("There are no curves to plot!");
            Session.set("spinner_img", "building_spinner.gif");
            document.getElementById("spinner").style.display="none";
            return false;
        }
        p.curves = [];
        p.plotAction = plotAction;
        curves.forEach(function(curve){p.curves.push(curve)});
        PlotParams.find({}).fetch().forEach(function(plotParam){
            var name = plotParam.name;
            var type = plotParam.type;
            var options = plotParam.options;

            if (type == InputTypes.radioGroup) {
                for (var i=0; i<options.length; i++) {
                    if (document.getElementById(name+"-" + type + "-" + options[i]).checked == true) {
                        p[name] = options[i];
                        break;
                    }
                }
            } else if (type == InputTypes.checkBoxGroup) {
                p[name] = [];
                for (var i = 0; i < options.length; i++) {
                    if (document.getElementById(name + "-" + type + "-" + options[i]).checked) {
                        p[name].push(options[i]);
                    }
                }
            } else if (type == InputTypes.dateRange) {
                p[name] = document.getElementById(name + '-' + type).value;
            } else if (type == InputTypes.numberSpinner) {
                p[name] = document.getElementById(name + '-' + type).value;
            } else if (type == InputTypes.select) {
                p[name] = document.getElementById(name + '-' + type).value;
            } else if (type == InputTypes.textInput) {
                p[name] = document.getElementById(name + '-' + type).value;
            }
        });
        Session.set("PlotParams", p);

        switch (action) {
            case "save":
                if (!Meteor.user()) {
                    setError("You must be logged in to use the 'save' feature");
                    Session.set("spinner_img", "building_spinner.gif");
                    document.getElementById("spinner").style.display="none";
                    return false;
                }
                if ((document.getElementById('save_as').value === "" ||
                    document.getElementById('save_as').value === undefined) &&
                    (document.getElementById('save_to').value === "" ||
                    document.getElementById('save_to').value === undefined)) {
                    $("#saveModal").modal('show');
                    Session.set("spinner_img", "building_spinner.gif");
                    document.getElementById("spinner").style.display="none";
                    return false;
                }
                var saveAs = "";
                if (document.getElementById('save_as').value !== "" &&
                    document.getElementById('save_as').value !== undefined) {
                    saveAs = document.getElementById('save_as').value;
                } else {
                    saveAs = document.getElementById('save_to').value;
                }
                var permission = document.getElementById("save-public").checked == true?"public":"private";
                //console.log("saving settings to " + saveAs);
                Session.set('plotName', saveAs);
                // get the settings to save out of the session
                p = Session.get("PlotParams");
                Meteor.call('saveSettings',saveAs, p, permission, function(error){
                    if (error) {
                        setError(error.message);
                    }
                });

                document.getElementById('save_as').value = "";
                document.getElementById('save_to').value = "";
                $("#saveModal").modal('hide');
                Session.set("spinner_img", "building_spinner.gif");
                document.getElementById("spinner").style.display="none";
                return false;
                break;
            case "restore":
                if (((document.getElementById('restore_from_private').value === "" ||
                      document.getElementById('restore_from_private').value === undefined)) &&
                    ((document.getElementById('restore_from_public').value === "" ||
                      document.getElementById('restore_from_public').value === undefined))){
                    $("#restoreModal").modal('show');
                    Session.set("spinner_img", "building_spinner.gif");
                    document.getElementById("spinner").style.display="none";
                    return false;
                }
                var restoreFrom = document.getElementById('restore_from_private').value;
                if (restoreFrom === "" || restoreFrom === undefined) {
                    restoreFrom = document.getElementById('restore_from_public').value;
                }
                //console.log("restore settings from " + restoreFrom);
                Session.set('plotName', restoreFrom);

                p = CurveSettings.findOne({name:restoreFrom});
                // now set all the curves....
                Session.set('Curves',p.data.curves);
                // reset all the curve params....
                var view = document.getElementById('paramList');
                Blaze.remove(Blaze.getView(view));
                Blaze.render(Template.paramList,document.getElementById('paramView'));

                // now set the PlotParams
                PlotParams.find({}).fetch().forEach(function(plotParam){
                    var name = plotParam.name;
                    var type = plotParam.type;
                    var options = plotParam.options;

                    if (type == InputTypes.dateRange) {
                        document.getElementById(name + '-' + type).value = p.data;
                    } else if (type == InputTypes.radioGroup) {
                        for (var i = 0; i < options.length; i++) {
                            if (options[i] === p.data[name]) {
                                document.getElementById(name + "-" + type + "-" + options[i]).checked = true;
                                break;
                            }
                        }
                    } else if (type == InputTypes.checkBoxGroup) {
                        for (var i = 0; i < options.length; i++) {
                            if (_.contains(p.data[name],options[i])) {
                                document.getElementById(name + "-" + type + "-" + options[i]).checked = true;
                                break;
                            }
                        }
                    } else if (type === InputTypes.numberSpinner || type === InputTypes.select || type === InputTypes.textInput) {
                        document.getElementById(name + '-' + type).value = p.data[name];
                    }
                });
                // reset the plotParams
                Session.set("PlotParams", p);
                //set the used defaults so that subsequent adds get a corre default
                setUsedColorsAndLabels();
                document.getElementById('restore_from_public').value = "";
                document.getElementById('restore_from_private').value = "";
                $("#restoreModal").modal('hide');
                Session.set("spinner_img", "building_spinner.gif");
                document.getElementById("spinner").style.display="none";
                return false;
                break;
            case "plot":
            default:
                var plotType = getPlotType();
                var plotGraphFunction = PlotGraphFunctions.findOne({plotType: plotType});
                if (plotGraphFunction === undefined) {
                    setError("do not have a plotGraphFunction for this plotType: " + plotType);
                    Session.set("spinner_img", "building_spinner.gif");
                    document.getElementById("spinner").style.display="none";
                    return false;
                }
                var graphFunction = plotGraphFunction.graphFunction;

                Meteor.call('getGraphData', p, plotType, function (error, result) {
                    //    //console.log ('result is : ' + JSON.stringify(result, null, '\t'));
                    if (error !== undefined) {
                        setError(error.toLocaleString());
                        Session.set("spinner_img", "building_spinner.gif");
                        document.getElementById("spinner").style.display="none";
                        return false;
                    }
                    if (result.error !== undefined && result.error !== "") {
                        setError(result.error);
                        Session.set("spinner_img", "building_spinner.gif");
                        document.getElementById("spinner").style.display="none";
                        return false;
                    }
                    document.getElementById('graph-container').style.display = 'block';
                    document.getElementById('plotType').style.display = 'none';
                    document.getElementById('paramList').style.display = 'none';
                    document.getElementById('plotList').style.display = 'none';
                    document.getElementById('curveList').style.display = 'none';
                    PlotResult = jQuery.extend(true,{}, result);
                    Session.set ('PlotResultsUpDated', new Date());
                    Session.set('graphFunction', graphFunction);
                    eval (graphFunction)(result, Session.get('Curves'));
                    document.getElementById("plotType").style.display = "none";
                    document.getElementById("scatter2d").style.display = "none";
                    document.getElementById("plotButton").style.display = "none";
                    document.getElementById("textButton").style.display = "block";
                    document.getElementById("plot-buttons-grp").style.display = "block";
                    document.getElementById("curves").style.display = "block";
                    document.getElementById("graphView").style.display = "block";
                    document.getElementById("textSeriesView").style.display = "none";
                    document.getElementById("textProfileView").style.display = "none";
                });
                break;
        }
        return false;
    }
});