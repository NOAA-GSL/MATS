/**
 * Created by pierce on 8/31/16.
 */
import { Mongo } from 'meteor/mongo';

var CurveParams = new Mongo.Collection("CurveParams");
var Scatter2dParams = new Mongo.Collection("Scatter2dParams");
var CurveTextPatterns = new Mongo.Collection("CurveTextPatterns");
var ScatterAxisTextPattern = new Mongo.Collection("ScatterAxisTextPattern");
var SavedCurveParams = new Mongo.Collection("SavedCurveParams");
var PlotParams = new Mongo.Collection("PlotParams");
var SavedPlotParams = new Mongo.Collection("SavedPlotParams");
var PlotGraphFunctions = new Mongo.Collection("PlotGraphFunctions");
var SavedPlotGraphFunctions = new Mongo.Collection("SavedPlotGraphFunctions");
var RegionsPerModel = new Mongo.Collection("RegionsPerModel");
var SitesPerModel = new Mongo.Collection("SitesPerModel");
var RegionDescriptions = new Mongo.Collection("RegionDescriptions");
var Models = new Mongo.Collection("Models");
var Instruments = new Mongo.Collection("Instruments");
var FcstLensPerModel = new Mongo.Collection("FcstLensPerModel");
var CurveSettings = new Mongo.Collection("CurveSettings");
var Settings = new Mongo.Collection("Settings");
var ColorScheme = new Mongo.Collection("ColorScheme");
var SentAddresses = new Mongo.Collection("SentAddresses");
var Authorization = new Mongo.Collection("Authorization");
var Roles = new Mongo.Collection("Roles");
var SavedRoles = new Mongo.Collection("SavedRoles");
var Databases = new Mongo.Collection("Databases");
var SavedDatabases = new Mongo.Collection("SavedDatabases");
var Credentials = new Mongo.Collection("Credentials");
var SavedCredentials = new Mongo.Collection("SavedCredentials");
var SiteMap = new Mongo.Collection("SiteMap");
//var ServiceConfiguration = new Mongo.Collection("ServiceConfiguration");


const startInit = function () {
    const today = new Date();
    const thenDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yr = thenDate.getUTCFullYear();
    const day = thenDate.getUTCDate();
    const month = thenDate.getUTCMonth() + 1;
    const hour = 0;
    const minute = 0;
    return month + '/' + day + "/" + yr + " " + ("0" + hour).slice(-2) + ":" + ("0" + minute).slice(-2);
};
const stopInit = function () {
    const today = new Date();
    const yr = today.getUTCFullYear();
    const day = today.getUTCDate();
    const month = today.getUTCMonth() + 1;
    const hour = 0;
    const minute = 0;
    return month + '/' + day + "/" + yr + " " + ("0" + hour).slice(-2) + ":" + ("0" + minute).slice(-2);
};

const dateInitStr = function() {
    return startInit() + " - " + stopInit();
};

export default matsCollections = {
    CurveParams:CurveParams,
    Scatter2dParams:Scatter2dParams,
    CurveTextPatterns:CurveTextPatterns,
    ScatterAxisTextPattern:ScatterAxisTextPattern,
    SavedCurveParams:SavedCurveParams,
    PlotParams:PlotParams,
    SavedPlotParams:SavedPlotParams,
    PlotGraphFunctions:PlotGraphFunctions,
    SavedPlotGraphFunctions:SavedPlotGraphFunctions,
    RegionsPerModel:RegionsPerModel,
    SitesPerModel:SitesPerModel,
    RegionDescriptions:RegionDescriptions,
    Models:Models,
    Instruments:Instruments,
    FcstLensPerModel:FcstLensPerModel,
    CurveSettings:CurveSettings,
    Settings:Settings,
    ColorScheme:ColorScheme,
    SentAddresses:SentAddresses,
    Authorization:Authorization,
    Roles:Roles,
    SavedRoles:SavedRoles,
    Databases:Databases,
    SavedDatabases:SavedDatabases,
    Credentials:Credentials,
    SavedCredentials:SavedCredentials,
    SiteMap:SiteMap,
    startInit:startInit,
    stopInit:stopInit,
    dateInitStr: dateInitStr
//    ServiceConfiguration:ServiceConfiguration
};