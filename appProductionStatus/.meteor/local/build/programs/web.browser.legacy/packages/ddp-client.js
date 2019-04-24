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
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Retry = Package.retry.Retry;
var IdMap = Package['id-map'].IdMap;
var Hook = Package['callback-hook'].Hook;
var DDPCommon = Package['ddp-common'].DDPCommon;
var Reload = Package.reload.Reload;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Symbol = Package['ecmascript-runtime-client'].Symbol;
var Map = Package['ecmascript-runtime-client'].Map;
var Set = Package['ecmascript-runtime-client'].Set;

/* Package-scope variables */
var DDP;

var require = meteorInstall({"node_modules":{"meteor":{"ddp-client":{"client":{"client.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/client/client.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("../common/namespace.js", {
  DDP: "DDP"
}, 0);
module.link("../common/livedata_connection");
module.link("./client_convenience");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"client_convenience.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/client/client_convenience.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var DDP;
module.link("../common/namespace.js", {
  DDP: function (v) {
    DDP = v;
  }
}, 0);
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 1);

// Meteor.refresh can be called on the client (if you're in common code) but it
// only has an effect on the server.
Meteor.refresh = function () {}; // By default, try to connect back to the same endpoint as the page
// was served from.
//
// XXX We should be doing this a different way. Right now we don't
// include ROOT_URL_PATH_PREFIX when computing ddpUrl. (We don't
// include it on the server when computing
// DDP_DEFAULT_CONNECTION_URL, and we don't include it in our
// default, '/'.) We get by with this because DDP.connect then
// forces the URL passed to it to be interpreted relative to the
// app's deploy path, even if it is absolute. Instead, we should
// make DDP_DEFAULT_CONNECTION_URL, if set, include the path prefix;
// make the default ddpUrl be '' rather that '/'; and make
// _translateUrl in stream_client_common.js not force absolute paths
// to be treated like relative paths. See also
// stream_client_common.js #RationalizingRelativeDDPURLs


var ddpUrl = '/';

if (typeof __meteor_runtime_config__ !== 'undefined') {
  if (__meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL) ddpUrl = __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL;
}

var retry = new Retry();

function onDDPVersionNegotiationFailure(description) {
  Meteor._debug(description);

  if (Package.reload) {
    var migrationData = Package.reload.Reload._migrationData('livedata') || Object.create(null);
    var failures = migrationData.DDPVersionNegotiationFailures || 0;
    ++failures;

    Package.reload.Reload._onMigrate('livedata', function () {
      return [true, {
        DDPVersionNegotiationFailures: failures
      }];
    });

    retry.retryLater(failures, function () {
      Package.reload.Reload._reload();
    });
  }
}

Meteor.connection = DDP.connect(ddpUrl, {
  onDDPVersionNegotiationFailure: onDDPVersionNegotiationFailure
}); // Proxy the public methods of Meteor.connection so they can
// be called directly on Meteor.

['subscribe', 'methods', 'call', 'apply', 'status', 'reconnect', 'disconnect'].forEach(function (name) {
  Meteor[name] = Meteor.connection[name].bind(Meteor.connection);
}); // Meteor.connection used to be called
// Meteor.default_connection. Provide backcompat as a courtesy even
// though it was never documented.
// XXX COMPAT WITH 0.6.4

Meteor.default_connection = Meteor.connection; // We should transition from Meteor.connect to DDP.connect.
// XXX COMPAT WITH 0.6.4

Meteor.connect = DDP.connect;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"common":{"MethodInvoker.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/common/MethodInvoker.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  "default": function () {
    return MethodInvoker;
  }
});

var MethodInvoker =
/*#__PURE__*/
function () {
  function MethodInvoker(options) {
    // Public (within this file) fields.
    this.methodId = options.methodId;
    this.sentMessage = false;
    this._callback = options.callback;
    this._connection = options.connection;
    this._message = options.message;

    this._onResultReceived = options.onResultReceived || function () {};

    this._wait = options.wait;
    this.noRetry = options.noRetry;
    this._methodResult = null;
    this._dataVisible = false; // Register with the connection.

    this._connection._methodInvokers[this.methodId] = this;
  } // Sends the method message to the server. May be called additional times if
  // we lose the connection and reconnect before receiving a result.


  var _proto = MethodInvoker.prototype;

  _proto.sendMessage = function () {
    function sendMessage() {
      // This function is called before sending a method (including resending on
      // reconnect). We should only (re)send methods where we don't already have a
      // result!
      if (this.gotResult()) throw new Error('sendingMethod is called on method with result'); // If we're re-sending it, it doesn't matter if data was written the first
      // time.

      this._dataVisible = false;
      this.sentMessage = true; // If this is a wait method, make all data messages be buffered until it is
      // done.

      if (this._wait) this._connection._methodsBlockingQuiescence[this.methodId] = true; // Actually send the message.

      this._connection._send(this._message);
    }

    return sendMessage;
  }() // Invoke the callback, if we have both a result and know that all data has
  // been written to the local cache.
  ;

  _proto._maybeInvokeCallback = function () {
    function _maybeInvokeCallback() {
      if (this._methodResult && this._dataVisible) {
        // Call the callback. (This won't throw: the callback was wrapped with
        // bindEnvironment.)
        this._callback(this._methodResult[0], this._methodResult[1]); // Forget about this method.


        delete this._connection._methodInvokers[this.methodId]; // Let the connection know that this method is finished, so it can try to
        // move on to the next block of methods.

        this._connection._outstandingMethodFinished();
      }
    }

    return _maybeInvokeCallback;
  }() // Call with the result of the method from the server. Only may be called
  // once; once it is called, you should not call sendMessage again.
  // If the user provided an onResultReceived callback, call it immediately.
  // Then invoke the main callback if data is also visible.
  ;

  _proto.receiveResult = function () {
    function receiveResult(err, result) {
      if (this.gotResult()) throw new Error('Methods should only receive results once');
      this._methodResult = [err, result];

      this._onResultReceived(err, result);

      this._maybeInvokeCallback();
    }

    return receiveResult;
  }() // Call this when all data written by the method is visible. This means that
  // the method has returns its "data is done" message *AND* all server
  // documents that are buffered at that time have been written to the local
  // cache. Invokes the main callback if the result has been received.
  ;

  _proto.dataVisible = function () {
    function dataVisible() {
      this._dataVisible = true;

      this._maybeInvokeCallback();
    }

    return dataVisible;
  }() // True if receiveResult has been called.
  ;

  _proto.gotResult = function () {
    function gotResult() {
      return !!this._methodResult;
    }

    return gotResult;
  }();

  return MethodInvoker;
}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livedata_connection.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/common/livedata_connection.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

module.export({
  Connection: function () {
    return Connection;
  }
});
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var DDPCommon;
module.link("meteor/ddp-common", {
  DDPCommon: function (v) {
    DDPCommon = v;
  }
}, 1);
var Tracker;
module.link("meteor/tracker", {
  Tracker: function (v) {
    Tracker = v;
  }
}, 2);
var EJSON;
module.link("meteor/ejson", {
  EJSON: function (v) {
    EJSON = v;
  }
}, 3);
var Random;
module.link("meteor/random", {
  Random: function (v) {
    Random = v;
  }
}, 4);
var Hook;
module.link("meteor/callback-hook", {
  Hook: function (v) {
    Hook = v;
  }
}, 5);
var MongoID;
module.link("meteor/mongo-id", {
  MongoID: function (v) {
    MongoID = v;
  }
}, 6);
var DDP;
module.link("./namespace.js", {
  DDP: function (v) {
    DDP = v;
  }
}, 7);
var MethodInvoker;
module.link("./MethodInvoker.js", {
  "default": function (v) {
    MethodInvoker = v;
  }
}, 8);
var hasOwn, slice, keys, isEmpty, last;
module.link("meteor/ddp-common/utils.js", {
  hasOwn: function (v) {
    hasOwn = v;
  },
  slice: function (v) {
    slice = v;
  },
  keys: function (v) {
    keys = v;
  },
  isEmpty: function (v) {
    isEmpty = v;
  },
  last: function (v) {
    last = v;
  }
}, 9);

if (Meteor.isServer) {
  var Fiber = Npm.require('fibers');

  var Future = Npm.require('fibers/future');
}

var MongoIDMap =
/*#__PURE__*/
function (_IdMap) {
  (0, _inheritsLoose2.default)(MongoIDMap, _IdMap);

  function MongoIDMap() {
    return _IdMap.call(this, MongoID.idStringify, MongoID.idParse) || this;
  }

  return MongoIDMap;
}(IdMap); // @param url {String|Object} URL to Meteor app,
//   or an object as a test hook (see code)
// Options:
//   reloadWithOutstanding: is it OK to reload if there are outstanding methods?
//   headers: extra headers to send on the websockets connection, for
//     server-to-server DDP only
//   _sockjsOptions: Specifies options to pass through to the sockjs client
//   onDDPNegotiationVersionFailure: callback when version negotiation fails.
//
// XXX There should be a way to destroy a DDP connection, causing all
// outstanding method calls to fail.
//
// XXX Our current way of handling failure and reconnection is great
// for an app (where we want to tolerate being disconnected as an
// expect state, and keep trying forever to reconnect) but cumbersome
// for something like a command line tool that wants to make a
// connection, call a method, and print an error if connection
// fails. We should have better usability in the latter case (while
// still transparently reconnecting if it's just a transient failure
// or the server migrating us).


var Connection =
/*#__PURE__*/
function () {
  function Connection(url, options) {
    var self = this;
    this.options = options = (0, _objectSpread2.default)({
      onConnected: function () {},
      onDDPVersionNegotiationFailure: function (description) {
        Meteor._debug(description);
      },
      heartbeatInterval: 17500,
      heartbeatTimeout: 15000,
      npmFayeOptions: Object.create(null),
      // These options are only for testing.
      reloadWithOutstanding: false,
      supportedDDPVersions: DDPCommon.SUPPORTED_DDP_VERSIONS,
      retry: true,
      respondToPings: true,
      // When updates are coming within this ms interval, batch them together.
      bufferedWritesInterval: 5,
      // Flush buffers immediately if writes are happening continuously for more than this many ms.
      bufferedWritesMaxAge: 500
    }, options); // If set, called when we reconnect, queuing method calls _before_ the
    // existing outstanding ones.
    // NOTE: This feature has been preserved for backwards compatibility. The
    // preferred method of setting a callback on reconnect is to use
    // DDP.onReconnect.

    self.onReconnect = null; // as a test hook, allow passing a stream instead of a url.

    if ((0, _typeof2.default)(url) === 'object') {
      self._stream = url;
    } else {
      var _require = require("meteor/socket-stream-client"),
          ClientStream = _require.ClientStream;

      self._stream = new ClientStream(url, {
        retry: options.retry,
        ConnectionError: DDP.ConnectionError,
        headers: options.headers,
        _sockjsOptions: options._sockjsOptions,
        // Used to keep some tests quiet, or for other cases in which
        // the right thing to do with connection errors is to silently
        // fail (e.g. sending package usage stats). At some point we
        // should have a real API for handling client-stream-level
        // errors.
        _dontPrintErrors: options._dontPrintErrors,
        connectTimeoutMs: options.connectTimeoutMs,
        npmFayeOptions: options.npmFayeOptions
      });
    }

    self._lastSessionId = null;
    self._versionSuggestion = null; // The last proposed DDP version.

    self._version = null; // The DDP version agreed on by client and server.

    self._stores = Object.create(null); // name -> object with methods

    self._methodHandlers = Object.create(null); // name -> func

    self._nextMethodId = 1;
    self._supportedDDPVersions = options.supportedDDPVersions;
    self._heartbeatInterval = options.heartbeatInterval;
    self._heartbeatTimeout = options.heartbeatTimeout; // Tracks methods which the user has tried to call but which have not yet
    // called their user callback (ie, they are waiting on their result or for all
    // of their writes to be written to the local cache). Map from method ID to
    // MethodInvoker object.

    self._methodInvokers = Object.create(null); // Tracks methods which the user has called but whose result messages have not
    // arrived yet.
    //
    // _outstandingMethodBlocks is an array of blocks of methods. Each block
    // represents a set of methods that can run at the same time. The first block
    // represents the methods which are currently in flight; subsequent blocks
    // must wait for previous blocks to be fully finished before they can be sent
    // to the server.
    //
    // Each block is an object with the following fields:
    // - methods: a list of MethodInvoker objects
    // - wait: a boolean; if true, this block had a single method invoked with
    //         the "wait" option
    //
    // There will never be adjacent blocks with wait=false, because the only thing
    // that makes methods need to be serialized is a wait method.
    //
    // Methods are removed from the first block when their "result" is
    // received. The entire first block is only removed when all of the in-flight
    // methods have received their results (so the "methods" list is empty) *AND*
    // all of the data written by those methods are visible in the local cache. So
    // it is possible for the first block's methods list to be empty, if we are
    // still waiting for some objects to quiesce.
    //
    // Example:
    //  _outstandingMethodBlocks = [
    //    {wait: false, methods: []},
    //    {wait: true, methods: [<MethodInvoker for 'login'>]},
    //    {wait: false, methods: [<MethodInvoker for 'foo'>,
    //                            <MethodInvoker for 'bar'>]}]
    // This means that there were some methods which were sent to the server and
    // which have returned their results, but some of the data written by
    // the methods may not be visible in the local cache. Once all that data is
    // visible, we will send a 'login' method. Once the login method has returned
    // and all the data is visible (including re-running subs if userId changes),
    // we will send the 'foo' and 'bar' methods in parallel.

    self._outstandingMethodBlocks = []; // method ID -> array of objects with keys 'collection' and 'id', listing
    // documents written by a given method's stub. keys are associated with
    // methods whose stub wrote at least one document, and whose data-done message
    // has not yet been received.

    self._documentsWrittenByStub = Object.create(null); // collection -> IdMap of "server document" object. A "server document" has:
    // - "document": the version of the document according the
    //   server (ie, the snapshot before a stub wrote it, amended by any changes
    //   received from the server)
    //   It is undefined if we think the document does not exist
    // - "writtenByStubs": a set of method IDs whose stubs wrote to the document
    //   whose "data done" messages have not yet been processed

    self._serverDocuments = Object.create(null); // Array of callbacks to be called after the next update of the local
    // cache. Used for:
    //  - Calling methodInvoker.dataVisible and sub ready callbacks after
    //    the relevant data is flushed.
    //  - Invoking the callbacks of "half-finished" methods after reconnect
    //    quiescence. Specifically, methods whose result was received over the old
    //    connection (so we don't re-send it) but whose data had not been made
    //    visible.

    self._afterUpdateCallbacks = []; // In two contexts, we buffer all incoming data messages and then process them
    // all at once in a single update:
    //   - During reconnect, we buffer all data messages until all subs that had
    //     been ready before reconnect are ready again, and all methods that are
    //     active have returned their "data done message"; then
    //   - During the execution of a "wait" method, we buffer all data messages
    //     until the wait method gets its "data done" message. (If the wait method
    //     occurs during reconnect, it doesn't get any special handling.)
    // all data messages are processed in one update.
    //
    // The following fields are used for this "quiescence" process.
    // This buffers the messages that aren't being processed yet.

    self._messagesBufferedUntilQuiescence = []; // Map from method ID -> true. Methods are removed from this when their
    // "data done" message is received, and we will not quiesce until it is
    // empty.

    self._methodsBlockingQuiescence = Object.create(null); // map from sub ID -> true for subs that were ready (ie, called the sub
    // ready callback) before reconnect but haven't become ready again yet

    self._subsBeingRevived = Object.create(null); // map from sub._id -> true
    // if true, the next data update should reset all stores. (set during
    // reconnect.)

    self._resetStores = false; // name -> array of updates for (yet to be created) collections

    self._updatesForUnknownStores = Object.create(null); // if we're blocking a migration, the retry func

    self._retryMigrate = null;
    self.__flushBufferedWrites = Meteor.bindEnvironment(self._flushBufferedWrites, 'flushing DDP buffered writes', self); // Collection name -> array of messages.

    self._bufferedWrites = Object.create(null); // When current buffer of updates must be flushed at, in ms timestamp.

    self._bufferedWritesFlushAt = null; // Timeout handle for the next processing of all pending writes

    self._bufferedWritesFlushHandle = null;
    self._bufferedWritesInterval = options.bufferedWritesInterval;
    self._bufferedWritesMaxAge = options.bufferedWritesMaxAge; // metadata for subscriptions.  Map from sub ID to object with keys:
    //   - id
    //   - name
    //   - params
    //   - inactive (if true, will be cleaned up if not reused in re-run)
    //   - ready (has the 'ready' message been received?)
    //   - readyCallback (an optional callback to call when ready)
    //   - errorCallback (an optional callback to call if the sub terminates with
    //                    an error, XXX COMPAT WITH 1.0.3.1)
    //   - stopCallback (an optional callback to call when the sub terminates
    //     for any reason, with an error argument if an error triggered the stop)

    self._subscriptions = Object.create(null); // Reactive userId.

    self._userId = null;
    self._userIdDeps = new Tracker.Dependency(); // Block auto-reload while we're waiting for method responses.

    if (Meteor.isClient && Package.reload && !options.reloadWithOutstanding) {
      Package.reload.Reload._onMigrate(function (retry) {
        if (!self._readyToMigrate()) {
          if (self._retryMigrate) throw new Error('Two migrations in progress?');
          self._retryMigrate = retry;
          return false;
        } else {
          return [true];
        }
      });
    }

    var onDisconnect = function () {
      if (self._heartbeat) {
        self._heartbeat.stop();

        self._heartbeat = null;
      }
    };

    if (Meteor.isServer) {
      self._stream.on('message', Meteor.bindEnvironment(this.onMessage.bind(this), 'handling DDP message'));

      self._stream.on('reset', Meteor.bindEnvironment(this.onReset.bind(this), 'handling DDP reset'));

      self._stream.on('disconnect', Meteor.bindEnvironment(onDisconnect, 'handling DDP disconnect'));
    } else {
      self._stream.on('message', this.onMessage.bind(this));

      self._stream.on('reset', this.onReset.bind(this));

      self._stream.on('disconnect', onDisconnect);
    }
  } // 'name' is the name of the data on the wire that should go in the
  // store. 'wrappedStore' should be an object with methods beginUpdate, update,
  // endUpdate, saveOriginals, retrieveOriginals. see Collection for an example.


  var _proto = Connection.prototype;

  _proto.registerStore = function () {
    function registerStore(name, wrappedStore) {
      var self = this;
      if (name in self._stores) return false; // Wrap the input object in an object which makes any store method not
      // implemented by 'store' into a no-op.

      var store = Object.create(null);
      ['update', 'beginUpdate', 'endUpdate', 'saveOriginals', 'retrieveOriginals', 'getDoc', '_getCollection'].forEach(function (method) {
        store[method] = function () {
          if (wrappedStore[method]) {
            return wrappedStore[method].apply(wrappedStore, arguments);
          }
        };
      });
      self._stores[name] = store;
      var queued = self._updatesForUnknownStores[name];

      if (queued) {
        store.beginUpdate(queued.length, false);
        queued.forEach(function (msg) {
          store.update(msg);
        });
        store.endUpdate();
        delete self._updatesForUnknownStores[name];
      }

      return true;
    }

    return registerStore;
  }()
  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.subscribe
   * @summary Subscribe to a record set.  Returns a handle that provides
   * `stop()` and `ready()` methods.
   * @locus Client
   * @param {String} name Name of the subscription.  Matches the name of the
   * server's `publish()` call.
   * @param {EJSONable} [arg1,arg2...] Optional arguments passed to publisher
   * function on server.
   * @param {Function|Object} [callbacks] Optional. May include `onStop`
   * and `onReady` callbacks. If there is an error, it is passed as an
   * argument to `onStop`. If a function is passed instead of an object, it
   * is interpreted as an `onReady` callback.
   */
  ;

  _proto.subscribe = function () {
    function subscribe(name
    /* .. [arguments] .. (callback|callbacks) */
    ) {
      var self = this;
      var params = slice.call(arguments, 1);
      var callbacks = Object.create(null);

      if (params.length) {
        var lastParam = params[params.length - 1];

        if (typeof lastParam === 'function') {
          callbacks.onReady = params.pop();
        } else if (lastParam && [lastParam.onReady, // XXX COMPAT WITH 1.0.3.1 onError used to exist, but now we use
        // onStop with an error callback instead.
        lastParam.onError, lastParam.onStop].some(function (f) {
          return typeof f === "function";
        })) {
          callbacks = params.pop();
        }
      } // Is there an existing sub with the same name and param, run in an
      // invalidated Computation? This will happen if we are rerunning an
      // existing computation.
      //
      // For example, consider a rerun of:
      //
      //     Tracker.autorun(function () {
      //       Meteor.subscribe("foo", Session.get("foo"));
      //       Meteor.subscribe("bar", Session.get("bar"));
      //     });
      //
      // If "foo" has changed but "bar" has not, we will match the "bar"
      // subcribe to an existing inactive subscription in order to not
      // unsub and resub the subscription unnecessarily.
      //
      // We only look for one such sub; if there are N apparently-identical subs
      // being invalidated, we will require N matching subscribe calls to keep
      // them all active.


      var existing;
      keys(self._subscriptions).some(function (id) {
        var sub = self._subscriptions[id];

        if (sub.inactive && sub.name === name && EJSON.equals(sub.params, params)) {
          return existing = sub;
        }
      });
      var id;

      if (existing) {
        id = existing.id;
        existing.inactive = false; // reactivate

        if (callbacks.onReady) {
          // If the sub is not already ready, replace any ready callback with the
          // one provided now. (It's not really clear what users would expect for
          // an onReady callback inside an autorun; the semantics we provide is
          // that at the time the sub first becomes ready, we call the last
          // onReady callback provided, if any.)
          // If the sub is already ready, run the ready callback right away.
          // It seems that users would expect an onReady callback inside an
          // autorun to trigger once the the sub first becomes ready and also
          // when re-subs happens.
          if (existing.ready) {
            callbacks.onReady();
          } else {
            existing.readyCallback = callbacks.onReady;
          }
        } // XXX COMPAT WITH 1.0.3.1 we used to have onError but now we call
        // onStop with an optional error argument


        if (callbacks.onError) {
          // Replace existing callback if any, so that errors aren't
          // double-reported.
          existing.errorCallback = callbacks.onError;
        }

        if (callbacks.onStop) {
          existing.stopCallback = callbacks.onStop;
        }
      } else {
        // New sub! Generate an id, save it locally, and send message.
        id = Random.id();
        self._subscriptions[id] = {
          id: id,
          name: name,
          params: EJSON.clone(params),
          inactive: false,
          ready: false,
          readyDeps: new Tracker.Dependency(),
          readyCallback: callbacks.onReady,
          // XXX COMPAT WITH 1.0.3.1 #errorCallback
          errorCallback: callbacks.onError,
          stopCallback: callbacks.onStop,
          connection: self,
          remove: function () {
            delete this.connection._subscriptions[this.id];
            this.ready && this.readyDeps.changed();
          },
          stop: function () {
            this.connection._send({
              msg: 'unsub',
              id: id
            });

            this.remove();

            if (callbacks.onStop) {
              callbacks.onStop();
            }
          }
        };

        self._send({
          msg: 'sub',
          id: id,
          name: name,
          params: params
        });
      } // return a handle to the application.


      var handle = {
        stop: function () {
          if (!hasOwn.call(self._subscriptions, id)) {
            return;
          }

          self._subscriptions[id].stop();
        },
        ready: function () {
          // return false if we've unsubscribed.
          if (!hasOwn.call(self._subscriptions, id)) {
            return false;
          }

          var record = self._subscriptions[id];
          record.readyDeps.depend();
          return record.ready;
        },
        subscriptionId: id
      };

      if (Tracker.active) {
        // We're in a reactive computation, so we'd like to unsubscribe when the
        // computation is invalidated... but not if the rerun just re-subscribes
        // to the same subscription!  When a rerun happens, we use onInvalidate
        // as a change to mark the subscription "inactive" so that it can
        // be reused from the rerun.  If it isn't reused, it's killed from
        // an afterFlush.
        Tracker.onInvalidate(function (c) {
          if (hasOwn.call(self._subscriptions, id)) {
            self._subscriptions[id].inactive = true;
          }

          Tracker.afterFlush(function () {
            if (hasOwn.call(self._subscriptions, id) && self._subscriptions[id].inactive) {
              handle.stop();
            }
          });
        });
      }

      return handle;
    }

    return subscribe;
  }() // options:
  // - onLateError {Function(error)} called if an error was received after the ready event.
  //     (errors received before ready cause an error to be thrown)
  ;

  _proto._subscribeAndWait = function () {
    function _subscribeAndWait(name, args, options) {
      var self = this;
      var f = new Future();
      var ready = false;
      var handle;
      args = args || [];
      args.push({
        onReady: function () {
          ready = true;
          f['return']();
        },
        onError: function (e) {
          if (!ready) f['throw'](e);else options && options.onLateError && options.onLateError(e);
        }
      });
      handle = self.subscribe.apply(self, [name].concat(args));
      f.wait();
      return handle;
    }

    return _subscribeAndWait;
  }();

  _proto.methods = function () {
    function methods(_methods) {
      var _this = this;

      keys(_methods).forEach(function (name) {
        var func = _methods[name];

        if (typeof func !== 'function') {
          throw new Error("Method '" + name + "' must be a function");
        }

        if (_this._methodHandlers[name]) {
          throw new Error("A method named '" + name + "' is already defined");
        }

        _this._methodHandlers[name] = func;
      });
    }

    return methods;
  }()
  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.call
   * @summary Invokes a method passing any number of arguments.
   * @locus Anywhere
   * @param {String} name Name of method to invoke
   * @param {EJSONable} [arg1,arg2...] Optional method arguments
   * @param {Function} [asyncCallback] Optional callback, which is called asynchronously with the error or result after the method is complete. If not provided, the method runs synchronously if possible (see below).
   */
  ;

  _proto.call = function () {
    function call(name
    /* .. [arguments] .. callback */
    ) {
      // if it's a function, the last argument is the result callback,
      // not a parameter to the remote method.
      var args = slice.call(arguments, 1);
      if (args.length && typeof args[args.length - 1] === 'function') var callback = args.pop();
      return this.apply(name, args, callback);
    }

    return call;
  }()
  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.apply
   * @summary Invoke a method passing an array of arguments.
   * @locus Anywhere
   * @param {String} name Name of method to invoke
   * @param {EJSONable[]} args Method arguments
   * @param {Object} [options]
   * @param {Boolean} options.wait (Client only) If true, don't send this method until all previous method calls have completed, and don't send any subsequent method calls until this one is completed.
   * @param {Function} options.onResultReceived (Client only) This callback is invoked with the error or result of the method (just like `asyncCallback`) as soon as the error or result is available. The local cache may not yet reflect the writes performed by the method.
   * @param {Boolean} options.noRetry (Client only) if true, don't send this method again on reload, simply call the callback an error with the error code 'invocation-failed'.
   * @param {Boolean} options.throwStubExceptions (Client only) If true, exceptions thrown by method stubs will be thrown instead of logged, and the method will not be invoked on the server.
   * @param {Boolean} options.returnStubValue (Client only) If true then in cases where we would have otherwise discarded the stub's return value and returned undefined, instead we go ahead and return it. Specifically, this is any time other than when (a) we are already inside a stub or (b) we are in Node and no callback was provided. Currently we require this flag to be explicitly passed to reduce the likelihood that stub return values will be confused with server return values; we may improve this in future.
   * @param {Function} [asyncCallback] Optional callback; same semantics as in [`Meteor.call`](#meteor_call).
   */
  ;

  _proto.apply = function () {
    function apply(name, args, options, callback) {
      var self = this; // We were passed 3 arguments. They may be either (name, args, options)
      // or (name, args, callback)

      if (!callback && typeof options === 'function') {
        callback = options;
        options = Object.create(null);
      }

      options = options || Object.create(null);

      if (callback) {
        // XXX would it be better form to do the binding in stream.on,
        // or caller, instead of here?
        // XXX improve error message (and how we report it)
        callback = Meteor.bindEnvironment(callback, "delivering result of invoking '" + name + "'");
      } // Keep our args safe from mutation (eg if we don't send the message for a
      // while because of a wait method).


      args = EJSON.clone(args);

      var enclosing = DDP._CurrentMethodInvocation.get();

      var alreadyInSimulation = enclosing && enclosing.isSimulation; // Lazily generate a randomSeed, only if it is requested by the stub.
      // The random streams only have utility if they're used on both the client
      // and the server; if the client doesn't generate any 'random' values
      // then we don't expect the server to generate any either.
      // Less commonly, the server may perform different actions from the client,
      // and may in fact generate values where the client did not, but we don't
      // have any client-side values to match, so even here we may as well just
      // use a random seed on the server.  In that case, we don't pass the
      // randomSeed to save bandwidth, and we don't even generate it to save a
      // bit of CPU and to avoid consuming entropy.

      var randomSeed = null;

      var randomSeedGenerator = function () {
        if (randomSeed === null) {
          randomSeed = DDPCommon.makeRpcSeed(enclosing, name);
        }

        return randomSeed;
      }; // Run the stub, if we have one. The stub is supposed to make some
      // temporary writes to the database to give the user a smooth experience
      // until the actual result of executing the method comes back from the
      // server (whereupon the temporary writes to the database will be reversed
      // during the beginUpdate/endUpdate process.)
      //
      // Normally, we ignore the return value of the stub (even if it is an
      // exception), in favor of the real return value from the server. The
      // exception is if the *caller* is a stub. In that case, we're not going
      // to do a RPC, so we use the return value of the stub as our return
      // value.


      var stub = self._methodHandlers[name];

      if (stub) {
        var setUserId = function (userId) {
          self.setUserId(userId);
        };

        var invocation = new DDPCommon.MethodInvocation({
          isSimulation: true,
          userId: self.userId(),
          setUserId: setUserId,
          randomSeed: function () {
            return randomSeedGenerator();
          }
        });
        if (!alreadyInSimulation) self._saveOriginals();

        try {
          // Note that unlike in the corresponding server code, we never audit
          // that stubs check() their arguments.
          var stubReturnValue = DDP._CurrentMethodInvocation.withValue(invocation, function () {
            if (Meteor.isServer) {
              // Because saveOriginals and retrieveOriginals aren't reentrant,
              // don't allow stubs to yield.
              return Meteor._noYieldsAllowed(function () {
                // re-clone, so that the stub can't affect our caller's values
                return stub.apply(invocation, EJSON.clone(args));
              });
            } else {
              return stub.apply(invocation, EJSON.clone(args));
            }
          });
        } catch (e) {
          var exception = e;
        }
      } // If we're in a simulation, stop and return the result we have,
      // rather than going on to do an RPC. If there was no stub,
      // we'll end up returning undefined.


      if (alreadyInSimulation) {
        if (callback) {
          callback(exception, stubReturnValue);
          return undefined;
        }

        if (exception) throw exception;
        return stubReturnValue;
      } // We only create the methodId here because we don't actually need one if
      // we're already in a simulation


      var methodId = '' + self._nextMethodId++;

      if (stub) {
        self._retrieveAndStoreOriginals(methodId);
      } // Generate the DDP message for the method call. Note that on the client,
      // it is important that the stub have finished before we send the RPC, so
      // that we know we have a complete list of which local documents the stub
      // wrote.


      var message = {
        msg: 'method',
        method: name,
        params: args,
        id: methodId
      }; // If an exception occurred in a stub, and we're ignoring it
      // because we're doing an RPC and want to use what the server
      // returns instead, log it so the developer knows
      // (unless they explicitly ask to see the error).
      //
      // Tests can set the '_expectedByTest' flag on an exception so it won't
      // go to log.

      if (exception) {
        if (options.throwStubExceptions) {
          throw exception;
        } else if (!exception._expectedByTest) {
          Meteor._debug("Exception while simulating the effect of invoking '" + name + "'", exception);
        }
      } // At this point we're definitely doing an RPC, and we're going to
      // return the value of the RPC to the caller.
      // If the caller didn't give a callback, decide what to do.


      if (!callback) {
        if (Meteor.isClient) {
          // On the client, we don't have fibers, so we can't block. The
          // only thing we can do is to return undefined and discard the
          // result of the RPC. If an error occurred then print the error
          // to the console.
          callback = function (err) {
            err && Meteor._debug("Error invoking Method '" + name + "'", err);
          };
        } else {
          // On the server, make the function synchronous. Throw on
          // errors, return on success.
          var future = new Future();
          callback = future.resolver();
        }
      } // Send the randomSeed only if we used it


      if (randomSeed !== null) {
        message.randomSeed = randomSeed;
      }

      var methodInvoker = new MethodInvoker({
        methodId: methodId,
        callback: callback,
        connection: self,
        onResultReceived: options.onResultReceived,
        wait: !!options.wait,
        message: message,
        noRetry: !!options.noRetry
      });

      if (options.wait) {
        // It's a wait method! Wait methods go in their own block.
        self._outstandingMethodBlocks.push({
          wait: true,
          methods: [methodInvoker]
        });
      } else {
        // Not a wait method. Start a new block if the previous block was a wait
        // block, and add it to the last block of methods.
        if (isEmpty(self._outstandingMethodBlocks) || last(self._outstandingMethodBlocks).wait) {
          self._outstandingMethodBlocks.push({
            wait: false,
            methods: []
          });
        }

        last(self._outstandingMethodBlocks).methods.push(methodInvoker);
      } // If we added it to the first block, send it out now.


      if (self._outstandingMethodBlocks.length === 1) methodInvoker.sendMessage(); // If we're using the default callback on the server,
      // block waiting for the result.

      if (future) {
        return future.wait();
      }

      return options.returnStubValue ? stubReturnValue : undefined;
    }

    return apply;
  }() // Before calling a method stub, prepare all stores to track changes and allow
  // _retrieveAndStoreOriginals to get the original versions of changed
  // documents.
  ;

  _proto._saveOriginals = function () {
    function _saveOriginals() {
      var _this2 = this;

      if (!this._waitingForQuiescence()) {
        this._flushBufferedWrites();
      }

      keys(this._stores).forEach(function (storeName) {
        _this2._stores[storeName].saveOriginals();
      });
    }

    return _saveOriginals;
  }() // Retrieves the original versions of all documents modified by the stub for
  // method 'methodId' from all stores and saves them to _serverDocuments (keyed
  // by document) and _documentsWrittenByStub (keyed by method ID).
  ;

  _proto._retrieveAndStoreOriginals = function () {
    function _retrieveAndStoreOriginals(methodId) {
      var self = this;
      if (self._documentsWrittenByStub[methodId]) throw new Error('Duplicate methodId in _retrieveAndStoreOriginals');
      var docsWritten = [];
      keys(self._stores).forEach(function (collection) {
        var originals = self._stores[collection].retrieveOriginals(); // not all stores define retrieveOriginals


        if (!originals) return;
        originals.forEach(function (doc, id) {
          docsWritten.push({
            collection: collection,
            id: id
          });

          if (!hasOwn.call(self._serverDocuments, collection)) {
            self._serverDocuments[collection] = new MongoIDMap();
          }

          var serverDoc = self._serverDocuments[collection].setDefault(id, Object.create(null));

          if (serverDoc.writtenByStubs) {
            // We're not the first stub to write this doc. Just add our method ID
            // to the record.
            serverDoc.writtenByStubs[methodId] = true;
          } else {
            // First stub! Save the original value and our method ID.
            serverDoc.document = doc;
            serverDoc.flushCallbacks = [];
            serverDoc.writtenByStubs = Object.create(null);
            serverDoc.writtenByStubs[methodId] = true;
          }
        });
      });

      if (!isEmpty(docsWritten)) {
        self._documentsWrittenByStub[methodId] = docsWritten;
      }
    }

    return _retrieveAndStoreOriginals;
  }() // This is very much a private function we use to make the tests
  // take up fewer server resources after they complete.
  ;

  _proto._unsubscribeAll = function () {
    function _unsubscribeAll() {
      var _this3 = this;

      keys(this._subscriptions).forEach(function (id) {
        var sub = _this3._subscriptions[id]; // Avoid killing the autoupdate subscription so that developers
        // still get hot code pushes when writing tests.
        //
        // XXX it's a hack to encode knowledge about autoupdate here,
        // but it doesn't seem worth it yet to have a special API for
        // subscriptions to preserve after unit tests.

        if (sub.name !== 'meteor_autoupdate_clientVersions') {
          sub.stop();
        }
      });
    }

    return _unsubscribeAll;
  }() // Sends the DDP stringification of the given message object
  ;

  _proto._send = function () {
    function _send(obj) {
      this._stream.send(DDPCommon.stringifyDDP(obj));
    }

    return _send;
  }() // We detected via DDP-level heartbeats that we've lost the
  // connection.  Unlike `disconnect` or `close`, a lost connection
  // will be automatically retried.
  ;

  _proto._lostConnection = function () {
    function _lostConnection(error) {
      this._stream._lostConnection(error);
    }

    return _lostConnection;
  }()
  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.status
   * @summary Get the current connection status. A reactive data source.
   * @locus Client
   */
  ;

  _proto.status = function () {
    function status() {
      var _this$_stream;

      return (_this$_stream = this._stream).status.apply(_this$_stream, arguments);
    }

    return status;
  }()
  /**
   * @summary Force an immediate reconnection attempt if the client is not connected to the server.
   This method does nothing if the client is already connected.
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.reconnect
   * @locus Client
   */
  ;

  _proto.reconnect = function () {
    function reconnect() {
      var _this$_stream2;

      return (_this$_stream2 = this._stream).reconnect.apply(_this$_stream2, arguments);
    }

    return reconnect;
  }()
  /**
   * @memberOf Meteor
   * @importFromPackage meteor
   * @alias Meteor.disconnect
   * @summary Disconnect the client from the server.
   * @locus Client
   */
  ;

  _proto.disconnect = function () {
    function disconnect() {
      var _this$_stream3;

      return (_this$_stream3 = this._stream).disconnect.apply(_this$_stream3, arguments);
    }

    return disconnect;
  }();

  _proto.close = function () {
    function close() {
      return this._stream.disconnect({
        _permanent: true
      });
    }

    return close;
  }() ///
  /// Reactive user system
  ///
  ;

  _proto.userId = function () {
    function userId() {
      if (this._userIdDeps) this._userIdDeps.depend();
      return this._userId;
    }

    return userId;
  }();

  _proto.setUserId = function () {
    function setUserId(userId) {
      // Avoid invalidating dependents if setUserId is called with current value.
      if (this._userId === userId) return;
      this._userId = userId;
      if (this._userIdDeps) this._userIdDeps.changed();
    }

    return setUserId;
  }() // Returns true if we are in a state after reconnect of waiting for subs to be
  // revived or early methods to finish their data, or we are waiting for a
  // "wait" method to finish.
  ;

  _proto._waitingForQuiescence = function () {
    function _waitingForQuiescence() {
      return !isEmpty(this._subsBeingRevived) || !isEmpty(this._methodsBlockingQuiescence);
    }

    return _waitingForQuiescence;
  }() // Returns true if any method whose message has been sent to the server has
  // not yet invoked its user callback.
  ;

  _proto._anyMethodsAreOutstanding = function () {
    function _anyMethodsAreOutstanding() {
      var invokers = this._methodInvokers;
      return keys(invokers).some(function (id) {
        return invokers[id].sentMessage;
      });
    }

    return _anyMethodsAreOutstanding;
  }();

  _proto._livedata_connected = function () {
    function _livedata_connected(msg) {
      var self = this;

      if (self._version !== 'pre1' && self._heartbeatInterval !== 0) {
        self._heartbeat = new DDPCommon.Heartbeat({
          heartbeatInterval: self._heartbeatInterval,
          heartbeatTimeout: self._heartbeatTimeout,
          onTimeout: function () {
            self._lostConnection(new DDP.ConnectionError('DDP heartbeat timed out'));
          },
          sendPing: function () {
            self._send({
              msg: 'ping'
            });
          }
        });

        self._heartbeat.start();
      } // If this is a reconnect, we'll have to reset all stores.


      if (self._lastSessionId) self._resetStores = true;

      if (typeof msg.session === 'string') {
        var reconnectedToPreviousSession = self._lastSessionId === msg.session;
        self._lastSessionId = msg.session;
      }

      if (reconnectedToPreviousSession) {
        // Successful reconnection -- pick up where we left off.  Note that right
        // now, this never happens: the server never connects us to a previous
        // session, because DDP doesn't provide enough data for the server to know
        // what messages the client has processed. We need to improve DDP to make
        // this possible, at which point we'll probably need more code here.
        return;
      } // Server doesn't have our data any more. Re-sync a new session.
      // Forget about messages we were buffering for unknown collections. They'll
      // be resent if still relevant.


      self._updatesForUnknownStores = Object.create(null);

      if (self._resetStores) {
        // Forget about the effects of stubs. We'll be resetting all collections
        // anyway.
        self._documentsWrittenByStub = Object.create(null);
        self._serverDocuments = Object.create(null);
      } // Clear _afterUpdateCallbacks.


      self._afterUpdateCallbacks = []; // Mark all named subscriptions which are ready (ie, we already called the
      // ready callback) as needing to be revived.
      // XXX We should also block reconnect quiescence until unnamed subscriptions
      //     (eg, autopublish) are done re-publishing to avoid flicker!

      self._subsBeingRevived = Object.create(null);
      keys(self._subscriptions).forEach(function (id) {
        if (self._subscriptions[id].ready) {
          self._subsBeingRevived[id] = true;
        }
      }); // Arrange for "half-finished" methods to have their callbacks run, and
      // track methods that were sent on this connection so that we don't
      // quiesce until they are all done.
      //
      // Start by clearing _methodsBlockingQuiescence: methods sent before
      // reconnect don't matter, and any "wait" methods sent on the new connection
      // that we drop here will be restored by the loop below.

      self._methodsBlockingQuiescence = Object.create(null);

      if (self._resetStores) {
        var invokers = self._methodInvokers;
        keys(invokers).forEach(function (id) {
          var invoker = invokers[id];

          if (invoker.gotResult()) {
            // This method already got its result, but it didn't call its callback
            // because its data didn't become visible. We did not resend the
            // method RPC. We'll call its callback when we get a full quiesce,
            // since that's as close as we'll get to "data must be visible".
            self._afterUpdateCallbacks.push(function () {
              return invoker.dataVisible.apply(invoker, arguments);
            });
          } else if (invoker.sentMessage) {
            // This method has been sent on this connection (maybe as a resend
            // from the last connection, maybe from onReconnect, maybe just very
            // quickly before processing the connected message).
            //
            // We don't need to do anything special to ensure its callbacks get
            // called, but we'll count it as a method which is preventing
            // reconnect quiescence. (eg, it might be a login method that was run
            // from onReconnect, and we don't want to see flicker by seeing a
            // logged-out state.)
            self._methodsBlockingQuiescence[invoker.methodId] = true;
          }
        });
      }

      self._messagesBufferedUntilQuiescence = []; // If we're not waiting on any methods or subs, we can reset the stores and
      // call the callbacks immediately.

      if (!self._waitingForQuiescence()) {
        if (self._resetStores) {
          keys(self._stores).forEach(function (storeName) {
            var s = self._stores[storeName];
            s.beginUpdate(0, true);
            s.endUpdate();
          });
          self._resetStores = false;
        }

        self._runAfterUpdateCallbacks();
      }
    }

    return _livedata_connected;
  }();

  _proto._processOneDataMessage = function () {
    function _processOneDataMessage(msg, updates) {
      var messageType = msg.msg; // msg is one of ['added', 'changed', 'removed', 'ready', 'updated']

      if (messageType === 'added') {
        this._process_added(msg, updates);
      } else if (messageType === 'changed') {
        this._process_changed(msg, updates);
      } else if (messageType === 'removed') {
        this._process_removed(msg, updates);
      } else if (messageType === 'ready') {
        this._process_ready(msg, updates);
      } else if (messageType === 'updated') {
        this._process_updated(msg, updates);
      } else if (messageType === 'nosub') {// ignore this
      } else {
        Meteor._debug('discarding unknown livedata data message type', msg);
      }
    }

    return _processOneDataMessage;
  }();

  _proto._livedata_data = function () {
    function _livedata_data(msg) {
      var self = this;

      if (self._waitingForQuiescence()) {
        self._messagesBufferedUntilQuiescence.push(msg);

        if (msg.msg === 'nosub') {
          delete self._subsBeingRevived[msg.id];
        }

        if (msg.subs) {
          msg.subs.forEach(function (subId) {
            delete self._subsBeingRevived[subId];
          });
        }

        if (msg.methods) {
          msg.methods.forEach(function (methodId) {
            delete self._methodsBlockingQuiescence[methodId];
          });
        }

        if (self._waitingForQuiescence()) {
          return;
        } // No methods or subs are blocking quiescence!
        // We'll now process and all of our buffered messages, reset all stores,
        // and apply them all at once.


        var bufferedMessages = self._messagesBufferedUntilQuiescence;
        keys(bufferedMessages).forEach(function (id) {
          self._processOneDataMessage(bufferedMessages[id], self._bufferedWrites);
        });
        self._messagesBufferedUntilQuiescence = [];
      } else {
        self._processOneDataMessage(msg, self._bufferedWrites);
      } // Immediately flush writes when:
      //  1. Buffering is disabled. Or;
      //  2. any non-(added/changed/removed) message arrives.


      var standardWrite = msg.msg === "added" || msg.msg === "changed" || msg.msg === "removed";

      if (self._bufferedWritesInterval === 0 || !standardWrite) {
        self._flushBufferedWrites();

        return;
      }

      if (self._bufferedWritesFlushAt === null) {
        self._bufferedWritesFlushAt = new Date().valueOf() + self._bufferedWritesMaxAge;
      } else if (self._bufferedWritesFlushAt < new Date().valueOf()) {
        self._flushBufferedWrites();

        return;
      }

      if (self._bufferedWritesFlushHandle) {
        clearTimeout(self._bufferedWritesFlushHandle);
      }

      self._bufferedWritesFlushHandle = setTimeout(self.__flushBufferedWrites, self._bufferedWritesInterval);
    }

    return _livedata_data;
  }();

  _proto._flushBufferedWrites = function () {
    function _flushBufferedWrites() {
      var self = this;

      if (self._bufferedWritesFlushHandle) {
        clearTimeout(self._bufferedWritesFlushHandle);
        self._bufferedWritesFlushHandle = null;
      }

      self._bufferedWritesFlushAt = null; // We need to clear the buffer before passing it to
      //  performWrites. As there's no guarantee that it
      //  will exit cleanly.

      var writes = self._bufferedWrites;
      self._bufferedWrites = Object.create(null);

      self._performWrites(writes);
    }

    return _flushBufferedWrites;
  }();

  _proto._performWrites = function () {
    function _performWrites(updates) {
      var self = this;

      if (self._resetStores || !isEmpty(updates)) {
        // Begin a transactional update of each store.
        keys(self._stores).forEach(function (storeName) {
          self._stores[storeName].beginUpdate(hasOwn.call(updates, storeName) ? updates[storeName].length : 0, self._resetStores);
        });
        self._resetStores = false;
        keys(updates).forEach(function (storeName) {
          var updateMessages = updates[storeName];
          var store = self._stores[storeName];

          if (store) {
            updateMessages.forEach(function (updateMessage) {
              store.update(updateMessage);
            });
          } else {
            var _updates$storeName;

            // Nobody's listening for this data. Queue it up until
            // someone wants it.
            // XXX memory use will grow without bound if you forget to
            // create a collection or just don't care about it... going
            // to have to do something about that.
            var _updates = self._updatesForUnknownStores;

            if (!hasOwn.call(_updates, storeName)) {
              _updates[storeName] = [];
            }

            (_updates$storeName = _updates[storeName]).push.apply(_updates$storeName, (0, _toConsumableArray2.default)(updateMessages));
          }
        }); // End update transaction.

        keys(self._stores).forEach(function (storeName) {
          self._stores[storeName].endUpdate();
        });
      }

      self._runAfterUpdateCallbacks();
    }

    return _performWrites;
  }() // Call any callbacks deferred with _runWhenAllServerDocsAreFlushed whose
  // relevant docs have been flushed, as well as dataVisible callbacks at
  // reconnect-quiescence time.
  ;

  _proto._runAfterUpdateCallbacks = function () {
    function _runAfterUpdateCallbacks() {
      var self = this;
      var callbacks = self._afterUpdateCallbacks;
      self._afterUpdateCallbacks = [];
      callbacks.forEach(function (c) {
        c();
      });
    }

    return _runAfterUpdateCallbacks;
  }();

  _proto._pushUpdate = function () {
    function _pushUpdate(updates, collection, msg) {
      if (!hasOwn.call(updates, collection)) {
        updates[collection] = [];
      }

      updates[collection].push(msg);
    }

    return _pushUpdate;
  }();

  _proto._getServerDoc = function () {
    function _getServerDoc(collection, id) {
      var self = this;

      if (!hasOwn.call(self._serverDocuments, collection)) {
        return null;
      }

      var serverDocsForCollection = self._serverDocuments[collection];
      return serverDocsForCollection.get(id) || null;
    }

    return _getServerDoc;
  }();

  _proto._process_added = function () {
    function _process_added(msg, updates) {
      var self = this;
      var id = MongoID.idParse(msg.id);

      var serverDoc = self._getServerDoc(msg.collection, id);

      if (serverDoc) {
        // Some outstanding stub wrote here.
        var isExisting = serverDoc.document !== undefined;
        serverDoc.document = msg.fields || Object.create(null);
        serverDoc.document._id = id;

        if (self._resetStores) {
          // During reconnect the server is sending adds for existing ids.
          // Always push an update so that document stays in the store after
          // reset. Use current version of the document for this update, so
          // that stub-written values are preserved.
          var currentDoc = self._stores[msg.collection].getDoc(msg.id);

          if (currentDoc !== undefined) msg.fields = currentDoc;

          self._pushUpdate(updates, msg.collection, msg);
        } else if (isExisting) {
          throw new Error('Server sent add for existing id: ' + msg.id);
        }
      } else {
        self._pushUpdate(updates, msg.collection, msg);
      }
    }

    return _process_added;
  }();

  _proto._process_changed = function () {
    function _process_changed(msg, updates) {
      var self = this;

      var serverDoc = self._getServerDoc(msg.collection, MongoID.idParse(msg.id));

      if (serverDoc) {
        if (serverDoc.document === undefined) throw new Error('Server sent changed for nonexisting id: ' + msg.id);
        DiffSequence.applyChanges(serverDoc.document, msg.fields);
      } else {
        self._pushUpdate(updates, msg.collection, msg);
      }
    }

    return _process_changed;
  }();

  _proto._process_removed = function () {
    function _process_removed(msg, updates) {
      var self = this;

      var serverDoc = self._getServerDoc(msg.collection, MongoID.idParse(msg.id));

      if (serverDoc) {
        // Some outstanding stub wrote here.
        if (serverDoc.document === undefined) throw new Error('Server sent removed for nonexisting id:' + msg.id);
        serverDoc.document = undefined;
      } else {
        self._pushUpdate(updates, msg.collection, {
          msg: 'removed',
          collection: msg.collection,
          id: msg.id
        });
      }
    }

    return _process_removed;
  }();

  _proto._process_updated = function () {
    function _process_updated(msg, updates) {
      var self = this; // Process "method done" messages.

      msg.methods.forEach(function (methodId) {
        var docs = self._documentsWrittenByStub[methodId];
        keys(docs).forEach(function (id) {
          var written = docs[id];

          var serverDoc = self._getServerDoc(written.collection, written.id);

          if (!serverDoc) {
            throw new Error('Lost serverDoc for ' + JSON.stringify(written));
          }

          if (!serverDoc.writtenByStubs[methodId]) {
            throw new Error('Doc ' + JSON.stringify(written) + ' not written by  method ' + methodId);
          }

          delete serverDoc.writtenByStubs[methodId];

          if (isEmpty(serverDoc.writtenByStubs)) {
            // All methods whose stubs wrote this method have completed! We can
            // now copy the saved document to the database (reverting the stub's
            // change if the server did not write to this object, or applying the
            // server's writes if it did).
            // This is a fake ddp 'replace' message.  It's just for talking
            // between livedata connections and minimongo.  (We have to stringify
            // the ID because it's supposed to look like a wire message.)
            self._pushUpdate(updates, written.collection, {
              msg: 'replace',
              id: MongoID.idStringify(written.id),
              replace: serverDoc.document
            }); // Call all flush callbacks.


            serverDoc.flushCallbacks.forEach(function (c) {
              c();
            }); // Delete this completed serverDocument. Don't bother to GC empty
            // IdMaps inside self._serverDocuments, since there probably aren't
            // many collections and they'll be written repeatedly.

            self._serverDocuments[written.collection].remove(written.id);
          }
        });
        delete self._documentsWrittenByStub[methodId]; // We want to call the data-written callback, but we can't do so until all
        // currently buffered messages are flushed.

        var callbackInvoker = self._methodInvokers[methodId];

        if (!callbackInvoker) {
          throw new Error('No callback invoker for method ' + methodId);
        }

        self._runWhenAllServerDocsAreFlushed(function () {
          return callbackInvoker.dataVisible.apply(callbackInvoker, arguments);
        });
      });
    }

    return _process_updated;
  }();

  _proto._process_ready = function () {
    function _process_ready(msg, updates) {
      var self = this; // Process "sub ready" messages. "sub ready" messages don't take effect
      // until all current server documents have been flushed to the local
      // database. We can use a write fence to implement this.

      msg.subs.forEach(function (subId) {
        self._runWhenAllServerDocsAreFlushed(function () {
          var subRecord = self._subscriptions[subId]; // Did we already unsubscribe?

          if (!subRecord) return; // Did we already receive a ready message? (Oops!)

          if (subRecord.ready) return;
          subRecord.ready = true;
          subRecord.readyCallback && subRecord.readyCallback();
          subRecord.readyDeps.changed();
        });
      });
    }

    return _process_ready;
  }() // Ensures that "f" will be called after all documents currently in
  // _serverDocuments have been written to the local cache. f will not be called
  // if the connection is lost before then!
  ;

  _proto._runWhenAllServerDocsAreFlushed = function () {
    function _runWhenAllServerDocsAreFlushed(f) {
      var self = this;

      var runFAfterUpdates = function () {
        self._afterUpdateCallbacks.push(f);
      };

      var unflushedServerDocCount = 0;

      var onServerDocFlush = function () {
        --unflushedServerDocCount;

        if (unflushedServerDocCount === 0) {
          // This was the last doc to flush! Arrange to run f after the updates
          // have been applied.
          runFAfterUpdates();
        }
      };

      keys(self._serverDocuments).forEach(function (collection) {
        self._serverDocuments[collection].forEach(function (serverDoc) {
          var writtenByStubForAMethodWithSentMessage = keys(serverDoc.writtenByStubs).some(function (methodId) {
            var invoker = self._methodInvokers[methodId];
            return invoker && invoker.sentMessage;
          });

          if (writtenByStubForAMethodWithSentMessage) {
            ++unflushedServerDocCount;
            serverDoc.flushCallbacks.push(onServerDocFlush);
          }
        });
      });

      if (unflushedServerDocCount === 0) {
        // There aren't any buffered docs --- we can call f as soon as the current
        // round of updates is applied!
        runFAfterUpdates();
      }
    }

    return _runWhenAllServerDocsAreFlushed;
  }();

  _proto._livedata_nosub = function () {
    function _livedata_nosub(msg) {
      var self = this; // First pass it through _livedata_data, which only uses it to help get
      // towards quiescence.

      self._livedata_data(msg); // Do the rest of our processing immediately, with no
      // buffering-until-quiescence.
      // we weren't subbed anyway, or we initiated the unsub.


      if (!hasOwn.call(self._subscriptions, msg.id)) {
        return;
      } // XXX COMPAT WITH 1.0.3.1 #errorCallback


      var errorCallback = self._subscriptions[msg.id].errorCallback;
      var stopCallback = self._subscriptions[msg.id].stopCallback;

      self._subscriptions[msg.id].remove();

      var meteorErrorFromMsg = function (msgArg) {
        return msgArg && msgArg.error && new Meteor.Error(msgArg.error.error, msgArg.error.reason, msgArg.error.details);
      }; // XXX COMPAT WITH 1.0.3.1 #errorCallback


      if (errorCallback && msg.error) {
        errorCallback(meteorErrorFromMsg(msg));
      }

      if (stopCallback) {
        stopCallback(meteorErrorFromMsg(msg));
      }
    }

    return _livedata_nosub;
  }();

  _proto._livedata_result = function () {
    function _livedata_result(msg) {
      // id, result or error. error has error (code), reason, details
      var self = this; // Lets make sure there are no buffered writes before returning result.

      if (!isEmpty(self._bufferedWrites)) {
        self._flushBufferedWrites();
      } // find the outstanding request
      // should be O(1) in nearly all realistic use cases


      if (isEmpty(self._outstandingMethodBlocks)) {
        Meteor._debug('Received method result but no methods outstanding');

        return;
      }

      var currentMethodBlock = self._outstandingMethodBlocks[0].methods;
      var m;

      for (var i = 0; i < currentMethodBlock.length; i++) {
        m = currentMethodBlock[i];
        if (m.methodId === msg.id) break;
      }

      if (!m) {
        Meteor._debug("Can't match method response to original method call", msg);

        return;
      } // Remove from current method block. This may leave the block empty, but we
      // don't move on to the next block until the callback has been delivered, in
      // _outstandingMethodFinished.


      currentMethodBlock.splice(i, 1);

      if (hasOwn.call(msg, 'error')) {
        m.receiveResult(new Meteor.Error(msg.error.error, msg.error.reason, msg.error.details));
      } else {
        // msg.result may be undefined if the method didn't return a
        // value
        m.receiveResult(undefined, msg.result);
      }
    }

    return _livedata_result;
  }() // Called by MethodInvoker after a method's callback is invoked.  If this was
  // the last outstanding method in the current block, runs the next block. If
  // there are no more methods, consider accepting a hot code push.
  ;

  _proto._outstandingMethodFinished = function () {
    function _outstandingMethodFinished() {
      var self = this;
      if (self._anyMethodsAreOutstanding()) return; // No methods are outstanding. This should mean that the first block of
      // methods is empty. (Or it might not exist, if this was a method that
      // half-finished before disconnect/reconnect.)

      if (!isEmpty(self._outstandingMethodBlocks)) {
        var firstBlock = self._outstandingMethodBlocks.shift();

        if (!isEmpty(firstBlock.methods)) throw new Error('No methods outstanding but nonempty block: ' + JSON.stringify(firstBlock)); // Send the outstanding methods now in the first block.

        if (!isEmpty(self._outstandingMethodBlocks)) self._sendOutstandingMethods();
      } // Maybe accept a hot code push.


      self._maybeMigrate();
    }

    return _outstandingMethodFinished;
  }() // Sends messages for all the methods in the first block in
  // _outstandingMethodBlocks.
  ;

  _proto._sendOutstandingMethods = function () {
    function _sendOutstandingMethods() {
      var self = this;

      if (isEmpty(self._outstandingMethodBlocks)) {
        return;
      }

      self._outstandingMethodBlocks[0].methods.forEach(function (m) {
        m.sendMessage();
      });
    }

    return _sendOutstandingMethods;
  }();

  _proto._livedata_error = function () {
    function _livedata_error(msg) {
      Meteor._debug('Received error from server: ', msg.reason);

      if (msg.offendingMessage) Meteor._debug('For: ', msg.offendingMessage);
    }

    return _livedata_error;
  }();

  _proto._callOnReconnectAndSendAppropriateOutstandingMethods = function () {
    function _callOnReconnectAndSendAppropriateOutstandingMethods() {
      var self = this;
      var oldOutstandingMethodBlocks = self._outstandingMethodBlocks;
      self._outstandingMethodBlocks = [];
      self.onReconnect && self.onReconnect();

      DDP._reconnectHook.each(function (callback) {
        callback(self);
        return true;
      });

      if (isEmpty(oldOutstandingMethodBlocks)) return; // We have at least one block worth of old outstanding methods to try
      // again. First: did onReconnect actually send anything? If not, we just
      // restore all outstanding methods and run the first block.

      if (isEmpty(self._outstandingMethodBlocks)) {
        self._outstandingMethodBlocks = oldOutstandingMethodBlocks;

        self._sendOutstandingMethods();

        return;
      } // OK, there are blocks on both sides. Special case: merge the last block of
      // the reconnect methods with the first block of the original methods, if
      // neither of them are "wait" blocks.


      if (!last(self._outstandingMethodBlocks).wait && !oldOutstandingMethodBlocks[0].wait) {
        oldOutstandingMethodBlocks[0].methods.forEach(function (m) {
          last(self._outstandingMethodBlocks).methods.push(m); // If this "last block" is also the first block, send the message.

          if (self._outstandingMethodBlocks.length === 1) {
            m.sendMessage();
          }
        });
        oldOutstandingMethodBlocks.shift();
      } // Now add the rest of the original blocks on.


      oldOutstandingMethodBlocks.forEach(function (block) {
        self._outstandingMethodBlocks.push(block);
      });
    }

    return _callOnReconnectAndSendAppropriateOutstandingMethods;
  }() // We can accept a hot code push if there are no methods in flight.
  ;

  _proto._readyToMigrate = function () {
    function _readyToMigrate() {
      return isEmpty(this._methodInvokers);
    }

    return _readyToMigrate;
  }() // If we were blocking a migration, see if it's now possible to continue.
  // Call whenever the set of outstanding/blocked methods shrinks.
  ;

  _proto._maybeMigrate = function () {
    function _maybeMigrate() {
      var self = this;

      if (self._retryMigrate && self._readyToMigrate()) {
        self._retryMigrate();

        self._retryMigrate = null;
      }
    }

    return _maybeMigrate;
  }();

  _proto.onMessage = function () {
    function onMessage(raw_msg) {
      try {
        var msg = DDPCommon.parseDDP(raw_msg);
      } catch (e) {
        Meteor._debug('Exception while parsing DDP', e);

        return;
      } // Any message counts as receiving a pong, as it demonstrates that
      // the server is still alive.


      if (this._heartbeat) {
        this._heartbeat.messageReceived();
      }

      if (msg === null || !msg.msg) {
        // XXX COMPAT WITH 0.6.6. ignore the old welcome message for back
        // compat.  Remove this 'if' once the server stops sending welcome
        // messages (stream_server.js).
        if (!(msg && msg.server_id)) Meteor._debug('discarding invalid livedata message', msg);
        return;
      }

      if (msg.msg === 'connected') {
        this._version = this._versionSuggestion;

        this._livedata_connected(msg);

        this.options.onConnected();
      } else if (msg.msg === 'failed') {
        if (this._supportedDDPVersions.indexOf(msg.version) >= 0) {
          this._versionSuggestion = msg.version;

          this._stream.reconnect({
            _force: true
          });
        } else {
          var description = 'DDP version negotiation failed; server requested version ' + msg.version;

          this._stream.disconnect({
            _permanent: true,
            _error: description
          });

          this.options.onDDPVersionNegotiationFailure(description);
        }
      } else if (msg.msg === 'ping' && this.options.respondToPings) {
        this._send({
          msg: 'pong',
          id: msg.id
        });
      } else if (msg.msg === 'pong') {// noop, as we assume everything's a pong
      } else if (['added', 'changed', 'removed', 'ready', 'updated'].includes(msg.msg)) {
        this._livedata_data(msg);
      } else if (msg.msg === 'nosub') {
        this._livedata_nosub(msg);
      } else if (msg.msg === 'result') {
        this._livedata_result(msg);
      } else if (msg.msg === 'error') {
        this._livedata_error(msg);
      } else {
        Meteor._debug('discarding unknown livedata message type', msg);
      }
    }

    return onMessage;
  }();

  _proto.onReset = function () {
    function onReset() {
      var _this4 = this;

      // Send a connect message at the beginning of the stream.
      // NOTE: reset is called even on the first connection, so this is
      // the only place we send this message.
      var msg = {
        msg: 'connect'
      };
      if (this._lastSessionId) msg.session = this._lastSessionId;
      msg.version = this._versionSuggestion || this._supportedDDPVersions[0];
      this._versionSuggestion = msg.version;
      msg.support = this._supportedDDPVersions;

      this._send(msg); // Mark non-retry calls as failed. This has to be done early as getting these methods out of the
      // current block is pretty important to making sure that quiescence is properly calculated, as
      // well as possibly moving on to another useful block.
      // Only bother testing if there is an outstandingMethodBlock (there might not be, especially if
      // we are connecting for the first time.


      if (this._outstandingMethodBlocks.length > 0) {
        // If there is an outstanding method block, we only care about the first one as that is the
        // one that could have already sent messages with no response, that are not allowed to retry.
        var _currentMethodBlock = this._outstandingMethodBlocks[0].methods;
        this._outstandingMethodBlocks[0].methods = _currentMethodBlock.filter(function (methodInvoker) {
          // Methods with 'noRetry' option set are not allowed to re-send after
          // recovering dropped connection.
          if (methodInvoker.sentMessage && methodInvoker.noRetry) {
            // Make sure that the method is told that it failed.
            methodInvoker.receiveResult(new Meteor.Error('invocation-failed', 'Method invocation might have failed due to dropped connection. ' + 'Failing because `noRetry` option was passed to Meteor.apply.'));
          } // Only keep a method if it wasn't sent or it's allowed to retry.
          // This may leave the block empty, but we don't move on to the next
          // block until the callback has been delivered, in _outstandingMethodFinished.


          return !(methodInvoker.sentMessage && methodInvoker.noRetry);
        });
      } // Now, to minimize setup latency, go ahead and blast out all of
      // our pending methods ands subscriptions before we've even taken
      // the necessary RTT to know if we successfully reconnected. (1)
      // They're supposed to be idempotent, and where they are not,
      // they can block retry in apply; (2) even if we did reconnect,
      // we're not sure what messages might have gotten lost
      // (in either direction) since we were disconnected (TCP being
      // sloppy about that.)
      // If the current block of methods all got their results (but didn't all get
      // their data visible), discard the empty block now.


      if (this._outstandingMethodBlocks.length > 0 && this._outstandingMethodBlocks[0].methods.length === 0) {
        this._outstandingMethodBlocks.shift();
      } // Mark all messages as unsent, they have not yet been sent on this
      // connection.


      keys(this._methodInvokers).forEach(function (id) {
        _this4._methodInvokers[id].sentMessage = false;
      }); // If an `onReconnect` handler is set, call it first. Go through
      // some hoops to ensure that methods that are called from within
      // `onReconnect` get executed _before_ ones that were originally
      // outstanding (since `onReconnect` is used to re-establish auth
      // certificates)

      this._callOnReconnectAndSendAppropriateOutstandingMethods(); // add new subscriptions at the end. this way they take effect after
      // the handlers and we don't see flicker.


      keys(this._subscriptions).forEach(function (id) {
        var sub = _this4._subscriptions[id];

        _this4._send({
          msg: 'sub',
          id: id,
          name: sub.name,
          params: sub.params
        });
      });
    }

    return onReset;
  }();

  return Connection;
}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"namespace.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ddp-client/common/namespace.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  DDP: function () {
    return DDP;
  }
});
var DDPCommon;
module.link("meteor/ddp-common", {
  DDPCommon: function (v) {
    DDPCommon = v;
  }
}, 0);
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 1);
var keys;
module.link("meteor/ddp-common/utils.js", {
  keys: function (v) {
    keys = v;
  }
}, 2);
var Connection;
module.link("./livedata_connection.js", {
  Connection: function (v) {
    Connection = v;
  }
}, 3);
// This array allows the `_allSubscriptionsReady` method below, which
// is used by the `spiderable` package, to keep track of whether all
// data is ready.
var allConnections = [];
/**
 * @namespace DDP
 * @summary Namespace for DDP-related methods/classes.
 */

