/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
//import {Groups} from "groups.js";


Meteor.methods({
    'getEnvironment'() {
        const env = process.env.DEPLOYMENT_ENVIRONMENT;
        if (env === undefined) {
            throw new Meteor.Error('deployment environment is unknown (ENV variable deployment_environment is not set)');
        }
        return env;
    }
});

if (Meteor.isServer) {
    // add a status route
    Picker.route('/status', function (params, req, res, next) {
        Picker.middleware(_status(params, req, res, next));
    });

    Picker.route('/:app/status', function (params, req, res, next) {
        Picker.middleware(_status(params, req, res, next));
    });

    Picker.route(Meteor.settings.public.proxy_prefix_path + '/status', function (params, req, res, next) {
        Picker.middleware(_status(params, req, res, next));
    });

    Picker.route(Meteor.settings.public.proxy_prefix_path + '/:app/status', function (params, req, res, next) {
        Picker.middleware(_status(params, req, res, next));
    });
}

// private middleware for getting the status - think health check
const _status = function (params, req, res, next) {
    if (Meteor.isServer) {
        if (params.app == "home") {
            res.end("<body><div id='status'>Running</div></body>");
        } else {
            res.end("<body><div id='status'>Wrong app</div></body>");
        }
    }
};
