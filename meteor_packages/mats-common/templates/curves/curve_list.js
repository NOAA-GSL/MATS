import {matsTypes} from "meteor/randyp:mats-common";
import {matsCollections} from "meteor/randyp:mats-common";
import {matsMethods} from "meteor/randyp:mats-common";
import {matsCurveUtils} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';

Template.curveList.helpers({
    displayPlotUnMatched: function() {
        // scatter plots can't match
        if (Session.get('plotType') === matsTypes.PlotTypes.scatter2d) {
            return "none";
        }
        // don't allow plotting when editing
        const mode = Session.get("editMode");
        if (mode === undefined || mode === "") {
            return "block";
        } else {
            return "none";
        }
    },
    displayPlotMatched: function() {
        // don't allow plotting when editing
        const mode = Session.get("editMode");
        if (mode === undefined || mode === "") {
            return "block";
        } else {
            return "none";
        }
    },
    curves: function () {
        return Session.get('Curves');
    },
    displayCurves: function () {
        if (Session.get('Curves') === undefined || Session.get('Curves').length === 0) {
            return "none";
        } else {
            return "block";
        }
    },
    log: function () {
        console.log(this);
    },
    averagesdisabled: function () {
        // temporary disable plot match for profiles on wfip2 untill profiles are correctly implemented
        if (Session.get("plotType") === matsTypes.PlotTypes.profile && Session.get("app").appName === "wfip2") {
            return "disabled";
        }
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return "";
        }
        var average = curves[0].average;
        for (var i = 0; i < curves.length; i++) {
            if (average != curves[i].average) {
                return "disabled";
            }
        }
    },
    disabledPlotsHidden: function () {
        var curves = Session.get('Curves');
        if (curves === undefined || curves.length == 0) {
            return "none";
        }
        var average = curves[0].average;
        for (var i = 0; i < curves.length; i++) {
            if (average != curves[i].average) {
                return "block";
            }
        }
        return "none"
    },
    editMode: function() {
        if (Session.get('editMode') === '') {
            return '';
        } else {
            return "Changing " + Session.get('editMode');
        }
    }
});


