import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import {matsParamUtils } from 'meteor/randyp:mats-common';

Template.About.helpers({
    version: function () {
        const deploymentRoles = {
                "mats-dev.gsd.esrl.noaa.gov": "development",
                "mats-int.gsd.esrl.noaa.gov": "integration",
                "mats.gsd.esrl.noaa.gov": "production"
            };

        if (matsCollections.Settings.findOne()) {
            var versions = JSON.parse(matsCollections.Settings.findOne().version);
            return "<h3> development: " + versions.development + "</h3>" +
                    "<h3> production: " + versions.production + "</h3>";
        } else {
            return "unknown";
        }
    },
    releaseNotes: function() {
        return "These are the release notes";
    }
});