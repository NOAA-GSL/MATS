/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */
import matsMethods from "../../imports/startup/api/matsMethods";

const getRunEnvironment = function () {
    if (Session.get('deployment_environment') == undefined) {
        matsMethods.getRunEnvironment.call({}, function (error, result) {
            if (error !== undefined) {
                setError(error);
                return "<p>" + error + "</p>";
            }
            Session.set('deployment_environment', result);
            return result;
        });
    } else {
        return Session.get('deployment_environment')
    }
}

Template.topNav.helpers({
    transparentGif: function() {
        return  document.location.href + "/img/noaa_transparent.gif";
    },
    agencyText: function () {
        switch (getRunEnvironment()) {
            case "metexpress":
                return "National Weather Service";
                break;
            default:
                return "Global Systems Laboratory";
        }
    },
    agencyLink: function () {
        switch (getRunEnvironment()) {
            case "metexpress":
                return "https://www.weather.gov/";
                break;
            default:
                return "http://esrl.noaa.gov/gsd/";
        }
    },
    productText: function () {
        switch (getRunEnvironment()) {
            case "metexpress":
                return "METexpress";
                break;
            default:
                return "Model Analysis Tool Suite (MATS)";
        }
    },
    productLink: function () {
            const location = document.location.href;
            const locationArr = location.split('/');
            locationArr.pop();
            return locationArr.join('/');
    },
    isMetexpress: function () {
        if (matsCollections.Settings.findOne({}) !== undefined && matsCollections.Settings.findOne({}).appType !== undefined) {
            const appType = matsCollections.Settings.findOne({}).appType;
            return appType === matsTypes.AppTypes.metexpress;
        } else {
            return false;
        }
    }
});

Template.topNav.events({
    'click .about': function () {
        $("#modal-display-about").modal();
        return false;
    }
});
