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
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Retry = Package.retry.Retry;
var DDP = Package['ddp-client'].DDP;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Symbol = Package['ecmascript-runtime-client'].Symbol;
var Map = Package['ecmascript-runtime-client'].Map;
var Set = Package['ecmascript-runtime-client'].Set;

/* Package-scope variables */
var Autoupdate;

var require = meteorInstall({"node_modules":{"meteor":{"autoupdate":{"autoupdate_client.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/autoupdate/autoupdate_client.js                                                                 //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.export({
  Autoupdate: function () {
    return Autoupdate;
  }
});
var ClientVersions;
module.link("./client_versions.js", {
  ClientVersions: function (v) {
    ClientVersions = v;
  }
}, 0);
var clientArch = Meteor.isCordova ? "web.cordova" : Meteor.isModern ? "web.browser" : "web.browser.legacy";
var autoupdateVersions = ((__meteor_runtime_config__.autoupdate || {}).versions || {})[clientArch] || {
  version: "unknown",
  versionRefreshable: "unknown",
  versionNonRefreshable: "unknown",
  assets: []
};
var Autoupdate = {};
// Stores acceptable client versions.
var clientVersions = Autoupdate._clientVersions = // Used by a self-test.
new ClientVersions();
Meteor.connection.registerStore("meteor_autoupdate_clientVersions", clientVersions.createStore());

Autoupdate.newClientAvailable = function () {
  return clientVersions.newClientAvailable(clientArch, ["versionRefreshable", "versionNonRefreshable"], autoupdateVersions);
}; // Set to true if the link.onload callback ever fires for any <link> node.


var knownToSupportCssOnLoad = false;
var retry = new Retry({
  // Unlike the stream reconnect use of Retry, which we want to be instant
  // in normal operation, this is a wacky failure. We don't want to retry
  // right away, we can start slowly.
  //
  // A better way than timeconstants here might be to use the knowledge
  // of when we reconnect to help trigger these retries. Typically, the
  // server fixing code will result in a restart and reconnect, but
  // potentially the subscription could have a transient error.
  minCount: 0,
  // don't do any immediate retries
  baseTimeout: 30 * 1000 // start with 30s

});
var failures = 0;

Autoupdate._retrySubscription = function () {
  Meteor.subscribe("meteor_autoupdate_clientVersions", {
    onError: function (error) {
      Meteor._debug("autoupdate subscription failed", error);

      failures++;
      retry.retryLater(failures, function () {
        // Just retry making the subscription, don't reload the whole
        // page. While reloading would catch more cases (for example,
        // the server went back a version and is now doing old-style hot
        // code push), it would also be more prone to reload loops,
        // which look really bad to the user. Just retrying the
        // subscription over DDP means it is at least possible to fix by
        // updating the server.
        Autoupdate._retrySubscription();
      });
    },
    onReady: function () {
      // Call checkNewVersionDocument with a slight delay, so that the
      // const handle declaration is guaranteed to be initialized, even if
      // the added or changed callbacks are called synchronously.
      var resolved = Promise.resolve();

      function check(doc) {
        resolved.then(function () {
          return checkNewVersionDocument(doc);
        });
      }

      var stop = clientVersions.watch(check);

      function checkNewVersionDocument(doc) {
        if (doc._id !== clientArch) {
          return;
        }

        if (doc.versionNonRefreshable !== autoupdateVersions.versionNonRefreshable) {
          // Non-refreshable assets have changed, so we have to reload the
          // whole page rather than just replacing <link> tags.
          if (stop) stop();

          if (Package.reload) {
            // The reload package should be provided by ddp-client, which
            // is provided by the ddp package that autoupdate depends on.
            Package.reload.Reload._reload();
          }

          return;
        }

        if (doc.versionRefreshable !== autoupdateVersions.versionRefreshable) {
          var waitUntilCssLoads = function (link, callback) {
            var called;

            link.onload = function () {
              knownToSupportCssOnLoad = true;

              if (!called) {
                called = true;
                callback();
              }
            };

            if (!knownToSupportCssOnLoad) {
              var id = Meteor.setInterval(function () {
                if (link.sheet) {
                  if (!called) {
                    called = true;
                    callback();
                  }

                  Meteor.clearInterval(id);
                }
              }, 50);
            }
          };

          var removeOldLinks = function () {
            if (oldLinks.length > 0 && --newLinksLeftToLoad < 1) {
              oldLinks.splice(0).forEach(function (link) {
                link.parentNode.removeChild(link);
              });
            }
          };

          autoupdateVersions.versionRefreshable = doc.versionRefreshable; // Switch out old css links for the new css links. Inspired by:
          // https://github.com/guard/guard-livereload/blob/master/js/livereload.js#L710

          var newCss = doc.assets || [];
          var oldLinks = [];
          Array.prototype.forEach.call(document.getElementsByTagName('link'), function (link) {
            if (link.className === '__meteor-css__') {
              oldLinks.push(link);
            }
          });
          var newLinksLeftToLoad = newCss.length;

          if (newCss.length > 0) {
            newCss.forEach(function (css) {
              var newLink = document.createElement("link");
              newLink.setAttribute("rel", "stylesheet");
              newLink.setAttribute("type", "text/css");
              newLink.setAttribute("class", "__meteor-css__");
              newLink.setAttribute("href", css.url);
              waitUntilCssLoads(newLink, function () {
                Meteor.setTimeout(removeOldLinks, 200);
              });
              var head = document.getElementsByTagName("head").item(0);
              head.appendChild(newLink);
            });
          } else {
            removeOldLinks();
          }
        }
      }
    }
  });
};

Autoupdate._retrySubscription();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"client_versions.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/autoupdate/client_versions.js                                                                   //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

module.export({
  ClientVersions: function () {
    return ClientVersions;
  }
});
var Tracker;
module.link("meteor/tracker", {
  Tracker: function (v) {
    Tracker = v;
  }
}, 0);

var ClientVersions =
/*#__PURE__*/
function () {
  function ClientVersions() {
    this._versions = new Map();
    this._watchCallbacks = new Set();
  } // Creates a Livedata store for use with `Meteor.connection.registerStore`.
  // After the store is registered, document updates reported by Livedata are
  // merged with the documents in this `ClientVersions` instance.


  var _proto = ClientVersions.prototype;

  _proto.createStore = function () {
    function createStore() {
      var _this = this;

      return {
        update: function (_ref) {
          var id = _ref.id,
              msg = _ref.msg,
              fields = _ref.fields;

          if (msg === "added" || msg === "changed") {
            _this.set(id, fields);
          }
        }
      };
    }

    return createStore;
  }();

  _proto.hasVersions = function () {
    function hasVersions() {
      return this._versions.size > 0;
    }

    return hasVersions;
  }();

  _proto.get = function () {
    function get(id) {
      return this._versions.get(id);
    }

    return get;
  }() // Adds or updates a version document and invokes registered callbacks for the
  // added/updated document. If a document with the given ID already exists, its
  // fields are merged with `fields`.
  ;

  _proto.set = function () {
    function set(id, fields) {
      var version = this._versions.get(id);

      var isNew = false;

      if (version) {
        Object.assign(version, fields);
      } else {
        version = (0, _objectSpread2.default)({
          _id: id
        }, fields);
        isNew = true;

        this._versions.set(id, version);
      }

      this._watchCallbacks.forEach(function (_ref2) {
        var fn = _ref2.fn,
            filter = _ref2.filter;

        if (!filter || filter === version._id) {
          fn(version, isNew);
        }
      });
    }

    return set;
  }() // Registers a callback that will be invoked when a version document is added
  // or changed. Calling the function returned by `watch` removes the callback.
  // If `skipInitial` is true, the callback isn't be invoked for existing
  // documents. If `filter` is set, the callback is only invoked for documents
  // with ID `filter`.
  ;

  _proto.watch = function () {
    function watch(fn) {
      var _this2 = this;

      var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          skipInitial = _ref3.skipInitial,
          filter = _ref3.filter;

      if (!skipInitial) {
        var resolved = Promise.resolve();

        this._versions.forEach(function (version) {
          if (!filter || filter === version._id) {
            resolved.then(function () {
              return fn(version, true);
            });
          }
        });
      }

      var callback = {
        fn: fn,
        filter: filter
      };

      this._watchCallbacks.add(callback);

      return function () {
        return _this2._watchCallbacks.delete(callback);
      };
    }

    return watch;
  }() // A reactive data source for `Autoupdate.newClientAvailable`.
  ;

  _proto.newClientAvailable = function () {
    function newClientAvailable(id, fields, currentVersion) {
      function isNewVersion(version) {
        return version._id === id && fields.some(function (field) {
          return version[field] !== currentVersion[field];
        });
      }

      var dependency = new Tracker.Dependency();
      var version = this.get(id);
      dependency.depend();
      var stop = this.watch(function (version) {
        if (isNewVersion(version)) {
          dependency.changed();
          stop();
        }
      }, {
        skipInitial: true
      });
      return !!version && isNewVersion(version);
    }

    return newClientAvailable;
  }();

  return ClientVersions;
}();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/autoupdate/autoupdate_client.js");

/* Exports */
Package._define("autoupdate", exports, {
  Autoupdate: Autoupdate
});

})();
