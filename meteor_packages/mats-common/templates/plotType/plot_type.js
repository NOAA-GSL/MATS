import { matsTypes } from 'meteor/randyp:mats-common'; 
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';


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
    },
    isNewWindow: function() {
        if (window.name !== "") {
            return true;
        } else {
            return false;
        }
    }
});


Template.plotType.events({
    'click .plot-type-Profile': function(event) {
        matsCurveUtils.removeAllCurves();
        matsCurveUtils.showProfileFace();
    },
    'click .plot-type-TimeSeries': function() {
        matsCurveUtils.removeAllCurves();
        matsCurveUtils.showTimeseriesFace();
    },
    'click .plot-type-Scatter2d': function() {
        matsCurveUtils.removeAllCurves();
        matsCurveUtils.showScatterFace();
    },
    'click .newapp': function() {
        var win = window.open(window.location.href, Date.now(), 'toolbar=0,location=0,menubar=0, resizeable=1, status=0,titlebar=0');
        win.document.title = matsCollections.Settings === undefined ? "new app" : matsCollections.Settings.findOne({}, {fields: {Title: 1}});
    },
    'click .closeapp': function() {
    window.close();
}
});
