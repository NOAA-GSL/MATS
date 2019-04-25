/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsCurveUtils,matsPlotUtils} from 'meteor/randyp:mats-common';

Template.spinner.helpers({
    image: function () {
        var img = Session.get("spinner_img");
        if (img == undefined) {
            img = "spinner.gif";
            Session.set("spinner_img", "spinner.gif");
        }
        return img;
    }
});


Template.spinner.events({
    'click .cancel': function () {
        matsCurveUtils.hideSpinner();
        matsPlotUtils.enableActionButtons();
    }
});