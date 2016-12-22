import { matsTypes } from 'meteor/randyp:mats-common'; 
import { matsCollections } from 'meteor/randyp:mats-common';

Template.plotType.helpers({
    plotTypes:function() {
       return matsCollections.PlotGraphFunctions.find({}).fetch();
   },
   title:function() {
       if (matsCollections.Settings === undefined || matsCollections.Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
           return "";
       } else {
           return matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title;
       }
   },
    display: function() {    // don't display the choice if there is only one choice
        if (matsCollections.PlotGraphFunctions.find({}).fetch().length === 1) {
            return "hidden";
        } else {
            return "";
        }
    }
});

var refreshDependents = function(dependentNames) {
    if (dependentNames) {
        // refresh the dependents
        for (var i = 0; i < dependentNames.length; i++) {
            var name = dependentNames[i];
            var targetParam = matsCollections.CurveParams.findOne({name: name});
            var targetId = targetParam.name + '-' + targetParam.type;
            var targetElem = document.getElementById(targetId);
            var refreshEvent = new CustomEvent("refresh", {
                detail: {
                    refElement: event.target
                }
            });
            targetElem.dispatchEvent(refreshEvent);
        }
    }
};

Template.plotType.events({
    'click .plot-type-Profile': function(event) {
        // remove all curves
        document.getElementById('remove-all') && document.getElementById('remove-all').click();
        // move dates selector to curve parameters - one date range for each curve
        if (document.getElementById('plot-type-' + matsTypes.PlotTypes.profile).checked === true) {
            var elem = document.getElementById(matsTypes.PlotTypes.scatter2d);
            if (elem && elem.style) {
                elem.style.display="none";
            }
            elem = document.getElementById('curve-dates-item');
            if (elem && elem.style) {
                elem.style.display="block";
            }
            elem = document.getElementById('dates-item');
            if (elem && elem.style) {
                elem.style.display = "none";
            }
            elem = document.getElementById('average-item');
            if (elem && elem.style) {
                elem.style.display = "none";
            }
           /* elem = document.getElementById('top-numberSpinner');
            if (elem && elem.style) {
                elem.value = 0;
            }
            elem = document.getElementById('controlButton-top-value');
            if (elem && elem.style) {
                elem.textContent = "0";
            } */
            Session.set('plotType', matsTypes.PlotTypes.profile);
            Session.set('lastUpdate', Date.now());
            refreshDependents(this.dependents);
        }
    },
    'click .plot-type-TimeSeries': function() {
        // remove all curves
        document.getElementById('remove-all') && document.getElementById('remove-all').click();
        // move dates selector to plot parameters - one date range for all curves
        if (document.getElementById('plot-type-' + matsTypes.PlotTypes.timeSeries).checked === true) {
            var elem = document.getElementById(matsTypes.PlotTypes.scatter2d);
            if (elem && elem.style) {
                elem.style.display = "none";
            }
            elem = document.getElementById('curve-dates-item');
            if (elem && elem.style) {
                elem.style.display = "none";
            }
            elem = document.getElementById('dates-item');
            if (elem && elem.style) {
                elem.style.display = "block";
            }
            elem = document.getElementById('average-item');
            if (elem && elem.style) {
                elem.style.display = "block";
            }
            /*
            elem = document.getElementById('top-numberSpinner');
            if (elem && elem.style) {
                elem.value = 100;
            }
            elem = document.getElementById('controlButton-top-value');
            if (elem && elem.style) {
                elem.textContent = "100";
            }
            */
            Session.set('plotType', matsTypes.PlotTypes.timeSeries);
            Session.set('lastUpdate', Date.now());
            refreshDependents(this.dependents);
        }
    },
    'click .plot-type-Scatter2d': function() {
        // remove all curves
        document.getElementById('remove-all') && document.getElementById('remove-all').click();
        if (document.getElementById('plot-type-' + matsTypes.PlotTypes.scatter2d).checked === true) {
            var elem = document.getElementById(matsTypes.PlotTypes.scatter2d);
            if (elem && elem.style) {
                elem.style.display = "block";
            }
            Session.set('plotType', matsTypes.PlotTypes.scatter2d);
            Session.set('lastUpdate', Date.now());
            refreshDependents(this.dependents);
        }
    }
});
