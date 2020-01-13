/*
 * Copyright (c) 2019 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import {Groups} from "../../api/groups.js";


Meteor.methods({
    'getEnvironment'() {
        const env = process.env.DEPLOYMENT_ENVIRONMENT;
        if (env === undefined) {
            throw new Meteor.Error('deployment environment is unknown (ENV variable deployment_environment is not set)');
        }
        return env;
    }
});
