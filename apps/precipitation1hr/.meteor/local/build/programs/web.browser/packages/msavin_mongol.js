//////////////////////////////////////////////////////////////////////////
//                                                                      //
// This is a generated file. You can view the original                  //
// source in your browser if your browser supports source maps.         //
// Source maps are supported by all recent versions of Chrome, Safari,  //
// and Firefox, and by Internet Explorer 11.                            //
//                                                                      //
//////////////////////////////////////////////////////////////////////////


(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Template = Package['templating-runtime'].Template;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Mongo = Package.mongo.Mongo;
var $ = Package.jquery.$;
var jQuery = Package.jquery.jQuery;
var _ = Package.underscore._;
var Blaze = Package.blaze.Blaze;
var UI = Package.blaze.UI;
var Handlebars = Package.blaze.Handlebars;
var Spacebars = Package.spacebars.Spacebars;
var HTML = Package.htmljs.HTML;

/* Package-scope variables */
var MeteorToysDict, Mongol, updData, newId, self, MongolEditingStatus, Mongol_InlineEditor, current, content, DocumentPosition, CurrentCollection, a, b, colorized, sessionKey, CollectionName, CollectionCount, CurrentDocument, DocumentID, ValidatedCurrentDocument, list, docID, docIndex, currentDoc, newPosition;

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
// packages/msavin_mongol/client/row_header/template.header.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_header");
Template["Mongol_header"] = new Template("Template.Mongol_header", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      name: Spacebars.call("mongol_618")
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("Mongol_Component"), function() {
      return [ "\n\n    ", HTML.STRONG("Mongol"), HTML.BR(), "\n    ", HTML.DIV({
        class: "Mongol_contentView"
      }, "\n    ", HTML.Comment("  "), "\n      ", HTML.DIV({
        class: "Mongol_docMenu",
        style: "text-indent: 8px"
      }, "\n        In-App MongoDB Editor\n      "), "\n      ", HTML.DIV({
        class: "Mongol_documentViewer "
      }, "\n", HTML.PRE({
        class: "MeteorToys-off"
      }, "{ \n  ", HTML.SPAN({
        class: "MeteorToys_key"
      }, '"created_by"'), ': "', HTML.A({
        href: "http://maxsavin.com"
      }, "Max Savin"), '",\n  ', HTML.SPAN({
        class: "MeteorToys_key"
      }, '"docs_at"'), ':    "', HTML.A({
        href: "https://meteor.toys"
      }, "Meteor Toys"), '",\n  ', HTML.SPAN({
        class: "MeteorToys_key"
      }, '"license"'), ':    "', HTML.A({
        href: "https://github.com/MeteorToys/allthings/blob/master/LICENSE.md"
      }, "MT License"), '",\n}\n'), "\n      "), "\n    ", HTML.Comment("  "), "\n    "), "\n\n  " ];
    });
  });
}));

