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
    'click .confirm-remove-all': function () {
        matsCurveUtils.clearAllUsed();
        matsParamUtils.setAllParamsToDefault();
        Session.set("editMode", "");
        Session.set("paramWellColor", "#f5f5f5");  // default grey
        Session.set("lastUpdate", Date.now());

        Session.set("confirmPlotChange", Date.now());
        const plotChangeType = Session.get('plotChangeType');
        const ref = "#plot-type-" + plotChangeType;   //NOTE: this assumes that the id of the associated plotType is following a convention defined by matsTypes.PlotTypes
        $(ref).trigger('click');
    },
    'click .confirm-keep-all': function () {
        Session.set("confirmPlotChange", Date.now());
        const plotChangeType = Session.get('plotChangeType');
        const ref = "#plot-type-" + plotChangeType;   //NOTE: this assumes that the id of the associated plotType is following a convention defined by matsTypes.PlotTypes
        $(ref).trigger('click');
    },
    'click .plot-type-Profile': function(event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            matsCurveUtils.showProfileFace();
            Session.set("confirmPlotChange","");
            Session.set('plotChangeType',"");
            var curves = Session.get('Curves');
            if (curves.length > 0 ) {
                // try to assign the curve dates
                const tsDate = $('#controlButton-dates-value').text();
                if (tsDate !== undefined && tsDate !== "") {
                    for (var ci = 0; ci < curves.length; ci++) {
                        curves[ci]['curve-dates'] = tsDate;
                        if (!curves[ci]['average'] && matsCollections.CurveParams.findOne({name:'average'}) && matsCollections.CurveParams.findOne({name:'average'}).default) {
                            curves[ci]['average'] = matsCollections.CurveParams.findOne({name:'average'}).default;
                        }
                        if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name:'forecast-length'}) && matsCollections.CurveParams.findOne({name:'forecast-length'}).default) {
                            curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name:'forecast-length'}).default;
                        }
                    }
                }
                Session.set('Curves',curves);
                Session.set("lastUpdate", Date.now());
            }
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0 ) {
                Session.set('plotChangeType',matsTypes.PlotTypes.profile);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the profile face
                matsCurveUtils.showProfileFace();
            }
        }
    },
    'click .plot-type-DieOff': function(event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            matsCurveUtils.showDieOffFace();
            var curves = Session.get("Curves");
            if (curves.length > 0 ) {
                // the average may not have been carried over from a dieoff so let it default
                for (var ci = 0; ci < curves.length; ci ++) {
                    if (!curves[ci]['dieoff-forecast-length'] && matsCollections.CurveParams.findOne({name:'dieoff-forecast-length'}) && matsCollections.CurveParams.findOne({name:'dieoff-forecast-length'}).default) {
                        curves[ci]['dieoff-forecast-length'] = matsCollections.CurveParams.findOne({name:'dieoff-forecast-length'}).default;
                    }
                }
                Session.set("Curves", curves);
                Session.set("lastUpdate", Date.now());
            }
            Session.set("confirmPlotChange","");
            Session.set('plotChangeType',"");
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0 ) {
                Session.set('plotChangeType',matsTypes.PlotTypes.dieoff);
                $("#modal-change-plot-type").modal();
            } else {
                matsCurveUtils.showDieOffFace();
            }
        }
    },
    'click .plot-type-TimeSeries': function(event) {
        if (Session.get("confirmPlotChange")) {
            matsCurveUtils.showTimeseriesFace();
            var curves = Session.get("Curves");
            if (curves.length > 0 ) {
                // the average may not have been carried over from a dieoff so let it default
                for (var ci = 0; ci < curves.length; ci ++) {
                    if (!curves[ci]['average'] && matsCollections.CurveParams.findOne({name:'average'}) && matsCollections.CurveParams.findOne({name:'average'}).default) {
                        curves[ci]['average'] = matsCollections.CurveParams.findOne({name:'average'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name:'forecast-length'}) && matsCollections.CurveParams.findOne({name:'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name:'forecast-length'}).default;
                    }
                }
                Session.set("Curves", curves);
                Session.set("lastUpdate", Date.now());
            }
            Session.set("confirmPlotChange","");
            Session.set('plotChangeType',"");
            return false;
        } else {
            if (Session.get("Curves").length > 0 ) {
                Session.set('plotChangeType',matsTypes.PlotTypes.timeSeries);
                $("#modal-change-plot-type").modal();
            } else {
                matsCurveUtils.showTimeseriesFace();
            }
        }
    },
    'click .plot-type-Scatter2d': function(event) {
        if (Session.get("confirmPlotChange")) {
            matsCurveUtils.showScatterFace();
            Session.set("confirmPlotChange","");
            Session.set('plotChangeType',"");
            return false;
        } else {
            if (Session.get("Curves").length > 0 ) {
                Session.set('plotChangeType',matsTypes.PlotTypes.scatter2d);
                $("#modal-change-plot-type").modal();
            } else {
                matsCurveUtils.showScatterFace();
            }
        }
    },
    'click .newapp': function() {
        var win = window.open(window.location.href, Date.now(), 'toolbar=0,location=0,menubar=0, resizeable=1, status=0,titlebar=0');
        win.document.title = matsCollections.Settings === undefined ? "new app" : matsCollections.Settings.findOne({}, {fields: {Title: 1}});
    },
    'click .closeapp': function() {
    window.close();
}
});
