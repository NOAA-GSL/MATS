/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsCurveUtils} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';
import {matsMethods} from 'meteor/randyp:mats-common';

function shadeRGBColor(color, percent) {
    var f = color.split(","), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent,
        R = parseInt(f[0].slice(4)), G = parseInt(f[1]), B = parseInt(f[2]);
    return "rgb(" + (Math.round((t - R) * p) + R) + "," + (Math.round((t - G) * p) + G) + "," + (Math.round((t - B) * p) + B) + ")";
}

Template.paramList.helpers({
    CurveParamGroups: function () {
        var lastUpdate = Session.get('lastUpdate');
        var groupNums = [];
        var params = matsCollections.CurveParams.find({}).fetch();
        for (var i = 0; i < params.length; i++) {
            groupNums.push(params[i].displayGroup);
        }
        var res = _.uniq(groupNums).sort();
        return res;
    },
    isEdit: function () {
        return Session.get('editMode') != '';
    },
    log: function () {
        console.log(this);
    },
    paramWellColor: function () {
        if (Session.get("paramWellColor") === undefined) {
            Session.set("paramWellColor", "rgb(245,245,245)");
        }
        if (Session.get("editMode") !== "") {
            const curveBeingEdited = $.grep(Session.get("Curves"), function (c) {
                return c.label == Session.get("editMode");
            });
            if (curveBeingEdited === undefined || curveBeingEdited[0] === undefined) {
                Session.set("paramWellColor", "rgb(245,245,245)");
                return "rgb(245,245,245)";
            }
            const color = curveBeingEdited[0].color;
            const lighterShadeOfColor = shadeRGBColor(color, 0.2);
            Session.set("paramWellColor", lighterShadeOfColor);
        }

        return Session.get("paramWellColor");
    }
});

