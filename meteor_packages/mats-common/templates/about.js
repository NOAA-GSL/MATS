import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import { jqueryui } from 'jquery-ui';

Template.About.helpers({
    version: function () {
        var settings = matsCollections.Settings.findOne({});
        var version = "unknown";
        var buildDate = "unkown";
        if (settings) {
            version = settings.appVersion;
            buildDate = settings.buildDate;
        }
        versionStr = "<h3>" + version + "</h3>";
        return versionStr + "<h3> Last Build Date: " + buildDate + "</h3>";

    }
});