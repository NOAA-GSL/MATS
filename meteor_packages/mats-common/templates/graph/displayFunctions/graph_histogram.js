import {moment} from 'meteor/momentjs:moment'
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCurveUtils} from 'meteor/randyp:mats-common';
import {matsGraphUtils} from 'meteor/randyp:mats-common';

graphHistogram = function (key) {
    // get plot info
    var vpw = Math.min(document.documentElement.clientWidth, window.innerWidth || 0);
    var vph = Math.min(document.documentElement.clientHeight, window.innerHeight || 0);
    var min = Math.min(vpw, vph);

    // get dataset info
    var resultSet = matsCurveUtils.getGraphResult();
    if (resultSet === null) {
        return false;
    }
    var dataset = resultSet.data;
    var options = resultSet.options;
    if (min < 400) {
        options.series && options.series.points && (options.series.points.radius = 1);
    } else {
        options.series && options.series.points && (options.series.points.radius = 2);
    }

    var placeholder = $("#placeholder");

    matsGraphUtils.setNoDataLabels(dataset);

    // draw the plot for the first time
    var plot = $.plot(placeholder, dataset, options);

    // hide the spinner
    matsCurveUtils.hideSpinner();
};