var DDP = {};
// This is private but it's used in a few places. accounts-base uses
// it to get the current user. Meteor.setTimeout and friends clear
// it. We can probably find a better way to factor this.
DDP._CurrentMethodInvocation = new Meteor.EnvironmentVariable();
DDP._CurrentPublicationInvocation = new Meteor.EnvironmentVariable(); // XXX: Keep DDP._CurrentInvocation for backwards-compatibility.

DDP._CurrentInvocation = DDP._CurrentMethodInvocation; // This is passed into a weird `makeErrorType` function that expects its thing
// to be a constructor

function connectionErrorConstructor(message) {
  this.message = message;
}

DDP.ConnectionError = Meteor.makeErrorType('DDP.ConnectionError', connectionErrorConstructor);
DDP.ForcedReconnectError = Meteor.makeErrorType('DDP.ForcedReconnectError', function () {}); // Returns the named sequence of pseudo-random values.
// The scope will be DDP._CurrentMethodInvocation.get(), so the stream will produce
// consistent values for method calls on the client and server.

DDP.randomStream = function (name) {
  var scope = DDP._CurrentMethodInvocation.get();

  return DDPCommon.RandomStream.get(scope, name);
}; // @param url {String} URL to Meteor app,
//     e.g.:
//     "subdomain.meteor.com",
//     "http://subdomain.meteor.com",
//     "/",
//     "ddp+sockjs://ddp--****-foo.meteor.com/sockjs"

