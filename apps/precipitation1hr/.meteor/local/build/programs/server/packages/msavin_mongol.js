(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var check = Package.check.check;
var Match = Package.check.Match;

/* Package-scope variables */
var MeteorToysDict, Mongol, updData, newId, canRun, targetCollection, trashDocument, insertDoc, collectionObjects, collections;

(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/lib/common.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Grab the Dict
if (Meteor.isClient) {
  Meteor.startup(function () {
    MeteorToysDict = Package["meteortoys:toykit"].MeteorToys;
  })
}

// Create object and reserve name across the package
if (Mongol === undefined) {  
  Mongol = {};
}

Mongol = {
  'getDocumentUpdate': function (data) {
    var elementID = 'MongolDoc_' + data,
      newData = false;
      updData = document.getElementById(elementID);
      if (updData) {
        newData = updData.textContent;
      }

    return newData;
  },
  'error': function (data) {
    switch (data) {
      case "json.parse":
        alert("There is an error with your JSON syntax.\n\nNote: keys and string values need double quotes.");
        break;
      case "duplicate":
        alert("Strange, there was an error duplicating your document.");
        break;
      case "remove":
        alert("Strange, there was an error removing your document.");
        break;
      case "insert":
        alert("Strange, there was an error inserting your document.");
        break;
      case "update":
        alert("There was an error updating your document. Please review your changes and try again.");
        break;
      default:
        return "Unknown Error";
        break;
    }
  },
  'parse': function (data) {
      var newObject = null;
      try { 
        var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
        var dateParser = function (key, value) {
          if (_.isString(value)) {
            var a = reISO.exec(value);
            if (a) {
              return new Date(value);
            }
          }
          return value;
        }
        newObject = JSON.parse(data, dateParser);
      }
      catch (error) {
        Mongol.error("json.parse");
      }
      return newObject;
  },
  'detectCollections': function () {
    if (MeteorToysDict.get('Mongol') === undefined) {
        // Note: this returns the actual mongo collection name
        var collections = _.map(Mongo.Collection.getAll(), function (collection) {
        return collection.name;
      });

      var defaults = {
        'collections': collections,
      };

      MeteorToysDict.set("Mongol", defaults);

    }
  },
  'hideCollection': function (collectionName) {

    var MongolConfig = MeteorToysDict.get("Mongol"),
        collections  = MongolConfig.collections;

    collections = _.without(collections, collectionName);
    MongolConfig.collections = collections;
    MeteorToysDict.set("Mongol", MongolConfig);
    
  },
  'showCollection': function (collectionName) {
    // In case a collection does not get detected, like a local one
    var MongolConfig = MeteorToysDict.get("Mongol"),
        collections  = MongolConfig.collections;

    collections.push(collectionName);
    
    MeteorToysDict.set("Mongol", MongolConfig);
  },
  'hideVelocity': function () {
    this.hideCollection('velocityTestFiles');
    this.hideCollection('velocityFixtureFiles');
    this.hideCollection('velocityTestReports');
    this.hideCollection('velocityAggregateReports');
    this.hideCollection('velocityLogs');
    this.hideCollection('velocityMirrors');
    this.hideCollection('velocityOptions');
  },
  'hideMeteorToys': function () {
    this.hideCollection("MeteorToys.Impersonate");
    this.hideCollection("MeteorToys.JetSetter");
    this.hideCollection("MeteorToys.Mongol");
    this.hideCollection("MeteorToys.AutoPub");
    this.hideCollection("MeteorToys.Email");
    this.hideCollection("MeteorToys.Result");
    this.hideCollection("MeteorToys.Throttle");
  },
  'hideMeteor': function () {
    this.hideCollection("meteor_accounts_loginServiceConfiguration")
    this.hideCollection("meteor_autoupdate_clientVersions")
  },
  'Collection': function (collectionName) {

    // Go through a variety of means of trying to return the correct collection
    return Mongo.Collection.get(collectionName)
      // This should automatically match all collections by default
      // including namespaced collections

    || ((Meteor.isServer) ? eval(collectionName) : Meteor._get.apply(null,[window].concat(collectionName.split('.'))))
    // For user defined collection names
    // in the form of Meteor's Mongo.Collection names as strings

    || ((Meteor.isServer) ? eval(firstToUpper(collectionName)) : Meteor._get.apply(null,[window].concat(firstToUpper(collectionName).split('.'))))
    // For user defined collections where the user has typical upper-case collection names
    // but they've put actual mongodb collection names into the Mongol config instead of Meteor's Mongo.Collection names as strings

    || null;
    // If the user has gone for unconventional casing of collection names,
    // they'll have to get them right (i.e. Meteor's Mongo.Collection names as string) in the Mongol config manually

    // Changes the first character of a string to upper case

    function firstToUpper(text) {

      return text.charAt(0).toUpperCase() + text.substr(1);

    }
  },
  'insertDoc': function (MongolCollection, documentData) {

    check(MongolCollection, Match.Any);
    check(documentData, Match.Any);

    if (!!Package['aldeed:simple-schema'] && !!Package['aldeed:collection2'] && _.isFunction(MongolCollection.simpleSchema) && MongolCollection._c2) {
      // This is to nullify the effects of SimpleSchema/Collection2
      newId = MongolCollection.insert(documentData, {
        filter: false,
        autoConvert: false,
        removeEmptyStrings: false,
        validate: false
      });
    }
    else {
      newId = MongolCollection.insert(documentData);
    }
    return newId;
  }
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/server/methods.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0xa4e6=["\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73","\x63\x61\x6C\x6C","\x73\x74\x61\x72\x74\x75\x70","\x5F\x69\x64","\x66\x69\x6E\x64\x4F\x6E\x65","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x69\x6E\x73\x65\x72\x74","\x64\x69\x66\x66\x44\x6F\x63\x75\x6D\x65\x6E\x74\x44\x61\x74\x61","\x61\x6C\x64\x65\x65\x64\x3A\x63\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E\x32","\x73\x69\x6D\x70\x6C\x65\x53\x63\x68\x65\x6D\x61","\x69\x73\x46\x75\x6E\x63\x74\x69\x6F\x6E","\x5F\x63\x32","\x72\x61\x77\x43\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E","\x75\x70\x64\x61\x74\x65","\x75\x6E\x64\x65\x66\x69\x6E\x65\x64","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x4D\x6F\x6E\x67\x6F\x6C","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6F\x72\x69\x67\x69\x6E","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x61\x74\x65","\x69\x6E\x73\x65\x72\x74","\x72\x65\x6D\x6F\x76\x65","\x69\x6E\x73\x65\x72\x74\x44\x6F\x63","\x44\x75\x70\x6C\x69\x63\x61\x74\x65\x20\x5F\x69\x64\x20\x66\x6F\x75\x6E\x64","\x6C\x6F\x67","\x67\x65\x74\x41\x6C\x6C","\x43\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E","\x6E\x61\x6D\x65","\x70\x75\x73\x68","\x6D\x61\x70","\x67\x65\x74","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x49\x6D\x70\x65\x72\x73\x6F\x6E\x61\x74\x65","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x4A\x65\x74\x53\x65\x74\x74\x65\x72","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x41\x75\x74\x6F\x50\x75\x62","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x45\x6D\x61\x69\x6C","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x52\x65\x73\x75\x6C\x74","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x54\x68\x72\x6F\x74\x74\x6C\x65","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x43\x72\x65\x64\x65\x6E\x74\x69\x61\x6C\x73","\x6D\x65\x74\x68\x6F\x64\x73"];canRun= false;Meteor[_0xa4e6[2]](function(){Meteor[_0xa4e6[1]](_0xa4e6[0],function(_0x6409x1,_0x6409x2){canRun= _0x6409x2})});Meteor[_0xa4e6[35]]({Mongol_update:function(_0x6409x3,_0x6409x4,_0x6409x5){check(_0x6409x3,String);check(_0x6409x4,Object);check(_0x6409x5,Object);var _0x6409x6=Mongol.Collection(_0x6409x3),_0x6409x7=_0x6409x4[_0xa4e6[3]],_0x6409x8=_0x6409x5[_0xa4e6[3]];var _0x6409x9=_0x6409x6[_0xa4e6[4]]({_id:_0x6409x7},{transform:null});if(!_0x6409x9){Meteor[_0xa4e6[1]](_0xa4e6[5],_0x6409x3,_0x6409x4);return};delete _0x6409x4[_0xa4e6[3]];delete _0x6409x5[_0xa4e6[3]];delete _0x6409x9[_0xa4e6[3]];var _0x6409xa=Mongol[_0xa4e6[6]](_0x6409x9,_0x6409x4,_0x6409x5);delete _0x6409xa[_0xa4e6[3]];if(!!Package[_0xa4e6[7]]&& _[_0xa4e6[9]](_0x6409x6[_0xa4e6[8]]) && _0x6409x6[_0xa4e6[10]]){if( typeof _0x6409x6[_0xa4e6[11]]){_0x6409x6[_0xa4e6[11]]()[_0xa4e6[12]]({_id:_0x6409x7},{$set:_0x6409xa},{filter:false,autoConvert:false,removeEmptyStrings:false,validate:false})}else {_0x6409x6[_0xa4e6[12]]({_id:_0x6409x7},{$set:_0x6409xa},{filter:false,autoConvert:false,removeEmptyStrings:false,validate:false,bypassCollection2:true})};return};_0x6409x6[_0xa4e6[12]]({_id:_0x6409x7},_0x6409xa)},Mongol_remove:function(_0x6409x3,_0x6409x7,_0x6409xb){check(_0x6409x3,String);check(_0x6409x7,String);check(_0x6409xb,Match.Any);var _0x6409x6=Mongol.Collection(_0x6409x3);var _0x6409xc=_0x6409x6[_0xa4e6[4]](_0x6409x7,{transform:null});if( typeof _0x6409xb=== _0xa4e6[13]){targetCollection= Mongol.Collection(_0xa4e6[14]);trashDocument= _0x6409xc;trashDocument[_0xa4e6[15]]= String(_0x6409x3);trashDocument[_0xa4e6[16]]=  new Date();targetCollection[_0xa4e6[17]](trashDocument)};_0x6409x6[_0xa4e6[18]](_0x6409x7);return _0x6409xc},Mongol_duplicate:function(_0x6409x3,_0x6409x7){check(_0x6409x3,String);check(_0x6409x7,String);var _0x6409x6=Mongol.Collection(_0x6409x3),_0x6409xd=_0x6409x6[_0xa4e6[4]](_0x6409x7,{transform:null});if(_0x6409xd){delete _0x6409xd[_0xa4e6[3]];var _0x6409xe=_0x6409xd;var _0x6409xf=Mongol[_0xa4e6[19]](_0x6409x6,_0x6409xe);return _0x6409xf}},Mongol_insert:function(_0x6409x3,_0x6409x4){check(_0x6409x3,String);check(_0x6409x4,Object);insertDoc= function(_0x6409x6,_0x6409x4){if(!!Package[_0xa4e6[7]]&& _[_0xa4e6[9]](_0x6409x6[_0xa4e6[8]]) && _0x6409x6[_0xa4e6[10]]){_0x6409x10= _0x6409x6[_0xa4e6[17]](_0x6409x4,{filter:false,autoConvert:false,removeEmptyStrings:false,validate:false,bypassCollection2:true})}else {_0x6409x10= _0x6409x6[_0xa4e6[17]](_0x6409x4)};return _0x6409x10};var _0x6409x6=Mongol.Collection(_0x6409x3);var _0x6409x10=null;if(_0x6409x4[_0xa4e6[3]]&& _0x6409x6[_0xa4e6[4]]({_id:_0x6409x4[_0xa4e6[3]]})){console[_0xa4e6[21]](_0xa4e6[20]);return null};var _0x6409x10=insertDoc(_0x6409x6,_0x6409x4);return _0x6409x10},Mongol_getCollections:function(){collectionObjects= Mongo[_0xa4e6[23]][_0xa4e6[22]](),collections= [];collectionObjects[_0xa4e6[26]](function(_0x6409x11){if(_0x6409x11[_0xa4e6[24]]){collections[_0xa4e6[25]](_0x6409x11[_0xa4e6[24]])}});return collections},Mongol_resetCollection:function(_0x6409x12){check(_0x6409x12,Match.Any);if(!canRun){return};Mongo[_0xa4e6[23]][_0xa4e6[27]](_0x6409x12)[_0xa4e6[18]]({});return true},Mongol_resetMeteorToys:function(){if(!canRun){return};try{if(Mongol.Collection(_0xa4e6[28])[_0xa4e6[11]]){Mongol.Collection(_0xa4e6[28])[_0xa4e6[11]]()[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[29])[_0xa4e6[11]]()[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[14])[_0xa4e6[11]]()[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[30])[_0xa4e6[11]]()[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[31])[_0xa4e6[11]]()[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[32])[_0xa4e6[11]]()[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[33])[_0xa4e6[11]]()[_0xa4e6[18]]({})}else {Mongol.Collection(_0xa4e6[28])[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[29])[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[14])[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[30])[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[31])[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[32])[_0xa4e6[18]]({});Mongol.Collection(_0xa4e6[33])[_0xa4e6[18]]({})}}catch(e){};return true},Mongol_resetAll:function(){if(!canRun){return};var _0x6409x13=Mongo[_0xa4e6[23]][_0xa4e6[22]](),_0x6409x14=[];_0x6409x13[_0xa4e6[26]](function(_0x6409x11){if(_0x6409x11[_0xa4e6[24]]){if(_0x6409x11[_0xa4e6[24]]!== _0xa4e6[34]){Mongo[_0xa4e6[23]][_0xa4e6[27]](_0x6409x11[_0xa4e6[24]])[_0xa4e6[18]]({})}}});return true}})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/server/utilities.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0xa419=["\x64\x69\x66\x66\x44\x6F\x63\x75\x6D\x65\x6E\x74\x44\x61\x74\x61","\x6B\x65\x79\x73","\x64\x69\x66\x66\x65\x72\x65\x6E\x63\x65","\x75\x6E\x69\x6F\x6E","\x63\x6F\x6E\x74\x61\x69\x6E\x73","\x27","\x27\x20\x61\x70\x70\x65\x61\x72\x73\x20\x74\x6F\x20\x62\x65\x20\x61\x20\x64\x79\x6E\x61\x6D\x69\x63\x61\x6C\x6C\x79\x20\x61\x64\x64\x65\x64\x20\x66\x69\x65\x6C\x64\x2E\x20\x54\x68\x69\x73\x20\x66\x69\x65\x6C\x64\x20\x77\x61\x73\x20\x6E\x6F\x74\x20\x75\x70\x64\x61\x74\x65\x64\x2E","\x6C\x6F\x67","\x27\x20\x69\x73\x20\x61\x6E\x20\x75\x6E\x70\x75\x62\x6C\x69\x73\x68\x65\x64\x20\x66\x69\x65\x6C\x64\x2E\x20\x54\x68\x69\x73\x20\x66\x69\x65\x6C\x64\x27\x73\x20\x76\x61\x6C\x75\x65\x20\x77\x61\x73\x20\x6E\x6F\x74\x20\x6F\x76\x65\x72\x77\x72\x69\x74\x74\x65\x6E\x2E","\x69\x73\x55\x6E\x64\x65\x66\x69\x6E\x65\x64","\x69\x73\x4F\x62\x6A\x65\x63\x74","\x69\x73\x41\x72\x72\x61\x79","\x69\x73\x44\x61\x74\x65","\x65\x61\x63\x68"];Mongol[_0xa419[0]]= function(_0x7555x1,_0x7555x2,_0x7555x3){var _0x7555x4={};var _0x7555x5=_[_0xa419[1]](_0x7555x1);var _0x7555x6=_[_0xa419[1]](_0x7555x2);var _0x7555x7=_[_0xa419[1]](_0x7555x3);var _0x7555x8=_[_0xa419[2]](_0x7555x7,_0x7555x5);var _0x7555x9=_[_0xa419[2]](_0x7555x5,_0x7555x7);var _0x7555xa=_[_0xa419[3]](_0x7555x5,_0x7555x6);_[_0xa419[13]](_0x7555xa,function(_0x7555xb){if(_[_0xa419[4]](_0x7555x8,_0x7555xb)){console[_0xa419[7]](_0xa419[5]+ _0x7555xb+ _0xa419[6]);return};if(_[_0xa419[4]](_0x7555x9,_0x7555xb)){if(_0x7555x2[_0x7555xb]){console[_0xa419[7]](_0xa419[5]+ _0x7555xb+ _0xa419[8])};_0x7555x4[_0x7555xb]= _0x7555x1[_0x7555xb];return};if(!_[_0xa419[9]](_0x7555x2[_0x7555xb])){_0x7555x4[_0x7555xb]= (_[_0xa419[10]](_0x7555x2[_0x7555xb])&&  !_[_0xa419[11]](_0x7555x2[_0x7555xb])&&  !_[_0xa419[12]](_0x7555x2[_0x7555xb]))?Mongol[_0xa419[0]](_0x7555x1[_0x7555xb]|| {},_0x7555x2[_0x7555xb],_0x7555x3[_0x7555xb]|| {}):_0x7555x2[_0x7555xb]}});return _0x7555x4}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
Package._define("msavin:mongol");

})();
