import { matsCollections } from 'meteor/randyp:mats-common';

Template.version.helpers({
    version: function() {
        if (matsCollections.Settings.findOne()) {
            var settings = matsCollections.Settings.findOne({});
            var versions = JSON.parse(settings.appVersion);
            var hostname = settings.hostname;
            var deploymentRoles = JSON.parse(settings.deploymentRoles);
            var role = deploymentRoles[hostname];

            switch (role) {
                case "development" :
                    return versions.development;
                    break;

                case "integration" :
                    return versions.integration;
                    break;

                case "production" :
                    return versions.production;
                    break;

                default:
                    return "development: " + versions.development + "," + " integration: " + versions.integration + "," + " production: " + versions.production;
            }

            return "development: " + versions.development + "," + "integration: " + versions.integration + "," + " production: " + versions.production;
        } else {
            return "unknown";
        }
    }
});