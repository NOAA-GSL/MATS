/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import { Meteor } from 'meteor/meteor';
import matsCollections from 'meteor/randyp:mats-common';
if (Meteor.isClient) {
    Meteor.subscribe("CurveParams");
    Meteor.subscribe("Scatter2dParams");
    Meteor.subscribe("SavedCurveParams");
    Meteor.subscribe("PlotParams");
    Meteor.subscribe("PlotGraphFunctions");
    Meteor.subscribe("RegionsPerModel");
    Meteor.subscribe("SitesPerModel");
    Meteor.subscribe("RegionDescriptions");
    Meteor.subscribe("Models");
    Meteor.subscribe("FcstLensPerModel");
    Meteor.subscribe("ColorScheme");
    Meteor.subscribe("Settings");
    Meteor.subscribe("CurveSettings");
    Meteor.subscribe("SentAddresses");
    Meteor.subscribe("Roles");
    Meteor.subscribe("Authorization");
    Meteor.subscribe("Credentials");
    Meteor.subscribe("Databases");
    Meteor.subscribe("CurveTextPatterns");
    Meteor.subscribe("ScatterAxisTextPattern");
    Meteor.subscribe("RangePerDescriptor");
    Meteor.subscribe("SiteMap");
    Meteor.subscribe("StationMap");
    Meteor.subscribe("appName");
    Meteor.subscribe("LayoutStoreCollection");
    Session.set('Curves', []);
    Session.set('PlotParams', []);

    Accounts.ui.config({
        requestOfflineToken: {
            google: true
        }
    });

    const ref = location.href;
    const pathArray = location.href.split('/');
    const protocol = pathArray[0];
    const hostport = pathArray[2];
    const hostName = hostport.split(':')[0];
    const app = pathArray[3] == "" ? "/" : pathArray[3];
    const matsRef = protocol + "//" + hostport;
    const helpRef = ref.endsWith('/') ? ref + "help" : ref + "/help";
    Session.set("app", {appName: app, matsref: matsRef, appref: ref, helpref: helpRef, hostName: hostName});
    var collections = Object.keys(matsCollections).map(key => matsCollections[key]);
    Session.set("Mongol", {
        'collections': collections,
        'display': false,
        'opacity_normal': ".7",
        'opacity_expand': ".9",
        'disable_warning': true
    });
}