/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
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
        var base_arr = document.location.href.split('/');
        base_arr.pop();
        return  base_arr.join('/') + "/img/noaa_transparent.gif";
    },
    agencyText: function () {
        switch (getRunEnvironment()) {
            case "metexpress":
                return "National Weather Service";
                break;
            default:
                return "Earth System Research Laboratory";
        }
    },
    agencyLink: function () {
        switch (getRunEnvironment()) {
            case "metexpress":
                return "https://www.weather.gov/";
                break;
            default:
                return "http://esrl.noaa.gov/gsd/mdb";
        }
    },
    productText: function () {
        switch (getRunEnvironment()) {
            case "metexpress":
                return "METexpress";
                break;
            default:
                return "Model Analysis Tool Suite";
        }
    },
    productLink: function () {
            const location = document.location.href;
            const locationArr = location.split('/');
            const lastPart = locationArr[locationArr.length - 1]
            if (lastPart == "home") {
                return location;
            } else {
                locationArr.pop();
                return locationArr.join('/') + "/home";
            }
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