Template.paramList.events({
    'click .edit-cancel': function () {
        Session.set('editMode', '');
        Session.set("paramWellColor", "rgb(245,245,245)");
        var labelId = 'label-' + matsTypes.InputTypes.textInput;
        var label = document.getElementById(labelId);
        label.disabled = false;
        // reset parameters to match edited curve.....
        matsParamUtils.setInputForParamName('label', matsCurveUtils.getNextCurveLabel());
        matsParamUtils.collapseParams();
    },
    'click .reset': function (event, template) {
        const plotType = $('input[name=plot-type]:checked').val();
        event.preventDefault();
        Session.set("paramWellColor", "rgb(245,245,245)");
        var paramView = document.getElementById('paramList');
        var plotView = document.getElementById('plotList');
        document.getElementById('plot-type-' + plotType).checked = true;
        matsMethods.refreshMetaData.call({}, function (error, result) {
            if (error !== undefined) {
                setError(new Error(error.message));
            }
            matsParamUtils.setAllParamsToDefault();
        });
    },
    'click .expand': function () {
        matsParamUtils.expandParams();
    },
    'click .collapse': function () {
        matsParamUtils.collapseParams();
    },
    // restore settings
    'click .restore-settings': function (event) {
        Session.set("paramWellColor", "rgb(245,245,245)");
        event.preventDefault();
        document.getElementById("restore-settings").click();
        return false;
    },
    // add curve
    // save changes
    /*
        Note: when adding a curve or saving changes after editing a curve there is a special
        case for scatter plots. Each hidden axis parameter must get set with the value from the regular parameter.
     */
    'submit form': function (event, template) {
        event.preventDefault();
        if (!matsParamUtils.getValueForParamName('label')) {
            setError('Label cannot be blank');
            return;
        }
        var isScatter = matsPlotUtils.getPlotType() === matsTypes.PlotTypes.scatter2d;
        var isMap = matsPlotUtils.getPlotType() === matsTypes.PlotTypes.map;
        var isReliability = matsPlotUtils.getPlotType() === matsTypes.PlotTypes.reliability;
        var isContour = matsPlotUtils.getPlotType() === matsTypes.PlotTypes.contour;
        var isContourDiff = matsPlotUtils.getPlotType() === matsTypes.PlotTypes.contourDiff;
        var curves = Session.get('Curves');
        var p = {};
        var elems = event.target.valueOf().elements;
        var curveParams = matsCollections.CurveParams.find({}, {fields: {name: 1}}).fetch();
        var curveNames = _.pluck(curveParams, "name");
        // remove any hidden params or unused ones
        // iterate backwards so that we can splice to remove
        for (var cindex = curveNames.length - 1; cindex >= 0; cindex--) {
            var cname = curveNames[cindex];
            var ctlElem = document.getElementById(cname + "-item");
            var isHidden = (matsParamUtils.getInputElementForParamName(cname) &&
                matsParamUtils.getInputElementForParamName(cname).style &&
                matsParamUtils.getInputElementForParamName(cname).style.display === 'none') ||
                (ctlElem && ctlElem.style && ctlElem.style.display === 'none');
            var isUnused = matsParamUtils.getInputElementForParamName(cname) !== undefined &&
                matsParamUtils.getValueForParamName(cname) == matsTypes.InputTypes.unused;
            if ((isHidden || isUnused) && cname !== 'plot-type') {
                // MET apps have a hidden plot-type selector that needs to be included in the curve
                curveNames.splice(cindex, 1);
            }
        }

        var dateParams = matsCollections.CurveParams.find({type: matsTypes.InputTypes.dateRange}, {fields: {name: 1}}).fetch();
        var dateParamNames = _.pluck(dateParams, "name");
        // remove any hidden date params or unused ones
        // iterate backwards so that we can splice to remove
        // dates are a little different - there is no element named paramName-paramtype because of the way daterange widgets are attached
        // Instead we have to look for a document element with an id element-paramName
        for (var dindex = dateParamNames.length - 1; dindex >= 0; dindex--) {
            var dElem = document.getElementById(dateParamNames[dindex] + "-item");
            if (dElem && dElem.style && dElem.style.display === 'none') {
                dateParamNames.splice(dindex, 1);
            }
        }
        if (isScatter) {
            var scatterCurveNames = [];
            for (var i = 0; i < curveNames.length; i++) {
                scatterCurveNames.push(curveNames[i]);
                scatterCurveNames.push("xaxis-" + curveNames[i]);
                scatterCurveNames.push("yaxis-" + curveNames[i]);
            }
            curveNames = scatterCurveNames;
        }
        var paramElems = _.filter(elems, function (elem) {
            return _.contains(curveNames, elem.name);
        });
        // add in any date params (they aren't technically elements)
        paramElems.push.apply(paramElems, dateParamNames);
        // add in the scatter2d parameters if it is a scatter plot.
        if (isScatter) {
            $(":input[id^='Fit-Type']:input[name*='Fit-Type']").each(function () {
                paramElems.push(this);
            });
        }
        var l = paramElems.length;
        if (Session.get('editMode')) {
            var changingCurveLabel = Session.get('editMode');
            Session.set('editMode', '');
            Session.set("paramWellColor", "rgb(245,245,245)");
            var labelId = 'label-' + matsTypes.InputTypes.textInput;
            var label = document.getElementById(labelId);
            label.disabled = false;

            for (var i = 0; i < l; i++) {
                if (paramElems[i].name == "label") {
                    p[paramElems[i].name] = changingCurveLabel;  // don't change the label when editing a curve
                    continue;
                }
                if ((paramElems[i] instanceof Element) === false) { // isn't really an element - must be a date field - these are only strings
                    p[paramElems[i]] = matsParamUtils.getValueForParamName(paramElems[i]);
                } else if (paramElems[i].type === "select-multiple") {
                    // define a p value if it doesn't exist (necessary for adding truth values)
                    p[paramElems[i].name] = (p[paramElems[i].name] === undefined) ? "" : p[paramElems[i].name];
                    p[paramElems[i].name] = $(paramElems[i].selectedOptions).map(function () {
                        return (this.value)
                    }).get();
                } else {
                    if (paramElems[i].type === "radio") {
                        if (paramElems[i].checked) {
                            p[paramElems[i].name] = paramElems[i].value;
                        }
                    } else if (paramElems[i].type === "checkbox") {
                        if (paramElems[i].checked) {
                            p[paramElems[i].name].push(paramElems[i].value);
                        }
                    } else if (paramElems[i].type === "button") {
                        p[paramElems[i].id] = paramElems[i].value;
                    } else {
                        p[paramElems[i].name] = (paramElems[i]).value;
                    }
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
                if (isScatter) {
                    // copy the params to the current axis paremeters
                    var axis = Session.get('axis');
                    var axisParams = (Object.keys(p)).filter(function (key) {
                        return key.startsWith(axis)
                    });
                    for (var api = 0; api < axisParams.length; api++) {
                        var ap = axisParams[api];
                        var pp = ap.replace(axis + '-', '');
                        p[ap] = p[pp];
                        curves[index][ap] = p[pp];
                    }
                    curves[index]['Fit-Type'] = p['Fit-Type'];
                } else {
                    curves[index] = p;
                }
            }
        } else {
            if (isMap && curves.length >= 1) {
                setError(new Error('ERROR: Map plot-type can only have one curve!'));
                return false;
            } else if (isContour && curves.length >= 1) {
                setError(new Error('ERROR: Contour plot-type can only have one curve!'));
                return false;
            } else if (isContourDiff && curves.length >= 2) {
                setError(new Error('ERROR: Contour Diff plot-type can only have two curves!'));
                return false;
            } else if (isReliability && curves.length >= 1) {
                setError(new Error('ERROR: Reliability plot-type can only have one curve right now!'));
                return false;
            } else {
                for (var i = 0; i < l; i++) {
                    if ((paramElems[i] instanceof Element) === false) { // isn't really an element - must be a date field - these are only strings
                        p[paramElems[i]] = matsParamUtils.getValueForParamName(paramElems[i]);
                    } else if (paramElems[i].type === "select-multiple") {
                        p[paramElems[i].name] = $(paramElems[i].selectedOptions).map(function () {
                            return (this.value)
                        }).get();
                    } else {
                        if (paramElems[i].type === "radio") {
                            if (paramElems[i].checked) {
                                p[paramElems[i].name] = paramElems[i].value;
                            }
                        } else if (paramElems[i].type === "checkbox") {
                            if (paramElems[i].checked) {
                                if (p[paramElems[i].name] === undefined) {
                                    p[paramElems[i].name] = [];
                                }
                                p[paramElems[i].name].push(paramElems[i].value);
                            }
                        } else if (paramElems[i].type === "button") {
                            p[paramElems[i].id] = paramElems[i].value;
                        } else {
                            if (isScatter) {
                                p[paramElems[i].name] = (paramElems[i]).value;
                            } else {
                                p[paramElems[i].name] = matsParamUtils.getValueForParamName(paramElems[i].name)
                            }
                        }
                    }
                    if (paramElems[i].name && paramElems[i].name === 'label') {
                        if (_.indexOf(matsCurveUtils.getUsedLabels(), (paramElems[i]).value) != -1) {
                            setError(new Error('labels need to be unique - change ' + (paramElems[i]).value + " to something else"));
                            return false;
                        }
                    }
                }
            }
            p.color = matsCurveUtils.getNextCurveColor();
            curves.push(p);
            var elem = document.getElementById("curveList");
            elem.style.display = "block";
        }

        Session.set('Curves', curves);
        matsCurveUtils.setUsedColorsAndLabels(); // we have used a color and label so we have to set the next one
        matsCurveUtils.checkDiffs();
        matsParamUtils.collapseParams();
        matsParamUtils.setInputForParamName('label', matsCurveUtils.getNextCurveLabel());
        return false;
    }
});

Template.paramList.onRendered(function () {
    Session.set('displayPriority', 1);
    Session.set('editMode', '');

    //hide sites and sitesMap selectors for anything that isn't a map plot or wfip2
    var elem;
    var ptype = matsPlotUtils.getPlotType();
    elem = document.getElementById('sites-item');
    var sitesParamHidden;
    if (elem && elem.style) {
        sitesParamHidden = matsCollections.CurveParams.findOne({name: 'sites'}).hiddenForPlotTypes;
        if (sitesParamHidden) {
            if (sitesParamHidden.indexOf(ptype) === -1) {
                elem.style.display = "block";
            } else {
                elem.style.display = "none";
            }
        }
    }
    elem = document.getElementById('sitesMap-item');
    if (elem && elem.style) {
        sitesParamHidden = matsCollections.CurveParams.findOne({name: 'sitesMap'}).hiddenForPlotTypes;
        if (sitesParamHidden) {
            if (sitesParamHidden.indexOf(ptype) === -1) {
                elem.style.display = "block";
            } else {
                elem.style.display = "none";
            }
        }
    }
});