/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsCurveUtils} from 'meteor/randyp:mats-common';
import {matsParamUtils} from 'meteor/randyp:mats-common';


Template.plotType.helpers({
    plotTypes: function () {
        return matsCollections.PlotGraphFunctions.find({}).fetch();
    },
    title: function () {
        if (matsCollections.Settings === undefined || matsCollections.Settings.findOne({}, {fields: {Title: 1}}) === undefined) {
            return "";
        } else {
            return matsCollections.Settings.findOne({}, {fields: {Title: 1}}).Title;
        }
    },
    display: function () {    // don't display the choice if there is only one choice
        if (matsCollections.PlotGraphFunctions.find({}).fetch().length === 1) {
            return "hidden";
        } else {
            return "";
        }
    },
    loadingMetadataVisibility: function () {    // let users know if metadata is updating
        if (matsCollections.Settings === undefined || matsCollections.Settings.findOne({}, {fields: {loadingMetadata: 1}}) === undefined) {
            return "none";
        } else {
            const loadingMetadata = matsCollections.Settings.findOne({}, {fields: {loadingMetadata: 1}}).loadingMetadata;
            if (loadingMetadata) {  // loadingMetadata should be a boolean
                return "block";
            } else {
                return "none";
            }
        }
    }
});

const matchPlotTypeSelector = function (plotType) {
    // used in met apps to only display the options appropriate to a particular plot type in each selector
    if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
        const currentDatabase = matsParamUtils.getValueForParamName('database');
        const currentDataSource = matsParamUtils.getValueForParamName('data-source');
        if (matsCollections.CurveParams.findOne({name: 'plot-type'}).optionsMap[currentDatabase][currentDataSource].indexOf(plotType) !== -1) {
            matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', plotType);
        } else {
            setInfo(('INFO:  Plot type ' + plotType + ' is not available for the database/model combination ' + currentDatabase + ' and ' + currentDataSource + '.'));
        }
    }
};

const setDatesAndShowFace = function (plotType) {
    // display appropriate selectors for each plot type, and make sure the previous dates or curve-dates values
    // carry across to the appropriate new selector
    var oldDatesExist;
    switch (plotType) {
        case matsTypes.PlotTypes.timeSeries:
            oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showTimeseriesFace();
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            break;
        case matsTypes.PlotTypes.profile:
            oldDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showProfileFace();
            if (!oldDatesExist) {
                const date = $('#controlButton-dates-value').text();
                matsParamUtils.setValueTextForParamName('curve-dates', date)
            }
            break;
        case matsTypes.PlotTypes.dieoff:
            oldDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showDieOffFace();
            if (!oldDatesExist) {
                const date = $('#controlButton-dates-value').text();
                matsParamUtils.setValueTextForParamName('curve-dates', date)
            }
            break;
        case matsTypes.PlotTypes.threshold:
            oldDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showThresholdFace();
            if (!oldDatesExist) {
                const date = $('#controlButton-dates-value').text();
                matsParamUtils.setValueTextForParamName('curve-dates', date)
            }
            break;
        case matsTypes.PlotTypes.validtime:
            oldDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showValidTimeFace();
            if (!oldDatesExist) {
                const date = $('#controlButton-dates-value').text();
                matsParamUtils.setValueTextForParamName('curve-dates', date)
            }
            break;
        case matsTypes.PlotTypes.gridscale:
            oldDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showGridScaleFace();
            if (!oldDatesExist) {
                const date = $('#controlButton-dates-value').text();
                matsParamUtils.setValueTextForParamName('curve-dates', date)
            }
            break;
        case matsTypes.PlotTypes.dailyModelCycle:
            oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showDailyModelCycleFace();
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            break;
        case matsTypes.PlotTypes.map:
            oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showMapFace();
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            break;
        case matsTypes.PlotTypes.reliability:
            oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showReliabilityFace();
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            break;
        case matsTypes.PlotTypes.roc:
            oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showROCFace();
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            break;
        case matsTypes.PlotTypes.histogram:
            oldDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showHistogramFace();
            if (!oldDatesExist) {
                const date = $('#controlButton-dates-value').text();
                matsParamUtils.setValueTextForParamName('curve-dates', date)
            }
            break;
        case matsTypes.PlotTypes.ensembleHistogram:
            oldDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showEnsembleHistogramFace();
            if (!oldDatesExist) {
                const date = $('#controlButton-dates-value').text();
                matsParamUtils.setValueTextForParamName('curve-dates', date)
            }
            break;
        case matsTypes.PlotTypes.contour:
        case matsTypes.PlotTypes.contourDiff:
            oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showContourFace();
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            break;
        case matsTypes.PlotTypes.scatter2d:
            oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showScatterFace();
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            break;
    }
};

