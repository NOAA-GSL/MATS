import { Meteor } from 'meteor/meteor';
import matsCollections from 'meteor/randyp:mats-common';

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
Session.set('Curves',[]);
Session.set('PlotParams',[]);

Accounts.ui.config({
    requestOfflineToken: {
        google: true
    }
});

var ref = location.href;
var pathArray = location.href.split( '/' );
var protocol = pathArray[0];
var hostport = pathArray[2];
var app = pathArray[3] == "" ? "/" : pathArray[3];
var matsRef = protocol + "//" + hostport;
var helpRef = ref.endsWith('/') ? ref + "help" : ref + "/help";
Session.set ("app",{appName:app,matsref:matsRef, appref:ref, helpref:helpRef});
var collections = Object.keys(matsCollections).map(key => matsCollections[key]);
Session.set("Mongol", {
    'collections': collections,
    'display': false,
    'opacity_normal': ".7",
    'opacity_expand': ".9",
    'disable_warning': true
});
