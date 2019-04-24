/*
 * Copyright (c) 2019. Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {Template} from 'meteor/templating';
import {BuildConfiguration} from '../api/buildConfiguration.js';
import {Deployments} from '../api/deployments.js';

import './configuration.js';
import './deployment.js';
import './body.html';

Template.body.onCreated(function bodyOnCreated() {
    Meteor.subscribe('Deployments');
    Meteor.subscribe('BuildConfiguration');
});

Template.body.helpers({
    configurations() {
        var configs = BuildConfiguration.find({}, {sort: {deployment_environment: 1}});
        return configs;
    },
    deployments() {
        var deployments = Deployments.find({}, {sort: {deployment_environment: 1}});
        return deployments;
    },
    environments() {
        var deployments = Deployments.find({}, {sort: {deployment_environment: 1}});
    },
    environment() {
      return this.deployment_environment;
    },
    apps() {
        return this.apps;
    },
    title() {
        return this.title;
    },
    buildDate() {
        return this.buildDate;
    },
    version() {
        return this.version;
    },
    lastTestStatus() {
        return this.last_test_status;
    },
    lastTestRunDate() {
        return this.last_test_run;
    }
});

Template.body.events({
    'click .toggle-deployment'(e) {
        var environments = Deployments.find({}, {sort: {deployment_environment: 1}}).fetch();
        for (var eIndex = 0; eIndex < environments.length; eIndex++) {
            var eid = environments[eIndex].deployment_environment + '-deploy';
            if (environments[eIndex].deployment_environment.trim() === e.currentTarget.textContent.trim()) {
                document.getElementById(eid).style.display =
                    document.getElementById(eid).style.display == "block" ? "none" : "block";
            } else {
                document.getElementById(eid).style.display = "none";
            }
        }
        return false;
    },
    'click .toggle-configuration'(e) {
        var environments = BuildConfiguration.find({}, {sort: {deployment_environment: 1}}).fetch();
        for (var eIndex = 0; eIndex < environments.length; eIndex++) {
            var eid = environments[eIndex].deployment_environment + '-config';
            if (environments[eIndex].deployment_environment.trim() === e.currentTarget.textContent.trim()) {
                document.getElementById(eid).style.display =
                    document.getElementById(eid).style.display == "block" ? "none" : "block";
            } else {
                document.getElementById(eid).style.display = "none";
            }
        }
        return false;
    },
    'click .category'(e) {
        var categoryDivs = $("div[class='category']")
        for (var cIndex = 0; cIndex < categoryDivs.length; cIndex++) {
            var cDiv = categoryDivs[cIndex];
            if (e.currentTarget.textContent.toLowerCase().trim() === cDiv.id) {
                cDiv.style.display = cDiv.style.display === "none" ? "block": "none";
            } else {
                cDiv.style.display = "none";
            }
        }
        return false;
    }
});