const changePlotType = function (plotType, selectorsToInitialize) {
    if (Session.get("confirmPlotChange")) {
        // change has been confirmed
        // the MET apps have a hidden plot-type selector than needs to match the actual plot type
        matchPlotTypeSelector(plotType);

        // display appropriate selectors for this plot type, and make sure the previous dates or curve-dates values
        // carry across to the appropriate new selector
        setDatesAndShowFace(plotType);

        // make sure the curves already added also have the correct parameters displayed
        var curves = Session.get('Curves');
        if (curves.length > 0) {
            // initialize parameters that may not have been used yet
            for (var ci = 0; ci < curves.length; ci++) {
                for (var si = 0; si < selectorsToInitialize.length; si++) {
                    if (!curves[ci][selectorsToInitialize[si]] && matsCollections.CurveParams.findOne({name: selectorsToInitialize[si]}) && matsCollections.CurveParams.findOne({name: selectorsToInitialize[si]}).default) {
                        curves[ci][selectorsToInitialize[si]] = matsCollections.CurveParams.findOne({name: selectorsToInitialize[si]}).default;
                    }
                }
            }
            Session.set('Curves', curves);
        }
        Session.set("confirmPlotChange", "");
        Session.set('plotChangeType', "");
    } else {
        // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
        if (Session.get("Curves").length > 0) {
            Session.set('plotChangeType', plotType);
            $("#modal-change-plot-type").modal();
        } else {
            // no curves - just set the new plot type face
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            matchPlotTypeSelector(plotType);

            // display appropriate selectors for this plot type, and make sure the previous dates or curve-dates values
            // carry across to the appropriate new selector
            setDatesAndShowFace(plotType);
        }
    }
};

Template.plotType.events({
    'click .plot-type-TimeSeries': function (event) {
        const plotType = matsTypes.PlotTypes.timeSeries;
        const selectorsToInitialize = ['statistic', 'threshold', 'scale', 'level', 'forecast-length', 'average', 'valid-time', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-Profile': function (event) {
        const plotType = matsTypes.PlotTypes.profile;
        const selectorsToInitialize = ['statistic', 'threshold', 'scale', 'forecast-length', 'valid-time', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-DieOff': function (event) {
        const plotType = matsTypes.PlotTypes.dieoff;
        const selectorsToInitialize = ['statistic', 'threshold', 'scale', 'level', 'dieoff-type', 'valid-time', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-Threshold': function (event) {
        const plotType = matsTypes.PlotTypes.threshold;
        const selectorsToInitialize = ['statistic', 'scale', 'level', 'forecast-length', 'valid-time', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-ValidTime': function (event) {
        const plotType = matsTypes.PlotTypes.validtime;
        const selectorsToInitialize = ['statistic', 'threshold', 'scale', 'level', 'forecast-length', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-GridScale': function (event) {
        const plotType = matsTypes.PlotTypes.gridscale;
        const selectorsToInitialize = ['statistic', 'threshold', 'level', 'forecast-length', 'valid-time', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-DailyModelCycle': function (event) {
        const plotType = matsTypes.PlotTypes.dailyModelCycle;
        const selectorsToInitialize = ['statistic', 'threshold', 'scale', 'level', 'utc-cycle-start', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-Reliability': function (event) {
        const plotType = matsTypes.PlotTypes.reliability;
        const selectorsToInitialize = ['threshold', 'scale', 'level', 'forecast-length', 'valid-time', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-ROC': function (event) {
        const plotType = matsTypes.PlotTypes.roc;
        const selectorsToInitialize = ['threshold', 'scale', 'level', 'forecast-length', 'valid-time', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-Map': function (event) {
        const plotType = matsTypes.PlotTypes.map;
        const selectorsToInitialize = ['threshold', 'scale', 'level', 'forecast-length', 'valid-time'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-Histogram': function (event) {
        const plotType = matsTypes.PlotTypes.histogram;
        const selectorsToInitialize = ['statistic', 'threshold', 'scale', 'level', 'forecast-length', 'valid-time', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-EnsembleHistogram': function (event) {
        const plotType = matsTypes.PlotTypes.ensembleHistogram;
        const selectorsToInitialize = ['threshold', 'scale', 'level', 'forecast-length', 'valid-time', 'truth', 'region-type', 'region'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-Contour': function (event) {
        const plotType = matsTypes.PlotTypes.contour;
        const selectorsToInitialize = ['statistic', 'threshold', 'scale', 'level', 'forecast-length', 'valid-time', 'truth', 'region-type', 'region', 'x-axis-parameter', 'y-axis-parameter'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-ContourDiff': function (event) {
        const plotType = matsTypes.PlotTypes.contourDiff;
        const selectorsToInitialize = ['statistic', 'threshold', 'scale', 'level', 'forecast-length', 'valid-time', 'truth', 'region-type', 'region', 'x-axis-parameter', 'y-axis-parameter'];
        changePlotType(plotType, selectorsToInitialize);
    },
    'click .plot-type-Scatter2d': function (event) {
        const plotType = matsTypes.PlotTypes.scatter2d;
        const selectorsToInitialize = [];
        changePlotType(plotType, selectorsToInitialize);
    }
});
