var require = meteorInstall({"client":{"main.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// client/main.js                                                    //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
let matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes(v) {
    matsTypes = v;
  }

}, 0);
let matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections(v) {
    matsCollections = v;
  }

}, 1);
let methods;
module.link("meteor/randyp:mats-common", {
  methods(v) {
    methods = v;
  }

}, 2);
///////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".html",
    ".css"
  ]
});

require("/client/main.js");