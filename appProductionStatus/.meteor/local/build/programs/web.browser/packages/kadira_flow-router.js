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
var _ = Package.underscore._;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var ReactiveDict = Package['reactive-dict'].ReactiveDict;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var EJSON = Package.ejson.EJSON;
var meteorInstall = Package.modules.meteorInstall;

/* Package-scope variables */
var page, qs, Triggers, Router, Group, Route, FlowRouter;

var require = meteorInstall({"node_modules":{"meteor":{"kadira:flow-router":{"client":{"modules.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/kadira_flow-router/client/modules.js                                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
page = require('page');
qs   = require('qs');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"triggers.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/kadira_flow-router/client/triggers.js                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// a set of utility functions for triggers

Triggers = {};

// Apply filters for a set of triggers
// @triggers - a set of triggers
// @filter - filter with array fileds with `only` and `except` 
//           support only either `only` or `except`, but not both
Triggers.applyFilters = function(triggers, filter) {
  if(!(triggers instanceof Array)) {
    triggers = [triggers];
  }

  if(!filter) {
    return triggers;
  }

  if(filter.only && filter.except) {
    throw new Error("Triggers don't support only and except filters at once");
  }

  if(filter.only && !(filter.only instanceof Array)) {
    throw new Error("only filters needs to be an array");
  }

  if(filter.except && !(filter.except instanceof Array)) {
    throw new Error("except filters needs to be an array");
  }

  if(filter.only) {
    return Triggers.createRouteBoundTriggers(triggers, filter.only);
  }

  if(filter.except) {
    return Triggers.createRouteBoundTriggers(triggers, filter.except, true);
  }

  throw new Error("Provided a filter but not supported");
};

//  create triggers by bounding them to a set of route names
//  @triggers - a set of triggers 
//  @names - list of route names to be bound (trigger runs only for these names)
//  @negate - negate the result (triggers won't run for above names)
Triggers.createRouteBoundTriggers = function(triggers, names, negate) {
  var namesMap = {};
  _.each(names, function(name) {
    namesMap[name] = true;
  });

  var filteredTriggers = _.map(triggers, function(originalTrigger) {
    var modifiedTrigger = function(context, next) {
      var routeName = context.route.name;
      var matched = (namesMap[routeName])? 1: -1;
      matched = (negate)? matched * -1 : matched;

      if(matched === 1) {
        originalTrigger(context, next);
      }
    };
    return modifiedTrigger;
  });

  return filteredTriggers;
};

//  run triggers and abort if redirected or callback stopped
//  @triggers - a set of triggers 
//  @context - context we need to pass (it must have the route)
//  @redirectFn - function which used to redirect 
//  @after - called after if only all the triggers runs
Triggers.runTriggers = function(triggers, context, redirectFn, after) {
  var abort = false;
  var inCurrentLoop = true;
  var alreadyRedirected = false;

  for(var lc=0; lc<triggers.length; lc++) {
    var trigger = triggers[lc];
    trigger(context, doRedirect, doStop);

    if(abort) {
      return;
    }
  }

  // mark that, we've exceeds the currentEventloop for
  // this set of triggers.
  inCurrentLoop = false;
  after();

  function doRedirect(url, params, queryParams) {
    if(alreadyRedirected) {
      throw new Error("already redirected");
    }

    if(!inCurrentLoop) {
      throw new Error("redirect needs to be done in sync");
    }

    if(!url) {
      throw new Error("trigger redirect requires an URL");
    }

    abort = true;
    alreadyRedirected = true;
    redirectFn(url, params, queryParams);
  }

  function doStop() {
    abort = true;
  }
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"router.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/kadira_flow-router/client/router.js                                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Router = function () {
  var self = this;
  this.globals = [];
  this.subscriptions = Function.prototype;

  this._tracker = this._buildTracker();
  this._current = {};

  // tracks the current path change
  this._onEveryPath = new Tracker.Dependency();

  this._globalRoute = new Route(this);

  // holds onRoute callbacks
  this._onRouteCallbacks = [];

  // if _askedToWait is true. We don't automatically start the router
  // in Meteor.startup callback. (see client/_init.js)
  // Instead user need to call `.initialize()
  this._askedToWait = false;
  this._initialized = false;
  this._triggersEnter = [];
  this._triggersExit = [];
  this._routes = [];
  this._routesMap = {};
  this._updateCallbacks();
  this.notFound = this.notfound = null;
  // indicate it's okay (or not okay) to run the tracker
  // when doing subscriptions
  // using a number and increment it help us to support FlowRouter.go()
  // and legitimate reruns inside tracker on the same event loop.
  // this is a solution for #145
  this.safeToRun = 0;

  // Meteor exposes to the client the path prefix that was defined using the
  // ROOT_URL environement variable on the server using the global runtime
  // configuration. See #315.
  this._basePath = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';

  // this is a chain contains a list of old routes
  // most of the time, there is only one old route
  // but when it's the time for a trigger redirect we've a chain
  this._oldRouteChain = [];

  this.env = {
    replaceState: new Meteor.EnvironmentVariable(),
    reload: new Meteor.EnvironmentVariable(),
    trailingSlash: new Meteor.EnvironmentVariable()
  };

  // redirect function used inside triggers
  this._redirectFn = function(pathDef, fields, queryParams) {
    if (/^http(s)?:\/\//.test(pathDef)) {
        var message = "Redirects to URLs outside of the app are not supported in this version of Flow Router. Use 'window.location = yourUrl' instead";
        throw new Error(message);
    }
    self.withReplaceState(function() {
      var path = FlowRouter.path(pathDef, fields, queryParams);
      self._page.redirect(path);
    });
  };
  this._initTriggersAPI();
};

Router.prototype.route = function(pathDef, options, group) {
  if (!/^\/.*/.test(pathDef)) {
    var message = "route's path must start with '/'";
    throw new Error(message);
  }

  options = options || {};
  var self = this;
  var route = new Route(this, pathDef, options, group);

  // calls when the page route being activates
  route._actionHandle = function (context, next) {
    var oldRoute = self._current.route;
    self._oldRouteChain.push(oldRoute);

    var queryParams = self._qs.parse(context.querystring);
    // _qs.parse() gives us a object without prototypes,
    // created with Object.create(null)
    // Meteor's check doesn't play nice with it.
    // So, we need to fix it by cloning it.
    // see more: https://github.com/meteorhacks/flow-router/issues/164
    queryParams = JSON.parse(JSON.stringify(queryParams));

    self._current = {
      path: context.path,
      context: context,
      params: context.params,
      queryParams: queryParams,
      route: route,
      oldRoute: oldRoute
    };

    // we need to invalidate if all the triggers have been completed
    // if not that means, we've been redirected to another path
    // then we don't need to invalidate
    var afterAllTriggersRan = function() {
      self._invalidateTracker();
    };

    var triggers = self._triggersEnter.concat(route._triggersEnter);
    Triggers.runTriggers(
      triggers,
      self._current,
      self._redirectFn,
      afterAllTriggersRan
    );
  };

  // calls when you exit from the page js route
  route._exitHandle = function(context, next) {
    var triggers = self._triggersExit.concat(route._triggersExit);
    Triggers.runTriggers(
      triggers,
      self._current,
      self._redirectFn,
      next
    );
  };

  this._routes.push(route);
  if (options.name) {
    this._routesMap[options.name] = route;
  }

  this._updateCallbacks();
  this._triggerRouteRegister(route);

  return route;
};

Router.prototype.group = function(options) {
  return new Group(this, options);
};

Router.prototype.path = function(pathDef, fields, queryParams) {
  if (this._routesMap[pathDef]) {
    pathDef = this._routesMap[pathDef].pathDef;
  }

  var path = "";

  // Prefix the path with the router global prefix
  if (this._basePath) {
    path += "/" + this._basePath + "/";
  }

  fields = fields || {};
  var regExp = /(:[\w\(\)\\\+\*\.\?]+)+/g;
  path += pathDef.replace(regExp, function(key) {
    var firstRegexpChar = key.indexOf("(");
    // get the content behind : and (\\d+/)
    key = key.substring(1, (firstRegexpChar > 0)? firstRegexpChar: undefined);
    // remove +?*
    key = key.replace(/[\+\*\?]+/g, "");

    // this is to allow page js to keep the custom characters as it is
    // we need to encode 2 times otherwise "/" char does not work properly
    // So, in that case, when I includes "/" it will think it's a part of the
    // route. encoding 2times fixes it
    return encodeURIComponent(encodeURIComponent(fields[key] || ""));
  });

  // Replace multiple slashes with single slash
  path = path.replace(/\/\/+/g, "/");

  // remove trailing slash
  // but keep the root slash if it's the only one
  path = path.match(/^\/{1}$/) ? path: path.replace(/\/$/, "");

  // explictly asked to add a trailing slash
  if(this.env.trailingSlash.get() && _.last(path) !== "/") {
    path += "/";
  }

  var strQueryParams = this._qs.stringify(queryParams || {});
  if(strQueryParams) {
    path += "?" + strQueryParams;
  }

  return path;
};

Router.prototype.go = function(pathDef, fields, queryParams) {
  var path = this.path(pathDef, fields, queryParams);

  var useReplaceState = this.env.replaceState.get();
  if(useReplaceState) {
    this._page.replace(path);
  } else {
    this._page(path);
  }
};

Router.prototype.reload = function() {
  var self = this;

  self.env.reload.withValue(true, function() {
    self._page.replace(self._current.path);
  });
};

Router.prototype.redirect = function(path) {
  this._page.redirect(path);
};

Router.prototype.setParams = function(newParams) {
  if(!this._current.route) {return false;}

  var pathDef = this._current.route.pathDef;
  var existingParams = this._current.params;
  var params = {};
  _.each(_.keys(existingParams), function(key) {
    params[key] = existingParams[key];
  });

  params = _.extend(params, newParams);
  var queryParams = this._current.queryParams;

  this.go(pathDef, params, queryParams);
  return true;
};

Router.prototype.setQueryParams = function(newParams) {
  if(!this._current.route) {return false;}

  var queryParams = _.clone(this._current.queryParams);
  _.extend(queryParams, newParams);

  for (var k in queryParams) {
    if (queryParams[k] === null || queryParams[k] === undefined) {
      delete queryParams[k];
    }
  }

  var pathDef = this._current.route.pathDef;
  var params = this._current.params;
  this.go(pathDef, params, queryParams);
  return true;
};

// .current is not reactive
// This is by design. use .getParam() instead
// If you really need to watch the path change, use .watchPathChange()
Router.prototype.current = function() {
  // We can't trust outside, that's why we clone this
  // Anyway, we can't clone the whole object since it has non-jsonable values
  // That's why we clone what's really needed.
  var current = _.clone(this._current);
  current.queryParams = EJSON.clone(current.queryParams);
  current.params = EJSON.clone(current.params);
  return current;
};

// Implementing Reactive APIs
var reactiveApis = [
  'getParam', 'getQueryParam',
  'getRouteName', 'watchPathChange'
];
reactiveApis.forEach(function(api) {
  Router.prototype[api] = function(arg1) {
    // when this is calling, there may not be any route initiated
    // so we need to handle it
    var currentRoute = this._current.route;
    if(!currentRoute) {
      this._onEveryPath.depend();
      return;
    }

    // currently, there is only one argument. If we've more let's add more args
    // this is not clean code, but better in performance
    return currentRoute[api].call(currentRoute, arg1);
  };
});

Router.prototype.subsReady = function() {
  var callback = null;
  var args = _.toArray(arguments);

  if (typeof _.last(args) === "function") {
    callback = args.pop();
  }

  var currentRoute = this.current().route;
  var globalRoute = this._globalRoute;

  // we need to depend for every route change and
  // rerun subscriptions to check the ready state
  this._onEveryPath.depend();

  if(!currentRoute) {
    return false;
  }

  var subscriptions;
  if(args.length === 0) {
    subscriptions = _.values(globalRoute.getAllSubscriptions());
    subscriptions = subscriptions.concat(_.values(currentRoute.getAllSubscriptions()));
  } else {
    subscriptions = _.map(args, function(subName) {
      return globalRoute.getSubscription(subName) || currentRoute.getSubscription(subName);
    });
  }

  var isReady = function() {
    var ready =  _.every(subscriptions, function(sub) {
      return sub && sub.ready();
    });

    return ready;
  };

  if (callback) {
    Tracker.autorun(function(c) {
      if (isReady()) {
        callback();
        c.stop();
      }
    });
  } else {
    return isReady();
  }
};

Router.prototype.withReplaceState = function(fn) {
  return this.env.replaceState.withValue(true, fn);
};

Router.prototype.withTrailingSlash = function(fn) {
  return this.env.trailingSlash.withValue(true, fn);
};

Router.prototype._notfoundRoute = function(context) {
  this._current = {
    path: context.path,
    context: context,
    params: [],
    queryParams: {},
  };

  // XXX this.notfound kept for backwards compatibility
  this.notFound = this.notFound || this.notfound;
  if(!this.notFound) {
    console.error("There is no route for the path:", context.path);
    return;
  }

  this._current.route = new Route(this, "*", this.notFound);
  this._invalidateTracker();
};

Router.prototype.initialize = function(options) {
  options = options || {};

  if(this._initialized) {
    throw new Error("FlowRouter is already initialized");
  }

  var self = this;
  this._updateCallbacks();

  // Implementing idempotent routing
  // by overriding page.js`s "show" method.
  // Why?
  // It is impossible to bypass exit triggers,
  // because they execute before the handler and
  // can not know what the next path is, inside exit trigger.
  //
  // we need override both show, replace to make this work
  // since we use redirect when we are talking about withReplaceState
  _.each(['show', 'replace'], function(fnName) {
    var original = self._page[fnName];
    self._page[fnName] = function(path, state, dispatch, push) {
      var reload = self.env.reload.get();
      if (!reload && self._current.path === path) {
        return;
      }

      original.call(this, path, state, dispatch, push);
    };
  });

  // this is very ugly part of pagejs and it does decoding few times
  // in unpredicatable manner. See #168
  // this is the default behaviour and we need keep it like that
  // we are doing a hack. see .path()
  this._page.base(this._basePath);
  this._page({
    decodeURLComponents: true,
    hashbang: !!options.hashbang
  });

  this._initialized = true;
};

Router.prototype._buildTracker = function() {
  var self = this;

  // main autorun function
  var tracker = Tracker.autorun(function () {
    if(!self._current || !self._current.route) {
      return;
    }

    // see the definition of `this._processingContexts`
    var currentContext = self._current;
    var route = currentContext.route;
    var path = currentContext.path;

    if(self.safeToRun === 0) {
      var message =
        "You can't use reactive data sources like Session" +
        " inside the `.subscriptions` method!";
      throw new Error(message);
    }

    // We need to run subscriptions inside a Tracker
    // to stop subs when switching between routes
    // But we don't need to run this tracker with
    // other reactive changes inside the .subscription method
    // We tackle this with the `safeToRun` variable
    self._globalRoute.clearSubscriptions();
    self.subscriptions.call(self._globalRoute, path);
    route.callSubscriptions(currentContext);

    // otherwise, computations inside action will trigger to re-run
    // this computation. which we do not need.
    Tracker.nonreactive(function() {
      var isRouteChange = currentContext.oldRoute !== currentContext.route;
      var isFirstRoute = !currentContext.oldRoute;
      // first route is not a route change
      if(isFirstRoute) {
        isRouteChange = false;
      }

      // Clear oldRouteChain just before calling the action
      // We still need to get a copy of the oldestRoute first
      // It's very important to get the oldest route and registerRouteClose() it
      // See: https://github.com/kadirahq/flow-router/issues/314
      var oldestRoute = self._oldRouteChain[0];
      self._oldRouteChain = [];

      currentContext.route.registerRouteChange(currentContext, isRouteChange);
      route.callAction(currentContext);

      Tracker.afterFlush(function() {
        self._onEveryPath.changed();
        if(isRouteChange) {
          // We need to trigger that route (definition itself) has changed.
          // So, we need to re-run all the register callbacks to current route
          // This is pretty important, otherwise tracker
          // can't identify new route's items

          // We also need to afterFlush, otherwise this will re-run
          // helpers on templates which are marked for destroying
          if(oldestRoute) {
            oldestRoute.registerRouteClose();
          }
        }
      });
    });

    self.safeToRun--;
  });

  return tracker;
};

Router.prototype._invalidateTracker = function() {
  var self = this;
  this.safeToRun++;
  this._tracker.invalidate();
  // After the invalidation we need to flush to make changes imediately
  // otherwise, we have face some issues context mix-maches and so on.
  // But there are some cases we can't flush. So we need to ready for that.

  // we clearly know, we can't flush inside an autorun
  // this may leads some issues on flow-routing
  // we may need to do some warning
  if(!Tracker.currentComputation) {
    // Still there are some cases where we can't flush
    //  eg:- when there is a flush currently
    // But we've no public API or hacks to get that state
    // So, this is the only solution
    try {
      Tracker.flush();
    } catch(ex) {
      // only handling "while flushing" errors
      if(!/Tracker\.flush while flushing/.test(ex.message)) {
        return;
      }

      // XXX: fix this with a proper solution by removing subscription mgt.
      // from the router. Then we don't need to run invalidate using a tracker

      // this happens when we are trying to invoke a route change
      // with inside a route chnage. (eg:- Template.onCreated)
      // Since we use page.js and tracker, we don't have much control
      // over this process.
      // only solution is to defer route execution.

      // It's possible to have more than one path want to defer
      // But, we only need to pick the last one.
      // self._nextPath = self._current.path;
      Meteor.defer(function() {
        var path = self._nextPath;
        if(!path) {
          return;
        }

        delete self._nextPath;
        self.env.reload.withValue(true, function() {
          self.go(path);
        });
      });
    }
  }
};

Router.prototype._updateCallbacks = function () {
  var self = this;

  self._page.callbacks = [];
  self._page.exits = [];

  _.each(self._routes, function(route) {
    self._page(route.pathDef, route._actionHandle);
    self._page.exit(route.pathDef, route._exitHandle);
  });

  self._page("*", function(context) {
    self._notfoundRoute(context);
  });
};

Router.prototype._initTriggersAPI = function() {
  var self = this;
  this.triggers = {
    enter: function(triggers, filter) {
      triggers = Triggers.applyFilters(triggers, filter);
      if(triggers.length) {
        self._triggersEnter = self._triggersEnter.concat(triggers);
      }
    },

    exit: function(triggers, filter) {
      triggers = Triggers.applyFilters(triggers, filter);
      if(triggers.length) {
        self._triggersExit = self._triggersExit.concat(triggers);
      }
    }
  };
};

Router.prototype.wait = function() {
  if(this._initialized) {
    throw new Error("can't wait after FlowRouter has been initialized");
  }

  this._askedToWait = true;
};

Router.prototype.onRouteRegister = function(cb) {
  this._onRouteCallbacks.push(cb);
};

Router.prototype._triggerRouteRegister = function(currentRoute) {
  // We should only need to send a safe set of fields on the route
  // object.
  // This is not to hide what's inside the route object, but to show
  // these are the public APIs
  var routePublicApi = _.pick(currentRoute, 'name', 'pathDef', 'path');
  var omittingOptionFields = [
    'triggersEnter', 'triggersExit', 'action', 'subscriptions', 'name'
  ];
  routePublicApi.options = _.omit(currentRoute.options, omittingOptionFields);

  _.each(this._onRouteCallbacks, function(cb) {
    cb(routePublicApi);
  });
};

Router.prototype._page = page;
Router.prototype._qs = qs;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"group.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/kadira_flow-router/client/group.js                                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Group = function(router, options, parent) {
  options = options || {};

  if (options.prefix && !/^\/.*/.test(options.prefix)) {
    var message = "group's prefix must start with '/'";
    throw new Error(message);
  }

  this._router = router;
  this.prefix = options.prefix || '';
  this.name = options.name;
  this.options = options;

  this._triggersEnter = options.triggersEnter || [];
  this._triggersExit = options.triggersExit || [];
  this._subscriptions = options.subscriptions || Function.prototype;

  this.parent = parent;
  if (this.parent) {
    this.prefix = parent.prefix + this.prefix;

    this._triggersEnter = parent._triggersEnter.concat(this._triggersEnter);
    this._triggersExit = this._triggersExit.concat(parent._triggersExit);
  }
};

Group.prototype.route = function(pathDef, options, group) {
  options = options || {};

  if (!/^\/.*/.test(pathDef)) {
    var message = "route's path must start with '/'";
    throw new Error(message);
  }

  group = group || this;
  pathDef = this.prefix + pathDef;

  var triggersEnter = options.triggersEnter || [];
  options.triggersEnter = this._triggersEnter.concat(triggersEnter);

  var triggersExit = options.triggersExit || [];
  options.triggersExit = triggersExit.concat(this._triggersExit);

  return this._router.route(pathDef, options, group);
};

Group.prototype.group = function(options) {
  return new Group(this._router, options, this);
};

Group.prototype.callSubscriptions = function(current) {
  if (this.parent) {
    this.parent.callSubscriptions(current);
  }

  this._subscriptions.call(current.route, current.params, current.queryParams);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"route.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/kadira_flow-router/client/route.js                                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Route = function(router, pathDef, options, group) {
  options = options || {};

  this.options = options;
  this.pathDef = pathDef

  // Route.path is deprecated and will be removed in 3.0
  this.path = pathDef;

  if (options.name) {
    this.name = options.name;
  }

  this._action = options.action || Function.prototype;
  this._subscriptions = options.subscriptions || Function.prototype;
  this._triggersEnter = options.triggersEnter || [];
  this._triggersExit = options.triggersExit || [];
  this._subsMap = {};
  this._router = router;

  this._params = new ReactiveDict();
  this._queryParams = new ReactiveDict();
  this._routeCloseDep = new Tracker.Dependency();

  // tracks the changes in the URL
  this._pathChangeDep = new Tracker.Dependency();

  this.group = group;
};

Route.prototype.clearSubscriptions = function() {
  this._subsMap = {};
};

Route.prototype.register = function(name, sub, options) {
  this._subsMap[name] = sub;
};


Route.prototype.getSubscription = function(name) {
  return this._subsMap[name];
};


Route.prototype.getAllSubscriptions = function() {
  return this._subsMap;
};

Route.prototype.callAction = function(current) {
  var self = this;
  self._action(current.params, current.queryParams);
};

Route.prototype.callSubscriptions = function(current) {
  this.clearSubscriptions();
  if (this.group) {
    this.group.callSubscriptions(current);
  }

  this._subscriptions(current.params, current.queryParams);
};

Route.prototype.getRouteName = function() {
  this._routeCloseDep.depend();
  return this.name;
};

Route.prototype.getParam = function(key) {
  this._routeCloseDep.depend();
  return this._params.get(key);
};

Route.prototype.getQueryParam = function(key) {
  this._routeCloseDep.depend();
  return this._queryParams.get(key);
};

Route.prototype.watchPathChange = function() {
  this._pathChangeDep.depend();
};

Route.prototype.registerRouteClose = function() {
  this._params = new ReactiveDict();
  this._queryParams = new ReactiveDict();
  this._routeCloseDep.changed();
  this._pathChangeDep.changed();
};

Route.prototype.registerRouteChange = function(currentContext, routeChanging) {
  // register params
  var params = currentContext.params;
  this._updateReactiveDict(this._params, params);

  // register query params
  var queryParams = currentContext.queryParams;
  this._updateReactiveDict(this._queryParams, queryParams);

  // if the route is changing, we need to defer triggering path changing
  // if we did this, old route's path watchers will detect this
  // Real issue is, above watcher will get removed with the new route
  // So, we don't need to trigger it now
  // We are doing it on the route close event. So, if they exists they'll 
  // get notify that
  if(!routeChanging) {
    this._pathChangeDep.changed();
  }
};

Route.prototype._updateReactiveDict = function(dict, newValues) {
  var currentKeys = _.keys(newValues);
  var oldKeys = _.keys(dict.keyDeps);

  // set new values
  //  params is an array. So, _.each(params) does not works
  //  to iterate params
  _.each(currentKeys, function(key) {
    dict.set(key, newValues[key]);
  });

  // remove keys which does not exisits here
  var removedKeys = _.difference(oldKeys, currentKeys);
  _.each(removedKeys, function(key) {
    dict.set(key, undefined);
  });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"_init.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/kadira_flow-router/client/_init.js                                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Export Router Instance
FlowRouter = new Router();
FlowRouter.Router = Router;
FlowRouter.Route = Route;

// Initialize FlowRouter
Meteor.startup(function () {
  if(!FlowRouter._askedToWait) {
    FlowRouter.initialize();
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lib":{"router.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/kadira_flow-router/lib/router.js                                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Router.prototype.url = function() {
  // We need to remove the leading base path, or "/", as it will be inserted
  // automatically by `Meteor.absoluteUrl` as documented in:
  // http://docs.meteor.com/#/full/meteor_absoluteurl
  var completePath = this.path.apply(this, arguments);
  var basePath = this._basePath || '/';
  var pathWithoutBase = completePath.replace(new RegExp('^' + basePath), '');
  return Meteor.absoluteUrl(pathWithoutBase);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"node_modules":{"page":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/page/package.json                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "page",
  "version": "1.6.4"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/page/index.js                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
  /* globals require, module */

  'use strict';

  /**
   * Module dependencies.
   */

  var pathtoRegexp = require('path-to-regexp');

  /**
   * Module exports.
   */

  module.exports = page;

  /**
   * Detect click event
   */
  var clickEvent = ('undefined' !== typeof document) && document.ontouchstart ? 'touchstart' : 'click';

  /**
   * To work properly with the URL
   * history.location generated polyfill in https://github.com/devote/HTML5-History-API
   */

  var location = ('undefined' !== typeof window) && (window.history.location || window.location);

  /**
   * Perform initial dispatch.
   */

  var dispatch = true;


  /**
   * Decode URL components (query string, pathname, hash).
   * Accommodates both regular percent encoding and x-www-form-urlencoded format.
   */
  var decodeURLComponents = true;

  /**
   * Base path.
   */

  var base = '';

  /**
   * Running flag.
   */

  var running;

  /**
   * HashBang option
   */

  var hashbang = false;

  /**
   * Previous context, for capturing
   * page exit events.
   */

  var prevContext;

  /**
   * Register `path` with callback `fn()`,
   * or route `path`, or redirection,
   * or `page.start()`.
   *
   *   page(fn);
   *   page('*', fn);
   *   page('/user/:id', load, user);
   *   page('/user/' + user.id, { some: 'thing' });
   *   page('/user/' + user.id);
   *   page('/from', '/to')
   *   page();
   *
   * @param {string|!Function|!Object} path
   * @param {Function=} fn
   * @api public
   */

  function page(path, fn) {
    // <callback>
    if ('function' === typeof path) {
      return page('*', path);
    }

    // route <path> to <callback ...>
    if ('function' === typeof fn) {
      var route = new Route(/** @type {string} */ (path));
      for (var i = 1; i < arguments.length; ++i) {
        page.callbacks.push(route.middleware(arguments[i]));
      }
      // show <path> with [state]
    } else if ('string' === typeof path) {
      page['string' === typeof fn ? 'redirect' : 'show'](path, fn);
      // start [options]
    } else {
      page.start(path);
    }
  }

  /**
   * Callback functions.
   */

  page.callbacks = [];
  page.exits = [];

  /**
   * Current path being processed
   * @type {string}
   */
  page.current = '';

  /**
   * Number of pages navigated to.
   * @type {number}
   *
   *     page.len == 0;
   *     page('/login');
   *     page.len == 1;
   */

  page.len = 0;

  /**
   * Get or set basepath to `path`.
   *
   * @param {string} path
   * @api public
   */

  page.base = function(path) {
    if (0 === arguments.length) return base;
    base = path;
  };

  /**
   * Bind with the given `options`.
   *
   * Options:
   *
   *    - `click` bind to click events [true]
   *    - `popstate` bind to popstate [true]
   *    - `dispatch` perform initial dispatch [true]
   *
   * @param {Object} options
   * @api public
   */

  page.start = function(options) {
    options = options || {};
    if (running) return;
    running = true;
    if (false === options.dispatch) dispatch = false;
    if (false === options.decodeURLComponents) decodeURLComponents = false;
    if (false !== options.popstate) window.addEventListener('popstate', onpopstate, false);
    if (false !== options.click) {
      document.addEventListener(clickEvent, onclick, false);
    }
    if (true === options.hashbang) hashbang = true;
    if (!dispatch) return;
    var url = (hashbang && ~location.hash.indexOf('#!')) ? location.hash.substr(2) + location.search : location.pathname + location.search + location.hash;
    page.replace(url, null, true, dispatch);
  };

  /**
   * Unbind click and popstate event handlers.
   *
   * @api public
   */

  page.stop = function() {
    if (!running) return;
    page.current = '';
    page.len = 0;
    running = false;
    document.removeEventListener(clickEvent, onclick, false);
    window.removeEventListener('popstate', onpopstate, false);
  };

  /**
   * Show `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} dispatch
   * @param {boolean=} push
   * @return {!Context}
   * @api public
   */

  page.show = function(path, state, dispatch, push) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    if (false !== dispatch) page.dispatch(ctx);
    if (false !== ctx.handled && false !== push) ctx.pushState();
    return ctx;
  };

  /**
   * Goes back in the history
   * Back should always let the current route push state and then go back.
   *
   * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
   * @param {Object=} state
   * @api public
   */

  page.back = function(path, state) {
    if (page.len > 0) {
      // this may need more testing to see if all browsers
      // wait for the next tick to go back in history
      history.back();
      page.len--;
    } else if (path) {
      setTimeout(function() {
        page.show(path, state);
      });
    }else{
      setTimeout(function() {
        page.show(base, state);
      });
    }
  };


  /**
   * Register route to redirect from one path to other
   * or just redirect to another route
   *
   * @param {string} from - if param 'to' is undefined redirects to 'from'
   * @param {string=} to
   * @api public
   */
  page.redirect = function(from, to) {
    // Define route from a path to another
    if ('string' === typeof from && 'string' === typeof to) {
      page(from, function(e) {
        setTimeout(function() {
          page.replace(/** @type {!string} */ (to));
        }, 0);
      });
    }

    // Wait for the push state and replace it with another
    if ('string' === typeof from && 'undefined' === typeof to) {
      setTimeout(function() {
        page.replace(from);
      }, 0);
    }
  };

  /**
   * Replace `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} init
   * @param {boolean=} dispatch
   * @return {!Context}
   * @api public
   */


  page.replace = function(path, state, init, dispatch) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    ctx.init = init;
    ctx.save(); // save before dispatching, which may redirect
    if (false !== dispatch) page.dispatch(ctx);
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Context} ctx
   * @api private
   */
  page.dispatch = function(ctx) {
    var prev = prevContext,
      i = 0,
      j = 0;

    prevContext = ctx;

    function nextExit() {
      var fn = page.exits[j++];
      if (!fn) return nextEnter();
      fn(prev, nextExit);
    }

    function nextEnter() {
      var fn = page.callbacks[i++];

      if (ctx.path !== page.current) {
        ctx.handled = false;
        return;
      }
      if (!fn) return unhandled(ctx);
      fn(ctx, nextEnter);
    }

    if (prev) {
      nextExit();
    } else {
      nextEnter();
    }
  };

  /**
   * Unhandled `ctx`. When it's not the initial
   * popstate then redirect. If you wish to handle
   * 404s on your own use `page('*', callback)`.
   *
   * @param {Context} ctx
   * @api private
   */
  function unhandled(ctx) {
    if (ctx.handled) return;
    var current;

    if (hashbang) {
      current = base + location.hash.replace('#!', '');
    } else {
      current = location.pathname + location.search;
    }

    if (current === ctx.canonicalPath) return;
    page.stop();
    ctx.handled = false;
    location.href = ctx.canonicalPath;
  }

  /**
   * Register an exit route on `path` with
   * callback `fn()`, which will be called
   * on the previous context when a new
   * page is visited.
   */
  page.exit = function(path, fn) {
    if (typeof path === 'function') {
      return page.exit('*', path);
    }

    var route = new Route(path);
    for (var i = 1; i < arguments.length; ++i) {
      page.exits.push(route.middleware(arguments[i]));
    }
  };

  /**
   * Remove URL encoding from the given `str`.
   * Accommodates whitespace in both x-www-form-urlencoded
   * and regular percent-encoded form.
   *
   * @param {string} val - URL component to decode
   */
  function decodeURLEncodedURIComponent(val) {
    if (typeof val !== 'string') { return val; }
    return decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
  }

  /**
   * Initialize a new "request" `Context`
   * with the given `path` and optional initial `state`.
   *
   * @constructor
   * @param {string} path
   * @param {Object=} state
   * @api public
   */

  function Context(path, state) {
    if ('/' === path[0] && 0 !== path.indexOf(base)) path = base + (hashbang ? '#!' : '') + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    this.path = path.replace(base, '') || '/';
    if (hashbang) this.path = this.path.replace('#!', '') || '/';

    this.title = document.title;
    this.state = state || {};
    this.state.path = path;
    this.querystring = ~i ? decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
    this.pathname = decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
    this.params = {};

    // fragment
    this.hash = '';
    if (!hashbang) {
      if (!~this.path.indexOf('#')) return;
      var parts = this.path.split('#');
      this.path = parts[0];
      this.hash = decodeURLEncodedURIComponent(parts[1]) || '';
      this.querystring = this.querystring.split('#')[0];
    }
  }

  /**
   * Expose `Context`.
   */

  page.Context = Context;

  /**
   * Push state.
   *
   * @api private
   */

  Context.prototype.pushState = function() {
    page.len++;
    history.pushState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function() {
    history.replaceState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Initialize `Route` with the given HTTP `path`,
   * and an array of `callbacks` and `options`.
   *
   * Options:
   *
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @constructor
   * @param {string} path
   * @param {Object=} options
   * @api private
   */

  function Route(path, options) {
    options = options || {};
    this.path = (path === '*') ? '(.*)' : path;
    this.method = 'GET';
    this.regexp = pathtoRegexp(this.path,
      this.keys = [],
      options);
  }

  /**
   * Expose `Route`.
   */

  page.Route = Route;

  /**
   * Return route middleware with
   * the given callback `fn()`.
   *
   * @param {Function} fn
   * @return {Function}
   * @api public
   */

  Route.prototype.middleware = function(fn) {
    var self = this;
    return function(ctx, next) {
      if (self.match(ctx.path, ctx.params)) return fn(ctx, next);
      next();
    };
  };

  /**
   * Check if this route matches `path`, if so
   * populate `params`.
   *
   * @param {string} path
   * @param {Object} params
   * @return {boolean}
   * @api private
   */

  Route.prototype.match = function(path, params) {
    var keys = this.keys,
      qsIndex = path.indexOf('?'),
      pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
      m = this.regexp.exec(decodeURIComponent(pathname));

    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];
      var val = decodeURLEncodedURIComponent(m[i]);
      if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
        params[key.name] = val;
      }
    }

    return true;
  };


  /**
   * Handle "populate" events.
   */

  var onpopstate = (function () {
    var loaded = false;
    if ('undefined' === typeof window) {
      return;
    }
    if (document.readyState === 'complete') {
      loaded = true;
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() {
          loaded = true;
        }, 0);
      });
    }
    return function onpopstate(e) {
      if (!loaded) return;
      if (e.state) {
        var path = e.state.path;
        page.replace(path, e.state);
      } else {
        page.show(location.pathname + location.hash, undefined, undefined, false);
      }
    };
  })();
  /**
   * Handle "click" events.
   */

  function onclick(e) {

    if (1 !== which(e)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;



    // ensure link
    var el = e.target;
    while (el && 'A' !== el.nodeName) el = el.parentNode;
    if (!el || 'A' !== el.nodeName) return;



    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if (!hashbang && el.pathname === location.pathname && (el.hash || '#' === link)) return;



    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    if (el.target) return;

    // x-origin
    if (!sameOrigin(el.href)) return;



    // rebuild path
    var path = el.pathname + el.search + (el.hash || '');

    path = path[0] !== '/' ? '/' + path : path;

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (typeof process !== 'undefined' && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;

    if (path.indexOf(base) === 0) {
      path = path.substr(base.length);
    }

    if (hashbang) path = path.replace('#!', '');

    if (base && orig === path) return;

    e.preventDefault();
    page.show(orig);
  }

  /**
   * Event button.
   */

  function which(e) {
    e = e || window.event;
    return null === e.which ? e.button : e.which;
  }

  /**
   * Check if `href` is the same origin.
   */

  function sameOrigin(href) {
    var origin = location.protocol + '//' + location.hostname;
    if (location.port) origin += ':' + location.port;
    return (href && (0 === href.indexOf(origin)));
  }

  page.sameOrigin = sameOrigin;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"path-to-regexp":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/page/node_modules/path-to-regexp/package.json                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "path-to-regexp",
  "version": "1.2.1"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/page/node_modules/path-to-regexp/index.js                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var isarray = require('isarray')

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp
module.exports.parse = parse
module.exports.compile = compile
module.exports.tokensToFunction = tokensToFunction
module.exports.tokensToRegExp = tokensToRegExp

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {String} str
 * @return {Array}
 */
function parse (str) {
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var res

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      continue
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
    }

    var prefix = res[2]
    var name = res[3]
    var capture = res[4]
    var group = res[5]
    var suffix = res[6]
    var asterisk = res[7]

    var repeat = suffix === '+' || suffix === '*'
    var optional = suffix === '?' || suffix === '*'
    var delimiter = prefix || '/'
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?')

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: escapeGroup(pattern)
    })
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index)
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path)
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {String}   str
 * @return {Function}
 */
function compile (str) {
  return tokensToFunction(parse(str))
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^' + tokens[i].pattern + '$')
    }
  }

  return function (obj) {
    var path = ''
    var data = obj || {}

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i]

      if (typeof token === 'string') {
        path += token

        continue
      }

      var value = data[token.name]
      var segment

      if (value == null) {
        if (token.optional) {
          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encodeURIComponent(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      segment = encodeURIComponent(value)

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {String} str
 * @return {String}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {String}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {RegExp} path
 * @param  {Array}  keys
 * @return {RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      })
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = []

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source)
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options))

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {String} path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function stringToRegexp (path, keys, options) {
  var tokens = parse(path)
  var re = tokensToRegExp(tokens, options)

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i])
    }
  }

  return attachKeys(re, keys)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {Array}  tokens
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function tokensToRegExp (tokens, options) {
  options = options || {}

  var strict = options.strict
  var end = options.end !== false
  var route = ''
  var lastToken = tokens[tokens.length - 1]
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken)

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
    } else {
      var prefix = escapeString(token.prefix)
      var capture = token.pattern

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*'
      }

      if (token.optional) {
        if (prefix) {
          capture = '(?:' + prefix + '(' + capture + '))?'
        } else {
          capture = '(' + capture + ')?'
        }
      } else {
        capture = prefix + '(' + capture + ')'
      }

      route += capture
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)'
  }

  return new RegExp('^' + route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 [keys]
 * @param  {Object}                [options]
 * @return {RegExp}
 */
function pathToRegexp (path, keys, options) {
  keys = keys || []

  if (!isarray(keys)) {
    options = keys
    keys = []
  } else if (!options) {
    options = {}
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options)
  }

  if (isarray(path)) {
    return arrayToRegexp(path, keys, options)
  }

  return stringToRegexp(path, keys, options)
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"isarray":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/page/node_modules/path-to-regexp/node_modules/isarray/package. //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "isarray",
  "version": "0.0.1",
  "main": "index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/page/node_modules/path-to-regexp/node_modules/isarray/index.js //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},"qs":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/qs/package.json                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "qs",
  "version": "5.2.0",
  "main": "lib/index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/qs/lib/index.js                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Load modules

var Stringify = require('./stringify');
var Parse = require('./parse');


// Declare internals

var internals = {};


module.exports = {
    stringify: Stringify,
    parse: Parse
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"stringify.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/qs/lib/stringify.js                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Load modules

var Utils = require('./utils');


// Declare internals

var internals = {
    delimiter: '&',
    arrayPrefixGenerators: {
        brackets: function (prefix, key) {

            return prefix + '[]';
        },
        indices: function (prefix, key) {

            return prefix + '[' + key + ']';
        },
        repeat: function (prefix, key) {

            return prefix;
        }
    },
    strictNullHandling: false,
    skipNulls: false,
    encode: true
};


internals.stringify = function (obj, prefix, generateArrayPrefix, strictNullHandling, skipNulls, encode, filter, sort) {

    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    }
    else if (Utils.isBuffer(obj)) {
        obj = obj.toString();
    }
    else if (obj instanceof Date) {
        obj = obj.toISOString();
    }
    else if (obj === null) {
        if (strictNullHandling) {
            return encode ? Utils.encode(prefix) : prefix;
        }

        obj = '';
    }

    if (typeof obj === 'string' ||
        typeof obj === 'number' ||
        typeof obj === 'boolean') {

        if (encode) {
            return [Utils.encode(prefix) + '=' + Utils.encode(obj)];
        }
        return [prefix + '=' + obj];
    }

    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;
    if (Array.isArray(filter)) {
        objKeys = filter;
    } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    for (var i = 0, il = objKeys.length; i < il; ++i) {
        var key = objKeys[i];

        if (skipNulls &&
            obj[key] === null) {

            continue;
        }

        if (Array.isArray(obj)) {
            values = values.concat(internals.stringify(obj[key], generateArrayPrefix(prefix, key), generateArrayPrefix, strictNullHandling, skipNulls, encode, filter));
        }
        else {
            values = values.concat(internals.stringify(obj[key], prefix + '[' + key + ']', generateArrayPrefix, strictNullHandling, skipNulls, encode, filter));
        }
    }

    return values;
};


module.exports = function (obj, options) {

    options = options || {};
    var delimiter = typeof options.delimiter === 'undefined' ? internals.delimiter : options.delimiter;
    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : internals.strictNullHandling;
    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : internals.skipNulls;
    var encode = typeof options.encode === 'boolean' ? options.encode : internals.encode;
    var sort = typeof options.sort === 'function' ? options.sort : null;
    var objKeys;
    var filter;
    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    }
    else if (Array.isArray(options.filter)) {
        objKeys = filter = options.filter;
    }

    var keys = [];

    if (typeof obj !== 'object' ||
        obj === null) {

        return '';
    }

    var arrayFormat;
    if (options.arrayFormat in internals.arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    }
    else if ('indices' in options) {
        arrayFormat = options.indices ? 'indices' : 'repeat';
    }
    else {
        arrayFormat = 'indices';
    }

    var generateArrayPrefix = internals.arrayPrefixGenerators[arrayFormat];

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (sort) {
        objKeys.sort(sort);
    }

    for (var i = 0, il = objKeys.length; i < il; ++i) {
        var key = objKeys[i];

        if (skipNulls &&
            obj[key] === null) {

            continue;
        }

        keys = keys.concat(internals.stringify(obj[key], key, generateArrayPrefix, strictNullHandling, skipNulls, encode, filter, sort));
    }

    return keys.join(delimiter);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils.js":function(require,exports){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/qs/lib/utils.js                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Load modules


// Declare internals

var internals = {};
internals.hexTable = new Array(256);
for (var h = 0; h < 256; ++h) {
    internals.hexTable[h] = '%' + ((h < 16 ? '0' : '') + h.toString(16)).toUpperCase();
}


exports.arrayToObject = function (source, options) {

    var obj = options.plainObjects ? Object.create(null) : {};
    for (var i = 0, il = source.length; i < il; ++i) {
        if (typeof source[i] !== 'undefined') {

            obj[i] = source[i];
        }
    }

    return obj;
};


exports.merge = function (target, source, options) {

    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (Array.isArray(target)) {
            target.push(source);
        }
        else if (typeof target === 'object') {
            target[source] = true;
        }
        else {
            target = [target, source];
        }

        return target;
    }

    if (typeof target !== 'object') {
        target = [target].concat(source);
        return target;
    }

    if (Array.isArray(target) &&
        !Array.isArray(source)) {

        target = exports.arrayToObject(target, options);
    }

    var keys = Object.keys(source);
    for (var k = 0, kl = keys.length; k < kl; ++k) {
        var key = keys[k];
        var value = source[key];

        if (!Object.prototype.hasOwnProperty.call(target, key)) {
            target[key] = value;
        }
        else {
            target[key] = exports.merge(target[key], value, options);
        }
    }

    return target;
};


