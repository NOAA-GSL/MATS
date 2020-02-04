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
        return document.location + "/img/noaa_transparent.gif";
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
        switch (getRunEnvironment()) {
            case "metexpress":
                return "";
                break;
            default:
                return "";
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
    'click .matshome': function (event) {
        event.preventDefault();
        var homeref = document.referrer;
        if (typeof Meteor.settings.public !== "undefined" && typeof Meteor.settings.public.home != "undefined") {
            homeref = Meteor.settings.public.home;
        } else {
            if (homeref === "" || typeof homeref === "undefined") {
                var r = document.location.href;
                var rparts = r.split(":");
                if (rparts.length >= 2) {
                    // has a port - remove the port part
                    rparts.pop
                    homeref = rparts.join(":");
                } else {
                    // doesn't have a port - strip the appreference
                    var appref = Session.get("app").appref;
                    homeref = appref.substring(0, appref.lastIndexOf("/"));
                }
            }
        }
        window.location.replace(homeref);
        return false;
    },
    'click .about': function () {
        $("#modal-display-about").modal();
        return false;
    }
});