Template.__checkName("Mongol_header_pro");
Template["Mongol_header_pro"] = new Template("Template.Mongol_header_pro", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      name: Spacebars.call("cmongol_618")
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("Mongol_Component"), function() {
      return [ "\n    ", HTML.STRONG("Mongol Pro"), HTML.BR(), "\n    ", HTML.DIV({
        class: "Mongol_contentView"
      }, "\n      ", HTML.Comment("  "), "\n      ", HTML.DIV({
        class: "Mongol_docMenu",
        style: "text-indent: 8px"
      }, "\n        Reset a Collection\n      "), "\n      ", HTML.DIV({
        class: "Mongol_documentViewer ",
        style: "padding-top: 0px"
      }, "\n        ", HTML.Comment(' <div class="MeteorToys_row Mongol_Impersonation MeteorToys_row_hoverable" style="margin-top: 0px">\n          Reset All Collections\n        </div> '), "\n        ", HTML.DIV({
        class: "MeteorToys_row Mongol_All MeteorToys_row_hoverable",
        style: "margin-top: 0px; line-height: 20px"
      }, "\n          All Collections + localStorage\n        "), "\n        ", HTML.DIV({
        class: "MeteorToys_row Mongol_MeteorToys MeteorToys_row_hoverable",
        style: "margin-top: 0px; line-height: 20px"
      }, "\n          Meteor Toys\n        "), "\n        ", HTML.DIV({
        class: "MeteorToys_row Mongol_Impersonation MeteorToys_row_hoverable",
        style: "margin-top: 0px; line-height: 20px"
      }, "\n          Authenticate Toy\n        "), "\n        ", Blaze.Each(function() {
        return Spacebars.call(view.lookup("collection"));
      }, function() {
        return [ "\n          ", Blaze.If(function() {
          return Spacebars.call(view.lookup("."));
        }, function() {
          return [ "\n            ", HTML.DIV({
            class: "MeteorToys_row MeteorToys_row_reset MeteorToys_row_hoverable",
            style: "margin-top: 0px; line-height: 20px"
          }, "\n              ", Blaze.View("lookup:.", function() {
            return Spacebars.mustache(view.lookup("."));
          }), " \n            "), "\n          " ];
        }), "\n        " ];
      }), "\n      "), "\n    "), "\n  " ];
    });
  });
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_header/header.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0xea35=["\x54\x68\x69\x73\x20\x77\x69\x6C\x6C\x20\x70\x65\x72\x6D\x61\x6E\x65\x6E\x74\x6C\x79\x20\x72\x65\x6D\x6F\x76\x65\x20\x61\x6C\x6C\x20\x74\x68\x65\x20\x64\x6F\x63\x75\x6D\x65\x6E\x74\x73\x20\x69\x6E\x20","\x2E","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x72\x65\x73\x65\x74\x43\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E","\x53\x6F\x72\x72\x79\x2C\x20\x74\x68\x65\x72\x65\x20\x77\x61\x73\x20\x61\x6E\x20\x65\x72\x72\x6F\x72\x20\x72\x65\x6D\x6F\x76\x69\x6E\x67\x20","\x63\x61\x6C\x6C","\x54\x68\x69\x73\x20\x77\x69\x6C\x6C\x20\x70\x65\x72\x6D\x61\x6E\x65\x6E\x74\x6C\x79\x20\x72\x65\x6D\x6F\x76\x65\x20\x61\x6C\x6C\x20\x74\x68\x65\x20\x64\x6F\x63\x75\x6D\x65\x6E\x74\x73\x20\x69\x6E\x20\x79\x6F\x75\x72\x20\x63\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E\x73\x2E","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x72\x65\x73\x65\x74\x43\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E\x73","\x53\x6F\x72\x72\x79\x2C\x20\x74\x68\x65\x72\x65\x20\x77\x61\x73\x20\x61\x6E\x20\x65\x72\x72\x6F\x72\x20\x72\x65\x6D\x6F\x76\x69\x6E\x67\x20\x79\x6F\x75\x72\x20\x63\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E\x73\x2E","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x49\x6D\x70\x65\x72\x73\x6F\x6E\x61\x74\x65","\x54\x68\x69\x73\x20\x77\x69\x6C\x6C\x20\x72\x65\x73\x65\x74\x20\x79\x6F\x75\x72\x20\x41\x75\x74\x68\x65\x6E\x74\x69\x63\x61\x74\x69\x6F\x6E\x20\x72\x65\x63\x65\x6E\x74\x73\x20\x6C\x69\x73\x74","\x54\x68\x69\x73\x20\x77\x69\x6C\x6C\x20\x72\x65\x73\x65\x74\x20\x61\x6C\x6C\x20\x79\x6F\x75\x72\x20\x4D\x65\x74\x65\x6F\x72\x20\x54\x6F\x79\x73\x20\x64\x61\x74\x61\x2E","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x72\x65\x73\x65\x74\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73","\x54\x68\x69\x73\x20\x77\x69\x6C\x6C\x20\x72\x65\x73\x65\x74\x20\x61\x6C\x6C\x20\x79\x6F\x75\x72\x20\x4D\x65\x74\x65\x6F\x72\x20\x63\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E\x73\x20\x61\x6E\x64\x20\x6C\x6F\x63\x61\x6C\x53\x74\x6F\x72\x61\x67\x65\x2E","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x72\x65\x73\x65\x74\x41\x6C\x6C","\x63\x6C\x65\x61\x72","\x72\x65\x6C\x6F\x61\x64","\x6C\x6F\x63\x61\x74\x69\x6F\x6E","\x65\x76\x65\x6E\x74\x73","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x68\x65\x61\x64\x65\x72\x5F\x70\x72\x6F","\x4D\x6F\x6E\x67\x6F\x6C","\x67\x65\x74","\x63\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E\x73","\x68\x65\x6C\x70\x65\x72\x73"];Template[_0xea35[18]][_0xea35[17]]({"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x5F\x72\x6F\x77\x5F\x72\x65\x73\x65\x74":function(){self= String(this);if(confirm(_0xea35[0]+ self+ _0xea35[1])){Meteor[_0xea35[4]](_0xea35[2],self,function(_0x3b03x1,_0x3b03x2){if(_0x3b03x1){alert(_0xea35[3]+ self+ _0xea35[1])}})}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x5F\x72\x6F\x77\x5F\x72\x65\x73\x65\x74\x5F\x61\x6C\x6C":function(){if(confirm(_0xea35[5])){Meteor[_0xea35[4]](_0xea35[6],self,function(_0x3b03x1,_0x3b03x2){if(_0x3b03x1){alert(_0xea35[7])}})}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x49\x6D\x70\x65\x72\x73\x6F\x6E\x61\x74\x69\x6F\x6E":function(){self= _0xea35[8];if(confirm(_0xea35[9])){Meteor[_0xea35[4]](_0xea35[2],self,function(_0x3b03x1,_0x3b03x2){if(_0x3b03x1){alert(_0xea35[3]+ self+ _0xea35[1])}})}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73":function(){if(confirm(_0xea35[10])){Meteor[_0xea35[4]](_0xea35[11],self,function(_0x3b03x1,_0x3b03x2){})}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x41\x6C\x6C":function(){if(confirm(_0xea35[12])){Meteor[_0xea35[4]](_0xea35[13],function(_0x3b03x1,_0x3b03x2){if(_0x3b03x1){alert(_0xea35[3]+ self+ _0xea35[1])};if(_0x3b03x2){MeteorToys[_0xea35[14]]();window[_0xea35[16]][_0xea35[15]]()}})}}});Template[_0xea35[18]][_0xea35[22]]({collection:function(){var _0x3b03x3=MeteorToysDict[_0xea35[20]](_0xea35[19]);return _0x3b03x3[_0xea35[21]]}})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/doc_editor/template.docViewer.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_docViewer");
Template["Mongol_docViewer"] = new Template("Template.Mongol_docViewer", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("notEmpty"));
  }, function() {
    return [ "\n    ", Spacebars.include(view.lookupTemplate("Mongol_docControls")), "\n    ", Spacebars.With(function() {
      return Spacebars.call(view.lookup("activeDocument"));
    }, function() {
      return [ "\n      ", Blaze.If(function() {
        return Spacebars.call(view.lookup("editStyle"));
      }, function() {
        return [ "\n        ", HTML.DIV({
          class: function() {
            return [ "Mongol_documentViewer ", Spacebars.mustache(view.lookup("editStyle")) ];
          },
          id: function() {
            return [ "MongolDoc_", Spacebars.mustache(view.lookup("..")) ];
          },
          contenteditable: function() {
            return Spacebars.mustache(view.lookup("editContent"));
          }
        }, "  \n          ", HTML.PRE({
          spellcheck: "false"
        }, Blaze.View("lookup:normalJSON", function() {
          return Spacebars.makeRaw(Spacebars.mustache(view.lookup("normalJSON")));
        })), "\n        "), "\n      " ];
      }, function() {
        return [ "\n        ", HTML.DIV({
          class: function() {
            return [ "Mongol_documentViewer ", Spacebars.mustache(view.lookup("editStyle")) ];
          },
          id: function() {
            return [ "MongolDoc_", Spacebars.mustache(view.lookup("..")) ];
          },
          contenteditable: function() {
            return Spacebars.mustache(view.lookup("editContent"));
          }
        }, "  \n            ", HTML.PRE({
          spellcheck: "false"
        }, Blaze.View("lookup:editableJSON", function() {
          return Spacebars.makeRaw(Spacebars.mustache(view.lookup("editableJSON")));
        })), "\n        "), "\n      " ];
      }), "\n    " ];
    }, function() {
      return [ "\n      ", HTML.DIV({
        class: "Mongol_documentViewer",
        id: function() {
          return [ "MongolDoc_", Spacebars.mustache(view.lookup(".")) ];
        }
      }, "  \n        ", HTML.PRE("No document found"), "\n      "), "\n    " ];
    }), "\n  " ];
  }, function() {
    return [ "\n    ", Spacebars.include(view.lookupTemplate("Mongol_docInsert")), "\n  " ];
  });
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/doc_editor/docViewer.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0x938e=["\x66\x65\x74\x63\x68","\x66\x69\x6E\x64","\x4D\x6F\x6E\x67\x6F\x6C\x5F","\x67\x65\x74","\x73\x74\x72\x69\x6E\x67\x69\x66\x79","\x63\x6F\x6C\x6F\x72\x69\x7A\x65\x45\x64\x69\x74\x61\x62\x6C\x65","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x5F\x4A\x53\x4F\x4E","\x6D\x65\x74\x65\x6F\x72\x74\x6F\x79\x73\x3A\x74\x6F\x79\x6B\x69\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x65\x64\x69\x74\x4D\x6F\x64\x65","\x74\x72\x75\x65","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x65\x64\x69\x74\x61\x62\x6C\x65","\x63\x6F\x75\x6E\x74","\x68\x65\x6C\x70\x65\x72\x73","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x6F\x63\x56\x69\x65\x77\x65\x72"];Template[_0x938e[13]][_0x938e[12]]({activeDocument:function(){var _0x2e40x1=String(this);var _0x2e40x2=Mongol.Collection(_0x2e40x1);var _0x2e40x3=_0x2e40x2[_0x938e[1]]({},{transform:null})[_0x938e[0]]();var _0x2e40x4=_0x938e[2]+ String(this);var _0x2e40x5=MeteorToysDict[_0x938e[3]](_0x2e40x4);var _0x2e40x6=_0x2e40x3[_0x2e40x5];return _0x2e40x6},editableJSON:function(){var _0x2e40x6=this;var _0x2e40x7=JSON[_0x938e[4]](_0x2e40x6,null,2),_0x2e40x8;if(!(_0x2e40x7=== undefined)){_0x2e40x8= Package[_0x938e[7]][_0x938e[6]][_0x938e[5]](_0x2e40x7)}else {_0x2e40x8= _0x2e40x7};return _0x2e40x8},normalJSON:function(){var _0x2e40x6=this,_0x2e40x7=JSON[_0x938e[4]](_0x2e40x6,null,2);return _0x2e40x7},editContent:function(){var _0x2e40x9=MeteorToysDict[_0x938e[3]](_0x938e[8]);if(_0x2e40x9){return _0x938e[9]}},editStyle:function(){var _0x2e40x9=MeteorToysDict[_0x938e[3]](_0x938e[8]);if(_0x2e40x9){return _0x938e[10]}},notEmpty:function(){var _0x2e40xa=Mongol.Collection(String(this))&& Mongol.Collection(String(this))[_0x938e[1]]()[_0x938e[11]]()|| 0;if(_0x2e40xa>= 1){return true}}})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/doc_editor/inline.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0xd44b=["\x4D\x6F\x6E\x67\x6F\x6C\x5F\x63\x75\x72\x72\x65\x6E\x74\x43\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E","\x67\x65\x74","\x68\x74\x6D\x6C","\x23\x4D\x6F\x6E\x67\x6F\x6C\x44\x6F\x63\x5F","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x62\x61\x63\x6B\x75\x70","\x73\x65\x74","\x74\x65\x78\x74","\x23\x4D\x6F\x6E\x67\x6F\x6C\x5F\x63","\x20\x70\x72\x65","\x69\x73\x53\x74\x72\x69\x6E\x67","\x65\x78\x65\x63","\x70\x61\x72\x73\x65","\x72\x65\x73\x74\x6F\x72\x65\x42\x61\x63\x6B\x75\x70","\x61\x63\x63\x6F\x75\x6E\x74\x5F\x36\x31\x38","\x65\x71\x75\x61\x6C\x73","\x75\x73\x65\x72\x73","\x67\x65\x74\x44\x6F\x63\x75\x6D\x65\x6E\x74\x55\x70\x64\x61\x74\x65","\x67\x65\x74\x44\x61\x74\x61","\x75\x73\x65\x72","\x4D\x6F\x6E\x67\x6F\x6C\x5F","\x66\x65\x74\x63\x68","\x66\x69\x6E\x64","","\x20","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x75\x70\x64\x61\x74\x65","\x76\x61\x6C\x69\x64\x61\x74\x65\x44\x6F\x63\x75\x6D\x65\x6E\x74","\x75\x70\x64\x61\x74\x65","\x65\x72\x72\x6F\x72","\x63\x61\x6C\x6C","\x6B\x65\x79\x43\x6F\x64\x65","\x70\x72\x65\x76\x65\x6E\x74\x44\x65\x66\x61\x75\x6C\x74","\x62\x6C\x75\x72","\x2E\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x5F\x69\x6E\x6C\x69\x6E\x65\x3A\x66\x6F\x63\x75\x73","\x6B\x65\x79\x64\x6F\x77\x6E","\x2E\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x5F\x69\x6E\x6C\x69\x6E\x65","\x67\x65\x74\x53\x65\x6C\x65\x63\x74\x69\x6F\x6E","\x65\x6D\x70\x74\x79","\x72\x65\x6D\x6F\x76\x65\x41\x6C\x6C\x52\x61\x6E\x67\x65\x73","\x73\x65\x6C\x65\x63\x74\x69\x6F\x6E","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x65\x64\x69\x74\x4D\x6F\x64\x65","\x75\x70\x64\x61\x74\x65\x44\x61\x74\x61","\x72\x65\x6D\x6F\x76\x65\x54\x65\x78\x74\x53\x65\x6C\x65\x63\x74\x69\x6F\x6E","\x62\x69\x6E\x64\x48\x6F\x74\x6B\x65\x79\x73","\x63\x72\x65\x61\x74\x65\x42\x61\x63\x6B\x75\x70","\x73\x74\x6F\x70\x50\x72\x6F\x70\x61\x67\x61\x74\x69\x6F\x6E","\x65\x76\x65\x6E\x74\x73","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x6F\x63\x56\x69\x65\x77\x65\x72"];MongolEditingStatus= false;Mongol_InlineEditor= {createBackup:function(){current= MeteorToysDict[_0xd44b[1]](_0xd44b[0]);content= $(_0xd44b[3]+ current)[_0xd44b[2]]();MeteorToysDict[_0xd44b[5]](_0xd44b[4],content)},restoreBackup:function(){current= MeteorToysDict[_0xd44b[1]](_0xd44b[0]);content= MeteorToysDict[_0xd44b[1]](_0xd44b[4]);$(_0xd44b[3]+ current)[_0xd44b[2]](content)},clearBackup:function(){MeteorToysDict[_0xd44b[5]](_0xd44b[4],null)},getData:function(){var _0xe298x1=MeteorToysDict[_0xd44b[1]](_0xd44b[0]),_0xe298x2=$(_0xd44b[7]+ _0xe298x1+ _0xd44b[8])[_0xd44b[6]]();var _0xe298x3=null;try{var _0xe298x4=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;var _0xe298x5=function(_0xe298x6,_0xe298x7){if(_[_0xd44b[9]](_0xe298x7)){var _0xe298x8=_0xe298x4[_0xd44b[10]](_0xe298x7);if(_0xe298x8){return  new Date(_0xe298x7)}};return _0xe298x7};_0xe298x3= JSON[_0xd44b[11]](_0xe298x2,_0xe298x5)}catch(error){Mongol_InlineEditor[_0xd44b[12]]()};return _0xe298x3},updateData:function(){var _0xe298x9=(MeteorToysDict[_0xd44b[14]](_0xd44b[0],_0xd44b[13]))?_0xd44b[15]:MeteorToysDict[_0xd44b[1]](_0xd44b[0]),_0xe298xa,_0xe298x3,_0xe298xb;if(MeteorToysDict[_0xd44b[14]](_0xd44b[0],_0xd44b[13])){_0xe298xb= Mongol[_0xd44b[16]](_0xd44b[13]);_0xe298x3= Mongol_InlineEditor[_0xd44b[17]]();_0xe298xa= Meteor[_0xd44b[18]]()}else {var _0xe298xc=_0xd44b[19]+ _0xe298x9;DocumentPosition= MeteorToysDict[_0xd44b[1]](_0xe298xc),CurrentCollection= Mongol.Collection(_0xe298x9)[_0xd44b[21]]({},{transform:null})[_0xd44b[20]]();_0xe298xb= Mongol[_0xd44b[16]](_0xe298x9);_0xe298x3= Mongol_InlineEditor[_0xd44b[17]]();_0xe298xa= CurrentCollection[DocumentPosition]};delete _0xe298x3[_0xd44b[22]];delete _0xe298x3[_0xd44b[23]];if(_0xe298x3){Meteor[_0xd44b[28]](_0xd44b[24],_0xe298x9,_0xe298x3,Mongol[_0xd44b[25]](_0xe298xa),function(_0xe298xd,_0xe298xe){if(!_0xe298xd){}else {Mongol[_0xd44b[27]](_0xd44b[26]);Mongol_InlineEditor[_0xd44b[12]]()}})}},bindHotkeys:function(){$(_0xd44b[34])[_0xd44b[33]](function(_0xe298xf){if(_0xe298xf[_0xd44b[29]]== 10|| _0xe298xf[_0xd44b[29]]== 13){_0xe298xf[_0xd44b[30]]();$(_0xd44b[32])[_0xd44b[31]]()};if(_0xe298xf[_0xd44b[29]]== 27){Mongol_InlineEditor[_0xd44b[12]]();$(_0xd44b[32])[_0xd44b[31]]()}})},removeTextSelection:function(){if(window[_0xd44b[35]]){if(window[_0xd44b[35]]()[_0xd44b[36]]){window[_0xd44b[35]]()[_0xd44b[36]]()}else {if(window[_0xd44b[35]]()[_0xd44b[37]]){window[_0xd44b[35]]()[_0xd44b[37]]()}}}else {if(document[_0xd44b[38]]){document[_0xd44b[38]][_0xd44b[36]]()}}}};Template[_0xd44b[46]][_0xd44b[45]]({"\x64\x62\x6C\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x6F\x63\x75\x6D\x65\x6E\x74\x56\x69\x65\x77\x65\x72":function(){MeteorToysDict[_0xd44b[5]](_0xd44b[39],true)},"\x66\x6F\x63\x75\x73\x6F\x75\x74\x20\x2E\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x5F\x69\x6E\x6C\x69\x6E\x65":function(){try{a= Mongol_InlineEditor[_0xd44b[40]]();b= Mongol_InlineEditor[_0xd44b[41]]()}catch(e){}},"\x66\x6F\x63\x75\x73\x69\x6E\x20\x2E\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x5F\x69\x6E\x6C\x69\x6E\x65":function(){a= Mongol_InlineEditor[_0xd44b[42]]();b= Mongol_InlineEditor[_0xd44b[43]]()},"\x64\x62\x6C\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x5F\x69\x6E\x6C\x69\x6E\x65":function(_0xe298x10,_0xe298x11){_0xe298x10[_0xd44b[44]]()}})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_account/template.account.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_account");
Template["Mongol_account"] = new Template("Template.Mongol_account", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      name: Spacebars.call("account_618")
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("Mongol_Component"), function() {
      return [ "\n\n\t\t\t", HTML.Comment(" Display sign in status "), "\n\t\t\t", Blaze.If(function() {
        return Spacebars.call(view.lookup("currentUser"));
      }, function() {
        return [ "\n\t\t\t\t", HTML.DIV({
          class: "Mongol_account_state MeteorToys-background-green"
        }), "\n\t\t\t" ];
      }, function() {
        return [ "\n\t\t\t\t", HTML.DIV({
          class: "Mongol_account_state MeteorToys-background-red"
        }), "\n\t\t\t" ];
      }), "\n\n\t\t\t", HTML.Comment(" Row Name "), "\n\t\t\t", HTML.DIV({
        class: "Mongol_icon Mongol_icon_user"
      }), "\n\t\t\tAccount\n     \n        ", HTML.DIV({
        class: "Mongol_contentView"
      }, "\n\n\t\t\t", HTML.Comment(" Document Viewer "), "\n\t\t\t", Blaze.If(function() {
        return Spacebars.call(view.lookup("currentUser"));
      }, function() {
        return [ "\n\t\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_accountViewer")), "\n\t\t\t" ];
      }, function() {
        return [ "\n\t\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_accountViewer_notSignedIn")), "\n\t\t\t" ];
      }), "\n\n\t\t"), "\n\n\t" ];
    });
  });
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_account/account.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_account/template.accountViewer.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_accountViewer");
Template["Mongol_accountViewer"] = new Template("Template.Mongol_accountViewer", (function() {
  var view = this;
  return [ Spacebars.include(view.lookupTemplate("Mongol_docControls")), "\n\n\t", HTML.DIV({
    class: function() {
      return [ "Mongol_documentViewer ", Spacebars.mustache(view.lookup("editStyle")) ];
    },
    id: "MongolDoc_account_618",
    contenteditable: function() {
      return Spacebars.mustache(view.lookup("editContent"));
    }
  }, "\t\n\t\t", HTML.PRE(Blaze.View("lookup:accountData", function() {
    return Spacebars.makeRaw(Spacebars.mustache(view.lookup("accountData")));
  })), "\n\t") ];
}));

