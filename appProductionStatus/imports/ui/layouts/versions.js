/*
 * Copyright (c) 2019. Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import {Deployments} from '../../api/deployments.js';
import './versions.html';

Template.versions.onCreated(function bodyOnCreated() {
    Meteor.subscribe('Deployments');
    document.getElementById('topNav').style.display="none";
});

Template.versions.helpers({
    deployments() {
        var deployments = Deployments.find({}, {sort: {deployment_environment: 1}});
        return deployments;
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