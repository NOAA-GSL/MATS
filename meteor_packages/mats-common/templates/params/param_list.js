import { matsTypes } from 'meteor/randyp:mats-common'; 
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import {matsPlotUtils } from 'meteor/randyp:mats-common';
import {matsParamUtils } from 'meteor/randyp:mats-common';

Template.paramList.helpers({
    CurveParamGroups: function() {
        var lastUpdate = Session.get('lastUpdate');
        var groupNums = [];
        var params = matsCollections.CurveParams.find({}).fetch();
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
        var labelId = 'label-' + matsTypes.InputTypes.textInput;
        var label = document.getElementById(labelId);
        label.disabled = false;
    },
    'click .reset': function(event,template) {
        //location.reload();
        event.preventDefault();
        matsCurveUtils.resetScatterApply();
        var paramView = document.getElementById('paramList');
        var plotView = document.getElementById('plotList');

        // DO THIS DIFFERENTLY!!!!! USE A SESSION VARIABLE!!!
        Blaze.remove(Blaze.getView(paramView));
        Blaze.remove(Blaze.getView(plotView));
        Blaze.render(Template.paramList,document.getElementById('paramView'));
        Blaze.render(Template.plotList,document.getElementById('plotView'));

    },

    // restore settings
    'click .restore-settings': function(event) {
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
            var isScatter = matsPlotUtils.getPlotType() === matsTypes.PlotTypes.scatter2d;
            var curves = Session.get('Curves');
            var p = {};
            var elems = event.target.valueOf().elements;
            var curveParams = matsCollections.CurveParams.find({}, {fields: {name: 1}}).fetch();
            var curveNames = _.pluck(curveParams, "name");
            var dateParams = matsCollections.CurveParams.find({type:matsTypes.InputTypes.dateRange}, {fields: {name: 1}}).fetch();
            var dateParamNames = _.pluck(dateParams, "name");
            if (isScatter) {
                var scatterCurveNames = [];
                for (var i=0; i<curveNames.length;i++) {
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
            paramElems.push.apply(paramElems,dateParamNames);
            // add in the scatter2d parameters if it is a scatter plot.
            if (isScatter) {
                $(":input[id^='scatter2d']:input[name*='scatter2d']" ).each( function() {
                    paramElems.push(this);
                });
            }
            var l = paramElems.length;
            if (Session.get('editMode')) {
                var changingCurveLabel = Session.get('editMode');
                Session.set('editMode', '');
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
                            if (paramElems[i].checked){
                                p[paramElems[i].name] = paramElems[i].value;
                            }
                        } else if (paramElems[i].type === "checkbox") {
                            if (paramElems[i].checked){
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
                    curves[index] = p;
                }
            } else {
                for (var i = 0; i < l; i++) {
                    if ((paramElems[i] instanceof Element) === false) { // isn't really an element - must be a date field - these are only strings
                        p[paramElems[i]] = matsParamUtils.getValueForParamName(paramElems[i]);
                    } else if (paramElems[i].type === "select-multiple") {
                        p[paramElems[i].name] = $(paramElems[i].selectedOptions).map(function(){return(this.value)}).get();
                    } else {
                        if (paramElems[i].type === "radio") {
                            if (paramElems[i].checked){
                                p[paramElems[i].name] = paramElems[i].value;
                            }
                        } else if (paramElems[i].type === "checkbox") {
                            if (paramElems[i].checked){
                                if (p[paramElems[i].name] === undefined) {
                                    p[paramElems[i].name] = [];
                                }
                                p[paramElems[i].name].push(paramElems[i].value);
                            }
                        }
                     else if (paramElems[i].type === "button") {
                            p[paramElems[i].id] = paramElems[i].value;
                        } else {
                            p[paramElems[i].name] = (paramElems[i]).value;
                        }
                    }
                    if (paramElems[i].name && paramElems[i].name === 'label') {
                        if (_.indexOf(matsCurveUtils.getUsedLabels(), (paramElems[i]).value) != -1) {
                            setError('labels need to be unique - change ' + (paramElems[i]).value + " to something else");
                            return false;
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
            return false;
    }
});

Template.paramList.onRendered(function(){
    Session.set('displayPriority', 1);
    Session.set('editMode', '');
});