Template.__checkName("Mongol_accountViewer_notSignedIn");
Template["Mongol_accountViewer_notSignedIn"] = new Template("Template.Mongol_accountViewer_notSignedIn", (function() {
  var view = this;
  return HTML.Raw('<div class="Mongol_docMenu">\n\t\t\t<div class="Mongol_docBar1" style="text-indent: 8px">\n\t\t\t\tNot Signed In\n\t\t\t</div>\n\t\t</div>\n\t<div class="Mongol_documentViewer">\t\n\t\t<!-- Nothing -->\n\t</div>');
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_account/accountViewer.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Template.Mongol_accountViewer.helpers({
  accountData: function () {
    
    var docCurrent  = Meteor.user(),
        json_output = JSON.stringify(docCurrent, null, 2);

        if (MeteorToysDict.get("Mongol_editMode")) {
          colorized = json_output
        } else {
          colorized = Package["meteortoys:toykit"].MeteorToys.colorizeEditable(json_output);
        }
    return colorized;

  },
  editContent: function () {

    var editMode = MeteorToysDict.get("Mongol_editMode");

    if (editMode) {
      return "true";
    }

  },
  editStyle: function () {

    var editMode = MeteorToysDict.get("Mongol_editMode");

    if (editMode) {
      return "Mongol_editable";
    }

  },
  usercode: function () {
    
    return Meteor.userId();

  },
});


Template.Mongol_accountViewer.events({
    'dblclick .Mongol_documentViewer': function () {
    MeteorToysDict.set("Mongol_editMode", true);
  },
  'focusout .MeteorToys_inline': function () {
    a = Mongol_InlineEditor.updateData();
    b = Mongol_InlineEditor.removeTextSelection();
    // console.log("focusedout");
  },
  'focusin .MeteorToys_inline': function () {
    a = Mongol_InlineEditor.bindHotkeys();
    b = Mongol_InlineEditor.createBackup();
    // console.log("focusedin");
  },
  'dblclick .MeteorToys_inline': function (e,t) {
    e.stopPropagation();
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_collection_notFound/template.notFound.js                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_collection_notFound");
Template["Mongol_collection_notFound"] = new Template("Template.Mongol_collection_notFound", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      name: Spacebars.call("no_collections")
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("Mongol_Component"), function() {
      return [ "\n\n    ", HTML.DIV({
        class: "Mongol_icon Mongol_icon_collection"
      }), "No Collections", HTML.BR(), "\n    ", HTML.DIV({
        class: "Mongol_contentView"
      }, "\n    ", HTML.Comment("  "), "\n      ", HTML.DIV({
        class: "Mongol_docMenu",
        style: "text-indent: 8px"
      }, "\n        None Detected\n      "), "\n      ", HTML.DIV({
        class: "Mongol_documentViewer "
      }, "\n\n        If you think this is an error,", HTML.BR(), "\n        please report it on ", HTML.A({
        href: "https://github.com/msavin/Mongol",
        style: "color: #cc0000"
      }, "GitHub"), ".\n        \n      "), "\n    ", HTML.Comment("  "), "\n    "), "\n\n  " ];
    });
  });
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_collection_notFound/notFound.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_collection/template.collections.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_collection");
Template["Mongol_collection"] = new Template("Template.Mongol_collection", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      name: Spacebars.call(view.lookup("."))
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("Mongol_Component"), function() {
      return [ "\n\n\t\t", HTML.Comment(" Collection Count "), "\n\t\t", HTML.DIV({
        class: "Mongol_counter"
      }, "\n\t\t\t", Blaze.If(function() {
        return Spacebars.call(view.lookup("collectionCount"));
      }, function() {
        return [ "\n\t\t\t", HTML.SPAN({
          class: "MongolHide"
        }, Blaze.View("lookup:currentPosition", function() {
          return Spacebars.mustache(view.lookup("currentPosition"));
        }), "/") ];
      }), Blaze.View("lookup:collectionCount", function() {
        return Spacebars.mustache(view.lookup("collectionCount"));
      }), "\n\t\t"), "\n\n\t\t", HTML.Comment(" Collection Name "), "\n\t\t", HTML.DIV({
        class: "Mongol_row_name"
      }, HTML.DIV({
        class: "Mongol_icon Mongol_icon_collection"
      }), Blaze.View("lookup:.", function() {
        return Spacebars.mustache(view.lookup("."));
      }), Blaze.If(function() {
        return Spacebars.call(view.lookup("xf"));
      }, function() {
        return Blaze.View("lookup:xf", function() {
          return Spacebars.mustache(view.lookup("xf"));
        });
      })), "\n    \t    \n\t\t", HTML.Comment(" Document Viewer "), "\n\t\t", HTML.DIV({
        class: "Mongol_contentView"
      }, "\n\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_docViewer")), "\n\t\t"), "\n\t\t\n\t" ];
    });
  });
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_collection/collections.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Template.Mongol_collection.events({
  'click': function () {

    var targetCollection = String(this),
        sessionKey       = "Mongol_" + targetCollection;

    if (MeteorToysDict.equals("Mongol_currentCollection", targetCollection)) {
      
      // do nothing
    
    } else {
      
      // If the collection doesn't have an index key set,
      // start it from the first document
      
      if (!MeteorToysDict.get(String(sessionKey))) {
        MeteorToysDict.set(String(sessionKey), 0);
      }
      
    }

  },
});

