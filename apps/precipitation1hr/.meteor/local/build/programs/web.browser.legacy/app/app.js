var require = meteorInstall({"client":{"main.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// client/main.js                                                    //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
var matsTypes;
module.link("meteor/randyp:mats-common", {
  matsTypes: function (v) {
    matsTypes = v;
  }
}, 0);
var matsCollections;
module.link("meteor/randyp:mats-common", {
  matsCollections: function (v) {
    matsCollections = v;
  }
}, 1);
var methods;
module.link("meteor/randyp:mats-common", {
  methods: function (v) {
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