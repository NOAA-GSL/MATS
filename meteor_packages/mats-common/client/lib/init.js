Meteor.subscribe("CurveParams");
Meteor.subscribe("Scatter2dParams");
Meteor.subscribe("SavedCurveParams");
Meteor.subscribe("PlotParams");
Meteor.subscribe("PlotGraphFunctions");
Meteor.subscribe("RegionsPerModel");
Meteor.subscribe("SitesPerModel");
Meteor.subscribe("RegionDescriptions");
Meteor.subscribe("RegionNameMapping");
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
var app = pathArray[3];
var matsref = protocol + "//" + hostport;
var appName = app;
Session.set ("app",{appName:app,matsref:matsref, appref:ref, helpref:ref + "/help"});