Template.Mongol_collection.helpers({
  collectionCount: function () {

    var collectionName = String(this);
    var collectionVar = Mongol.Collection(collectionName);

    var count = collectionVar && collectionVar.find().count() || 0;

    return count;

  },
  currentPosition: function () {

    var targetCollection = String(this);
    var sessionKey = "Mongol_" + targetCollection;

    var current = MeteorToysDict.get(sessionKey);
    var count = current + 1;

    return count;

  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_trash/template.main.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_trash");
Template["Mongol_trash"] = new Template("Template.Mongol_trash", (function() {
  var view = this;
  return Blaze._TemplateWith(function() {
    return {
      name: Spacebars.call("trash")
    };
  }, function() {
    return Spacebars.include(view.lookupTemplate("Mongol_Component"), function() {
      return [ "\n\t  \n\t\t", HTML.DIV({
        class: "Mongol_counter"
      }, "\n\t\t\t", Blaze.If(function() {
        return Spacebars.call(view.lookup("collectionCount"));
      }, function() {
        return [ "\n\t\t\t\t", HTML.SPAN({
          class: "MongolHide"
        }, Blaze.View("lookup:currentPosition", function() {
          return Spacebars.mustache(view.lookup("currentPosition"));
        }), "/") ];
      }), Blaze.View("lookup:collectionCount", function() {
        return Spacebars.mustache(view.lookup("collectionCount"));
      }), "\n\t\t"), "\n\n\t\t", HTML.DIV({
        class: "Mongol_row_name"
      }, HTML.DIV({
        class: "Mongol_icon Mongol_icon_trash"
      }), "Trash"), "\n\n\t\t", Blaze.If(function() {
        return Spacebars.call(view.lookup("collectionCount"));
      }, function() {
        return [ "\n\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_trash_viewer")), "\n\t\t" ];
      }, function() {
        return [ "\n\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_trash_empty")), "\n\t\t" ];
      }), "\n\n\t" ];
    });
  });
}));

Template.__checkName("Mongol_trash_menu");
Template["Mongol_trash_menu"] = new Template("Template.Mongol_trash_menu", (function() {
  var view = this;
  return HTML.DIV({
    class: "Mongol_docMenu"
  }, HTML.Raw('\n\t\t<div class="Mongol_m_edit MeteorToys_action">Restore</div>\n\t\t'), HTML.DIV({
    class: function() {
      return [ Spacebars.mustache(view.lookup("disable_right")), " Mongol_m_right MeteorToys_action" ];
    }
  }, HTML.Raw("&rsaquo;")), "\n\t\t", HTML.DIV({
    class: function() {
      return [ Spacebars.mustache(view.lookup("disable_left")), " Mongol_m_left MeteorToys_action" ];
    }
  }, HTML.Raw("&lsaquo;")), "\n\t");
}));

Template.__checkName("Mongol_trash_viewer");
Template["Mongol_trash_viewer"] = new Template("Template.Mongol_trash_viewer", (function() {
  var view = this;
  return HTML.DIV({
    class: "Mongol_contentView"
  }, "\n\t\t", Spacebars.include(view.lookupTemplate("Mongol_trash_menu")), "\n\t    ", HTML.DIV({
    class: "Mongol_documentViewer"
  }, "\n", HTML.PRE("From ", Blaze.View("lookup:collectionName", function() {
    return Spacebars.mustache(view.lookup("collectionName"));
  }), " ", Blaze.View("lookup:currentDocument", function() {
    return Spacebars.makeRaw(Spacebars.mustache(view.lookup("currentDocument")));
  })), "\n\t    "), "\n\t");
}));

