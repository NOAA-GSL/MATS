Meteor.subscribe("CurveParams");
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


Session.set('Curves',[]);
Session.set('PlotParams',[]);

Accounts.ui.config({
    requestOfflineToken: {
        google: true
    }
});


