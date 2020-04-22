/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {moment} from 'meteor/momentjs:moment'
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCurveUtils} from 'meteor/randyp:mats-common';
import {matsGraphUtils} from 'meteor/randyp:mats-common';

graphPlotly = function (key) {
    // get plot info
    var route = Session.get('route');

    // get dataset info and options
    var resultSet = matsCurveUtils.getGraphResult();
    if (resultSet === null || resultSet === undefined || resultSet.data === undefined) {
        return false;
    }

    //set options
    var options = resultSet.options;
    if (route !== undefined && route !== "") {
        options.selection = [];
    }

    // initialize show/hide button labels
    var dataset = resultSet.data;
    if (Session.get('plotType') !== matsTypes.PlotTypes.map) {
        matsGraphUtils.setNoDataLabels(dataset);
    } else {
        matsGraphUtils.setNoDataLabelsMap(dataset);
    }
};