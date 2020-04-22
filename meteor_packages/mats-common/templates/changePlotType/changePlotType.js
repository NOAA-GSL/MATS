/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsParamUtils,matsCurveUtils} from 'meteor/randyp:mats-common';

// moved here from plotType.html and plotType.js
Template.changePlotType.events({
    'click .confirm-remove-all': function (event) {
        event.preventDefault();
        matsCurveUtils.clearAllUsed();
        matsParamUtils.setAllParamsToDefault();
        Session.set("editMode", "");
        Session.set("paramWellColor", "#f5f5f5");  // default grey
        Session.set("lastUpdate", Date.now());

        Session.set("confirmPlotChange", Date.now());
        const plotChangeType = Session.get('plotChangeType');
        const ref = "#plot-type-" + plotChangeType;   //NOTE: this assumes that the id of the associated plotType is following a convention defined by matsTypes.PlotTypes
        $(ref).trigger('click');
        //return false;
    },
    'click .confirm-keep-all': function (event) {
        event.preventDefault();
        Session.set("confirmPlotChange", Date.now());
        const plotChangeType = Session.get('plotChangeType');
        const ref = "#plot-type-" + plotChangeType;   //NOTE: this assumes that the id of the associated plotType is following a convention defined by matsTypes.PlotTypes
        $(ref).trigger('click');
        //return false;
    },
});