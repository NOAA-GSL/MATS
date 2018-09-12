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
    isNewWindow: function () {
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
    'click .plot-type-TimeSeries': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // see if the previous plot type also used the 'dates' parameter
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showTimeseriesFace();
            var curves = Session.get('Curves');
            // if a 'dates' parameter was already in use, we want to keep that value.
            // otherwise, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    // the average may not have been carried over from other curve types so let it default
                    if (!curves[ci]['average'] && matsCollections.CurveParams.findOne({name: 'average'}) && matsCollections.CurveParams.findOne({name: 'average'}).default) {
                        curves[ci]['average'] = matsCollections.CurveParams.findOne({name: 'average'}).default;
                    }
                    if (!curves[ci]['validtime'] && matsCollections.CurveParams.findOne({name: 'validtime'}) && matsCollections.CurveParams.findOne({name: 'validtime'}).default) {
                        curves[ci]['validtime'] = matsCollections.CurveParams.findOne({name: 'validtime'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.timeSeries);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the timeseries face
                // see if the previous plot type also used the 'dates' parameter
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                matsCurveUtils.showTimeseriesFace();
                // if a 'dates' parameter was already in use, we want to keep that value.
                // otherwise, set the 'dates' parameter to whatever 'curve-dates' was set to.
                if (!oldDatesExist) {
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-Profile': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // see if the previous plot type also used the 'curve-dates' parameter
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showProfileFace();
            var curves = Session.get('Curves');
            // if a 'curve-dates' parameter was already in use, we want to keep that value.
            // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
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
                    if (!curves[ci]['validtime'] && matsCollections.CurveParams.findOne({name: 'validtime'}) && matsCollections.CurveParams.findOne({name: 'validtime'}).default) {
                        curves[ci]['validtime'] = matsCollections.CurveParams.findOne({name: 'validtime'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.profile);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the profile face
                // see if the previous plot type also used the 'curve-dates' parameter
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                matsCurveUtils.showProfileFace();
                // if a 'curve-dates' parameter was already in use, we want to keep that value.
                // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
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
            // see if the previous plot type also used the 'curve-dates' parameter
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showDieOffFace();
            var curves = Session.get('Curves');
            // if a 'curve-dates' parameter was already in use, we want to keep that value.
            // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
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
                    if (!curves[ci]['validtime'] && matsCollections.CurveParams.findOne({name: 'validtime'}) && matsCollections.CurveParams.findOne({name: 'validtime'}).default) {
                        curves[ci]['validtime'] = matsCollections.CurveParams.findOne({name: 'validtime'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['dieoff-forecast-length'] && matsCollections.CurveParams.findOne({name: 'dieoff-forecast-length'}) && matsCollections.CurveParams.findOne({name: 'dieoff-forecast-length'}).default) {
                        curves[ci]['dieoff-forecast-length'] = matsCollections.CurveParams.findOne({name: 'dieoff-forecast-length'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.dieoff);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the dieoff face
                // see if the previous plot type also used the 'curve-dates' parameter
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                matsCurveUtils.showDieOffFace();
                // if a 'curve-dates' parameter was already in use, we want to keep that value.
                // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
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
            // see if the previous plot type also used the 'curve-dates' parameter
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showThresholdFace();
            var curves = Session.get('Curves');
            // if a 'curve-dates' parameter was already in use, we want to keep that value.
            // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
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
                    if (!curves[ci]['validtime'] && matsCollections.CurveParams.findOne({name: 'validtime'}) && matsCollections.CurveParams.findOne({name: 'validtime'}).default) {
                        curves[ci]['validtime'] = matsCollections.CurveParams.findOne({name: 'validtime'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.threshold);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the threshold face
                // see if the previous plot type also used the 'curve-dates' parameter
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                matsCurveUtils.showThresholdFace();
                // if a 'curve-dates' parameter was already in use, we want to keep that value.
                // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
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
            // see if the previous plot type also used the 'curve-dates' parameter
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showValidTimeFace();
            var curves = Session.get('Curves');
            // if a 'curve-dates' parameter was already in use, we want to keep that value.
            // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
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
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            // matsMethods.refreshMetaData.call({}, function (error, result) {
            //     if (error !== undefined) {
            //         setError(new Error(error.message));
            //     }
            //     matsParamUtils.setAllParamsToDefault();
            //     Session.set("lastUpdate", Date.now());
            // });
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.validtime);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the valid time face
                // see if the previous plot type also used the 'curve-dates' parameter
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                matsCurveUtils.showValidTimeFace();
                // if a 'curve-dates' parameter was already in use, we want to keep that value.
                // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
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
            // see if the previous plot type also used the 'dates' parameter
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showDailyModelCycleFace();
            var curves = Session.get('Curves');
            // if a 'dates' parameter was already in use, we want to keep that value.
            // otherwise, set the 'dates' parameter to whatever 'curve-dates' was set to.
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
                    if (!curves[ci]['utc-cycle-start'] && matsCollections.CurveParams.findOne({name: 'utc-cycle-start'}) && matsCollections.CurveParams.findOne({name: 'utc-cycle-start'}).default) {
                        curves[ci]['utc-cycle-start'] = matsCollections.CurveParams.findOne({name: 'utc-cycle-start'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.dailyModelCycle);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the daily model cycle face
                // see if the previous plot type also used the 'dates' parameter
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                matsCurveUtils.showDailyModelCycleFace();
                // if a 'dates' parameter was already in use, we want to keep that value.
                // otherwise, set the 'dates' parameter to whatever 'curve-dates' was set to.
                if (!oldDatesExist) {
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-Map': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // see if the previous plot type also used the 'dates' parameter
            const oldDatesExist = matsParamUtils.isParamVisible('dates');
            matsCurveUtils.showMapFace();
            var curves = Session.get('Curves');
            // if a 'dates' parameter was already in use, we want to keep that value.
            // otherwise, set the 'dates' parameter to whatever 'curve-dates' was set to.
            if (!oldDatesExist) {
                const curveDate = $('#controlButton-curve-dates-value').text();
                matsParamUtils.setValueTextForParamName('dates', curveDate)
            }
            if (curves.length > 0) {
                // initialize parameters that may not have been used yet
                for (var ci = 0; ci < curves.length; ci++) {
                    if (!curves[ci]['validtime'] && matsCollections.CurveParams.findOne({name: 'validtime'}) && matsCollections.CurveParams.findOne({name: 'validtime'}).default) {
                        curves[ci]['validtime'] = matsCollections.CurveParams.findOne({name: 'validtime'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.map);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the map face
                // see if the previous plot type also used the 'dates' parameter
                const oldDatesExist = matsParamUtils.isParamVisible('dates');
                matsCurveUtils.showMapFace();
                // if a 'dates' parameter was already in use, we want to keep that value.
                // otherwise, set the 'dates' parameter to whatever 'curve-dates' was set to.
                if (!oldDatesExist) {
                    const curveDate = $('#controlButton-curve-dates-value').text();
                    matsParamUtils.setValueTextForParamName('dates', curveDate)
                }
            }
        }
    },
    'click .plot-type-Histogram': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
            // see if the previous plot type also used the 'curve-dates' parameter
            const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
            matsCurveUtils.showHistogramFace();
            var curves = Session.get('Curves');
            // if a 'curve-dates' parameter was already in use, we want to keep that value.
            // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
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
                    if (!curves[ci]['validtime'] && matsCollections.CurveParams.findOne({name: 'validtime'}) && matsCollections.CurveParams.findOne({name: 'validtime'}).default) {
                        curves[ci]['validtime'] = matsCollections.CurveParams.findOne({name: 'validtime'}).default;
                    }
                    if (!curves[ci]['threshold'] && matsCollections.CurveParams.findOne({name: 'threshold'}) && matsCollections.CurveParams.findOne({name: 'threshold'}).default) {
                        curves[ci]['threshold'] = matsCollections.CurveParams.findOne({name: 'threshold'}).default;
                    }
                    if (!curves[ci]['forecast-length'] && matsCollections.CurveParams.findOne({name: 'forecast-length'}) && matsCollections.CurveParams.findOne({name: 'forecast-length'}).default) {
                        curves[ci]['forecast-length'] = matsCollections.CurveParams.findOne({name: 'forecast-length'}).default;
                    }
                }
                Session.set('Curves', curves);
            }
            Session.set("confirmPlotChange", "");
            Session.set('plotChangeType', "");
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.histogram);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the histogram face
                // see if the previous plot type also used the 'curve-dates' parameter
                const oldCurveDatesExist = matsParamUtils.isParamVisible('curve-dates');
                matsCurveUtils.showHistogramFace();
                // if a 'curve-dates' parameter was already in use, we want to keep that value.
                // otherwise, set the 'curve-dates' parameter to whatever 'dates' was set to.
                if (!oldCurveDatesExist) {
                    const tsDate = $('#controlButton-dates-value').text();
                    matsParamUtils.setValueTextForParamName('curve-dates', tsDate)
                }
            }
        }
    },
    'click .plot-type-Scatter2d': function (event) {
        if (Session.get("confirmPlotChange")) {
            // change has been confirmed
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
            return false;
        } else {
            // no confirmation yet so check to see if we have any curves and if so then show the confirm dialog
            if (Session.get("Curves").length > 0) {
                Session.set('plotChangeType', matsTypes.PlotTypes.scatter2d);
                $("#modal-change-plot-type").modal();
            } else {
                // no curves - just set the scatter face
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
    },
    'click .newapp': function () {
        var win = window.open(window.location.href, Date.now(), 'toolbar=0,location=0,menubar=0, resizeable=1, status=0,titlebar=0');
        win.document.title = matsCollections.Settings === undefined ? "new app" : matsCollections.Settings.findOne({}, {fields: {Title: 1}});
    },
    'click .closeapp': function () {
        window.close();
    }
});
