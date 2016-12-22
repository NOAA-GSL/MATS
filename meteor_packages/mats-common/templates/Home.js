import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import {matsParamUtils } from 'meteor/randyp:mats-common';
Template.Home.onCreated(function(){
    this.subscribe("matsPlotUtils").ready();
    this.subscribe("matsTypes").ready();
    this.subscribe("matsCollections").ready();
    this.subscribe("matsCurveUtils").ready();
    this.subscribe("matsParamUtils").ready();
    this.subscribe("plotType").ready();
    Meteor._reload.onMigrate(function() {
        return [false];
    });
});
