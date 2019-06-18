(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package['modules-runtime'].meteorInstall;

var require = meteorInstall({"node_modules":{"meteor":{"modules":{"server.js":function(require){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/modules/server.js                                                                    //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
require("./install-packages.js");
require("./process.js");
require("./reify.js");

///////////////////////////////////////////////////////////////////////////////////////////////////

},"install-packages.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/modules/install-packages.js                                                          //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
function install(name, mainModule) {
  var meteorDir = {};

  // Given a package name <name>, install a stub module in the
  // /node_modules/meteor directory called <name>.js, so that
  // require.resolve("meteor/<name>") will always return
  // /node_modules/meteor/<name>.js instead of something like
  // /node_modules/meteor/<name>/index.js, in the rare but possible event
  // that the package contains a file called index.js (#6590).

  if (typeof mainModule === "string") {
    // Set up an alias from /node_modules/meteor/<package>.js to the main
    // module, e.g. meteor/<package>/index.js.
    meteorDir[name + ".js"] = mainModule;
  } else {
    // back compat with old Meteor packages
    meteorDir[name + ".js"] = function (r, e, module) {
      module.exports = Package[name];
    };
  }

  meteorInstall({
    node_modules: {
      meteor: meteorDir
    }
  });
}

// This file will be modified during computeJsOutputFilesMap to include
// install(<name>) calls for every Meteor package.

install("meteor");
install("meteor-base");
install("mobile-experience");
install("npm-mongo");
install("ecmascript-runtime");
install("modules-runtime");
install("modules", "meteor/modules/server.js");
install("modern-browsers", "meteor/modern-browsers/modern.js");
install("es5-shim");
install("promise", "meteor/promise/server.js");
install("ecmascript-runtime-client", "meteor/ecmascript-runtime-client/versions.js");
install("ecmascript-runtime-server", "meteor/ecmascript-runtime-server/runtime.js");
install("babel-compiler");
install("ecmascript");
install("babel-runtime", "meteor/babel-runtime/babel-runtime.js");
install("fetch", "meteor/fetch/server.js");
install("inter-process-messaging", "meteor/inter-process-messaging/inter-process-messaging.js");
install("dynamic-import", "meteor/dynamic-import/server.js");
install("base64", "meteor/base64/base64.js");
install("ejson", "meteor/ejson/ejson.js");
install("diff-sequence", "meteor/diff-sequence/diff.js");
install("geojson-utils", "meteor/geojson-utils/main.js");
install("id-map", "meteor/id-map/id-map.js");
install("random");
install("mongo-id", "meteor/mongo-id/id.js");
install("ordered-dict", "meteor/ordered-dict/ordered_dict.js");
install("tracker");
install("minimongo", "meteor/minimongo/minimongo_server.js");
install("check", "meteor/check/match.js");
install("retry", "meteor/retry/retry.js");
install("callback-hook", "meteor/callback-hook/hook.js");
install("ddp-common");
install("reload");
install("socket-stream-client", "meteor/socket-stream-client/node.js");
install("ddp-client", "meteor/ddp-client/server/server.js");
install("underscore");
install("rate-limit", "meteor/rate-limit/rate-limit.js");
install("ddp-rate-limiter");
install("logging", "meteor/logging/logging.js");
install("routepolicy", "meteor/routepolicy/main.js");
install("boilerplate-generator", "meteor/boilerplate-generator/generator.js");
install("webapp-hashing");
install("webapp", "meteor/webapp/webapp_server.js");
install("ddp-server");
install("ddp");
install("allow-deny");
install("mongo-dev-server", "meteor/mongo-dev-server/server.js");
install("mongo-decimal", "meteor/mongo-decimal/decimal.js");
install("binary-heap", "meteor/binary-heap/binary-heap.js");
install("mongo");
install("blaze-html-templates");
install("reactive-var");
install("jquery");
install("standard-minifier-js");
install("shell-server", "meteor/shell-server/main.js");
install("pcel:mysql");
install("seba:minifiers-autoprefixer");
install("session");
install("momentjs:moment");
install("aldeed:simple-schema");
install("mdg:validated-method", "meteor/mdg:validated-method/validated-method.js");
install("accounts-base", "meteor/accounts-base/server_main.js");
install("service-configuration");
install("dangrossman:bootstrap-daterangepicker");
install("twbs:bootstrap");
install("fortawesome:fontawesome");
install("meteortoys:toykit");
install("msavin:mongol");
install("differential:event-hooks");
install("risul:bootstrap-colorpicker");
install("observe-sequence");
install("deps");
install("htmljs");
install("blaze");
install("spacebars");
install("reactive-dict", "meteor/reactive-dict/migration.js");
install("ostrio:flow-router-extra", "meteor/ostrio:flow-router-extra/server/_init.js");
install("meteorhacks:picker");
install("randyp:mats-common", "meteor/randyp:mats-common/server/main.js");
install("localstorage");
install("url", "meteor/url/url_server.js");
install("oauth");
install("accounts-oauth");
install("oauth2");
install("http", "meteor/http/httpcall_server.js");
install("google-oauth", "meteor/google-oauth/namespace.js");
install("accounts-ui");
install("google-config-ui");
install("accounts-google");
install("templating-compiler");
install("templating-runtime");
install("templating");
install("kadira:blaze-layout");
install("livedata");
install("hot-code-push");
install("launch-screen");
install("ui");
install("autoupdate", "meteor/autoupdate/autoupdate_server.js");
install("mdg:validation-error");

///////////////////////////////////////////////////////////////////////////////////////////////////

},"process.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/modules/process.js                                                                   //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
if (! global.process) {
  try {
    // The application can run `npm install process` to provide its own
    // process stub; otherwise this module will provide a partial stub.
    global.process = require("process");
  } catch (missing) {
    global.process = {};
  }
}

var proc = global.process;

if (Meteor.isServer) {
  // Make require("process") work on the server in all versions of Node.
  meteorInstall({
    node_modules: {
      "process.js": function (r, e, module) {
        module.exports = proc;
      }
    }
  });
} else {
  proc.platform = "browser";
  proc.nextTick = proc.nextTick || Meteor._setImmediate;
}

if (typeof proc.env !== "object") {
  proc.env = {};
}

var hasOwn = Object.prototype.hasOwnProperty;
for (var key in meteorEnv) {
  if (hasOwn.call(meteorEnv, key)) {
    proc.env[key] = meteorEnv[key];
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////

},"reify.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/modules/reify.js                                                                     //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
require("reify/lib/runtime").enable(
  module.constructor.prototype
);

///////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"reify":{"lib":{"runtime":{"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/meteor/modules/node_modules/reify/lib/runtime/index.js                           //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
meteorInstall({"node_modules":{"fibers":{"package.json":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/fibers/package.json                                                              //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.exports = {
  "name": "fibers",
  "version": "2.0.2",
  "main": "fibers"
};

///////////////////////////////////////////////////////////////////////////////////////////////////

},"fibers.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/fibers/fibers.js                                                                 //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////

}},"@babel":{"runtime":{"package.json":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/@babel/runtime/package.json                                                      //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////

},"helpers":{"interopRequireDefault.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/@babel/runtime/helpers/interopRequireDefault.js                                  //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////

},"objectSpread.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/@babel/runtime/helpers/objectSpread.js                                           //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"xmlbuilder":{"package.json":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/xmlbuilder/package.json                                                          //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.exports = {
  "name": "xmlbuilder",
  "version": "10.1.1",
  "main": "./lib/index"
};

///////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/xmlbuilder/lib/index.js                                                          //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////

}}},"object-sizeof":{"package.json":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/object-sizeof/package.json                                                       //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.exports = {
  "name": "object-sizeof",
  "version": "1.2.0",
  "main": "index.js"
};

///////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/object-sizeof/index.js                                                           //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////

}},"object-hash":{"package.json":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/object-hash/package.json                                                         //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.exports = {
  "name": "object-hash",
  "version": "1.3.0",
  "main": "./index.js"
};

///////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/object-hash/index.js                                                             //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////

}},"downsample-lttb":{"package.json":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/downsample-lttb/package.json                                                     //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.exports = {
  "name": "downsample-lttb",
  "version": "0.0.1",
  "main": "index.js"
};

///////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// node_modules/downsample-lttb/index.js                                                         //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////

}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/modules/server.js");

/* Exports */
Package._define("modules", exports, {
  meteorInstall: meteorInstall
});

})();
