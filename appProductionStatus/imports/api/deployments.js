/*
 * Copyright (c) 2019. Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
export const Deployments = new Mongo.Collection('deployment');
if (Meteor.isServer) {
    Meteor.publish('Deployments', function deploymentsPublication() {
        Deployments.deny({
            insert: function (doc) {
                return true;
            },
            update: function (doc, fieldNames, modifier) {
                return true;
            },
            remove: function (doc) {
                return true;
            }
        });
        return Deployments.find({});
    });
    // server side route for rest API
    // define some server side routes
    Picker.route('/getStableDeployment/:deployment', function (params, req, res, next) {
        Picker.middleware(_getStableDeployment(params, req, res, next));
    });
    Picker.route('/getStableDeploymentAppList/:deployment', function (params, req, res, next) {
        Picker.middleware(_getStableDeploymentAppList(params, req, res, next));
    });
    Picker.route('/getDeploymentEnvironments', function (params, req, res, next) {
        Picker.middleware(_getDeploymentEnvironments(params, req, res, next));
    });

    // private middleware for _getDeploymentEnvironments route
    const _getDeploymentEnvironments = function (params, req, res, next) {
        var rawdata = Deployments.find({},{fields:{'deployment_environment':1,'_id':0}}).fetch();
        var data = rawdata.map(a => a.deployment_environment);
        var jsonData = JSON.stringify(data, null,2);
        res.setHeader('Content-Type', 'application/json');
        res.write(jsonData);
        res.end();
    }

    // private middleware for _getProductionDeploymentAppsForServer route
    const _getStableDeployment = function (params, req, res, next) {
        var data = Deployments.findOne({deployment_environment: params.deployment},{"apps.app":1,"apps.title":1,"apps.version":1,_id:0});
        if (data == null || data._id == null) {
            data = {"error":"cannot find such a deployment, try .../getStableDeploymentBundle/production"};
        }
        delete data._id;
        delete data.servers;
        if (data.apps != null) {
            data.apps.forEach(function(e){ delete e.last_test_run; delete e.last_test_status; delete e.buildDate;});
        }
        var jsonData = JSON.stringify(data, null,2);
        res.setHeader('Content-Type', 'application/json');
        res.write(jsonData);
        res.end();
    }
    // private middleware for _getProductionDeploymentAppsForServer route
    const _getStableDeploymentAppList = function (params, req, res, next) {
        var data = Deployments.findOne({deployment_environment: params.deployment},{"apps.app":1,"apps.title":1,"apps.version":1,_id:0});
        if (data == null || data._id == null) {
            data = {"error":"cannot find such a deployment, try .../getStableDeploymentBundle/production"};
        }
        var jsonData = JSON.stringify(data.apps, ["apps","app","title","group"],2);

        res.setHeader('Content-Type', 'application/json');
        res.write(jsonData);
        res.end();
    }

}
Meteor.methods({
});
