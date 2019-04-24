/*
 * Copyright (c) 2019. Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { BuildConfiguration } from '../api/buildConfiguration.js';
import './configuration.html';

Template.configuration.helpers({
    environment() {
      return this.deployment_environment;
    },
    appReference() {
        return this.app;
    },
    server() {
      return this.server;
    },
    serverDeploymentStatus() {
      return this.deployment_status;
    },
    serverDeploymentStatusColor() {
        return   this.deployment_status === "active" ? "lightgreen" : "red";
    },
    deploymentStatusState() {
        return this.deploymentStatus === "enabled" ? "click to disable Deployment" : "click to enable Deployment";
    },
    deploymentStatusFace(){
        return this.deploymentStatus === "enabled" ? "fa fa-smile-o fa-lg" : "fa fa-frown-o fa-lg";
    },
    deploymentBtnClass() {
        if (this.deploymentStatus === undefined) {
            return "btn-default";
        }
        return   this.deploymentStatus === "enabled" ? "btn-success" : "btn-danger"
    },
    buildStatusState() {
        if (this.buildStatus === undefined ) {
            return "unavailable";
        }
        return this.buildStatus === "enabled" ? "click to disable Build" : "click to enable Build";
    },
    buildStatusFace(){
        return this.buildStatus === "enabled" ? "fa fa-smile-o fa-lg" : "fa fa-frown-o fa-lg";
    },
    buildBtnClass() {
        if (this.buildStatus === undefined){
            return "btn-default";
        }
        return this.buildStatus === "enabled" ? "btn-success" : "btn-danger"
    },
    buildBtnAbility() {
        return this.buildStatus === undefined ? "disabled": "";
    },
    otherParams() {
        var excluded = ['_id', 'deployment_environment', 'server', 'deployment_status', 'app_list'];
        var params = []
        var keys = Object.keys(this);
        for (var i = 0; i < keys.length; i++) {
            if (excluded.indexOf(keys[i]) == -1) {
                params.push([keys[i],this[keys[i]]]);
            }
        };
        return params;
    },
    param() {
        return this[0];
    },
    value() {
        return this[1];
    },
    statusToggle() {
      if (this.deployment_status == 'active') {
        return 'deactivate';
      } else {
        return 'activate';
      }
    },
    configurationApps() {
        return this.app_list;
    }
});

Template.configuration.events({
    'click .configuration-status-toggle'() {
        if (this.deployment_status == 'active') {
            BuildConfiguration.update({'_id': this._id}, {$set: {deployment_status: 'not active'}});
        } else {
            BuildConfiguration.update({'_id': this._id}, {$set: {deployment_status: 'active'}});
        }
        return false;
    },
    'click .deployment-status-toggle'(e) {
        var id = Template.currentData()._id;
        var app_list = BuildConfiguration.findOne({_id:id}).app_list;
        for (var ali = 0; ali < app_list.length; ali++) {
            if (app_list[ali].app == this.app) {
                app_list[ali].deploymentStatus = this.deploymentStatus === 'enabled' ? 'disabled' : 'enabled';
                break;
            }
        }
        BuildConfiguration.update({_id:id},{$set:{app_list:app_list}});
        return false;
    },
    'click .build-status-toggle'(e) {
        var id = Template.currentData()._id;
        var app_list = BuildConfiguration.findOne({_id:id}).app_list;
        for (var ali = 0; ali < app_list.length; ali++) {
            if (app_list[ali].app == this.app) {
                app_list[ali].buildStatus = this.buildStatus === 'enabled' ? 'disabled' : 'enabled';
                break;
            }
        }
        BuildConfiguration.update({_id:id},{$set:{app_list:app_list}});
        return false;
    }
});
