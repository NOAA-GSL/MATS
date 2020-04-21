/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { matsPlotUtils } from 'meteor/randyp:mats-common';
import { matsTypes } from 'meteor/randyp:mats-common';
import { matsCollections } from 'meteor/randyp:mats-common';
import { matsCurveUtils } from 'meteor/randyp:mats-common';
import {matsParamUtils } from 'meteor/randyp:mats-common';

Template.CustomHome.onCreated(function() {
    this.subscribe("matsPlotUtils").ready();
    this.subscribe("matsTypes").ready();
    this.subscribe("matsCollections").ready();
    this.subscribe("matsCurveUtils").ready();
    this.subscribe("matsParamUtils").ready();
    this.subscribe("plotType").ready();
});

Template.CustomHome.helpers({
    isUnderConstruction: function () {
        return matsCollections.CurveParams.findOne({name:'underConstruction'}) !== undefined;
    },
    resetDefaults: function() {
        matsMethods.refreshMetaData.call({}, function (error, result) {
            if (error !== undefined) {
                setError(new Error(error.message));
            }
            matsParamUtils.setAllParamsToDefault();
        });
    }
});