exports.decode = function (str) {

    try {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    } catch (e) {
        return str;
    }
};

exports.encode = function (str) {

    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    if (typeof str !== 'string') {
        str = '' + str;
    }

    var out = '';
    for (var i = 0, il = str.length; i < il; ++i) {
        var c = str.charCodeAt(i);

        if (c === 0x2D || // -
            c === 0x2E || // .
            c === 0x5F || // _
            c === 0x7E || // ~
            (c >= 0x30 && c <= 0x39) || // 0-9
            (c >= 0x41 && c <= 0x5A) || // a-z
            (c >= 0x61 && c <= 0x7A)) { // A-Z

            out += str[i];
            continue;
        }

        if (c < 0x80) {
            out += internals.hexTable[c];
            continue;
        }

        if (c < 0x800) {
            out += internals.hexTable[0xC0 | (c >> 6)] + internals.hexTable[0x80 | (c & 0x3F)];
            continue;
        }

        if (c < 0xD800 || c >= 0xE000) {
            out += internals.hexTable[0xE0 | (c >> 12)] + internals.hexTable[0x80 | ((c >> 6) & 0x3F)] + internals.hexTable[0x80 | (c & 0x3F)];
            continue;
        }

        ++i;
        c = 0x10000 + (((c & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF));
        out += internals.hexTable[0xF0 | (c >> 18)] + internals.hexTable[0x80 | ((c >> 12) & 0x3F)] + internals.hexTable[0x80 | ((c >> 6) & 0x3F)] + internals.hexTable[0x80 | (c & 0x3F)];
    }

    return out;
};

exports.compact = function (obj, refs) {

    if (typeof obj !== 'object' ||
        obj === null) {

        return obj;
    }

    refs = refs || [];
    var lookup = refs.indexOf(obj);
    if (lookup !== -1) {
        return refs[lookup];
    }

    refs.push(obj);

    if (Array.isArray(obj)) {
        var compacted = [];

        for (var i = 0, il = obj.length; i < il; ++i) {
            if (typeof obj[i] !== 'undefined') {
                compacted.push(obj[i]);
            }
        }

        return compacted;
    }

    var keys = Object.keys(obj);
    for (i = 0, il = keys.length; i < il; ++i) {
        var key = keys[i];
        obj[key] = exports.compact(obj[key], refs);
    }

    return obj;
};


exports.isRegExp = function (obj) {

    return Object.prototype.toString.call(obj) === '[object RegExp]';
};


exports.isBuffer = function (obj) {

    if (obj === null ||
        typeof obj === 'undefined') {

        return false;
    }

    return !!(obj.constructor &&
              obj.constructor.isBuffer &&
              obj.constructor.isBuffer(obj));
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"parse.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/kadira_flow-router/node_modules/qs/lib/parse.js                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Load modules

var Utils = require('./utils');


// Declare internals

var internals = {
    delimiter: '&',
    depth: 5,
    arrayLimit: 20,
    parameterLimit: 1000,
    strictNullHandling: false,
    plainObjects: false,
    allowPrototypes: false,
    allowDots: false
};


internals.parseValues = function (str, options) {

    var obj = {};
    var parts = str.split(options.delimiter, options.parameterLimit === Infinity ? undefined : options.parameterLimit);

    for (var i = 0, il = parts.length; i < il; ++i) {
        var part = parts[i];
        var pos = part.indexOf(']=') === -1 ? part.indexOf('=') : part.indexOf(']=') + 1;

        if (pos === -1) {
            obj[Utils.decode(part)] = '';

            if (options.strictNullHandling) {
                obj[Utils.decode(part)] = null;
            }
        }
        else {
            var key = Utils.decode(part.slice(0, pos));
            var val = Utils.decode(part.slice(pos + 1));

            if (!Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = val;
            }
            else {
                obj[key] = [].concat(obj[key]).concat(val);
            }
        }
    }

    return obj;
};


internals.parseObject = function (chain, val, options) {

    if (!chain.length) {
        return val;
    }

    var root = chain.shift();

    var obj;
    if (root === '[]') {
        obj = [];
        obj = obj.concat(internals.parseObject(chain, val, options));
    }
    else {
        obj = options.plainObjects ? Object.create(null) : {};
        var cleanRoot = root[0] === '[' && root[root.length - 1] === ']' ? root.slice(1, root.length - 1) : root;
        var index = parseInt(cleanRoot, 10);
        var indexString = '' + index;
        if (!isNaN(index) &&
            root !== cleanRoot &&
            indexString === cleanRoot &&
            index >= 0 &&
            (options.parseArrays &&
             index <= options.arrayLimit)) {

            obj = [];
            obj[index] = internals.parseObject(chain, val, options);
        }
        else {
            obj[cleanRoot] = internals.parseObject(chain, val, options);
        }
    }

    return obj;
};


internals.parseKeys = function (key, val, options) {

    if (!key) {
        return;
    }

    // Transform dot notation to bracket notation

    if (options.allowDots) {
        key = key.replace(/\.([^\.\[]+)/g, '[$1]');
    }

    // The regex chunks

    var parent = /^([^\[\]]*)/;
    var child = /(\[[^\[\]]*\])/g;

    // Get the parent

    var segment = parent.exec(key);

    // Stash the parent if it exists

    var keys = [];
    if (segment[1]) {
        // If we aren't using plain objects, optionally prefix keys
        // that would overwrite object prototype properties
        if (!options.plainObjects &&
            Object.prototype.hasOwnProperty(segment[1])) {

            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(segment[1]);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while ((segment = child.exec(key)) !== null && i < options.depth) {

        ++i;
        if (!options.plainObjects &&
            Object.prototype.hasOwnProperty(segment[1].replace(/\[|\]/g, ''))) {

            if (!options.allowPrototypes) {
                continue;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return internals.parseObject(keys, val, options);
};


module.exports = function (str, options) {

    options = options || {};
    options.delimiter = typeof options.delimiter === 'string' || Utils.isRegExp(options.delimiter) ? options.delimiter : internals.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : internals.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : internals.arrayLimit;
    options.parseArrays = options.parseArrays !== false;
    options.allowDots = typeof options.allowDots === 'boolean' ? options.allowDots : internals.allowDots;
    options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : internals.plainObjects;
    options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : internals.allowPrototypes;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : internals.parameterLimit;
    options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : internals.strictNullHandling;

    if (str === '' ||
        str === null ||
        typeof str === 'undefined') {

        return options.plainObjects ? Object.create(null) : {};
    }

    var tempObj = typeof str === 'string' ? internals.parseValues(str, options) : str;
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0, il = keys.length; i < il; ++i) {
        var key = keys[i];
        var newObj = internals.parseKeys(key, tempObj[key], options);
        obj = Utils.merge(obj, newObj, options);
    }

    return Utils.compact(obj);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/kadira:flow-router/client/modules.js");
require("/node_modules/meteor/kadira:flow-router/client/triggers.js");
require("/node_modules/meteor/kadira:flow-router/client/router.js");
require("/node_modules/meteor/kadira:flow-router/client/group.js");
require("/node_modules/meteor/kadira:flow-router/client/route.js");
require("/node_modules/meteor/kadira:flow-router/client/_init.js");
require("/node_modules/meteor/kadira:flow-router/lib/router.js");

/* Exports */
Package._define("kadira:flow-router", {
  FlowRouter: FlowRouter
});

})();
