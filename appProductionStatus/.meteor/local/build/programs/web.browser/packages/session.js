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
var ReactiveDict = Package['reactive-dict'].ReactiveDict;
var EJSON = Package.ejson.EJSON;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Session;

var require = meteorInstall({"node_modules":{"meteor":{"session":{"session.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/session/session.js                                       //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
module.export({
  Session: () => Session
});
let ReactiveDict;
module.link("meteor/reactive-dict", {
  ReactiveDict(v) {
    ReactiveDict = v;
  }

}, 0);
const Session = new ReactiveDict('session');
///////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/session/session.js");

/* Exports */
Package._define("session", exports, {
  Session: Session
});

})();