Template.curveList.events({
    'click .remove-all': function () {
        matsCurveUtils.removeAllCurves();
        Session.set("editMode", "");
        Session.set("paramWellColor","#f5f5f5");  // default grey
        return false;
    },
    'click .plot-curves-unmatched': function (event) {
        document.getElementById("spinner").style.display = "block";
        event.preventDefault();
        // trigger the submit on the plot_list plot_list.js - click .submit-params
        Session.set('plotParameter', matsTypes.PlotActions.unmatched);
        document.getElementById("plot-curves").click();
        return false;
    },
    'click .plot-curves-matched': function (event) {
        document.getElementById("spinner").style.display = "block";
        event.preventDefault();
        // trigger the submit on the plot_list plot_list.js - click .submit-params
        Session.set('plotParameter', matsTypes.PlotActions.matched);
        document.getElementById("plot-curves").click();
        return false;
    },
    'click .save-settings': function (event) {
        event.preventDefault();
        document.getElementById("save-settings").click();
        return false;
    },
    'click .submit-params': function (event, template) {
        event.preventDefault();
        var action = event.currentTarget.name;
        var p = {};
        // get the plot-type elements checked state
        const plotTypeElems = $('input[name=plot-type]');
        p.plotTypes = {};
        for (ptei = 0; ptei < plotTypeElems.length; ptei++){
            const ptElem = plotTypeElems[ptei];
            p.plotTypes[ptElem.value] = ptElem.checked;
        }
        var curves = Session.get('Curves');
        if (curves == 0 && action !== "restore") {
            //alert ("No Curves To plot");
            setError(new Error("There are no curves to plot!"));
            return false;
        }
        p.curves = [];
        curves.forEach(function (curve) {
            p.curves.push(curve)
        });
        matsCollections.PlotParams.find({}).fetch().forEach(function (plotParam) {
            var name = plotParam.name;
            var type = plotParam.type;
            var options = plotParam.options;

            if (type == matsTypes.InputTypes.radioGroup) {
                for (var i = 0; i < options.length; i++) {
                    if (document.getElementById(name + "-" + type + "-" + options[i]).checked == true) {
                        p[name] = options[i];
                        break;
                    }
                }
            } else if (type == matsTypes.InputTypes.checkBoxGroup) {
                p[name] = [];
                for (var i = 0; i < options.length; i++) {
                    if (document.getElementById(name + "-" + type + "-" + options[i]).checked) {
                        p[name].push(options[i]);
                    }
                }
            } else if (type == matsTypes.InputTypes.dateRange) {
                p[name] = matsParamUtils.getValueForParamName(name);
            } else if (type == matsTypes.InputTypes.numberSpinner) {
                p[name] = document.getElementById(name + '-' + type).value;
            } else if (type == matsTypes.InputTypes.select) {
                p[name] = document.getElementById(name + '-' + type).value;
            } else if (type == matsTypes.InputTypes.textInput) {
                p[name] = document.getElementById(name + '-' + type).value;
            }
        });
        Session.set("PlotParams", p);

        switch (action) {
            case "save":
                // if (!!Meteor.user()) {
                //     setError("You must be logged in to use the 'save' feature");
                //     return false;
                // }
                if ((document.getElementById('save_as').value === "" ||
                    document.getElementById('save_as').value === undefined) &&
                    (document.getElementById('save_to').value === "" ||
                    document.getElementById('save_to').value === undefined)) {
                    $("#saveModal").modal('show');
                    return false;
                }
                var saveAs = "";
                if (document.getElementById('save_as').value !== "" &&
                    document.getElementById('save_as').value !== undefined) {
                    saveAs = document.getElementById('save_as').value;
                } else {
                    saveAs = document.getElementById('save_to').value;
                }
                console.log("saving settings to " + saveAs);
                // get the settings to save out of the session
                p = Session.get("PlotParams");
                matsMethods.saveSettings.call( {saveAs:saveAs, p:p},  function(error){
                    if (error) {
                        setError(new Error(error));
                    }
                });
                document.getElementById('save_as').value = "";
                document.getElementById('save_to').value = "";
                $("#saveModal").modal('hide');
                return false;
                break;
            case "restore":
                if (!!Meteor.user()) {
                    setError(new Error("You must be logged in to use the 'restore' feature"));
                }
                if ((document.getElementById('restore_from').value === "" ||
                    document.getElementById('restore_from').value === undefined)) {
                    $("#restoreModal").modal('show');
                    return false;
                }
                var restoreFrom = document.getElementById('restore_from').value;
                console.log("restore settings from " + restoreFrom);
                p = matsCollections.CurveSettings.findOne({name: restoreFrom});
                // now set all the curves....
                Session.set('Curves', p.data.curves);
                ////fix the color selectors
                //for (var ci=0; ci < p.data.curves.length; ci++) {
                //    var label = p.data.curves[ci].label;
                //    var color = p.data.curves[ci].color;
                //    var cl = '.' + label + '-colorpick';
                //    console.log("color set cl: " + cl + " color:" + color);
                //    $(cl).colorpicker('setValue',color);
                //}
                // reset all the curve params....
                var view = document.getElementById('paramList');
                Blaze.remove(Blaze.getView(view));
                Blaze.render(Template.paramList, document.getElementById('paramView'));

                // reset the plotType - have to do this first because the event will remove all the possibly existing curves
                // get the plot-type elements checked state
                var plotTypeSaved = false;
                const plotTypeElems = $('input[name=plot-type]');
                for (var ptei = 0; ptei < plotTypeElems.length; ptei++) {
                    var ptElem = plotTypeElems[ptei];
                    if (p.data.plotTypes && p.data.plotTypes[ptElem.value] === true) {
                        plotTypeSaved = true;
                        ptElem.click();
                    }
                }

                // now set the PlotParams
                matsCollections.PlotParams.find({}).fetch().forEach(function (plotParam) {
                    var name = plotParam.name;
                    var type = plotParam.type;
                    var options = plotParam.options;

                    if (type == matsTypes.InputTypes.dateRange) {
                        matsParamUtils.setValueTextForParamName(p.data);
                    } else if (type == matsTypes.InputTypes.radioGroup) {
                        for (var i = 0; i < options.length; i++) {
                            if (options[i] === p.data[name]) {
                                document.getElementById(name + "-" + type + "-" + options[i]).checked = true;
                                break;
                            }
                        }
                    } else if (type == matsTypes.InputTypes.checkBoxGroup) {
                        for (var i = 0; i < options.length; i++) {
                            if (_.contains(p.data[name], options[i])) {
                                document.getElementById(name + "-" + type + "-" + options[i]).checked = true;
                                break;
                            }
                        }
                    } else if (type === matsTypes.InputTypes.numberSpinner || type === matsTypes.InputTypes.select || type === matsTypes.InputTypes.textInput) {
                        document.getElementById(name + '-' + type).value = p.data[name];
                    }
                });
                // reset the plotParams
                Session.set("PlotParams", p);

                document.getElementById('restore_from').value = "";
                $("#restoreModal").modal('hide');
                return false;
                break;
            case "plot":
            default:
                var plotType = matsPlotUtils.getPlotType();
                var plotGraphFunction = matsCollections.PlotGraphFunctions.findOne({plotType: plotType});
                if (plotGraphFunction === undefined) {
                    setError(new Error("do not have a plotGraphFunction for this plotType: " + plotType));
                    return false;
                }
                var graphFunction = plotGraphFunction.graphFunction;


                matsMethods.getGraphData({p:p, plotType:plotType}, function (error, result) {
                    //    //console.log ('result is : ' + JSON.stringify(result, null, '\t'));
                    if (error !== undefined) {
                        setError(new Error(error.message));
                        return false;
                    }
                    if (result.error !== undefined && result.error !== "") {
                        setError(new Error(result.error));
                        return false;
                    }
                    if (document.getElementById('graph-container')) {
                        document.getElementById('graph-container').style.display = 'block';
                    }
                    if (document.getElementById('plotType')) {
                        document.getElementById('plotType').style.display = 'none';
                    }
                    if (document.getElementById('paramList')) {
                        document.getElementById('paramList').style.display = 'none';
                    }
                    if (document.getElementById('plotList')) {
                        document.getElementById('plotList').style.display = 'none';
                    }
                    if (document.getElementById('curveList')) {
                        document.getElementById('curveList').style.display = 'none';
                    }
                    matsCurveUtils.PlotResult = $.extend(true, {}, result);
                    Session.set('graphFunction', graphFunction);
                    window[graphFunction](result, Session.get('Curves'));
                    if (document.getElementById("plotTypeContainer")) {
                        document.getElementById("plotTypeContainer").style.display="none";
                    }
                    if (document.getElementById("scatterView")) {
                        document.getElementById("scatterView").style.display="none";
                    }
                    if (document.getElementById("scatter2d")) {
                        document.getElementById("scatter2d").style.display = "none";
                    }
                    if (document.getElementById("plotButton")) {
                        document.getElementById("plotButton").style.display = "none";
                    }
                    if (document.getElementById("textButton")) {
                        document.getElementById("textButton").style.display = "block";
                    }
                    if (document.getElementById("plot-buttons-grp")) {
                        document.getElementById("plot-buttons-grp").style.display = "block";
                    }
                    if (document.getElementById("curves")) {
                        document.getElementById("curves").style.display = "block";
                    }
                    if (document.getElementById("graphView")) {
                        document.getElementById("graphView").style.display = "block";
                    }
                    if (document.getElementById("textSeriesView")) {
                        document.getElementById("textSeriesView").style.display = "none";
                    }
                    if (document.getElementById("textProfileView")) {
                        document.getElementById("textProfileView").style.display = "none";
                    }
                });
                break;

        }
        return false;
    }

});