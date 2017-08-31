import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import {matsParamUtils } from 'meteor/randyp:mats-common';

Template.About.helpers({
    version: function () {
        var settings = matsCollections.Settings.findOne({});
        if (settings) {
            var versions = JSON.parse(settings.appVersion);
            var hostname = settings.hostname;
            var deploymentRoles = JSON.parse(settings.deploymentRoles);
            var role = deploymentRoles[hostname];

            var buildDate = "";
            var versionStr = "<h3>";
            switch (role) {
                case "development" :
                    versionStr += "development: " + versions.development;
                    buildDate = versions.development.split('-')[1];
                    break;
                case "integration" :
                    versionStr += "integration: " + versions.integration;
                    buildDate = versions.integration.split('-')[1];
                    break;
                case "production" :
                    versionStr += "production: " + versions.production;
                    buildDate = versions.integration.split('-')[1];
                    break;
                default:
                    versionStr += "development: " + versions.development + "," + " integration: " + versions.integration + "," + " production: " + versions.production;
                    buildDate = versions.development.split('-')[1];
            }

            versionStr += "</h3>";
            return versionStr + "<h3> Last Build Date: " + buildDate + "</h3>";

        } else {
            return "unknown";
        }
    }
});