Template.__checkName("Mongol_trash_empty");
Template["Mongol_trash_empty"] = new Template("Template.Mongol_trash_empty", (function() {
  var view = this;
  return HTML.Raw('<div class="Mongol_contentView">\n\t\t<div class="Mongol_docMenu" style="text-indent: 8px">Empty</div>\n\t\t<div class="Mongol_documentViewer">\n<pre>When you remove documents,\nthey will appear here.</pre></div>\n\t</div>');
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_trash/main.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0xdcf5=["\x4D\x6F\x6E\x67\x6F\x6C\x5F\x54\x72\x61\x73\x68\x5F\x43\x6F\x75\x6E\x74","\x67\x65\x74","\x73\x65\x74","\x65\x76\x65\x6E\x74\x73","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x74\x72\x61\x73\x68","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x4D\x6F\x6E\x67\x6F\x6C","\x4D\x6F\x6E\x67\x6F\x6C","\x6D\x73\x61\x76\x69\x6E\x3A\x6D\x6F\x6E\x67\x6F\x6C","\x63\x6F\x75\x6E\x74","\x66\x69\x6E\x64","\x54\x72\x61\x73\x68\x5F\x43\x6F\x75\x6E\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F","\x68\x65\x6C\x70\x65\x72\x73","\x66\x65\x74\x63\x68","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6F\x72\x69\x67\x69\x6E","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x61\x74\x65","\x73\x74\x72\x69\x6E\x67\x69\x66\x79","\x63\x6F\x6C\x6F\x72\x69\x7A\x65","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73","\x6D\x65\x74\x65\x6F\x72\x74\x6F\x79\x73\x3A\x74\x6F\x79\x6B\x69\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x74\x72\x61\x73\x68\x5F\x76\x69\x65\x77\x65\x72","\x5F\x69\x64","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x69\x6E\x73\x65\x72\x74","\x54\x68\x65\x72\x65\x20\x77\x61\x73\x20\x61\x6E\x20\x65\x72\x72\x6F\x72\x20\x72\x65\x73\x74\x6F\x72\x69\x6E\x67\x20\x79\x6F\x75\x72\x20\x64\x6F\x63\x75\x6D\x65\x6E\x74\x2E","\x63\x61\x6C\x6C","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x72\x65\x6D\x6F\x76\x65","\x54\x68\x65\x72\x65\x20\x77\x61\x73\x20\x61\x6E\x20\x65\x72\x72\x6F\x72\x20\x72\x65\x6D\x6F\x76\x69\x6E\x67\x20\x64\x6F\x63\x75\x6D\x65\x6E\x74\x20\x66\x72\x6F\x6D\x20\x74\x72\x61\x73\x68\x2C","\x63\x6C\x69\x63\x6B","\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x6C\x65\x66\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x64\x69\x73\x61\x62\x6C\x65\x64","\x68\x61\x73\x43\x6C\x61\x73\x73","\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x72\x69\x67\x68\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x74\x72\x61\x73\x68\x5F\x6D\x65\x6E\x75"];Template[_0xdcf5[4]][_0xdcf5[3]]({"\x63\x6C\x69\x63\x6B":function(){if(!MeteorToysDict[_0xdcf5[1]](_0xdcf5[0])){MeteorToysDict[_0xdcf5[2]](_0xdcf5[0],0)}}});Template[_0xdcf5[4]][_0xdcf5[12]]({collectionCount:function(){var _0x8985x1=_0xdcf5[5];var _0x8985x2=Package[_0xdcf5[7]][_0xdcf5[6]].Collection(_0x8985x1);var _0x8985x3=_0x8985x2&& _0x8985x2[_0xdcf5[9]]()[_0xdcf5[8]]()|| 0;return _0x8985x3},currentPosition:function(){var _0x8985x4=_0xdcf5[10];var _0x8985x5=_0xdcf5[11]+ _0x8985x4;var _0x8985x6=MeteorToysDict[_0xdcf5[1]](_0x8985x5);var _0x8985x3=_0x8985x6+ 1;return _0x8985x3}});Template[_0xdcf5[20]][_0xdcf5[12]]({currentDocument:function(){var _0x8985x1=_0xdcf5[5],_0x8985x7=MeteorToysDict[_0xdcf5[1]](_0xdcf5[0]),_0x8985x8=Package[_0xdcf5[7]][_0xdcf5[6]].Collection(_0xdcf5[5])[_0xdcf5[9]]()[_0xdcf5[13]]()[_0x8985x7];if(_0x8985x8){delete _0x8985x8[_0xdcf5[14]];delete _0x8985x8[_0xdcf5[15]];var _0x8985x9=Package[_0xdcf5[19]][_0xdcf5[18]][_0xdcf5[17]](JSON[_0xdcf5[16]](_0x8985x8,undefined,2));return _0x8985x9}},collectionName:function(){var _0x8985x1=_0xdcf5[5],_0x8985x7=MeteorToysDict[_0xdcf5[1]](_0xdcf5[0]),_0x8985x8=Package[_0xdcf5[7]][_0xdcf5[6]].Collection(_0xdcf5[5])[_0xdcf5[9]]()[_0xdcf5[13]]()[_0x8985x7];if(_0x8985x8){return _0x8985x8[_0xdcf5[14]]}}});Template[_0xdcf5[32]][_0xdcf5[3]]({"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x65\x64\x69\x74":function(){var _0x8985x1=_0xdcf5[5],_0x8985x7=MeteorToysDict[_0xdcf5[1]](_0xdcf5[0]),_0x8985x8=Package[_0xdcf5[7]][_0xdcf5[6]].Collection(_0xdcf5[5])[_0xdcf5[9]]()[_0xdcf5[13]]()[_0x8985x7];var _0x8985x4=_0x8985x8[_0xdcf5[14]];var _0x8985xa=_0x8985x8[_0xdcf5[21]];delete _0x8985x8[_0xdcf5[14]];delete _0x8985x8[_0xdcf5[15]];Meteor[_0xdcf5[24]](_0xdcf5[22],_0x8985x4,_0x8985x8,function(_0x8985xb,_0x8985xc){if(_0x8985xb){alert(_0xdcf5[23])}});Meteor[_0xdcf5[24]](_0xdcf5[25],_0xdcf5[5],_0x8985xa,true,function(_0x8985xb,_0x8985xc){if(_0x8985xb){alert(_0xdcf5[26])}});var _0x8985x5=_0xdcf5[0];var _0x8985xd=MeteorToysDict[_0xdcf5[1]](_0x8985x5);var _0x8985x2=Package[_0xdcf5[7]][_0xdcf5[6]].Collection(_0xdcf5[5]);var _0x8985xe=_0x8985x2[_0xdcf5[9]]()[_0xdcf5[8]]()- 1;if(_0x8985xe=== _0x8985xd){$(_0xdcf5[28])[_0xdcf5[27]]()}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x72\x69\x67\x68\x74":function(){if(!$(_0xdcf5[31])[_0xdcf5[30]](_0xdcf5[29])){var _0x8985x5=_0xdcf5[0];var _0x8985xd=MeteorToysDict[_0xdcf5[1]](_0x8985x5);var _0x8985x2=Package[_0xdcf5[7]][_0xdcf5[6]].Collection(_0xdcf5[5]);var _0x8985xe=_0x8985x2[_0xdcf5[9]]()[_0xdcf5[8]]()- 1;if(_0x8985xd> _0x8985xe){MeteorToysDict[_0xdcf5[2]](_0x8985x5,0);return};if(_0x8985xe=== _0x8985xd){MeteorToysDict[_0xdcf5[2]](_0x8985x5,0)}else {var _0x8985xf=MeteorToysDict[_0xdcf5[1]](_0x8985x5)+ 1;MeteorToysDict[_0xdcf5[2]](_0x8985x5,_0x8985xf)}}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x6C\x65\x66\x74":function(){if(!$(_0xdcf5[28])[_0xdcf5[30]](_0xdcf5[29])){var _0x8985x5=_0xdcf5[0];var _0x8985xd=MeteorToysDict[_0xdcf5[1]](_0x8985x5);var _0x8985x2=Package[_0xdcf5[7]][_0xdcf5[6]].Collection(_0xdcf5[5]);var _0x8985xe=_0x8985x2[_0xdcf5[9]]()[_0xdcf5[8]]()- 1;if(_0x8985xd> _0x8985xe){MeteorToysDict[_0xdcf5[2]](_0x8985x5,_0x8985xe);return};if(MeteorToysDict[_0xdcf5[1]](_0x8985x5)=== 0){MeteorToysDict[_0xdcf5[2]](_0x8985x5,_0x8985xe)}else {var _0x8985xf=MeteorToysDict[_0xdcf5[1]](_0x8985x5)- 1;MeteorToysDict[_0xdcf5[2]](_0x8985x5,_0x8985xf)}}}})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/doc_insert/template.docInsert.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_docInsert");
Template["Mongol_docInsert"] = new Template("Template.Mongol_docInsert", (function() {
  var view = this;
  return [ HTML.Raw('<div class="Mongol_docMenu">\n\t\t<div class="MeteorToys_action Mongol_docMenu_insert" style="float: right">Submit</div>\n\t\t&nbsp;Insert a Document\n\t</div>\n\n\t'), HTML.DIV({
    class: "Mongol_documentViewer ",
    id: function() {
      return [ "Mongol_", Spacebars.mustache(view.lookup(".")), "_newEntry" ];
    },
    tabindex: "-1",
    contenteditable: "true"
  }, "\t\n", HTML.Raw("<pre>{\n\n}</pre>"), "\n\n\t") ];
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/doc_insert/docInsert.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0x555b=["\x4D\x6F\x6E\x67\x6F\x6C\x5F","\x5F\x6E\x65\x77\x45\x6E\x74\x72\x79","\x74\x65\x78\x74\x43\x6F\x6E\x74\x65\x6E\x74","\x67\x65\x74\x45\x6C\x65\x6D\x65\x6E\x74\x42\x79\x49\x64","\x70\x61\x72\x73\x65","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x69\x6E\x73\x65\x72\x74","\x73\x65\x74","\x44\x6F\x63\x75\x6D\x65\x6E\x74\x20\x73\x75\x63\x63\x65\x73\x73\x66\x75\x6C\x6C\x79\x20\x69\x6E\x73\x65\x72\x74\x65\x64\x2E","\x7B\x3C\x62\x72\x3E\x3C\x62\x72\x3E\x7D","\x68\x74\x6D\x6C","\x23\x4D\x6F\x6E\x67\x6F\x6C\x5F","\x69\x6E\x73\x65\x72\x74","\x65\x72\x72\x6F\x72","\x63\x61\x6C\x6C","\x65\x76\x65\x6E\x74\x73","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x6F\x63\x49\x6E\x73\x65\x72\x74"];Template[_0x555b[15]][_0x555b[14]]({"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x6F\x63\x4D\x65\x6E\x75\x5F\x69\x6E\x73\x65\x72\x74":function(_0x309dx1,_0x309dx2){var _0x309dx3=String(this),_0x309dx4=_0x555b[0]+ String(this)+ _0x555b[1],_0x309dx5=document[_0x555b[3]](_0x309dx4)[_0x555b[2]],_0x309dx6=Mongol[_0x555b[4]](_0x309dx5);if(_0x309dx6){Meteor[_0x555b[13]](_0x555b[5],_0x309dx3,_0x309dx6,function(_0x309dx7,_0x309dx8){if(!_0x309dx7){sessionKey= _0x555b[0]+ _0x309dx3;MeteorToysDict[_0x555b[6]](sessionKey,0);alert(_0x555b[7]);_0x309dx2.$(_0x555b[10]+ _0x309dx3+ _0x555b[1])[_0x555b[9]](_0x555b[8])}else {Mongol[_0x555b[12]](_0x555b[11])}})}}})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/_component/template.component.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_Component");
Template["Mongol_Component"] = new Template("Template.Mongol_Component", (function() {
  var view = this;
  return HTML.DIV({
    class: function() {
      return [ "Mongol_row ", Spacebars.mustache(view.lookup("active")) ];
    },
    id: function() {
      return [ "Mongol_c", Spacebars.mustache(view.lookup("name")) ];
    }
  }, "\n\t\t", Blaze._InOuterTemplateScope(view, function() {
    return Spacebars.include(function() {
      return Spacebars.call(view.templateContentBlock);
    });
  }), "\n\t");
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/_component/component.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0xe2ee=["\x4D\x6F\x6E\x67\x6F\x6C","\x63\x6C\x6F\x73\x65","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x63\x75\x72\x72\x65\x6E\x74\x43\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E","\x67\x65\x74","\x73\x65\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x65\x64\x69\x74\x4D\x6F\x64\x65","\x77\x68\x69\x63\x68","\x6E\x61\x6D\x65","\x65\x71\x75\x61\x6C\x73","\x73\x74\x6F\x70\x50\x72\x6F\x70\x61\x67\x61\x74\x69\x6F\x6E","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x70\x72\x65\x76\x69\x65\x77","\x65\x76\x65\x6E\x74\x73","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x43\x6F\x6D\x70\x6F\x6E\x65\x6E\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x72\x6F\x77\x5F\x65\x78\x70\x61\x6E\x64","\x68\x65\x6C\x70\x65\x72\x73"];window[_0xe2ee[0]]= {};window[_0xe2ee[0]][_0xe2ee[1]]= function(){if(MeteorToysDict[_0xe2ee[3]](_0xe2ee[2])){MeteorToysDict[_0xe2ee[4]](_0xe2ee[2],null);MeteorToysDict[_0xe2ee[4]](_0xe2ee[5],false)}else {MeteorToys[_0xe2ee[1]]()}};Template[_0xe2ee[12]][_0xe2ee[11]]({"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x72\x6F\x77":function(_0x7f36x1,_0x7f36x2){if(_0x7f36x1[_0xe2ee[6]]=== 1){if(MeteorToysDict[_0xe2ee[8]](_0xe2ee[2],this[_0xe2ee[7]])){MeteorToysDict[_0xe2ee[4]](_0xe2ee[2],null)}else {MeteorToysDict[_0xe2ee[4]](_0xe2ee[2],this[_0xe2ee[7]])};MeteorToysDict[_0xe2ee[4]](_0xe2ee[5],false)}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x63\x6F\x6E\x74\x65\x6E\x74\x56\x69\x65\x77":function(_0x7f36x1){_0x7f36x1[_0xe2ee[9]]()},"\x6D\x6F\x75\x73\x65\x6F\x76\x65\x72\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x72\x6F\x77":function(){MeteorToysDict[_0xe2ee[4]](_0xe2ee[10],this[_0xe2ee[7]])}});Template[_0xe2ee[12]][_0xe2ee[14]]({active:function(){if(MeteorToysDict[_0xe2ee[8]](_0xe2ee[2],this[_0xe2ee[7]])){return _0xe2ee[13]}}})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/template.main.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol");
Template["Mongol"] = new Template("Template.Mongol", (function() {
  var view = this;
  return HTML.DIV({
    id: "Mongol",
    class: function() {
      return [ "MeteorToys MeteorToys_hide_Mongol MeteorToysReset ", Spacebars.mustache(view.lookup("active")) ];
    },
    oncontextmenu: "Mongol.close(); return false;"
  }, "\n\t\t", Blaze.If(function() {
    return Spacebars.call(view.lookup("MeteorToys_Pro"));
  }, function() {
    return [ "\n\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_header_pro")), "\n\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_account")), "\n\t\t\t", Blaze.Each(function() {
      return Spacebars.call(view.lookup("Mongol_collections"));
    }, function() {
      return [ "\n\t\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_collection")), "\n\t\t\t" ];
    }, function() {
      return [ "\n\t\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_collection_notFound")), "\n\t\t\t" ];
    }), "\n\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_trash")), "\n\t\t" ];
  }, function() {
    return [ "\n\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_header")), "\n\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_account")), "\n\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_support")), "\n\t\t\t", Blaze.Each(function() {
      return Spacebars.call(view.lookup("Mongol_collections"));
    }, function() {
      return [ "\n\t\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_collection")), "\n\t\t\t" ];
    }, function() {
      return [ "\n\t\t\t\t", Spacebars.include(view.lookupTemplate("Mongol_collection_notFound")), "\n\t\t\t" ];
    }), "\n\t\t" ];
  }), "\n\n\t");
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/main.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Meteor.startup(function() {
    
  // Detect collections
    Mongol.detectCollections();

  // Initialize Reactive-Dict
    MeteorToysDict = Package["meteortoys:toykit"].MeteorToys;

  // Hide background collections
    Mongol.hideMeteor();
    Mongol.hideVelocity();
    Mongol.hideMeteorToys();

  // For use outside of Mongol package scope:
  // Package["msavin:mongol"].Mongol.hideCollection("mongoName");
  // Package["msavin:mongol"].Mongol.showCollection("localCollection");

});

