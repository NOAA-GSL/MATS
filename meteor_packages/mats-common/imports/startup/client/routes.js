/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
FlowRouter.route('/', {
    name: 'main',
    action() {
        this.render('Home')
    }
});

FlowRouter.route('/CSV/:graphFunction/:key/:matching/:appName', {
    name: 'csv',
    action(params) {
        console.log("in csv route");
        window.location.href=FlowRouter.path;
    }
});

FlowRouter.route('/JSON/:graphFunction/:key/:matching/:appName', {
    name: 'json',
    action(params) {
        console.log("in json route");
        window.location.href=FlowRouter.path;
    }
});


FlowRouter.route('/preview/:graphFunction/:key/:matching/:appName', {
    name: 'preview',
    action(params) {
        console.log("in preview route- setting params", params);
        this.render('GraphStandAlone', params);
    }
});


FlowRouter.route('/gsd/mats/*/preview/:graphFunction/:key/:matching/:appName', {
    name: 'preview',
    action(params) {
        console.log("in preview route- setting params", params);
        this.render('GraphStandAlone', params);
    }
});

FlowRouter.route('/gsd/mats/*/', {
    name: 'main',
    action() {
        this.render('Home')
    }
});

FlowRouter.route('*', {
    action() {
        console.log ('route: ' + ' not found' );
        this.render('notFound');
    }
});
