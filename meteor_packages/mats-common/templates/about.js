/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import { matsParamUtils } from 'meteor/randyp:mats-common';
import { jqueryui } from 'jquery-ui';
import matsMethods from "../imports/startup/api/matsMethods";

var notes;

Template.About.helpers({
    version: function () {
        var settings = matsCollections.Settings.findOne({});
        var version = "unknown";
        var buildDate = "unkown";
        if (settings) {
            version = settings.appVersion;
            buildDate = settings.buildDate;
        }
        versionStr = "<div class='row' style='text-align:center'>Version: " + version + "</div>";
        return versionStr + "<div class='row' style='text-align:center'> Last Build Date: " + buildDate + "</div>";

    },
    releaseNotes: function() {
        Session.get('notesUpdated');
        return notes;
    }
});

Template.About.events({
    'click .show-release-notes': function () {
        matsMethods.getReleaseNotes.call({},function (error, result) {
            if (error !== undefined) {
                setError(error);
                return "<p>" + error + "</p>";
            }
            notes = result;
            Session.set('notesUpdated', Date.now());
        });
        document.getElementById('releaseNotes').style.display = "block";
    },
    'click .hide-release-notes': function () {
        document.getElementById('releaseNotes').style.display = "none";
    }
});