/**
 * @summary Connect to the server of a different Meteor application to subscribe to its document sets and invoke its remote methods.
 * @locus Anywhere
 * @param {String} url The URL of another Meteor application.
 */


DDP.connect = function (url, options) {
  var ret = new Connection(url, options);
  allConnections.push(ret); // hack. see below.

  return ret;
};

DDP._reconnectHook = new Hook({
  bindEnvironment: false
});
/**
 * @summary Register a function to call as the first step of
 * reconnecting. This function can call methods which will be executed before
 * any other outstanding methods. For example, this can be used to re-establish
 * the appropriate authentication context on the connection.
 * @locus Anywhere
 * @param {Function} callback The function to call. It will be called with a
 * single argument, the [connection object](#ddp_connect) that is reconnecting.
 */

DDP.onReconnect = function (callback) {
  return DDP._reconnectHook.register(callback);
}; // Hack for `spiderable` package: a way to see if the page is done
// loading all the data it needs.
//


DDP._allSubscriptionsReady = function () {
  return allConnections.every(function (conn) {
    return keys(conn._subscriptions).every(function (id) {
      return conn._subscriptions[id].ready;
    });
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/ddp-client/client/client.js");

/* Exports */
Package._define("ddp-client", exports, {
  DDP: DDP
});

})();
