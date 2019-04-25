/*
 * Copyright (c) 2019. Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Deployments } from '../api/deployments.js';
import './deployment.html';

Template.deployment.helpers({
    servers() {
      return this.servers;
    },
    deploymentApps() {
        return this.apps;
    },
    appTitle() {
        return this.title;
    },
    appVersion() {
        return this.version;
    },
    appBuildDate() {
        return this.buildDate;
    },
    lastTestRun() {
        return this.last_test_run;
    },
    lastTestStatus() {
        return this.last_test_status;
    },
    environment() {
        return this.deployment_environment;
    }

});

Template.deployment.events({
});
