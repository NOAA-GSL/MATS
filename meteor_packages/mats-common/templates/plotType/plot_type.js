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


Template.plotType.events({
    'click .plot-type-TimeSeries': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.timeSeries);
            }
            // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            // display appropriate selectors for timeseries
            matsCurveUtils.showTimeseriesFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['average'] && matsCollections.CurveParams.findOne({name: 'average'}) && matsCollections.CurveParams.findOne({name: 'average'}).default) {
                        curves[ci]['average'] = matsCollections.CurveParams.findOne({name: 'average'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.timeSeries);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the timeseries face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.timeSeries);
                }
                // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                // display appropriate selectors for timeseries
                matsCurveUtils.showTimeseriesFace();
                if (!oldDatesExist) {
                    // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-Profile': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.profile);
            }
            // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            // display appropriate selectors for profiles
            matsCurveUtils.showProfileFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
            const tsDate = $('#controlButton-dates-value').text();
            if (!oldCurveDatesExist) {
                matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (tsDate !== undefined && tsDate !== "" && !oldCurveDatesExist) {
                        curves[ci]['curve-dates'] = tsDate;
                    }
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.profile);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the profile face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.profile);
                }
                // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                // display appropriate selectors for profiles
                matsCurveUtils.showProfileFace();
                // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
                if (!oldCurveDatesExist) {
                    const tsDate = $('#controlButton-dates-value').text();
                    matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
                }
            }
        }
    },
    'click .plot-type-DieOff': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.dieoff);
            }
            // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            // display appropriate selectors for dieoffs
            matsCurveUtils.showDieOffFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
            const tsDate = $('#controlButton-dates-value').text();
            if (!oldCurveDatesExist) {
                matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (tsDate !== undefined && tsDate !== "" && !oldCurveDatesExist) {
                        curves[ci]['curve-dates'] = tsDate;
                    }
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['dieoff-type'] && matsCollections.CurveParams.findOne({name: 'dieoff-type'}) && matsCollections.CurveParams.findOne({name: 'dieoff-type'}).default) {
                        curves[ci]['dieoff-type'] = matsCollections.CurveParams.findOne({name: 'dieoff-type'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.dieoff);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the dieoff face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.dieoff);
                }
                // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                // display appropriate selectors for dieoffs
                matsCurveUtils.showDieOffFace();
                // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
                if (!oldCurveDatesExist) {
                    const tsDate = $('#controlButton-dates-value').text();
                    matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
                }
            }
        }
    },
    'click .plot-type-Threshold': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.threshold);
            }
            // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            // display appropriate selectors for thresholds
            matsCurveUtils.showThresholdFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
            const tsDate = $('#controlButton-dates-value').text();
            if (!oldCurveDatesExist) {
                matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (tsDate !== undefined && tsDate !== "" && !oldCurveDatesExist) {
                        curves[ci]['curve-dates'] = tsDate;
                    }
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.threshold);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the threshold face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.threshold);
                }
                // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                // display appropriate selectors for thresholds
                matsCurveUtils.showThresholdFace();
                // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
                if (!oldCurveDatesExist) {
                    const tsDate = $('#controlButton-dates-value').text();
                    matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
                }
            }
        }
    },
    'click .plot-type-ValidTime': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.validtime);
            }
            // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            // display appropriate selectors for validtimes
            matsCurveUtils.showValidTimeFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
            const tsDate = $('#controlButton-dates-value').text();
            if (!oldCurveDatesExist) {
                matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (tsDate !== undefined && tsDate !== "" && !oldCurveDatesExist) {
                        curves[ci]['curve-dates'] = tsDate;
                    }
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.validtime);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the validtime face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.validtime);
                }
                // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                // display appropriate selectors for validtimes
                matsCurveUtils.showValidTimeFace();
                // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
                if (!oldCurveDatesExist) {
                    const tsDate = $('#controlButton-dates-value').text();
                    matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
                }
            }
        }
    },
    'click .plot-type-GridScale': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.gridscale);
            }
            // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            // display appropriate selectors for grid scale plots
            matsCurveUtils.showGridScaleFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
            const tsDate = $('#controlButton-dates-value').text();
            if (!oldCurveDatesExist) {
                matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (tsDate !== undefined && tsDate !== "" && !oldCurveDatesExist) {
                        curves[ci]['curve-dates'] = tsDate;
                    }
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.gridscale);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the grid scale face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.gridscale);
                }
                // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                // display appropriate selectors for grid scale plots
                matsCurveUtils.showGridScaleFace();
                // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
                if (!oldCurveDatesExist) {
                    const tsDate = $('#controlButton-dates-value').text();
                    matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
                }
            }
        }
    },
    'click .plot-type-DailyModelCycle': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.dailyModelCycle);
            }
            // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            // display appropriate selectors for dailymodelcycle
            matsCurveUtils.showDailyModelCycleFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['utc-cycle-start'] && matsCollections.CurveParams.findOne({name: 'utc-cycle-start'}) && matsCollections.CurveParams.findOne({name: 'utc-cycle-start'}).default) {
                        curves[ci]['utc-cycle-start'] = matsCollections.CurveParams.findOne({name: 'utc-cycle-start'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.dailyModelCycle);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the dailymodelcycle face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.dailyModelCycle);
                }
                // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                // display appropriate selectors for dailymodelcycle
                matsCurveUtils.showDailyModelCycleFace();
                if (!oldDatesExist) {
                    // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-Reliability': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.reliability);
            }
            // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            // display appropriate selectors for reliability
            matsCurveUtils.showReliabilityFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.reliability);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the reliability face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.reliability);
                }
                // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                // display appropriate selectors for reliability
                matsCurveUtils.showReliabilityFace();
                if (!oldDatesExist) {
                    // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-ROC': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.roc);
            }
            // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            // display appropriate selectors for ROC
            matsCurveUtils.showROCFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.roc);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the ROC face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.roc);
                }
                // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                // display appropriate selectors for ROC
                matsCurveUtils.showROCFace();
                if (!oldDatesExist) {
                    // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-Map': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.map);
            }
            // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            // maps need to have the region be station-select mode
            if (matsParamUtils.getParameterForName('region-type') !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('region-type', 'Select stations (bias only)');
            }
            // display appropriate selectors for maps
            matsCurveUtils.showMapFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.map);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the map face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.map);
                }
                // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                // maps need to have the region be station-select mode
                if (matsParamUtils.getParameterForName('region-type') !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('region-type', 'Select stations (bias only)');
                }
                // display appropriate selectors for maps
                matsCurveUtils.showMapFace();
                if (!oldDatesExist) {
                    // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-Histogram': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.histogram);
            }
            // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            // display appropriate selectors for histograms
            matsCurveUtils.showHistogramFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
            const tsDate = $('#controlButton-dates-value').text();
            if (!oldCurveDatesExist) {
                matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (tsDate !== undefined && tsDate !== "" && !oldCurveDatesExist) {
                        curves[ci]['curve-dates'] = tsDate;
                    }
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.histogram);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the histogram face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.histogram);
                }
                // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                // display appropriate selectors for histograms
                matsCurveUtils.showHistogramFace();
                // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
                if (!oldCurveDatesExist) {
                    const tsDate = $('#controlButton-dates-value').text();
                    matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
                }
            }
        }
    },
    'click .plot-type-EnsembleHistogram': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.ensembleHistogram);
            }
            // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            // display appropriate selectors for ensemble histograms
            matsCurveUtils.showEnsembleHistogramFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
            const tsDate = $('#controlButton-dates-value').text();
            if (!oldCurveDatesExist) {
                matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (tsDate !== undefined && tsDate !== "" && !oldCurveDatesExist) {
                        curves[ci]['curve-dates'] = tsDate;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.ensembleHistogram);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the histogram face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.ensembleHistogram);
                }
                // see if the previous plot type also used the 'curve-dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                // display appropriate selectors for ensemble histograms
                matsCurveUtils.showEnsembleHistogramFace();
                // If a 'curve-dates' parameter was not already in use, set the 'curve-dates' parameter to whatever 'dates' was set to.
                if (!oldCurveDatesExist) {
                    const tsDate = $('#controlButton-dates-value').text();
                    matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
                }
            }
        }
    },
    'click .plot-type-Contour': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.contour);
            }
            // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            // contours need to have the region be in predefined mode
            if (matsParamUtils.getParameterForName('region-type') !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('region-type','Predefined region');
            }
            // display appropriate selectors for contours
            matsCurveUtils.showContourFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region-type'] && matsCollections.CurveParams.findOne({name: 'region-type'}) && matsCollections.CurveParams.findOne({name: 'region-type'}).default) {
                        curves[ci]['region-type'] = matsCollections.CurveParams.findOne({name: 'region-type'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                    if (!curves[ci]['x-axis-parameter'] && matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}) && matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}).default) {
                        curves[ci]['x-axis-parameter'] = matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}).default;
                    }
                    if (!curves[ci]['y-axis-parameter'] && matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}) && matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}).default) {
                        curves[ci]['y-axis-parameter'] = matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.contour);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the contour face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.contour);
                }
                // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                // contours need to have the region be in predefined mode
                if (matsParamUtils.getParameterForName('region-type') !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('region-type','Predefined region');
                }
                // display appropriate selectors for contours
                matsCurveUtils.showContourFace();
                if (!oldDatesExist) {
                    // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-ContourDiff': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.contourDiff);
            }
            // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            // contours need to have the region be in predefined mode
            if (matsParamUtils.getParameterForName('region-type') !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('region-type','Predefined region');
            }
            // display appropriate selectors for contours
            matsCurveUtils.showContourFace();
            // make sure the curves already added also have the correct parameters displayed
            var curves = Session.get('Curves');
            // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (!curves[ci]['statistic'] && matsCollections.CurveParams.findOne({name: 'statistic'}) && matsCollections.CurveParams.findOne({name: 'statistic'}).default) {
                        curves[ci]['statistic'] = matsCollections.CurveParams.findOne({name: 'statistic'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['scale'] && matsCollections.CurveParams.findOne({name: 'scale'}) && matsCollections.CurveParams.findOne({name: 'scale'}).default) {
                        curves[ci]['scale'] = matsCollections.CurveParams.findOne({name: 'scale'}).default;
                    }
                    if (!curves[ci]['level'] && matsCollections.CurveParams.findOne({name: 'level'}) && matsCollections.CurveParams.findOne({name: 'level'}).default) {
                        curves[ci]['level'] = matsCollections.CurveParams.findOne({name: 'level'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                    if (!curves[ci]['valid-time'] && matsCollections.CurveParams.findOne({name: 'valid-time'}) && matsCollections.CurveParams.findOne({name: 'valid-time'}).default) {
                        curves[ci]['valid-time'] = matsCollections.CurveParams.findOne({name: 'valid-time'}).default;
                    }
                    if (!curves[ci]['truth'] && matsCollections.CurveParams.findOne({name: 'truth'}) && matsCollections.CurveParams.findOne({name: 'truth'}).default) {
                        curves[ci]['truth'] = matsCollections.CurveParams.findOne({name: 'truth'}).default;
                    }
                    if (!curves[ci]['region'] && matsCollections.CurveParams.findOne({name: 'region'}) && matsCollections.CurveParams.findOne({name: 'region'}).default) {
                        curves[ci]['region'] = matsCollections.CurveParams.findOne({name: 'region'}).default;
                    }
                    if (!curves[ci]['x-axis-parameter'] && matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}) && matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}).default) {
                        curves[ci]['x-axis-parameter'] = matsCollections.CurveParams.findOne({name: 'x-axis-parameter'}).default;
                    }
                    if (!curves[ci]['y-axis-parameter'] && matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}) && matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}).default) {
                        curves[ci]['y-axis-parameter'] = matsCollections.CurveParams.findOne({name: 'y-axis-parameter'}).default;
                    }
                    if (!curves[ci]['significance'] && matsCollections.CurveParams.findOne({name: 'significance'}) && matsCollections.CurveParams.findOne({name: 'significance'}).default) {
                        curves[ci]['significance'] = matsCollections.CurveParams.findOne({name: 'significance'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.contourDiff);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the contour face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.contourDiff);
                }
                // see if the previous plot type also used the 'dates' parameter. If it did, we'll just keep whatever value it's set to
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                // contours need to have the region be in predefined mode
                if (matsParamUtils.getParameterForName('region-type') !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('region-type','Predefined region');
                }
                // display appropriate selectors for contours
                matsCurveUtils.showContourFace();
                if (!oldDatesExist) {
                    // If a 'dates' parameter was not already in use, set the 'dates' parameter to whatever 'curve-dates' was set to.
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-Scatter2d': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // the MET apps have a hidden plot-type selector than needs to match the actual plot type
            if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.scatter2d);
            }
            // see if the previous plot type also used the 'dates' parameter
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showScatterFace();
            // if a 'dates' parameter was already in use, we want to keep that value.
            // otherwise, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.scatter2d);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the scatter face
                // the MET apps have a hidden plot-type selector than needs to match the actual plot type
                if (matsCollections.CurveParams.findOne({name: 'plot-type'}) !== undefined) {
                    matsParamUtils.setInputValueForParamAndTriggerChange('plot-type', matsTypes.PlotTypes.scatter2d);
                }
                // see if the previous plot type also used the 'dates' parameter
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                matsCurveUtils.showScatterFace();
                // if a 'dates' parameter was already in use, we want to keep that value.
                // otherwise, set the 'dates' parameter to whatever 'curve-dates' was set to.
                if (!oldDatesExist) {
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    }
});