Template.Mongol.helpers({
  Mongol_collections: function () {
    // returns Mongo names of collections
    var    MongolConfig = MeteorToysDict.get("Mongol");
    return MongolConfig && _.without(MongolConfig.collections, null) || [];
  },
  active: function () {
    var MongolCollection = MeteorToysDict.get("Mongol_currentCollection");
    if (MongolCollection) {
      return "Mongol_expand";
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/doc_controls/template.docControls.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_docControls");
Template["Mongol_docControls"] = new Template("Template.Mongol_docControls", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("active"));
  }, function() {
    return [ "\n\t\t\n\t\t", HTML.DIV({
      class: function() {
        return [ "Mongol_docMenu ", Spacebars.mustache(view.lookup("Mongol_docMenu_editing")) ];
      }
    }, "\n\t\t\t", Blaze.If(function() {
      return Spacebars.call(view.lookup("account"));
    }, function() {
      return [ "\n\t\t\t\t", HTML.DIV({
        class: "Mongol_docBar1"
      }, "\n\t\t\t\t\t", Blaze.If(function() {
        return Spacebars.call(view.lookup("editing"));
      }, function() {
        return [ "\n\t\t\t\t\t\t", HTML.DIV({
          class: "Mongol_edit_title"
        }, "Update Document"), "\n\t\t\t\t\t\t", HTML.DIV({
          class: "MeteorToys_action Mongol_edit_save"
        }, "Save"), "\n\t\t\t\t\t\t", HTML.DIV({
          class: "MeteorToys_action Mongol_edit_cancel"
        }, "Cancel"), "\n\t\t\t\t\t" ];
      }, function() {
        return [ "\t\n\t\t\t\t\t\t\n                        ", HTML.Comment("For some reason, the method in place does not work for this\n                        Commenting out for now"), "\n                        ", HTML.DIV({
          class: "MeteorToys_action Mongol_m_edit Mongol_m_updateAccount"
        }, "Update"), "\n\t\t\t\t\t\t\n\t\t\t\t\t\t", HTML.Comment(" &nbsp;Currently Read-Only "), "\n\t\t\t\t\t\t", HTML.DIV({
          class: "MeteorToys_action Mongol_m_signout"
        }, "Sign Out"), "\n                        \n\t\t\t\t\t" ];
      }), "\n\t\t\t\t"), "\n\t\t\t" ];
    }, function() {
      return [ "\n\t\t\t\t", HTML.DIV({
        class: "Mongol_docBar1"
      }, "\n\t\t\t\t\t", Blaze.If(function() {
        return Spacebars.call(view.lookup("editing"));
      }, function() {
        return [ "\n\t\t\t\t\t\t", HTML.DIV({
          class: "Mongol_edit_title"
        }, "Update Document"), "\n\t\t\t\t\t\t", HTML.DIV({
          class: "MeteorToys_action Mongol_edit_save"
        }, "Save"), "\n\t\t\t\t\t\t", HTML.DIV({
          class: "MeteorToys_action Mongol_edit_cancel"
        }, "Cancel"), "\n\t\t\t\t\t" ];
      }, function() {
        return [ "\n\t\t\t\t\t\t", HTML.DIV({
          class: "MeteorToys_action Mongol_m_edit"
        }, "Update"), "\n\t\t\t\t\t\t", HTML.DIV({
          class: "MeteorToys_action Mongol_m_new"
        }, "Duplicate"), "\n\t\t\t\t\t\t", HTML.DIV({
          class: "MeteorToys_action Mongol_m_delete"
        }, "Remove"), "\n\t\t\t\t\t\t", HTML.DIV({
          class: function() {
            return [ "MeteorToys_action ", Spacebars.mustache(view.lookup("disable")), " Mongol_m_right" ];
          }
        }, HTML.CharRef({
          html: "&rsaquo;",
          str: "›"
        })), "\n\t\t\t\t\t\t", HTML.DIV({
          class: function() {
            return [ "MeteorToys_action ", Spacebars.mustache(view.lookup("disable")), " Mongol_m_left" ];
          }
        }, HTML.CharRef({
          html: "&lsaquo;",
          str: "‹"
        })), "\n\t\t\t\t\t" ];
      }), "\n\t\t\t\t"), "\n\t\t\t" ];
    }), "\t\n\t\t"), "\n\n\t" ];
  }, function() {
    return [ "\n\n\t\t", HTML.DIV({
      class: "Mongol_docMenu"
    }, "\n\t\t\t", HTML.DIV({
      class: "Mongol_docBar1"
    }, "\n\t\t\t\t", HTML.CharRef({
      html: "&nbsp;",
      str: " "
    }), "\n\t\t\t"), "\n\t\t"), "\n\n\t" ];
  });
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/doc_controls/docControls.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0x21f5=["\x76\x61\x6C\x69\x64\x61\x74\x65\x44\x6F\x63\x75\x6D\x65\x6E\x74","\x69\x73\x46\x75\x6E\x63\x74\x69\x6F\x6E","\x65\x61\x63\x68","\x69\x6E\x6C\x69\x6E\x65\x45\x64\x69\x74\x69\x6E\x67\x54\x69\x6D\x65\x72","\x72\x65\x73\x65\x74\x49\x6E\x6C\x69\x6E\x65\x45\x64\x69\x74\x69\x6E\x67\x54\x69\x6D\x65\x72","\x63\x6C\x65\x61\x72\x54\x69\x6D\x65\x6F\x75\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6E\x6F\x49\x6E\x6C\x69\x6E\x65\x45\x64\x69\x74\x69\x6E\x67","\x73\x65\x74","\x73\x65\x74\x54\x69\x6D\x65\x6F\x75\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x63\x75\x72\x72\x65\x6E\x74\x43\x6F\x6C\x6C\x65\x63\x74\x69\x6F\x6E","\x67\x65\x74","\x4D\x6F\x6E\x67\x6F\x6C\x5F","\x66\x65\x74\x63\x68","\x66\x69\x6E\x64","\x63\x6F\x75\x6E\x74","\x5F\x69\x64","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x75\x70\x6C\x69\x63\x61\x74\x65","\x66\x69\x6E\x64\x4F\x6E\x65","\x6D\x61\x70","\x64\x75\x70\x6C\x69\x63\x61\x74\x65","\x65\x72\x72\x6F\x72","\x63\x61\x6C\x6C","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x65\x64\x69\x74\x4D\x6F\x64\x65","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x72\x65\x6D\x6F\x76\x65","\x73\x68\x6F\x75\x6C\x64\x4C\x6F\x67","\x52\x65\x6D\x6F\x76\x65\x64\x20","\x20\x66\x72\x6F\x6D\x20","\x2E\x20\x42\x61\x63\x6B\x2D\x75\x70\x20\x62\x65\x6C\x6F\x77\x3A","\x6C\x6F\x67","\x72\x65\x6D\x6F\x76\x65","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x64\x69\x73\x61\x62\x6C\x65\x64","\x68\x61\x73\x43\x6C\x61\x73\x73","\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x72\x69\x67\x68\x74","\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x6C\x65\x66\x74","\x61\x63\x63\x6F\x75\x6E\x74\x5F\x36\x31\x38","\x65\x71\x75\x61\x6C\x73","\x75\x73\x65\x72\x73","\x67\x65\x74\x44\x6F\x63\x75\x6D\x65\x6E\x74\x55\x70\x64\x61\x74\x65","\x70\x61\x72\x73\x65","\x75\x73\x65\x72","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x75\x70\x64\x61\x74\x65","\x75\x70\x64\x61\x74\x65","\x6C\x6F\x67\x6F\x75\x74","\x65\x76\x65\x6E\x74\x73","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x6F\x63\x43\x6F\x6E\x74\x72\x6F\x6C\x73","\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x5F\x64\x69\x73\x61\x62\x6C\x65\x64","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x77\x72\x61\x70\x70\x65\x72\x5F\x65\x78\x70\x61\x6E\x64","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x64\x6F\x63\x4D\x65\x6E\x75\x5F\x65\x64\x69\x74\x69\x6E\x67","\x68\x65\x6C\x70\x65\x72\x73"];Mongol[_0x21f5[0]]= function(_0x4c53x1){var _0x4c53x2={};_[_0x21f5[2]](_0x4c53x1,function(_0x4c53x3,_0x4c53x4){if(_[_0x21f5[1]](_0x4c53x3)){return};_0x4c53x2[_0x4c53x4]= _0x4c53x3});return _0x4c53x2};Mongol[_0x21f5[3]]= null;Mongol[_0x21f5[4]]= function(){if(Mongol[_0x21f5[3]]){Meteor[_0x21f5[5]](Mongol[_0x21f5[3]])};MeteorToysDict[_0x21f5[7]](_0x21f5[6],true);Mongol[_0x21f5[3]]= Meteor[_0x21f5[8]](function(){MeteorToysDict[_0x21f5[7]](_0x21f5[6],false)},300)};Template[_0x21f5[44]][_0x21f5[43]]({"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x6E\x65\x77":function(){CollectionName= MeteorToysDict[_0x21f5[10]](_0x21f5[9]),DocumentPosition= MeteorToysDict[_0x21f5[10]](_0x21f5[11]+ String(this)),CurrentCollection= Mongol.Collection(CollectionName)[_0x21f5[13]]({},{transform:null})[_0x21f5[12]](),CollectionCount= Mongol.Collection(CollectionName)[_0x21f5[13]]()[_0x21f5[14]](),CurrentDocument= CurrentCollection[DocumentPosition],DocumentID= CurrentDocument[_0x21f5[15]],sessionKey= _0x21f5[11]+ String(this),ValidatedCurrentDocument= Mongol[_0x21f5[0]](CurrentDocument);Meteor[_0x21f5[21]](_0x21f5[16],CollectionName,ValidatedCurrentDocument._id,function(_0x4c53x5,_0x4c53x6){if(!_0x4c53x5){if(Mongol.Collection(CollectionName)[_0x21f5[17]](_0x4c53x6)){list= Mongol.Collection(CollectionName)[_0x21f5[13]]({},{transform:null})[_0x21f5[12]](),docID= _0x4c53x6,currentDoc;docIndex= _[_0x21f5[18]](list,function(_0x4c53x7,_0x4c53x8){if(_0x4c53x7[_0x21f5[15]]=== docID){currentDoc= _0x4c53x8}});MeteorToysDict[_0x21f5[7]](sessionKey,Number(currentDoc))}}else {Mongol[_0x21f5[20]](_0x21f5[19])}})},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x65\x64\x69\x74":function(){MeteorToysDict[_0x21f5[7]](_0x21f5[22],true)},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x64\x65\x6C\x65\x74\x65":function(){var _0x4c53x9=MeteorToysDict[_0x21f5[10]](_0x21f5[9]),_0x4c53xa=_0x21f5[11]+ String(this);DocumentPosition= MeteorToysDict[_0x21f5[10]](_0x4c53xa),CurrentCollection= Mongol.Collection(_0x4c53x9)[_0x21f5[13]]({},{transform:null})[_0x21f5[12]](),CollectionCount= Mongol.Collection(_0x4c53x9)[_0x21f5[13]]()[_0x21f5[14]]();var _0x4c53xb=CurrentCollection[DocumentPosition],_0x4c53xc=_0x4c53xb[_0x21f5[15]];Meteor[_0x21f5[21]](_0x21f5[23],_0x4c53x9,_0x4c53xc,function(_0x4c53x5,_0x4c53x6){if(!_0x4c53x5){if(MeteorToysDict[_0x21f5[24]]()){console[_0x21f5[28]](_0x21f5[25]+ _0x4c53xc+ _0x21f5[26]+ _0x4c53x9+ _0x21f5[27]);console[_0x21f5[28]](_0x4c53xb)};if(DocumentPosition>= CollectionCount- 1){newPosition= DocumentPosition- 1;MeteorToysDict[_0x21f5[7]](_0x4c53xa,newPosition)};if(MeteorToysDict[_0x21f5[10]](_0x4c53xa)===  -1){MeteorToysDict[_0x21f5[7]](_0x4c53xa,0)}}else {Mongol[_0x21f5[20]](_0x21f5[29])}})},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x72\x69\x67\x68\x74":function(_0x4c53xd,_0x4c53xe){if(!_0x4c53xe.$(_0x21f5[32])[_0x21f5[31]](_0x21f5[30])){Mongol[_0x21f5[4]]();var _0x4c53xa=_0x21f5[11]+ String(this);var _0x4c53xb=MeteorToysDict[_0x21f5[10]](_0x4c53xa);var _0x4c53xf=String(this);var _0x4c53x10=Mongol.Collection(_0x4c53xf);var _0x4c53x11=_0x4c53x10[_0x21f5[13]]()[_0x21f5[14]]()- 1;if(_0x4c53xb> _0x4c53x11){MeteorToysDict[_0x21f5[7]](_0x4c53xa,0);return};if(_0x4c53x11=== _0x4c53xb){MeteorToysDict[_0x21f5[7]](_0x4c53xa,0)}else {var _0x4c53x12=MeteorToysDict[_0x21f5[10]](_0x4c53xa)+ 1;MeteorToysDict[_0x21f5[7]](_0x4c53xa,_0x4c53x12)}}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x6C\x65\x66\x74":function(_0x4c53xd,_0x4c53xe){if(!_0x4c53xe.$(_0x21f5[33])[_0x21f5[31]](_0x21f5[30])){Mongol[_0x21f5[4]]();sessionKey= _0x21f5[11]+ String(this);var _0x4c53xb=MeteorToysDict[_0x21f5[10]](sessionKey);var _0x4c53xf=String(this);var _0x4c53x10=Mongol.Collection(_0x4c53xf);var _0x4c53x11=_0x4c53x10[_0x21f5[13]]()[_0x21f5[14]]()- 1;if(_0x4c53xb> _0x4c53x11){MeteorToysDict[_0x21f5[7]](sessionKey,_0x4c53x11);return};if(MeteorToysDict[_0x21f5[10]](sessionKey)=== 0){MeteorToysDict[_0x21f5[7]](sessionKey,_0x4c53x11)}else {var _0x4c53x12=MeteorToysDict[_0x21f5[10]](sessionKey)- 1;MeteorToysDict[_0x21f5[7]](sessionKey,_0x4c53x12)}}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x65\x64\x69\x74\x5F\x73\x61\x76\x65":function(){var _0x4c53xf=(MeteorToysDict[_0x21f5[35]](_0x21f5[9],_0x21f5[34]))?_0x21f5[36]:String(this);if(MeteorToysDict[_0x21f5[35]](_0x21f5[9],_0x21f5[34])){var _0x4c53x13=Mongol[_0x21f5[37]](_0x21f5[34]);var _0x4c53x14=Mongol[_0x21f5[38]](_0x4c53x13);var _0x4c53x15=Meteor[_0x21f5[39]]()}else {var _0x4c53xa=_0x21f5[11]+ _0x4c53xf;DocumentPosition= MeteorToysDict[_0x21f5[10]](_0x4c53xa),CurrentCollection= Mongol.Collection(_0x4c53xf)[_0x21f5[13]]({},{transform:null})[_0x21f5[12]]();var _0x4c53x13=Mongol[_0x21f5[37]](_0x4c53xf);var _0x4c53x14=Mongol[_0x21f5[38]](_0x4c53x13);var _0x4c53x15=CurrentCollection[DocumentPosition]};if(_0x4c53x14){Meteor[_0x21f5[21]](_0x21f5[40],_0x4c53xf,_0x4c53x14,Mongol[_0x21f5[0]](_0x4c53x15),function(_0x4c53x5,_0x4c53x6){if(!_0x4c53x5){MeteorToysDict[_0x21f5[7]](_0x21f5[22],null)}else {Mongol[_0x21f5[20]](_0x21f5[41])}})}},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x65\x64\x69\x74\x5F\x63\x61\x6E\x63\x65\x6C":function(){MeteorToysDict[_0x21f5[7]](_0x21f5[22],null)},"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x73\x69\x67\x6E\x6F\x75\x74":function(){Meteor[_0x21f5[42]]();MeteorToysDict[_0x21f5[7]](_0x21f5[9],null)}});Template[_0x21f5[44]][_0x21f5[48]]({disable:function(){var _0x4c53xa=_0x21f5[11]+ String(this);var _0x4c53xb=MeteorToysDict[_0x21f5[10]](_0x4c53xa);var _0x4c53xf=String(this);var _0x4c53x10=Mongol.Collection(_0x4c53xf);var _0x4c53x11=_0x4c53x10[_0x21f5[13]]()[_0x21f5[14]]();if(_0x4c53xb>= 1){return};if(_0x4c53x11=== 1){return _0x21f5[45]}},editing:function(){var _0x4c53x16=MeteorToysDict[_0x21f5[10]](_0x21f5[22]);return _0x4c53x16},editing_class:function(){var _0x4c53x17=MeteorToysDict[_0x21f5[10]](_0x21f5[22]);if(_0x4c53x17){return _0x21f5[46]}},Mongol_docMenu_editing:function(){var _0x4c53x18=MeteorToysDict[_0x21f5[10]](_0x21f5[22]);if(_0x4c53x18){return _0x21f5[47]}},active:function(){var _0x4c53x19=MeteorToysDict[_0x21f5[10]](_0x21f5[9]);if(_0x4c53x19=== String(this)){return true};if(_0x4c53x19=== _0x21f5[34]){return true}},account:function(){var _0x4c53x1a=MeteorToysDict[_0x21f5[10]](_0x21f5[9]);if(_0x4c53x1a=== _0x21f5[34]){return true}else {return false}}})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_support/template.support.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("Mongol_support");
Template["Mongol_support"] = new Template("Template.Mongol_support", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("show"));
  }, function() {
    return [ "\n\t", Blaze._TemplateWith(function() {
      return {
        name: Spacebars.call("support")
      };
    }, function() {
      return Spacebars.include(view.lookupTemplate("Mongol_Component"), function() {
        return [ "\n\t\t\n\t\t", HTML.DIV({
          class: "Mongol_icon Mongol_icon_support"
        }), "Support", HTML.BR(), "\n\t\t\n\n\t\t", HTML.DIV({
          class: "Mongol_contentView"
        }, "\n\t\t\t", HTML.DIV({
          class: "Mongol_docMenu",
          style: "padding-left: 8px"
        }, "\n\t\t\t\t", HTML.DIV({
          class: "MeteorToys_action Mongol_m_signout"
        }, "Hide"), "\n\t\t\t\tThanks for using Mongol!\n\t\t\t"), "\n\t\t\t", HTML.DIV({
          class: "Mongol_documentViewer "
        }, "\n\t\t\t\tIf you've been enjoying Meteor Toys,", HTML.BR(), "\n\t\t\t\tplease consider making a one-time\n\t\t\t\tpurchase ", HTML.BR(), "for the complete set.", HTML.BR(), HTML.BR(), "\n\t\t\t\t\n", HTML.A({
          href: "https://meteor.toys/?ref=mongol",
          style: "color: #cc0000"
        }, HTML.DIV({
          class: "Mongol_buy MeteorToys-background-blue MeteorToys-color-foundation"
        }, HTML.CharRef({
          html: "&nbsp;",
          str: " "
        }), " Upgrade Now ", HTML.CharRef({
          html: "&raquo;",
          str: "»"
        }), " ", HTML.CharRef({
          html: "&nbsp;",
          str: " "
        }))), "\n\n\t\t\t\t", HTML.BR(), HTML.BR(), "\n\n\t\t\t\tYou purchase will grant you access", HTML.BR(), "\n\t\t\t\tto over a dozen more, similar tools, ", HTML.BR(), "\n\t\t\t\tand help support their continuity.", HTML.BR(), HTML.BR(), "\n\t\t\t\tMeteor Toys Pro offer features like:", HTML.BR(), "\n\t\t\t\t - One-click Autopublish Toggle", HTML.BR(), "\n\t\t\t\t - Instant Account Authentication", HTML.BR(), "\n\t\t\t\t - DDP Speed Throttle", HTML.BR(), "\n\t\t\t\t - Template Inspection", HTML.BR(), "\n\t\t\t\t - and more!\n\n\n\n\t\t\t"), "\n\t\t"), "\n\t" ];
      });
    }), "\n" ];
  });
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/msavin_mongol/client/row_support/support.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _0xacfc=["\x4D\x65\x74\x65\x6F\x72\x54\x6F\x79\x73\x2E\x68\x69\x64\x65\x53\x75\x70\x70\x6F\x72\x74","\x67\x65\x74\x49\x74\x65\x6D","\x68\x69\x64\x65\x53\x75\x70\x70\x6F\x72\x74","\x73\x65\x74","\x73\x74\x61\x72\x74\x75\x70","\x63\x6C\x6F\x73\x65","\x4D\x6F\x6E\x67\x6F\x6C","\x74\x72\x75\x65","\x73\x65\x74\x49\x74\x65\x6D","\x73\x65\x74\x54\x69\x6D\x65\x6F\x75\x74","\x65\x76\x65\x6E\x74\x73","\x4D\x6F\x6E\x67\x6F\x6C\x5F\x73\x75\x70\x70\x6F\x72\x74","\x67\x65\x74","\x68\x65\x6C\x70\x65\x72\x73"];Meteor[_0xacfc[4]](function(){if(localStorage[_0xacfc[1]](_0xacfc[0])){MeteorToysDict[_0xacfc[3]](_0xacfc[2],true)}});Template[_0xacfc[11]][_0xacfc[10]]({"\x63\x6C\x69\x63\x6B\x20\x2E\x4D\x6F\x6E\x67\x6F\x6C\x5F\x6D\x5F\x73\x69\x67\x6E\x6F\x75\x74":function(){window[_0xacfc[6]][_0xacfc[5]]();window[_0xacfc[9]](function(){MeteorToysDict[_0xacfc[3]](_0xacfc[2],true);localStorage[_0xacfc[8]](_0xacfc[0],_0xacfc[7])},300)}});Template[_0xacfc[11]][_0xacfc[13]]({show:function(){if(MeteorToysDict[_0xacfc[12]](_0xacfc[2])){return false}else {return true}}})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
Package._define("msavin:mongol", {
  Mongol: Mongol
});

})();
