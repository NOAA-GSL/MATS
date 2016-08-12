CurveParams = new Meteor.Collection("CurveParams");
Scatter2dParams = new Meteor.Collection("Scatter2dParams");
CurveTextPatterns = new Meteor.Collection("CurveTextPatterns");
ScatterAxisTextPattern = new Meteor.Collection("ScatterAxisTextPattern");
SavedCurveParams = new Meteor.Collection("SavedCurveParams");
PlotParams = new Meteor.Collection("PlotParams");
SavedPlotParams = new Meteor.Collection("SavedPlotParams");
PlotGraphFunctions = new Meteor.Collection("PlotGraphFunctions");
SavedPlotGraphFunctions = new Meteor.Collection("SavedPlotGraphFunctions");
RegionsPerModel = new Meteor.Collection("RegionsPerModel");
SitesPerModel = new Meteor.Collection("SitesPerModel");
RegionDescriptions = new Meteor.Collection("RegionDescriptions");
Models = new Meteor.Collection("Models");
FcstLensPerModel = new Meteor.Collection("FcstLensPerModel");
CurveSettings = new Meteor.Collection("CurveSettings");
Settings = new Meteor.Collection("Settings");
ColorScheme = new Meteor.Collection("ColorScheme");
SentAddresses = new Meteor.Collection("SentAddresses");
Authorization = new Meteor.Collection("Authorization");
Roles = new Meteor.Collection("Roles");
SavedRoles = new Meteor.Collection("SavedRoles");
Databases = new Meteor.Collection("Databases");
SavedDatabases = new Meteor.Collection("SavedDatabases");
Credentials = new Meteor.Collection("Credentials");
SavedCredentials = new Meteor.Collection("SavedCredentials");
RangePerDescriptor = new Meteor.Collection("RangePerDescriptor");
SiteMap = new Meteor.Collection("SiteMap");

//Routes
Router.route('/data', function() {
    this.render('data', {
    });
});

Router.route('/', function () {
    this.render('Home', {
    });
});

Router.route('/wfip2', function () {
    this.render('Home', {
    });
});

Router.route('/upperair', function () {
    this.render('Home', {
    });
});

Router.route('/visibility', function () {
    this.render('Home', {
    });
});

Router.route('/surface', function () {
    this.render('Home', {
    });
});

Router.route('/ceiling', function () {
    this.render('Home', {
    });
});


InputTypes = {
    textInput : 'textInput',
    select : 'select',
    numberSpinner : 'numberSpinner',
    dateRange: 'dateRange',
    radioGroup: 'radioGroup',
    checkBoxGroup: 'checkBoxGroup',
    resetButton: 'resetButton',
    controlButton: 'controlButton',
    element: 'element',
    selectMap: 'selectMap',
    custom: 'custom'
};

PlotTypes = {
    timeSeries : "TimeSeries",
    profile : "Profile",
    scatter2d : "Scatter2d"
};

PlotFormats = {
    none: "none",
    matching: "matching",
    pairwise: "pairwise",
    absolute:"absolute"
};

PlotActions = {
    matched: "matched",
    unmatched: "unmatched"
};

BestFits = {
    none:'none',
    linear:'linear',
    linearThroughOrigin:'linearThroughOrigin',
    exponential:'exponential',
    logarithmic:'logarithmic',
    power:'power'
};

MatchFormats = {
    none: "none",
    time: "time",
    level: "level",
    site: "site"
};

PlotAxisFilters = {
    none: "none",
    level: "level",
    site: "site"
};

getCurves = function() {
    return Session.get('Curves');
};
