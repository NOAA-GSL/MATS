/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsTypes } from 'meteor/randyp:mats-common'; 
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsMethods } from 'meteor/randyp:mats-common';
import { matsGraphUtils } from 'meteor/randyp:mats-common';
import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import { matsSelectUtils } from 'meteor/randyp:mats-common';

Template.plotList.helpers({
    Title: function() {
       return matsCollections.Settings.findOne({},{fields:{Title:1}}).Title;
    } ,
    PlotParamGroups: function () {
        var groupNums = [];
        var params = matsCollections.PlotParams.find({},{fields:{displayGroup:1}}).fetch();
        for (var i = 0; i < params.length; i++) {
            groupNums.push(params[i].displayGroup);
        }
        var res = _.uniq(groupNums).sort();
        return res;
    },
    curves: function () {
        return Session.get('Curves');
    },
    privateDisabled: function() {
        if (!Meteor.user()) {
            return "disabled";
        } else {
            return "";
        }
    },
    privateRestoreNames: function() {
        var names = [];
        var l = matsCollections.CurveSettings.find({},{fields:{name:1,owner:1,permission:1}}).fetch();
        for (var i = 0; i < l.length; i++) {
            if (l[i].owner === Meteor.userId() && l[i].permission === "private") {
                names.push(l[i].name);
            }
        }
        return names;
    },
    publicRestoreNames: function() {
        var names = [];
        var savedSettings = matsCollections.CurveSettings.find({},{fields:{name:1,owner:1,permission:1}}).fetch();
        for (var i = 0; i < savedSettings.length; i++) {
            if (savedSettings[i].permission === "public") {
                names.push(savedSettings[i].name);
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
            matsMethods.deleteSettings.call({name:deleteThis}, function(error){
                if (error) {
                    setError(new Error(error.message));
                }
            });
        }
    },

    // catch a click on a diff plotFormat radio button.
    'click .data-input' : function() {
        var formats = Object.keys(matsTypes.PlotFormats);
        if ($.inArray(this.toString(),formats) !== -1) {
                matsCurveUtils.checkDiffs();
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
        Session.set("spinner_img", "spinner.gif");
        document.getElementById("spinner").style.display="block";
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
            Session.set("spinner_img", "spinner.gif");
            document.getElementById("spinner").style.display="none";
            return false;
        }
        p.curves = [];
        p.plotAction = plotAction;
        curves.forEach(function(curve){p.curves.push(curve)});
        matsCollections.PlotParams.find({}).fetch().forEach(function(plotParam){
            var name = plotParam.name;
            var type = plotParam.type;
            var options = plotParam.options;

            if (type == matsTypes.InputTypes.radioGroup) {
                for (var i=0; i<options.length; i++) {
                    if (document.getElementById(name+"-" + type + "-" + options[i]).checked == true) {
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
        p['completeness'] = document.getElementById("completeness").value;
        p['outliers'] = document.getElementById("outliers").value;
        p['noGapsCheck'] = document.getElementById("noGapsCheck").checked;
        Session.set("PlotParams", p);

        switch (action) {
            case "save":
                if ((document.getElementById('save_as').value === "" ||
                    document.getElementById('save_as').value === undefined) &&
                    (document.getElementById('save_to').value === "" ||
                    document.getElementById('save_to').value === undefined)) {
                    $("#saveModal").modal('show');
                    Session.set("spinner_img", "spinner.gif");
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
                var paramData = matsParamUtils.getElementValues();
                p['paramData'] = paramData;
                matsMethods.saveSettings.call( {saveAs:saveAs, p:p, permission:permission}, function(error){
                    if (error) {
                        setError(new Error("matsMethods.saveSettings from plot_list.js " +error.message));
                    }
                });

                document.getElementById('save_as').value = "";
                document.getElementById('save_to').value = "";
                $("#saveModal").modal('hide');
                Session.set("spinner_img", "spinner.gif");
                document.getElementById("spinner").style.display="none";
                return false;
                break;
            case "restore":
                matsCurveUtils.clearAllUsed();
                if (((document.getElementById('restore_from_private').value === "" ||
                      document.getElementById('restore_from_private').value === undefined)) &&
                    ((document.getElementById('restore_from_public').value === "" ||
                      document.getElementById('restore_from_public').value === undefined))){
                    $("#restoreModal").modal('show');
                    Session.set("spinner_img", "spinner.gif");
                    document.getElementById("spinner").style.display="none";
                    return false;
                }
                var restoreFrom = document.getElementById('restore_from_private').value;
                if (restoreFrom === "" || restoreFrom === undefined) {
                    restoreFrom = document.getElementById('restore_from_public').value;
                }
                //console.log("restore settings from " + restoreFrom);
                Session.set('plotName', restoreFrom);

                p = matsCollections.CurveSettings.findOne({name:restoreFrom});
                // now set all the curves.... This will refresh the curves list
                Session.set('Curves',p.data.curves);
                // reset the plotType - have to do this first because the event will remove all the possibly existing curves
                // get the plot-type elements checked state
                var plotTypeSaved = false;
                const plotTypeElems = $('input[name=plot-type]');
                for (var ptei = 0; ptei < plotTypeElems.length; ptei++){
                    var ptElem = plotTypeElems[ptei];
                    if (p.data.plotTypes && p.data.plotTypes[ptElem.value] === true) {
                        plotTypeSaved = true;
                        ptElem.checked = true;
                        // We have to set up the display without using click events because that would cause
                        // the restored curves to be removed
                        switch (ptElem.value) {
                            case matsTypes.PlotTypes.timeSeries:
                                matsCurveUtils.showTimeseriesFace();
                                break;
                            case matsTypes.PlotTypes.profile:
                                matsCurveUtils.showProfileFace();
                                break;
                            case matsTypes.PlotTypes.dieoff:
                                matsCurveUtils.showDieOffFace();
                                break;
                            case matsTypes.PlotTypes.threshold:
                                matsCurveUtils.showThresholdFace();
                                break;
                            case matsTypes.PlotTypes.validtime:
                                matsCurveUtils.showValidTimeFace();
                                break;
                            case matsTypes.PlotTypes.gridscale:
                                matsCurveUtils.showGridScaleFace();
                                break;
                            case matsTypes.PlotTypes.dailyModelCycle:
                                matsCurveUtils.showDailyModelCycleFace();
                                break;
                            case matsTypes.PlotTypes.reliability:
                                matsCurveUtils.showReliabilityFace();
                                break;
                            case matsTypes.PlotTypes.roc:
                                matsCurveUtils.showROCFace();
                                break;
                            case matsTypes.PlotTypes.map:
                                matsCurveUtils.showMapFace();
                                break;
                            case matsTypes.PlotTypes.histogram:
                                matsCurveUtils.showHistogramFace();
                                break;
                            case matsTypes.PlotTypes.ensembleHistogram:
                                matsCurveUtils.showEnsembleHistogramFace();
                                break;
                            case matsTypes.PlotTypes.contour:
                            case matsTypes.PlotTypes.contourDiff:
                                matsCurveUtils.showContourFace();
                                break;
                            case matsTypes.PlotTypes.scatter2d:
                                matsCurveUtils.showScatterFace();
                                break;
                        }
                    } else {
                        ptElem.checked = false;
                    }
                }
                if (plotTypeSaved !== true) {
                    // set the default - in the case none was set in an old saved settings
                    document.getElementById("plot-type-" + matsCollections.PlotGraphFunctions.findOne({checked:true}).plotType).checked = true;
                }

                // now set the PlotParams
                var params = matsCollections.PlotParams.find({}).fetch();
                params.forEach(function(plotParam){
                    const val =  p.data.paramData.plotParams[plotParam.name] === null ||
                        p.data.paramData.plotParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : p.data.paramData.plotParams[plotParam.name];
                    matsParamUtils.setInputForParamName(plotParam.name,val);
                });
                
                // reset the form parameters for the superiors first
                params = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : true }}).fetch();
                params.forEach(function(plotParam) {
                    if (plotParam.type === matsTypes.InputTypes.dateRange) {
                        if (p.data.paramData.curveParams[plotParam.name] === undefined) {
                            return;   // just like continue
                        }
                        const dateArr = p.data.paramData.curveParams[plotParam.name].split(' - ');
                        const from = dateArr[0];
                        const to = dateArr[1];
                        const idref = "#" + plotParam.name + "-item";
                        $(idref).data('daterangepicker').setStartDate(moment.utc (from, 'MM-DD-YYYY HH:mm'));
                        $(idref).data('daterangepicker').setEndDate(moment.utc (to, 'MM-DD-YYYY HH:mm'));
                        matsParamUtils.setValueTextForParamName(plotParam.name,p.data.paramData.curveParams[plotParam.name]);
                    } else {
                        const val =  p.data.paramData.curveParams[plotParam.name] === null ||
                            p.data.paramData.curveParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : p.data.paramData.curveParams[plotParam.name];
                        matsParamUtils.setInputForParamName(plotParam.name, val);
                    }
                });

                // now reset the form parameters for the dependents
                params = matsCollections.CurveParams.find({"dependentNames" : { "$exists" : false }}).fetch();
                params.forEach(function(plotParam) {
                    if (plotParam.type === matsTypes.InputTypes.dateRange) {
                        if (p.data.paramData.curveParams[plotParam.name] === undefined) {
                            return;   // just like continue
                        }
                        const dateArr = p.data.paramData.curveParams[plotParam.name].split(' - ');
                        const from = dateArr[0];
                        const to = dateArr[1];
                        const idref = "#" + plotParam.name + "-item";
                        $(idref).data('daterangepicker').setStartDate(moment.utc (from, 'MM-DD-YYYY HH:mm'));
                        $(idref).data('daterangepicker').setEndDate(moment.utc (to, 'MM-DD-YYYY HH:mm'));
                        matsParamUtils.setValueTextForParamName(plotParam.name,p.data.paramData.curveParams[plotParam.name]);
                    } else {
                        const val =  p.data.paramData.curveParams[plotParam.name] === null ||
                            p.data.paramData.curveParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : p.data.paramData.curveParams[plotParam.name];
                        matsParamUtils.setInputForParamName(plotParam.name, val);
                    }
                });

                // reset the scatter parameters
                params = matsCollections.Scatter2dParams.find({}).fetch();
                params.forEach(function(plotParam) {
                    const val =  p.data.paramData.scatterParams[plotParam.name] === null ||
                    p.data.paramData.scatterParams[plotParam.name] === undefined ? matsTypes.InputTypes.unused : p.data.paramData.scatterParams[plotParam.name];
                    matsParamUtils.setInputForParamName(plotParam.name, val);
                });

                // reset the dates
                if (p.data.dates !== undefined) {
                    const dateArr = p.data.dates.split(' - ');
                    const from = dateArr[0];
                    const to = dateArr[1];
                    $('#dates-item').data('daterangepicker').setStartDate(moment.utc (from, 'MM-DD-YYYY HH:mm'));
                    $('#dates-item').data('daterangepicker').setEndDate(moment.utc (to, 'MM-DD-YYYY HH:mm'));
                    matsParamUtils.setValueTextForParamName('dates',p.data.dates);
                }

                // reset the plotFormat

                // reset the plotParams
                Session.set("PlotParams", p);
                //set the used defaults so that subsequent adds get a core default
                matsCurveUtils.setUsedColorsAndLabels();
                document.getElementById('restore_from_public').value = "";
                document.getElementById('restore_from_private').value = "";
                $("#restoreModal").modal('hide');
                Session.set("spinner_img", "spinner.gif");
                document.getElementById("spinner").style.display="none";
                matsParamUtils.collapseParams();
                return false;
                break;
            case "plot":
                var pt = matsPlotUtils.getPlotType();
                console.log("resizing graph type is ", pt);
                matsGraphUtils.resizeGraph(pt);
                var pgf = matsCollections.PlotGraphFunctions.findOne({plotType: pt});
                if (pgf === undefined) {
                    setError(new Error("plot_list.js - plot -do not have a plotGraphFunction for this plotType: " + pt));
                    Session.set("spinner_img", "spinner.gif");
                    document.getElementById("spinner").style.display="none";
                    return false;
                }
                Session.set('graphViewMode',matsTypes.PlotView.graph);
                Session.set('mvResultKey',null); // disable the mv links on the graph page

                var graphFunction = pgf.graphFunction;
                console.log("prior to getGraphData call time:", new Date() );
                // the following line converts a null expireKey to false.
                var expireKey = Session.get('expireKey') === true ? true : false;
                matsMethods.getGraphData.call({plotParams: p, plotType: pt, expireKey: expireKey}, function (error, ret) {
                    if (error !== undefined) {
                        //setError(new Error("matsMethods.getGraphData from plot_list.js : error: " + error ));
                        setError(error);
                        matsCurveUtils.resetGraphResult();
                        //Session.set ('PlotResultsUpDated', new Date());
                        Session.set("spinner_img", "spinner.gif");
                        matsCurveUtils.hideSpinner();
                        Session.set('expireKey', false);
                        return false;
                    }
                    Session.set('expireKey', false);
                    matsCurveUtils.setGraphResult(ret.result);
                    const plotType = Session.get('plotType');
                    if (plotType === matsTypes.PlotTypes.contourDiff) {
                        const oldCurves = Session.get('Curves');
                        Session.set('oldCurves', oldCurves);
                        Session.set('Curves', ret.result.basis.plotParams.curves);
                    }
                    Session.set("plotResultKey", ret.key);
                    delete ret;
                    Session.set('graphFunction', graphFunction);
                    Session.set ('PlotResultsUpDated', new Date());
                    console.log("after successful getGraphData call time:", new Date(), ":Session key: ",  ret.key, " graphFunction:", graphFunction);
                    matsGraphUtils.setGraphView(pt);
                });
                break;
            default:
                break;
        }
        return false;
    }
});
Template.plotList.onRendered( function() {
    // last bit of stuff that needs to be done when the page finally renders
    // need to display correct selectors on page load if default plot type is not timeseries
    const plotType = matsPlotUtils.getPlotType();
    Session.set('plotType', plotType);  // need to make sure plotType is in the Session this early
    switch (plotType) {
        case matsTypes.PlotTypes.profile:
            matsCurveUtils.showProfileFace();
            break;
        case matsTypes.PlotTypes.dieoff:
            matsCurveUtils.showDieOffFace();
            break;
        case matsTypes.PlotTypes.threshold:
            matsCurveUtils.showThresholdFace();
            break;
        case matsTypes.PlotTypes.validtime:
            matsCurveUtils.showValidTimeFace();
            break;
        case matsTypes.PlotTypes.gridscale:
            matsCurveUtils.showGridScaleFace();
            break;
        case matsTypes.PlotTypes.dailyModelCycle:
            matsCurveUtils.showDailyModelCycleFace();
            break;
        case matsTypes.PlotTypes.reliability:
            matsCurveUtils.showReliabilityFace();
            break;
        case matsTypes.PlotTypes.roc:
            matsCurveUtils.showROCFace();
            break;
        case matsTypes.PlotTypes.map:
            matsCurveUtils.showMapFace();
            break;
        case matsTypes.PlotTypes.histogram:
            matsCurveUtils.showHistogramFace();
            break;
        case matsTypes.PlotTypes.ensembleHistogram:
            matsCurveUtils.showEnsembleHistogramFace();
            break;
        case matsTypes.PlotTypes.contour:
        case matsTypes.PlotTypes.contourDiff:
            matsCurveUtils.showContourFace();
            break;
        case matsTypes.PlotTypes.scatter2d:
            matsCurveUtils.showScatterFace();
            break;
        case matsTypes.PlotTypes.timeSeries:
        default:
            matsCurveUtils.showTimeseriesFace();
            break;
    }

    // make sure everything is at default
    matsParamUtils.setAllParamsToDefault();
});