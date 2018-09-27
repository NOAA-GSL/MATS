import {moment} from 'meteor/momentjs:moment'
import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCurveUtils} from 'meteor/randyp:mats-common';
import {matsGraphUtils} from 'meteor/randyp:mats-common';

graphProfile = function (key) {
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

    // format errorbars
    for (var i = 0; i < dataset.length; i++) {
        var o = dataset[i];
        var capRadius = 10;
        if (min < 400) {
            o.points && (o.points.radius = 1);
            capRadius = 5;
        } else {
            o.points && (o.points.radius = 2);
            capRadius = 10;
        }
        if (o.points.xerr.lowerCap === "squareCap") {
            o.points.xerr.lowerCap = matsGraphUtils.lXSquareCap;
        }
        if (o.points.xerr.upperCap === "squareCap") {
            o.points.xerr.upperCap = matsGraphUtils.uXSquareCap;
        }
    }

    var placeholder = $("#placeholder");

    matsGraphUtils.setNoDataLabels(dataset);

    // draw the plot for the first time
    var plot = $.plot(placeholder, dataset, options);

    // hide the spinner
    matsCurveUtils.hideSpinner();
};