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
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var ReactiveDict = Package['reactive-dict'].ReactiveDict;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var EJSON = Package.ejson.EJSON;
var check = Package.check.check;
var Match = Package.check.Match;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Symbol = Package['ecmascript-runtime-client'].Symbol;
var Map = Package['ecmascript-runtime-client'].Map;
var Set = Package['ecmascript-runtime-client'].Set;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:flow-router-extra":{"client":{"_init.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_flow-router-extra/client/_init.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  FlowRouter: function () {
    return FlowRouter;
  },
  Router: function () {
    return Router;
  },
  Route: function () {
    return Route;
  },
  Group: function () {
    return Group;
  },
  Triggers: function () {
    return Triggers;
  },
  BlazeRenderer: function () {
    return BlazeRenderer;
  },
  RouterHelpers: function () {
    return RouterHelpers;
  }
});
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var Router;
module.link("./router.js", {
  "default": function (v) {
    Router = v;
  }
}, 1);
var Route;
module.link("./route.js", {
  "default": function (v) {
    Route = v;
  }
}, 2);
var Group;
module.link("./group.js", {
  "default": function (v) {
    Group = v;
  }
}, 3);
var Triggers;
module.link("./triggers.js", {
  "default": function (v) {
    Triggers = v;
  }
}, 4);
var BlazeRenderer;
module.link("./renderer.js", {
  "default": function (v) {
    BlazeRenderer = v;
  }
}, 5);
var helpersInit;
module.link("./active.route.js", {
  "default": function (v) {
    helpersInit = v;
  }
}, 6);

var _helpers;

module.link("./../lib/_helpers.js", {
  _helpers: function (v) {
    _helpers = v;
  }
}, 7);
var requestAnimFrame;
module.link("./modules.js", {
  requestAnimFrame: function (v) {
    requestAnimFrame = v;
  }
}, 8);

if (Package['zimme:active-route']) {
  Meteor._debug('Please remove `zimme:active-route` package, as its features is build into flow-router-extra, and will interfere.');

  Meteor._debug('meteor remove zimme:active-route');
}

if (Package['arillo:flow-router-helpers']) {
  Meteor._debug('Please remove `arillo:flow-router-helpers` package, as its features is build into flow-router-extra, and will interfere.');

  Meteor._debug('meteor remove arillo:flow-router-helpers');
}

if (Package['meteorhacks:inject-data']) {
  Meteor._debug('`meteorhacks:inject-data` is deprecated, please remove it and install its successor - `staringatlights:inject-data`');

  Meteor._debug('meteor remove meteorhacks:inject-data');

  Meteor._debug('meteor add staringatlights:inject-data');
}

if (Package['meteorhacks:fast-render']) {
  Meteor._debug('`meteorhacks:fast-render` is deprecated, please remove it and install its successor - `staringatlights:fast-render`');

  Meteor._debug('meteor remove meteorhacks:fast-render');

  Meteor._debug('meteor add staringatlights:fast-render');
}

var FlowRouter = new Router();
FlowRouter.Router = Router;
FlowRouter.Route = Route; // Initialize FlowRouter

Meteor.startup(function () {
  if (!FlowRouter._askedToWait && !FlowRouter._initialized) {
    FlowRouter.initialize();
    FlowRouter.route('/___refresh/:layout/:template/:oldRoute?', {
      name: '___refresh',
      action: function (params, queryParams) {
        this.render(params.layout, params.template, function () {
          requestAnimFrame(function () {
            if (params.oldRoute) {
              try {
                if (history.length) {
                  window.history.go(-1);
                } else {
                  FlowRouter.go(params.oldRoute, queryParams.oldParams ? JSON.parse(queryParams.oldParams) : {});
                }
              } catch (e) {
                FlowRouter.go('/');
              }
            } else {
              if (history.length) {
                window.history.go(-1);
              } else {
                FlowRouter.go('/');
              }
            }
          });
        });
      }
    });

    FlowRouter.refresh = function (layout, template) {
      if (!layout || !_helpers.isString(layout)) {
        throw new Meteor.Error(400, '[FlowRouter.refresh(layout, template)] -> "layout" must be a String!');
      }

      if (!template || !_helpers.isString(template)) {
        throw new Meteor.Error(400, '[FlowRouter.refresh(layout, template)] -> "template" must be a String!');
      }

      FlowRouter.go('___refresh', {
        oldRoute: FlowRouter._current.route.name,
        layout: layout,
        template: template
      }, {
        oldParams: JSON.stringify(FlowRouter._current.params || {})
      });
    };
  }
});
var RouterHelpers = helpersInit(FlowRouter);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"active.route.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_flow-router-extra/client/active.route.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);

var _helpers;

module.link("./../lib/_helpers.js", {
  _helpers: function (v) {
    _helpers = v;
  }
}, 1);
var check, Match;
module.link("meteor/check", {
  check: function (v) {
    check = v;
  },
  Match: function (v) {
    Match = v;
  }
}, 2);
var ReactiveDict;
module.link("meteor/reactive-dict", {
  ReactiveDict: function (v) {
    ReactiveDict = v;
  }
}, 3);
var Template;

if (Package.templating) {
  Template = Package.templating.Template;
}

var init = function (FlowRouter) {
  // Active Route
  // https://github.com/meteor-activeroute/legacy
  // zimme:active-route
  // License (MIT License): https://github.com/meteor-activeroute/legacy/blob/master/LICENSE.md
  // Lib
  var errorMessages = {
    noSupportedRouter: 'No supported router installed. Please install flow-router.',
    invalidRouteNameArgument: 'Invalid argument, must be String or RegExp.',
    invalidRouteParamsArgument: 'Invalid argument, must be Object.'
  };

  var checkRouteOrPath = function (arg) {
    try {
      return check(arg, Match.OneOf(RegExp, String));
    } catch (e) {
      throw new Error(errorMessages.invalidRouteNameArgument);
    }
  };

  var checkParams = function (arg) {
    try {
      return check(arg, Object);
    } catch (e) {
      throw new Error(errorMessages.invalidRouteParamsArgument);
    }
  };

  var config = new ReactiveDict('activeRouteConfig');
  config.setDefault({
    activeClass: 'active',
    caseSensitive: true,
    disabledClass: 'disabled'
  });

  var test = function (_value, _pattern) {
    var value = _value;
    var pattern = _pattern;

    if (!value) {
      return false;
    }

    if (Match.test(pattern, RegExp)) {
      return value.search(pattern) > -1;
    }

    if (Match.test(pattern, String)) {
      if (config.equals('caseSensitive', false)) {
        value = value.toLowerCase();
        pattern = pattern.toLowerCase();
      }

      return value === pattern;
    }

    return false;
  };

  var ActiveRoute = {
    config: function () {
      return this.configure.apply(this, arguments);
    },
    configure: function (options) {
      if (!Meteor.isServer) {
        config.set(options);
      }
    },
    name: function (routeName) {
      var routeParams = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (Meteor.isServer) {
        return void 0;
      }

      checkRouteOrPath(routeName);
      checkParams(routeParams);
      var currentPath;
      var currentRouteName;
      var path;

      if (!_helpers.isEmpty(routeParams) && Match.test(routeName, String)) {
        FlowRouter.watchPathChange();
        currentPath = FlowRouter.current().path;
        path = FlowRouter.path(routeName, routeParams);
      } else {
        currentRouteName = FlowRouter.getRouteName();
      }

      return test(currentPath || currentRouteName, path || routeName);
    },
    path: function (path) {
      if (Meteor.isServer) {
        return void 0;
      }

      checkRouteOrPath(path);
      FlowRouter.watchPathChange();
      return test(FlowRouter.current().path, path);
    }
  }; // Client

  var isActive = function (type) {
    var inverse = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var helperName;
    helperName = 'is';

    if (inverse) {
      helperName += 'Not';
    }

    helperName += 'Active' + type;
    return function () {
      var _options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var _attributes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var options = _helpers.isObject(_options) ? _options.hash || _options : _options;
      var attributes = _helpers.isObject(_attributes) ? _attributes.hash || _attributes : _attributes;

      if (Match.test(options, String)) {
        if (config.equals('regex', true)) {
          options = {
            regex: options
          };
        } else if (type === 'Path') {
          options = {
            path: options
          };
        } else {
          options = {
            name: options
          };
        }
      }

      options = _helpers.extend(options, attributes);
      var pattern = Match.ObjectIncluding({
        "class": Match.Optional(String),
        className: Match.Optional(String),
        regex: Match.Optional(Match.OneOf(RegExp, String)),
        name: Match.Optional(String),
        path: Match.Optional(String)
      });
      check(options, pattern);
      var regex = options.regex;
      var name = options.name;
      var path = options.path;
      var className = options.class ? options.class : options.className;

      if (type === 'Path') {
        name = null;
      } else {
        path = null;
      }

      if (!(regex || name || path)) {
        var t = (type === 'Route' ? 'name' : type).toLowerCase();

        Meteor._debug('Invalid argument, ' + helperName + ' takes "' + t + '", ' + (t + '="' + t + '" or regex="regex"'));

        return false;
      }

      if (Match.test(regex, String)) {
        if (config.equals('caseSensitive', false)) {
          regex = new RegExp(regex, 'i');
        } else {
          regex = new RegExp(regex);
        }
      }

      if (!_helpers.isRegExp(regex)) {
        regex = name || path;
      }

      if (inverse) {
        if (!_helpers.isString(className)) {
          className = config.get('disabledClass');
        }
      } else {
        if (!_helpers.isString(className)) {
          className = config.get('activeClass');
        }
      }

      var isPath;
      var result;

      if (type === 'Path') {
        isPath = true;
      }

      if (isPath) {
        result = ActiveRoute.path(regex);
      } else {
        options = _helpers.extend(attributes.data, attributes);
        result = ActiveRoute.name(regex, _helpers.omit(options, ['class', 'className', 'data', 'regex', 'name', 'path']));
      }

      if (inverse) {
        result = !result;
      }

      if (result) {
        return className;
      }

      return false;
    };
  };

  var arHelpers = {
    isActiveRoute: isActive('Route'),
    isActivePath: isActive('Path'),
    isNotActiveRoute: isActive('Route', true),
    isNotActivePath: isActive('Path', true)
  }; // If blaze is in use, register global helpers

  if (Template) {
    var _arr = Object.entries(arHelpers);

    for (var _i = 0; _i < _arr.length; _i++) {
      var _ref = _arr[_i];

      var _ref2 = (0, _slicedToArray2.default)(_ref, 2);

      var name = _ref2[0];
      var helper = _ref2[1];
      Template.registerHelper(name, helper);
    }
  } // FlowRouter Helpers
  // arillo:flow-router-helpers
  // https://github.com/arillo/meteor-flow-router-helpers
  // License (MIT License): https://github.com/arillo/meteor-flow-router-helpers/blob/master/LICENCE


  var subsReady = function () {
    for (var _len = arguments.length, _subs = new Array(_len), _key = 0; _key < _len; _key++) {
      _subs[_key] = arguments[_key];
    }

    var subs = _subs.slice(0, -1);

    if (subs.length === 1) {
      return FlowRouter.subsReady();
    }

    return subs.filter(function (memo, sub) {
      if (_helpers.isString(sub)) {
        return memo && FlowRouter.subsReady(sub);
      }
    }, true);
  };

  var pathFor = function (_path) {
    var _view = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      hash: {}
    };

    var path = _path;
    var view = _view;

    if (!path) {
      throw new Error('no path defined');
    }

    if (!view.hash) {
      view = {
        hash: view
      };
    }

    if (path.hash && path.hash.route) {
      view = path;
      path = view.hash.route;
      delete view.hash.route;
    }

    var query = view.hash.query ? FlowRouter._qs.parse(view.hash.query) : {};
    var hashBang = view.hash.hash ? view.hash.hash : '';
    return FlowRouter.path(path, view.hash, query) + (hashBang ? '#' + hashBang : '');
  };

  var urlFor = function (path, view) {
    return Meteor.absoluteUrl(pathFor(path, view).substr(1));
  };

  var param = function (name) {
    return FlowRouter.getParam(name);
  };

  var queryParam = function (key) {
    return FlowRouter.getQueryParam(key);
  };

  var currentRouteName = function () {
    return FlowRouter.getRouteName();
  };

  var currentRouteOption = function (optionName) {
    return FlowRouter.current().route.options[optionName];
  };

  var isSubReady = function (sub) {
    if (sub) {
      return FlowRouter.subsReady(sub);
    }

    return FlowRouter.subsReady();
  };

  var frHelpers = {
    subsReady: subsReady,
    pathFor: pathFor,
    urlFor: urlFor,
    param: param,
    queryParam: queryParam,
    currentRouteName: currentRouteName,
    isSubReady: isSubReady,
    currentRouteOption: currentRouteOption
  };
  var FlowRouterHelpers;

  if (Meteor.isServer) {
    FlowRouterHelpers = {
      pathFor: pathFor,
      urlFor: urlFor
    };
  } else {
    FlowRouterHelpers = frHelpers; // If blaze is in use, register global helpers

    if (Template) {
      var _arr2 = Object.entries(frHelpers);

      for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
        var _ref3 = _arr2[_i2];

        var _ref4 = (0, _slicedToArray2.default)(_ref3, 2);

        var _name = _ref4[0];
        var _helper = _ref4[1];
        Template.registerHelper(_name, _helper);
      }
    }
  }

  return Object.assign({}, ActiveRoute, FlowRouterHelpers);
};

module.exportDefault(init);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"group.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_flow-router-extra/client/group.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _helpers;

module.link("./../lib/_helpers.js", {
  _helpers: function (v) {
    _helpers = v;
  }
}, 0);

var makeTrigger = function (trigger) {
  if (_helpers.isFunction(trigger)) {
    return [trigger];
  } else if (!_helpers.isArray(trigger)) {
    return [];
  }

  return trigger;
};

var makeWaitFor = function (func) {
  if (_helpers.isFunction(func)) {
    return [func];
  }

  return [];
};

var makeTriggers = function (_base, _triggers) {
  if (!_base && !_triggers) {
    return [];
  }

  return makeTrigger(_base).concat(makeTrigger(_triggers));
};

var Group =
/*#__PURE__*/
function () {
  function Group(router) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var parent = arguments.length > 2 ? arguments[2] : undefined;

    if (options.prefix && !/^\//.test(options.prefix)) {
      throw new Error('group\'s prefix must start with "/"');
    }

    this._waitFor = makeWaitFor(options.waitOn);
    this._router = router;
    this.prefix = options.prefix || '';
    this.name = options.name;
    this.options = options;
    this._triggersEnter = makeTriggers(options.triggersEnter, this._triggersEnter);
    this._triggersExit = makeTriggers(this._triggersExit, options.triggersExit);
    this._subscriptions = options.subscriptions || Function.prototype;
    this.parent = parent;

    if (this.parent) {
      this.prefix = parent.prefix + this.prefix;
      this._triggersEnter = makeTriggers(parent._triggersEnter, this._triggersEnter);
      this._triggersExit = makeTriggers(this._triggersExit, parent._triggersExit);
      this._waitFor = this.parent._waitFor.concat(this._waitFor);
    }
  }

  var _proto = Group.prototype;

  _proto.route = function () {
    function route(_pathDef) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var _group = arguments.length > 2 ? arguments[2] : undefined;

      if (!/^\//.test(_pathDef)) {
        throw new Error('route\'s path must start with "/"');
      }

      var group = _group || this;
      var pathDef = this.prefix + _pathDef;
      options.triggersEnter = makeTriggers(this._triggersEnter, options.triggersEnter);
      options.triggersExit = makeTriggers(options.triggersExit, this._triggersExit);
      options.waitFor = this._waitFor.concat([]);
      return this._router.route(pathDef, _helpers.extend(_helpers.omit(this.options, ['triggersEnter', 'triggersExit', 'subscriptions', 'prefix', 'waitOn', 'name', 'title', 'titlePrefix', 'link', 'script', 'meta']), options), group);
    }

    return route;
  }();

  _proto.group = function () {
    function group(options) {
      return new Group(this._router, options, this);
    }

    return group;
  }();

  _proto.callSubscriptions = function () {
    function callSubscriptions(current) {
      if (this.parent) {
        this.parent.callSubscriptions(current);
      }

      this._subscriptions.call(current.route, current.params, current.queryParams);
    }

    return callSubscriptions;
  }();

  return Group;
}();

module.exportDefault(Group);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"modules.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_flow-router-extra/client/modules.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  page: function () {
    return page;
  },
  qs: function () {
    return qs;
  },
  requestAnimFrame: function () {
    return requestAnimFrame;
  }
});
var page;
module.link("page", {
  "default": function (v) {
    page = v;
  }
}, 0);
var qs;
module.link("qs", {
  "default": function (v) {
    qs = v;
  }
}, 1);

var requestAnimFrame = function () {
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
    setTimeout(callback, 1000 / 60);
  };
}();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"renderer.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_flow-router-extra/client/renderer.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);

var _helpers;

module.link("./../lib/_helpers.js", {
  _helpers: function (v) {
    _helpers = v;
  }
}, 1);
var requestAnimFrame;
module.link("./modules.js", {
  requestAnimFrame: function (v) {
    requestAnimFrame = v;
  }
}, 2);
var Blaze;
var Template;

if (Package.templating && Package.blaze) {
  Blaze = Package.blaze.Blaze;
  Template = Package.templating.Template;
}

var _BlazeRemove = function (view) {
  try {
    Blaze.remove(view);
  } catch (_e) {
    try {
      Blaze._destroyView(view);

      view._domrange.destroy();
    } catch (__e) {
      view._domrange.destroy();
    }
  }
};

var BlazeRenderer =
/*#__PURE__*/
function () {
  function BlazeRenderer() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    if (!Blaze || !Template) {
      return;
    }

    this.rootElement = opts.rootElement || function () {
      return document.body;
    };

    var self = this;
    this.isRendering = false;
    this.queue = [];
    this.yield = null;
    this.cache = {};
    this.old = this.newState();
    this.old.materialized = true;
    this.inMemoryRendering = opts.inMemoryRendering || false;

    this.getMemoryElement = opts.getMemoryElement || function () {
      return document.createElement('div');
    };

    if (!this.getMemoryElement || !_helpers.isFunction(this.getMemoryElement)) {
      throw new Meteor.Error(400, '{getMemoryElement} must be a function, which returns new DOM element');
    }

    if (!this.rootElement || !_helpers.isFunction(this.rootElement)) {
      throw new Meteor.Error(400, 'You must pass function into BlazeRenderer constructor, which returns DOM element');
    }

    Template.yield = new Template('yield', function () {});
    Template.yield.onCreated(function () {
      self.yield = this;
    });
    Template.yield.onRendered(function () {
      self.yield = this;
      self.materialize(self.old);
    });
    Template.yield.onDestroyed(function () {
      if (self.old.template.view) {
        _BlazeRemove(self.old.template.view);

        self.old.template.view = null;
        self.old.materialized = false;
      }

      self.yield = null;
    });
  }

  var _proto = BlazeRenderer.prototype;

  _proto.render = function () {
    function render(__layout) {
      var __template = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      var __data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var __callback = arguments.length > 3 ? arguments[3] : undefined;

      if (!Blaze || !Template) {
        throw new Meteor.Error(400, '`.render()` - Requires `blaze` and `templating`, or `blaze-html-templates` packages to be installed');
      }

      if (!__layout) {
        throw new Meteor.Error(400, '`.render()` - Requires at least one argument');
      } else if (!_helpers.isString(__layout) && !(__layout instanceof Blaze.Template)) {
        throw new Meteor.Error(400, '`.render()` - First argument must be a String or instance of Blaze.Template');
      }

      this.queue.push([__layout, __template, __data, __callback]);
      this.startQueue();
    }

    return render;
  }();

  _proto.startQueue = function () {
    function startQueue() {
      if (this.queue.length) {
        if (!this.isRendering) {
          this.isRendering = true;
          var task = this.queue.shift();
          this.proceed.apply(this, task);

          if (this.queue.length) {
            requestAnimFrame(this.startQueue.bind(this));
          }
        } else {
          requestAnimFrame(this.startQueue.bind(this));
        }
      }
    }

    return startQueue;
  }();

  _proto.proceed = function () {
    function proceed(__layout) {
      var __template = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      var __data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var __callback = arguments.length > 3 ? arguments[3] : undefined;

      if (!Blaze || !Template) {
        return;
      }

      var data = __data;
      var layout = __layout;
      var _layout = false;
      var template = __template;
      var _template = false;

      var callback = __callback || function () {};

      if (_helpers.isString(layout)) {
        _layout = typeof Template !== 'undefined' && Template !== null ? Template[layout] : void 0;
      } else if (layout instanceof Blaze.Template) {
        _layout = layout;
        layout = layout.viewName.replace('Template.', '');
      } else {
        layout = false;
      }

      if (_helpers.isString(template)) {
        _template = typeof Template !== 'undefined' && Template !== null ? Template[template] : void 0;
      } else if (template instanceof Blaze.Template) {
        _template = template;
        template = template.viewName.replace('Template.', '');
      } else if (_helpers.isObject(template)) {
        data = template;
        template = false;
      } else if (_helpers.isFunction(template)) {
        callback = template;
        template = false;
      } else {
        template = false;
      }

      if (_helpers.isFunction(data)) {
        callback = data;
        data = {};
      } else if (!_helpers.isObject(data)) {
        data = {};
      }

      if (!_helpers.isFunction(callback)) {
        callback = function () {};
      }

      if (!_layout) {
        this.old.materialized = true;
        this.isRendering = false;
        throw new Meteor.Error(404, 'No such layout: ' + layout);
      }

      var current = this.newState(layout, template);
      current.data = data;
      current.callback = callback;
      var updateTemplate = true;

      if (this.old.template.name !== template) {
        current.template.name = template;
        current.template.blaze = _template;
        this.newElement('template', current);

        if (this.old.template.view) {
          _BlazeRemove(this.old.template.view);

          this.old.template.view = null;
          this.old.materialized = false;
        }

        updateTemplate = false;
      } else {
        current.template = this.old.template;
      }

      if (this.old.layout.name !== layout) {
        current.layout.name = layout;
        current.layout.blaze = _layout;
        current.template.name = template;
        current.template.blaze = _template;
        this.newElement('layout', current);

        if (this.old.layout.view) {
          _BlazeRemove(this.old.layout.view);

          this.old.layout.view = null;
        }

        this._render(current);
      } else if (template) {
        current.layout = this.old.layout;
        current.template.name = template;
        current.template.blaze = _template;

        this._load(updateTemplate, true, current);
      } else {
        current.layout = this.old.layout;
        this.isRendering = false;
        current.materialized = true;
        current.callback();

        current.callback = function () {};
      }

      this.old = current;
    }

    return proceed;
  }();

  _proto._render = function () {
    function _render(current) {
      var _this = this;

      if (!Blaze || !Template) {
        return;
      }

      var getData = function () {
        return current.data;
      };

      var rootElement = this.rootElement();

      if (!rootElement) {
        throw new Meteor.Error(400, 'BlazeRenderer can\'t find root element!');
      }

      if (this.inMemoryRendering) {
        current.layout.view = Blaze.renderWithData(current.layout.blaze, getData, current.layout.element);
        requestAnimFrame(function () {
          rootElement.appendChild(current.layout.element);

          _this._load(false, false, current);
        });
      } else {
        current.layout.view = Blaze.renderWithData(current.layout.blaze, getData, rootElement);

        this._load(false, false, current);
      }
    }

    return _render;
  }();

  _proto._load = function () {
    function _load(updateTemplate, updateLayout, current) {
      if (updateLayout && current.layout.view) {
        current.layout.view.dataVar.set(current.data);
      }

      if (current.template.view && updateTemplate) {
        current.template.view.dataVar.set(current.data);
        this.isRendering = false;
        current.materialized = true;
        current.callback();

        current.callback = function () {};
      } else if (!current.template.name) {
        this.isRendering = false;
        current.materialized = true;
        current.callback();

        current.callback = function () {};
      } else if (current.template.name && !this.yield) {
        this.isRendering = false;
        current.materialized = false;
        current.callback();

        current.callback = function () {};
      } else if (current.template.name && this.yield) {
        this.materialize(current);
      }
    }

    return _load;
  }();

  _proto.newElement = function () {
    function newElement(type, current) {
      if (!this.inMemoryRendering) {
        return;
      }

      current[type].parent = current[type].parent ? current[type].parent : document.createElement('div');

      if (!current[type].element) {
        current[type].element = this.getMemoryElement();
        current[type].parent.appendChild(current[type].element);
        current[type].element._parentElement = current[type].parent;
      }
    }

    return newElement;
  }();

  _proto.newState = function () {
    function newState() {
      var layout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var template = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var base = {
        materialized: false,
        data: null,
        callback: function () {},
        layout: {
          view: null,
          name: '',
          blaze: null,
          parent: null,
          element: null
        },
        template: {
          view: null,
          name: '',
          blaze: null,
          parent: null,
          element: null
        }
      };

      if (!this.inMemoryRendering || !layout && !template) {
        return base;
      }

      if (layout && this.cache[layout]) {
        base.layout = this.cache[layout];
      }

      if (template && this.cache[template]) {
        base.template = this.cache[template];
      }

      this.cache[template] = base;
      return base;
    }

    return newState;
  }();

  _proto.materialize = function () {
    function materialize(current) {
      if (!Blaze || !Template) {
        return;
      }

      if (current.template.name && !current.materialized) {
        var getData = function () {
          return current.data;
        };

        if (!this.yield) {
          current.materialized = false;
          return;
        }

        current.materialized = true;

        if (this.inMemoryRendering) {
          current.template.view = Blaze.renderWithData(current.template.blaze, getData, current.template.element, this.yield.view);

          if (this.yield) {
            this.yield.view._domrange.parentElement.appendChild(current.template.element);

            this.isRendering = false;
            current.materialized = true;
            current.callback();

            current.callback = function () {};
          } else {
            current.materialized = false;
          }
        } else {
          if (this.yield) {
            current.template.view = Blaze.renderWithData(current.template.blaze, getData, this.yield.view._domrange.parentElement, this.yield.view);
            this.isRendering = false;
            current.materialized = true;
            current.callback();

            current.callback = function () {};
          } else {
            current.materialized = false;
          }
        }
      }
    }

    return materialize;
  }();

  return BlazeRenderer;
}();

module.exportDefault(BlazeRenderer);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"route.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_flow-router-extra/client/route.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var Router;
module.link("./_init.js", {
  Router: function (v) {
    Router = v;
  }
}, 0);
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 1);
var Promise;
module.link("meteor/promise", {
  Promise: function (v) {
    Promise = v;
  }
}, 2);
var Tracker;
module.link("meteor/tracker", {
  Tracker: function (v) {
    Tracker = v;
  }
}, 3);

var _helpers;

module.link("./../lib/_helpers.js", {
  _helpers: function (v) {
    _helpers = v;
  }
}, 4);
var ReactiveDict;
module.link("meteor/reactive-dict", {
  ReactiveDict: function (v) {
    ReactiveDict = v;
  }
}, 5);

var makeTriggers = function (triggers) {
  if (_helpers.isFunction(triggers)) {
    return [triggers];
  } else if (!_helpers.isArray(triggers)) {
    return [];
  }

  return triggers;
};

var Route =
/*#__PURE__*/
function () {
  function Route() {
    var router = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Router();
    var pathDef = arguments.length > 1 ? arguments[1] : undefined;
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var group = arguments.length > 3 ? arguments[3] : undefined;
    this.render = router.Renderer.render.bind(router.Renderer);
    this.options = options;
    this.globals = router.globals;
    this.pathDef = pathDef; // Route.path is deprecated and will be removed in 3.0

    this.path = pathDef;
    this.conf = options.conf || {};
    this.group = group;
    this._data = options.data || null;
    this._router = router;
    this._action = options.action || Function.prototype;
    this._waitOn = options.waitOn || null;
    this._waitFor = _helpers.isArray(options.waitFor) ? options.waitFor : [];
    this._subsMap = {};
    this._onNoData = options.onNoData || null;
    this._endWaiting = options.endWaiting || null;
    this._currentData = null;
    this._triggersExit = options.triggersExit ? makeTriggers(options.triggersExit) : [];
    this._whileWaiting = options.whileWaiting || null;
    this._triggersEnter = options.triggersEnter ? makeTriggers(options.triggersEnter) : [];
    this._subscriptions = options.subscriptions || Function.prototype;
    this._waitOnResources = options.waitOnResources || null;
    this._params = new ReactiveDict();
    this._queryParams = new ReactiveDict();
    this._routeCloseDep = new Tracker.Dependency();
    this._pathChangeDep = new Tracker.Dependency();

    if (options.name) {
      this.name = options.name;
    }
  }

  var _proto = Route.prototype;

  _proto.clearSubscriptions = function () {
    function clearSubscriptions() {
      this._subsMap = {};
    }

    return clearSubscriptions;
  }();

  _proto.register = function () {
    function register(name, sub) {
      this._subsMap[name] = sub;
    }

    return register;
  }();

  _proto.getSubscription = function () {
    function getSubscription(name) {
      return this._subsMap[name];
    }

    return getSubscription;
  }();

  _proto.getAllSubscriptions = function () {
    function getAllSubscriptions() {
      return this._subsMap;
    }

    return getAllSubscriptions;
  }();

  _proto.checkSubscriptions = function () {
    function checkSubscriptions(subscriptions) {
      var results = [];

      for (var i = 0; i < subscriptions.length; i++) {
        results.push(subscriptions[i] && subscriptions[i].ready ? subscriptions[i].ready() : false);
      }

      return !results.includes(false);
    }

    return checkSubscriptions;
  }();

  _proto.waitOn = function () {
    function waitOn() {
      var _this = this;

      var current = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var next = arguments.length > 1 ? arguments[1] : undefined;
      var _data = null;
      var _isWaiting = false;
      var _preloaded = 0;
      var _resources = false;
      var waitFor = [];
      var promises = [];
      var subscriptions = [];
      var timer;
      var trackers = [];

      var placeIn = function (d) {
        if (Object.prototype.toString.call(d) === '[object Promise]' || d.then && Object.prototype.toString.call(d.then) === '[object Function]') {
          promises.push(d);
        } else if (d.flush) {
          trackers.push(d);
        } else if (d.ready) {
          subscriptions.push(d);
        }
      };

      var whileWaitingAction = function () {
        if (!_isWaiting) {
          _this._whileWaiting && _this._whileWaiting(current.params, current.queryParams);
          _isWaiting = true;
        }
      };

      var subWait = function (delay) {
        timer = Meteor.setTimeout(function () {
          if (_this.checkSubscriptions(subscriptions)) {
            Meteor.clearTimeout(timer);
            _data = getData();

            if (_resources) {
              whileWaitingAction();
              getResources();
            } else {
              next(current, _data);
            }
          } else {
            wait(25);
          }
        }, delay);
      };

      var wait = function (delay) {
        if (promises.length) {
          Promise.all(promises).then(function () {
            subWait(delay);
            promises = [];
          }).catch(function (error) {
            Meteor._debug('[ostrio:flow-router-extra] [route.wait] Promise not resolved', error);
          });
        } else {
          subWait(delay);
        }
      };

      var processSubData = function (subData) {
        if (subData instanceof Array) {
          for (var i = subData.length - 1; i >= 0; i--) {
            if (subData[i] !== null && (0, _typeof2.default)(subData[i]) === 'object') {
              placeIn(subData[i]);
            }
          }
        } else if (subData !== null && (0, _typeof2.default)(subData) === 'object') {
          placeIn(subData);
        }
      };

      var stopSubs = function () {
        for (var i = subscriptions.length - 1; i >= 0; i--) {
          if (subscriptions[i].stop) {
            subscriptions[i].stop();
          }

          delete subscriptions[i];
        }

        subscriptions = [];
      };

      var done = function (subscription) {
        processSubData(_helpers.isFunction(subscription) ? subscription() : subscription);
      };

      if (current.route.globals.length) {
        for (var i = 0; i < current.route.globals.length; i++) {
          if ((0, _typeof2.default)(current.route.globals[i]) === 'object') {
            if (current.route.globals[i].waitOnResources) {
              if (!_resources) {
                _resources = [];
              }

              _resources.push(current.route.globals[i].waitOnResources);
            }

            if (current.route.globals[i].waitOn && _helpers.isFunction(current.route.globals[i].waitOn)) {
              waitFor.unshift(current.route.globals[i].waitOn);
            }
          }
        }
      }

      if (this._waitOnResources) {
        if (!_resources) {
          _resources = [];
        }

        _resources.push(this._waitOnResources);
      }

      var preload = function (len, __data) {
        _preloaded++;

        if (_preloaded >= len) {
          next(current, __data);
        }
      };

      var getData = function () {
        if (_this._data) {
          if (!_data) {
            _data = _this._currentData = _this._data(current.params, current.queryParams);
          } else {
            _data = _this._currentData;
          }
        }

        return _data;
      };

      var getResources = function () {
        _data = getData();
        var len = 0;
        var items;
        var images = [];
        var other = [];

        for (var _i = _resources.length - 1; _i >= 0; _i--) {
          items = _resources[_i].call(_this, current.params, current.queryParams, _data);

          if (items) {
            if (items.images && items.images.length) {
              images = images.concat(items.images);
            }

            if (items.other && items.other.length) {
              other = other.concat(items.other);
            }
          }
        }

        if (other && other.length || images && images.length) {
          if (other && other.length && typeof XMLHttpRequest !== 'undefined') {
            other = other.filter(function (elem, index, self) {
              return index === self.indexOf(elem);
            });
            len += other.length;
            var prefetch = {};

            for (var k = other.length - 1; k >= 0; k--) {
              prefetch[k] = new XMLHttpRequest();

              prefetch[k].onload = function () {
                preload(len, _data);
              };

              prefetch[k].onerror = function () {
                preload(len, _data);
              };

              prefetch[k].open('GET', other[k]);
              prefetch[k].send(null);
            }
          }

          if (images && images.length) {
            images = images.filter(function (elem, index, self) {
              return index === self.indexOf(elem);
            });
            len += images.length;
            var imgs = {};

            for (var j = images.length - 1; j >= 0; j--) {
              imgs[j] = new Image();

              imgs[j].onload = function () {
                preload(len, _data);
              };

              imgs[j].onerror = function () {
                preload(len, _data);
              };

              imgs[j].src = images[j];
            }
          }
        } else {
          next(current, _data);
        }
      };

      if (this._waitFor.length) {
        waitFor = waitFor.concat(this._waitFor);
      }

      if (_helpers.isFunction(this._waitOn)) {
        waitFor.push(this._waitOn);
      }

      if (waitFor.length) {
        waitFor.forEach(function (wo) {
          processSubData(wo.call(_this, current.params, current.queryParams, done));
        });

        var triggerExitIndex = this._triggersExit.push(function () {
          stopSubs();

          for (var _i2 = trackers.length - 1; _i2 >= 0; _i2--) {
            if (trackers[_i2].stop) {
              trackers[_i2].stop();
            }

            delete trackers[_i2];
          }

          trackers = [];
          promises = [];
          subscriptions = [];
          _data = _this._currentData = null;

          _this._triggersExit.splice(triggerExitIndex - 1, 1);
        });

        whileWaitingAction();
        wait(0);
      } else if (_resources) {
        whileWaitingAction();
        getResources();
      } else if (this._data) {
        next(current, getData());
      } else {
        next(current);
      }
    }

    return waitOn;
  }();

  _proto.callAction = function () {
    function callAction(current) {
      if (this._data) {
        if (this._onNoData && !this._currentData) {
          this._endWaiting && this._endWaiting();

          this._onNoData(current.params, current.queryParams);
        } else {
          this._endWaiting && this._endWaiting();

          this._action(current.params, current.queryParams, this._currentData);
        }
      } else {
        this._endWaiting && this._endWaiting();

        this._action(current.params, current.queryParams, this._currentData);
      }
    }

    return callAction;
  }();

  _proto.callSubscriptions = function () {
    function callSubscriptions(current) {
      this.clearSubscriptions();

      if (this.group) {
        this.group.callSubscriptions(current);
      }

      this._subscriptions(current.params, current.queryParams);
    }

    return callSubscriptions;
  }();

  _proto.getRouteName = function () {
    function getRouteName() {
      this._routeCloseDep.depend();

      return this.name;
    }

    return getRouteName;
  }();

  _proto.getParam = function () {
    function getParam(key) {
      this._routeCloseDep.depend();

      return this._params.get(key);
    }

    return getParam;
  }();

  _proto.getQueryParam = function () {
    function getQueryParam(key) {
      this._routeCloseDep.depend();

      return this._queryParams.get(key);
    }

    return getQueryParam;
  }();

  _proto.watchPathChange = function () {
    function watchPathChange() {
      this._pathChangeDep.depend();
    }

    return watchPathChange;
  }();

  _proto.registerRouteClose = function () {
    function registerRouteClose() {
      this._params = new ReactiveDict();
      this._queryParams = new ReactiveDict();

      this._routeCloseDep.changed();

      this._pathChangeDep.changed();
    }

    return registerRouteClose;
  }();

  _proto.registerRouteChange = function () {
    function registerRouteChange(currentContext, routeChanging) {
      // register params
      this._updateReactiveDict(this._params, currentContext.params); // register query params


      this._updateReactiveDict(this._queryParams, currentContext.queryParams); // if the route is changing, we need to defer triggering path changing
      // if we did this, old route's path watchers will detect this
      // Real issue is, above watcher will get removed with the new route
      // So, we don't need to trigger it now
      // We are doing it on the route close event. So, if they exists they'll
      // get notify that


      if (!routeChanging) {
        this._pathChangeDep.changed();
      }
    }

    return registerRouteChange;
  }();

  _proto._updateReactiveDict = function () {
    function _updateReactiveDict(dict, newValues) {
      var currentKeys = Object.keys(newValues);
      var oldKeys = Object.keys(dict.keyDeps); // set new values
      //  params is an array. So, currentKeys.forEach() does not works
      //  to iterate params

      currentKeys.forEach(function (key) {
        dict.set(key, newValues[key]);
      }); // remove keys which does not exisits here

      oldKeys.filter(function (i) {
        return currentKeys.indexOf(i) < 0;
      }).forEach(function (key) {
        dict.set(key, undefined);
      });
    }

    return _updateReactiveDict;
  }();

  return Route;
}();

module.exportDefault(Route);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"router.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_flow-router-extra/client/router.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var FlowRouter, Route, Group, Triggers, BlazeRenderer;
module.link("./_init.js", {
  FlowRouter: function (v) {
    FlowRouter = v;
  },
  Route: function (v) {
    Route = v;
  },
  Group: function (v) {
    Group = v;
  },
  Triggers: function (v) {
    Triggers = v;
  },
  BlazeRenderer: function (v) {
    BlazeRenderer = v;
  }
}, 0);
var EJSON;
module.link("meteor/ejson", {
  EJSON: function (v) {
    EJSON = v;
  }
}, 1);
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 2);
var Tracker;
module.link("meteor/tracker", {
  Tracker: function (v) {
    Tracker = v;
  }
}, 3);

var _helpers;

module.link("./../lib/_helpers.js", {
  _helpers: function (v) {
    _helpers = v;
  }
}, 4);
var page, qs;
module.link("./modules.js", {
  page: function (v) {
    page = v;
  },
  qs: function (v) {
    qs = v;
  }
}, 5);

var Router =
/*#__PURE__*/
function () {
  function Router() {
    var _this = this;

    this.pathRegExp = /(:[\w\(\)\\\+\*\.\?\[\]\-]+)+/g;
    this.globals = [];
    this.subscriptions = Function.prototype;
    this.Renderer = new BlazeRenderer();
    this._tracker = this._buildTracker();
    this._current = {};
    this._specialChars = ['/', '%', '+'];

    this._encodeParam = function (param) {
      var paramArr = param.split('');
      var _param = '';

      for (var i = 0; i < paramArr.length; i++) {
        if (_this._specialChars.includes(paramArr[i])) {
          _param += encodeURIComponent(encodeURIComponent(paramArr[i]));
        } else {
          try {
            _param += encodeURIComponent(paramArr[i]);
          } catch (e) {
            _param += paramArr[i];
          }
        }
      }

      return _param;
    }; // tracks the current path change


    this._onEveryPath = new Tracker.Dependency();
    this._globalRoute = new Route(this); // holds onRoute callbacks

    this._onRouteCallbacks = []; // if _askedToWait is true. We don't automatically start the router
    // in Meteor.startup callback. (see client/_init.js)
    // Instead user need to call `.initialize()

    this._askedToWait = false;
    this._initialized = false;
    this._triggersEnter = [];
    this._triggersExit = [];
    this._routes = [];
    this._routesMap = {};

    this._updateCallbacks();

    this._notFound = null;
    this.notfound = this.notFound; // indicate it's okay (or not okay) to run the tracker
    // when doing subscriptions
    // using a number and increment it help us to support FlowRouter.go()
    // and legitimate reruns inside tracker on the same event loop.
    // this is a solution for #145

    this.safeToRun = 0; // Meteor exposes to the client the path prefix that was defined using the
    // ROOT_URL environement variable on the server using the global runtime
    // configuration. See #315.

    this._basePath = window.__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || ''; // this is a chain contains a list of old routes
    // most of the time, there is only one old route
    // but when it's the time for a trigger redirect we've a chain

    this._oldRouteChain = [];
    this.env = {
      replaceState: new Meteor.EnvironmentVariable(),
      reload: new Meteor.EnvironmentVariable(),
      trailingSlash: new Meteor.EnvironmentVariable()
    }; // Implementing Reactive APIs

    var reactiveApis = ['getParam', 'getQueryParam', 'getRouteName', 'watchPathChange'];
    reactiveApis.forEach(function (api) {
      _this[api] = function (arg1) {
        // when this is calling, there may not be any route initiated
        // so we need to handle it
        var currentRoute = this._current.route;

        if (!currentRoute) {
          this._onEveryPath.depend();

          return void 0;
        } // currently, there is only one argument. If we've more let's add more args
        // this is not clean code, but better in performance


        return currentRoute[api].call(currentRoute, arg1);
      };
    }); // redirect function used inside triggers

    this._redirectFn = function (pathDef, fields, queryParams) {
      if (/^http(s)?:\/\//.test(pathDef)) {
        throw new Error("Redirects to URLs outside of the app are not supported in this version of Flow Router. Use 'window.location = yourUrl' instead");
      }

      _this.withReplaceState(function () {
        _this._page.redirect(FlowRouter.path(pathDef, fields, queryParams));
      });
    };

    this._initTriggersAPI();
  }

  var _proto = Router.prototype;

  _proto.route = function () {
    function route(pathDef) {
      var _this2 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var group = arguments.length > 2 ? arguments[2] : undefined;

      if (!/^\//.test(pathDef) && pathDef !== '*') {
        throw new Error("route's path must start with '/'");
      }

      var route = new Route(this, pathDef, options, group); // calls when the page route being activates

      route._actionHandle = function (context) {
        var oldRoute = _this2._current.route;

        _this2._oldRouteChain.push(oldRoute); // _qs.parse() gives us a object without prototypes,
        // created with Object.create(null)
        // Meteor's check doesn't play nice with it.
        // So, we need to fix it by cloning it.
        // see more: https://github.com/meteorhacks/flow-router/issues/164


        var queryParams = _this2._qs.parse(context.querystring);

        _this2._current = {
          path: context.path,
          params: context.params,
          route: route,
          context: context,
          oldRoute: oldRoute,
          queryParams: queryParams
        }; // we need to invalidate if all the triggers have been completed
        // if not that means, we've been redirected to another path
        // then we don't need to invalidate

        var afterAllTriggersRan = function () {
          _this2._invalidateTracker();
        };

        route.waitOn(_this2._current, function (current, data) {
          Triggers.runTriggers(_this2._triggersEnter.concat(route._triggersEnter), _this2._current, _this2._redirectFn, afterAllTriggersRan, data);
        });
      }; // calls when you exit from the page js route


      route._exitHandle = function (context, next) {
        Triggers.runTriggers(_this2._triggersExit.concat(route._triggersExit), _this2._current, _this2._redirectFn, next);
      };

      this._routes.push(route);

      if (options.name) {
        this._routesMap[options.name] = route;
      }

      this._updateCallbacks();

      this._triggerRouteRegister(route);

      return route;
    }

    return route;
  }();

  _proto.group = function () {
    function group(options) {
      return new Group(this, options);
    }

    return group;
  }();

  _proto.path = function () {
    function path(_pathDef) {
      var _this3 = this;

      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var queryParams = arguments.length > 2 ? arguments[2] : undefined;
      var pathDef = _pathDef;

      if (this._routesMap[pathDef]) {
        pathDef = this._routesMap[pathDef].pathDef;
      }

      var path = ''; // Prefix the path with the router global prefix

      if (this._basePath) {
        path += "/" + this._basePath + "/";
      }

      path += pathDef.replace(this.pathRegExp, function (_key) {
        var firstRegexpChar = _key.indexOf('('); // get the content behind : and (\\d+/)


        var key = _key.substring(1, firstRegexpChar > 0 ? firstRegexpChar : undefined); // remove +?*


        key = key.replace(/[\+\*\?]+/g, ''); // this is to allow page js to keep the custom characters as it is
        // we need to encode 2 times otherwise "/" char does not work properly
        // So, in that case, when I includes "/" it will think it's a part of the
        // route. encoding 2times fixes it

        if (fields[key]) {
          return _this3._encodeParam("" + fields[key]);
        }

        return '';
      }); // Replace multiple slashes with single slash

      path = path.replace(/\/\/+/g, '/'); // remove trailing slash
      // but keep the root slash if it's the only one

      path = path.match(/^\/{1}$/) ? path : path.replace(/\/$/, ''); // explictly asked to add a trailing slash

      if (this.env.trailingSlash.get() && path[path.length - 1] !== '/') {
        path += '/';
      }

      var strQueryParams = this._qs.stringify(queryParams || {});

      if (strQueryParams) {
        path += "?" + strQueryParams;
      }

      path = path.replace(/\/\/+/g, '/');
      return path;
    }

    return path;
  }();

  _proto.go = function () {
    function go(pathDef, fields, queryParams) {
      var path = this.path(pathDef, fields, queryParams);

      if (!this.env.reload.get() && path === this._current.path) {
        return;
      }

      try {
        if (this.env.replaceState.get()) {
          this._page.replace(path);
        } else {
          this._page(path);
        }
      } catch (e) {
        Meteor._debug('Malformed URI!', path, e);
      }
    }

    return go;
  }();

  _proto.reload = function () {
    function reload() {
      var _this4 = this;

      this.env.reload.withValue(true, function () {
        _this4._page.replace(_this4._current.path);
      });
    }

    return reload;
  }();

  _proto.redirect = function () {
    function redirect(path) {
      this._page.redirect(path);
    }

    return redirect;
  }();

  _proto.setParams = function () {
    function setParams(newParams) {
      if (!this._current.route) {
        return false;
      }

      var pathDef = this._current.route.pathDef;
      var existingParams = this._current.params;
      var params = {};
      Object.keys(existingParams).forEach(function (key) {
        params[key] = existingParams[key];
      });
      params = _helpers.extend(params, newParams);
      var queryParams = this._current.queryParams;
      this.go(pathDef, params, queryParams);
      return true;
    }

    return setParams;
  }();

  _proto.setQueryParams = function () {
    function setQueryParams(newParams) {
      if (!this._current.route) {
        return false;
      }

      var queryParams = _helpers.extend(_helpers.clone(this._current.queryParams), newParams);

      for (var k in meteorBabelHelpers.sanitizeForInObject(queryParams)) {
        if (queryParams[k] === null || queryParams[k] === undefined) {
          delete queryParams[k];
        }
      }

      var pathDef = this._current.route.pathDef;
      var params = this._current.params;
      this.go(pathDef, params, queryParams);
      return true;
    }

    return setQueryParams;
  }(); // .current is not reactive
  // This is by design. use .getParam() instead
  // If you really need to watch the path change, use .watchPathChange()


  _proto.current = function () {
    function current() {
      // We can't trust outside, that's why we clone this
      // Anyway, we can't clone the whole object since it has non-jsonable values
      // That's why we clone what's really needed.
      var current = _helpers.clone(this._current);

      current.queryParams = EJSON.clone(current.queryParams);
      current.params = EJSON.clone(current.params);
      return current;
    }

    return current;
  }();

  _proto.track = function () {
    function track(reactiveMapper) {
      return function (props, onData, env) {
        var trackerCleanup = null;
        var handler = Tracker.nonreactive(function () {
          return Tracker.autorun(function () {
            trackerCleanup = reactiveMapper(props, onData, env);
          });
        });
        return function () {
          if (typeof trackerCleanup === 'function') {
            trackerCleanup();
          }

          return handler.stop();
        };
      };
    }

    return track;
  }();

  _proto.mapper = function () {
    function mapper(props, onData, env) {
      if (typeof onData === 'function') {
        onData(null, {
          route: this.current(),
          props: props,
          env: env
        });
      }
    }

    return mapper;
  }();

  _proto.trackMapper = function () {
    function trackMapper() {
      return this.track(this.mapper);
    }

    return trackMapper;
  }();

  _proto.subsReady = function () {
    function subsReady() {
      var callback = null;
      var args = Array.from(arguments);

      if (typeof args[args.length - 1] === 'function') {
        callback = args.pop();
      }

      var currentRoute = this.current().route;
      var globalRoute = this._globalRoute; // we need to depend for every route change and
      // rerun subscriptions to check the ready state

      this._onEveryPath.depend();

      if (!currentRoute) {
        return false;
      }

      var subscriptions;

      if (args.length === 0) {
        subscriptions = Object.values(globalRoute.getAllSubscriptions());
        subscriptions = subscriptions.concat(Object.values(currentRoute.getAllSubscriptions()));
      } else {
        subscriptions = args.map(function (subName) {
          return globalRoute.getSubscription(subName) || currentRoute.getSubscription(subName);
        });
      }

      var isReady = function () {
        var ready = subscriptions.every(function (sub) {
          return sub && sub.ready();
        });
        return ready;
      };

      if (callback) {
        Tracker.autorun(function (c) {
          if (isReady()) {
            callback();
            c.stop();
          }
        });
        return true;
      }

      return isReady();
    }

    return subsReady;
  }();

  _proto.withReplaceState = function () {
    function withReplaceState(fn) {
      return this.env.replaceState.withValue(true, fn);
    }

    return withReplaceState;
  }();

  _proto.withTrailingSlash = function () {
    function withTrailingSlash(fn) {
      return this.env.trailingSlash.withValue(true, fn);
    }

    return withTrailingSlash;
  }();

  _proto.initialize = function () {
    function initialize() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (this._initialized) {
        throw new Error('FlowRouter is already initialized');
      }

      var self = this;

      this._updateCallbacks(); // Implementing idempotent routing
      // by overriding page.js`s "show" method.
      // Why?
      // It is impossible to bypass exit triggers,
      // because they execute before the handler and
      // can not know what the next path is, inside exit trigger.
      //
      // we need override both show, replace to make this work
      // since we use redirect when we are talking about withReplaceState


      ['show', 'replace'].forEach(function (fnName) {
        var original = self._page[fnName];

        self._page[fnName] = function (path, state, dispatch, push) {
          if (!path || !self.env.reload.get() && self._current.path === path) {
            return;
          }

          original.call(this, path.replace(/\/\/+/g, '/'), state, dispatch, push);
        };
      }); // this is very ugly part of pagejs and it does decoding few times
      // in unpredicatable manner. See #168
      // this is the default behaviour and we need keep it like that
      // we are doing a hack. see .path()

      this._page.base(this._basePath);

      var pageOptions = Object.assign({
        hashbang: !!options.hashbang,
        decodeURLComponents: true
      }, options.page || {});

      this._page(pageOptions);

      this._initialized = true;
    }

    return initialize;
  }();

  _proto._buildTracker = function () {
    function _buildTracker() {
      var _this5 = this;

      // main autorun function
      var tracker = Tracker.autorun(function () {
        if (!_this5._current || !_this5._current.route) {
          return;
        } // see the definition of `this._processingContexts`


        var currentContext = _this5._current;
        var route = currentContext.route;
        var path = currentContext.path;

        if (_this5.safeToRun === 0) {
          throw new Error("You can't use reactive data sources like Session inside the `.subscriptions` method!");
        } // We need to run subscriptions inside a Tracker
        // to stop subs when switching between routes
        // But we don't need to run this tracker with
        // other reactive changes inside the .subscription method
        // We tackle this with the `safeToRun` variable


        _this5._globalRoute.clearSubscriptions();

        _this5.subscriptions.call(_this5._globalRoute, path);

        route.callSubscriptions(currentContext); // otherwise, computations inside action will trigger to re-run
        // this computation. which we do not need.

        Tracker.nonreactive(function () {
          var isRouteChange = currentContext.oldRoute !== currentContext.route; // first route is not a route change

          if (!currentContext.oldRoute) {
            isRouteChange = false;
          } // Clear oldRouteChain just before calling the action
          // We still need to get a copy of the oldestRoute first
          // It's very important to get the oldest route and registerRouteClose() it
          // See: https://github.com/kadirahq/flow-router/issues/314


          var oldestRoute = _this5._oldRouteChain[0];
          _this5._oldRouteChain = [];
          currentContext.route.registerRouteChange(currentContext, isRouteChange);
          route.callAction(currentContext);
          Tracker.afterFlush(function () {
            _this5._onEveryPath.changed();

            if (isRouteChange) {
              // We need to trigger that route (definition itself) has changed.
              // So, we need to re-run all the register callbacks to current route
              // This is pretty important, otherwise tracker
              // can't identify new route's items
              // We also need to afterFlush, otherwise this will re-run
              // helpers on templates which are marked for destroying
              if (oldestRoute && oldestRoute.registerRouteClose) {
                oldestRoute.registerRouteClose();
              }
            }
          });
        });
        _this5.safeToRun--;
      });
      return tracker;
    }

    return _buildTracker;
  }();

  _proto._invalidateTracker = function () {
    function _invalidateTracker() {
      var _this6 = this;

      this.safeToRun++;

      this._tracker.invalidate(); // After the invalidation we need to flush to make changes immediately
      // otherwise, we have face some issues context mix-matches and so on.
      // But there are some cases we can't flush. So we need to ready for that.
      // we clearly know, we can't flush inside an autorun
      // this may leads some issues on flow-routing
      // we may need to do some warning


      if (!Tracker.currentComputation) {
        // Still there are some cases where we can't flush
        //  eg:- when there is a flush currently
        // But we've no public API or hacks to get that state
        // So, this is the only solution
        try {
          Tracker.flush();
        } catch (ex) {
          // only handling "while flushing" errors
          if (!/Tracker\.flush while flushing/.test(ex.message)) {
            return;
          } // XXX: fix this with a proper solution by removing subscription mgt.
          // from the router. Then we don't need to run invalidate using a tracker
          // this happens when we are trying to invoke a route change
          // with inside a route change. (eg:- Template.onCreated)
          // Since we use page.js and tracker, we don't have much control
          // over this process.
          // only solution is to defer route execution.
          // It's possible to have more than one path want to defer
          // But, we only need to pick the last one.
          // self._nextPath = self._current.path;


          Meteor.defer(function () {
            var path = _this6._nextPath;

            if (!path) {
              return;
            }

            delete _this6._nextPath;

            _this6.env.reload.withValue(true, function () {
              _this6.go(path);
            });
          });
        }
      }
    }

    return _invalidateTracker;
  }();

  _proto._updateCallbacks = function () {
    function _updateCallbacks() {
      var _this7 = this;

      this._page.callbacks = [];
      this._page.exits = [];
      var catchAll = null;

      this._routes.forEach(function (route) {
        if (route.pathDef === '*') {
          catchAll = route;
        } else {
          _this7._page(route.pathDef, route._actionHandle);

          _this7._page.exit(route.pathDef, route._exitHandle);
        }
      }); // Setting exit triggers on catch all routes leads to weird behavior.
      // We recommend to avoid enter and exit triggers on catch all (`*`) routes.
      // Use FlowRouter.triggers.exit([func]) and FlowRouter.triggers.enter([func]) instead


      if (catchAll) {
        this._page(catchAll.pathDef, catchAll._actionHandle); // this._page.exit(catchAll.pathDef, catchAll._exitHandle);

      }
    }

    return _updateCallbacks;
  }();

  _proto._initTriggersAPI = function () {
    function _initTriggersAPI() {
      var self = this;
      this.triggers = {
        enter: function (_triggers, filter) {
          var triggers = Triggers.applyFilters(_triggers, filter);

          if (triggers.length) {
            self._triggersEnter = self._triggersEnter.concat(triggers);
          }
        },
        exit: function (_triggers, filter) {
          var triggers = Triggers.applyFilters(_triggers, filter);

          if (triggers.length) {
            self._triggersExit = self._triggersExit.concat(triggers);
          }
        }
      };
    }

    return _initTriggersAPI;
  }();

  _proto.wait = function () {
    function wait() {
      if (this._initialized) {
        throw new Error("can't wait after FlowRouter has been initialized");
      }

      this._askedToWait = true;
    }

    return wait;
  }();

  _proto.onRouteRegister = function () {
    function onRouteRegister(cb) {
      this._onRouteCallbacks.push(cb);
    }

    return onRouteRegister;
  }();

  _proto._triggerRouteRegister = function () {
    function _triggerRouteRegister(currentRoute) {
      // We should only need to send a safe set of fields on the route
      // object.
      // This is not to hide what's inside the route object, but to show
      // these are the public APIs
      var routePublicApi = _helpers.pick(currentRoute, ['name', 'pathDef', 'path']);

      routePublicApi.options = _helpers.omit(currentRoute.options, ['triggersEnter', 'triggersExit', 'action', 'subscriptions', 'name']);

      this._onRouteCallbacks.forEach(function (cb) {
        cb(routePublicApi);
      });
    }

    return _triggerRouteRegister;
  }();

  _proto.url = function () {
    function url() {
      // We need to remove the leading base path, or "/", as it will be inserted
      // automatically by `Meteor.absoluteUrl` as documented in:
      // http://docs.meteor.com/#/full/meteor_absoluteurl
      return Meteor.absoluteUrl(this.path.apply(this, arguments).replace(new RegExp('^' + ("/" + (this._basePath || '') + "/").replace(/\/\/+/g, '/')), ''));
    }

    return url;
  }();

  (0, _createClass2.default)(Router, [{
    key: "notFound",
    set: function (opts) {
      Meteor._debug('FlowRouter.notFound is deprecated, use FlowRouter.route(\'*\', { /*...*/ }) instead!');

      opts.name = opts.name || '__notFound';
      this._notFound = this.route('*', opts);
    },
    get: function () {
      return this._notFound;
    }
  }, {
    key: "_page",
    get: function () {
      return page;
    }
  }, {
    key: "_qs",
    get: function () {
      return qs;
    }
  }]);
  return Router;
}();

module.exportDefault(Router);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"triggers.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_flow-router-extra/client/triggers.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// a set of utility functions for triggers
var Triggers = {}; // Apply filters for a set of triggers
// @triggers - a set of triggers
// @filter - filter with array fields with `only` and `except`
//           support only either `only` or `except`, but not both

Triggers.applyFilters = function (_triggers, filter) {
  var triggers = _triggers;

  if (!(triggers instanceof Array)) {
    triggers = [triggers];
  }

  if (!filter) {
    return triggers;
  }

  if (filter.only && filter.except) {
    throw new Error('Triggers don\'t support only and except filters at once');
  }

  if (filter.only && !(filter.only instanceof Array)) {
    throw new Error('only filters needs to be an array');
  }

  if (filter.except && !(filter.except instanceof Array)) {
    throw new Error('except filters needs to be an array');
  }

  if (filter.only) {
    return Triggers.createRouteBoundTriggers(triggers, filter.only);
  }

  if (filter.except) {
    return Triggers.createRouteBoundTriggers(triggers, filter.except, true);
  }

  throw new Error('Provided a filter but not supported');
}; //  create triggers by bounding them to a set of route names
//  @triggers - a set of triggers
//  @names - list of route names to be bound (trigger runs only for these names)
//  @negate - negate the result (triggers won't run for above names)


Triggers.createRouteBoundTriggers = function (triggers, names, negate) {
  var namesMap = {};
  names.forEach(function (name) {
    namesMap[name] = true;
  });
  var filteredTriggers = triggers.map(function (originalTrigger) {
    var modifiedTrigger = function (context, next) {
      var matched = namesMap[context.route.name] ? 1 : -1;
      matched = negate ? matched * -1 : matched;

      if (matched === 1) {
        originalTrigger(context, next);
      }
    };

    return modifiedTrigger;
  });
  return filteredTriggers;
}; //  run triggers and abort if redirected or callback stopped
//  @triggers - a set of triggers
//  @context - context we need to pass (it must have the route)
//  @redirectFn - function which used to redirect
//  @after - called after if only all the triggers runs


Triggers.runTriggers = function (triggers, context, redirectFn, after, data) {
  var abort = false;
  var inCurrentLoop = true;
  var alreadyRedirected = false;

  var doRedirect = function (url, params, queryParams) {
    if (alreadyRedirected) {
      throw new Error('already redirected');
    }

    if (!inCurrentLoop) {
      throw new Error('redirect needs to be done in sync');
    }

    if (!url) {
      throw new Error('trigger redirect requires an URL');
    }

    abort = true;
    alreadyRedirected = true;
    redirectFn(url, params, queryParams);
  };

  var doStop = function () {
    abort = true;
  };

  for (var lc = 0; lc < triggers.length; lc++) {
    triggers[lc](context, doRedirect, doStop, data);

    if (abort) {
      return;
    }
  } // mark that, we've exceeds the currentEventloop for
  // this set of triggers.


  inCurrentLoop = false;
  after();
};

module.exportDefault(Triggers);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lib":{"_helpers.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_flow-router-extra/lib/_helpers.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

module.export({
  _helpers: function () {
    return _helpers;
  }
});
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var _helpers = {
  isEmpty: function (obj) {
    // 1
    if (obj == null) {
      return true;
    }

    if (this.isArray(obj) || this.isString(obj) || this.isArguments(obj)) {
      return obj.length === 0;
    }

    return Object.keys(obj).length === 0;
  },
  isObject: function (obj) {
    var type = (0, _typeof2.default)(obj);
    return type === 'function' || type === 'object' && !!obj;
  },
  omit: function (obj, keys) {
    // 10
    if (!this.isObject(obj)) {
      Meteor._debug('[ostrio:flow-router-extra] [_helpers.omit] First argument must be an Object');

      return obj;
    }

    if (!this.isArray(keys)) {
      Meteor._debug('[ostrio:flow-router-extra] [_helpers.omit] Second argument must be an Array');

      return obj;
    }

    var copy = this.clone(obj);
    keys.forEach(function (key) {
      delete copy[key];
    });
    return copy;
  },
  pick: function (obj, keys) {
    // 2
    if (!this.isObject(obj)) {
      Meteor._debug('[ostrio:flow-router-extra] [_helpers.omit] First argument must be an Object');

      return obj;
    }

    if (!this.isArray(keys)) {
      Meteor._debug('[ostrio:flow-router-extra] [_helpers.omit] Second argument must be an Array');

      return obj;
    }

    var picked = {};
    keys.forEach(function (key) {
      picked[key] = obj[key];
    });
    return picked;
  },
  isArray: function (obj) {
    return Array.isArray(obj);
  },
  extend: function () {
    for (var _len = arguments.length, objs = new Array(_len), _key = 0; _key < _len; _key++) {
      objs[_key] = arguments[_key];
    }

    // 4
    return Object.assign.apply(Object, [{}].concat(objs));
  },
  clone: function (obj) {
    if (!this.isObject(obj)) return obj;
    return this.isArray(obj) ? obj.slice() : this.extend(obj);
  }
};
['Arguments', 'Function', 'String', 'RegExp'].forEach(function (name) {
  _helpers['is' + name] = function (obj) {
    return Object.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"node_modules":{"page":{"package.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/page/package.json                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "page",
  "version": "1.9.0",
  "browser": "page.js",
  "main": "index.js"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"page.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/page/page.js                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.page = factory());
}(this, (function () { 'use strict';

var isarray = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

/**
 * Expose `pathToRegexp`.
 */
var pathToRegexp_1 = pathToRegexp;
var parse_1 = parse;
var compile_1 = compile;
var tokensToFunction_1 = tokensToFunction;
var tokensToRegExp_1 = tokensToRegExp;

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
].join('|'), 'g');

/**
 * Parse a string for the raw tokens.
 *
 * @param  {String} str
 * @return {Array}
 */
function parse (str) {
  var tokens = [];
  var key = 0;
  var index = 0;
  var path = '';
  var res;

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0];
    var escaped = res[1];
    var offset = res.index;
    path += str.slice(index, offset);
    index = offset + m.length;

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1];
      continue
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path);
      path = '';
    }

    var prefix = res[2];
    var name = res[3];
    var capture = res[4];
    var group = res[5];
    var suffix = res[6];
    var asterisk = res[7];

    var repeat = suffix === '+' || suffix === '*';
    var optional = suffix === '?' || suffix === '*';
    var delimiter = prefix || '/';
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: escapeGroup(pattern)
    });
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index);
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path);
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
  var matches = new Array(tokens.length);

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^' + tokens[i].pattern + '$');
    }
  }

  return function (obj) {
    var path = '';
    var data = obj || {};

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      if (typeof token === 'string') {
        path += token;

        continue
      }

      var value = data[token.name];
      var segment;

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
          segment = encodeURIComponent(value[j]);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment;
        }

        continue
      }

      segment = encodeURIComponent(value);

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment;
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
  re.keys = keys;
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
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      });
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
  var parts = [];

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source);
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

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
  var tokens = parse(path);
  var re = tokensToRegExp(tokens, options);

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i]);
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
  options = options || {};

  var strict = options.strict;
  var end = options.end !== false;
  var route = '';
  var lastToken = tokens[tokens.length - 1];
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];

    if (typeof token === 'string') {
      route += escapeString(token);
    } else {
      var prefix = escapeString(token.prefix);
      var capture = token.pattern;

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*';
      }

      if (token.optional) {
        if (prefix) {
          capture = '(?:' + prefix + '(' + capture + '))?';
        } else {
          capture = '(' + capture + ')?';
        }
      } else {
        capture = prefix + '(' + capture + ')';
      }

      route += capture;
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
  }

  if (end) {
    route += '$';
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)';
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
  keys = keys || [];

  if (!isarray(keys)) {
    options = keys;
    keys = [];
  } else if (!options) {
    options = {};
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options)
  }

  if (isarray(path)) {
    return arrayToRegexp(path, keys, options)
  }

  return stringToRegexp(path, keys, options)
}

pathToRegexp_1.parse = parse_1;
pathToRegexp_1.compile = compile_1;
pathToRegexp_1.tokensToFunction = tokensToFunction_1;
pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

/**
   * Module dependencies.
   */

  

  /**
   * Module exports.
   */

  var page_js = page;
  page.default = page;
  page.Context = Context;
  page.Route = Route;
  page.sameOrigin = sameOrigin;

  /**
   * Short-cuts for global-object checks
   */

  var hasDocument = ('undefined' !== typeof document);
  var hasWindow = ('undefined' !== typeof window);
  var hasHistory = ('undefined' !== typeof history);
  var hasProcess = typeof process !== 'undefined';

  /**
   * Detect click event
   */
  var clickEvent = hasDocument && document.ontouchstart ? 'touchstart' : 'click';

  /**
   * To work properly with the URL
   * history.location generated polyfill in https://github.com/devote/HTML5-History-API
   */

  var isLocation = hasWindow && !!(window.history.location || window.location);

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
   * Strict path matching.
   */

  var strict = false;

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
   * The window for which this `page` is running
   */
  var pageWindow;

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
   * Get or set strict path matching to `enable`
   *
   * @param {boolean} enable
   * @api public
   */

  page.strict = function(enable) {
    if (0 === arguments.length) return strict;
    strict = enable;
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
    pageWindow = options.window || (hasWindow && window);
    if (false === options.dispatch) dispatch = false;
    if (false === options.decodeURLComponents) decodeURLComponents = false;
    if (false !== options.popstate && hasWindow) pageWindow.addEventListener('popstate', onpopstate, false);
    if (false !== options.click && hasDocument) {
      pageWindow.document.addEventListener(clickEvent, onclick, false);
    }
    hashbang = !!options.hashbang;
    if(hashbang && hasWindow && !hasHistory) {
      pageWindow.addEventListener('hashchange', onpopstate, false);
    }
    if (!dispatch) return;

    var url;
    if(isLocation) {
      var loc = pageWindow.location;

      if(hashbang && ~loc.hash.indexOf('#!')) {
        url = loc.hash.substr(2) + loc.search;
      } else if (hashbang) {
        url = loc.search + loc.hash;
      } else {
        url = loc.pathname + loc.search + loc.hash;
      }
    }

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
    hasDocument && pageWindow.document.removeEventListener(clickEvent, onclick, false);
    hasWindow && pageWindow.removeEventListener('popstate', onpopstate, false);
    hasWindow && pageWindow.removeEventListener('hashchange', onpopstate, false);
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
    var ctx = new Context(path, state),
      prev = prevContext;
    prevContext = ctx;
    page.current = ctx.path;
    if (false !== dispatch) page.dispatch(ctx, prev);
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
      hasHistory && pageWindow.history.back();
      page.len--;
    } else if (path) {
      setTimeout(function() {
        page.show(path, state);
      });
    }else{
      setTimeout(function() {
        page.show(getBase(), state);
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
    var ctx = new Context(path, state),
      prev = prevContext;
    prevContext = ctx;
    page.current = ctx.path;
    ctx.init = init;
    ctx.save(); // save before dispatching, which may redirect
    if (false !== dispatch) page.dispatch(ctx, prev);
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Context} ctx
   * @api private
   */

  page.dispatch = function(ctx, prev) {
    var i = 0,
      j = 0;

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
      current = isLocation && getBase() + pageWindow.location.hash.replace('#!', '');
    } else {
      current = isLocation && pageWindow.location.pathname + pageWindow.location.search;
    }

    if (current === ctx.canonicalPath) return;
    page.stop();
    ctx.handled = false;
    isLocation && (pageWindow.location.href = ctx.canonicalPath);
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
    var pageBase = getBase();
    if ('/' === path[0] && 0 !== path.indexOf(pageBase)) path = pageBase + (hashbang ? '#!' : '') + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    this.path = path.replace(pageBase, '') || '/';
    if (hashbang) this.path = this.path.replace('#!', '') || '/';

    this.title = (hasDocument && pageWindow.document.title);
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
      this.path = this.pathname = parts[0];
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
    if (hasHistory) {
        pageWindow.history.pushState(this.state, this.title,
          hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
    }
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function() {
    if (hasHistory && pageWindow.location.protocol !== 'file:') {
        pageWindow.history.replaceState(this.state, this.title,
          hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
    }
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
    options.strict = options.strict || strict;
    this.path = (path === '*') ? '(.*)' : path;
    this.method = 'GET';
    this.regexp = pathToRegexp_1(this.path,
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
    if ( ! hasWindow ) {
      return;
    }
    if (hasDocument && document.readyState === 'complete') {
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
      } else if (isLocation) {
        var loc = pageWindow.location;
        page.show(loc.pathname + loc.hash, undefined, undefined, false);
      }
    };
  })();
  /**
   * Handle "click" events.
   */

  /* jshint +W054 */
  function onclick(e) {
    if (1 !== which(e)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;

    // ensure link
    // use shadow dom when available if not, fall back to composedPath() for browsers that only have shady
    var el = e.target;
    var eventPath = e.path || (e.composedPath ? e.composedPath() : null);

    if(eventPath) {
      for (var i = 0; i < eventPath.length; i++) {
        if (!eventPath[i].nodeName) continue;
        if (eventPath[i].nodeName.toUpperCase() !== 'A') continue;
        if (!eventPath[i].href) continue;

        el = eventPath[i];
        break;
      }
    }
    // continue ensure link
    // el.nodeName for svg links are 'a' instead of 'A'
    while (el && 'A' !== el.nodeName.toUpperCase()) el = el.parentNode;
    if (!el || 'A' !== el.nodeName.toUpperCase()) return;

    // check if link is inside an svg
    // in this case, both href and target are always inside an object
    var svg = (typeof el.href === 'object') && el.href.constructor.name === 'SVGAnimatedString';

    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if(!hashbang && samePath(el) && (el.hash || '#' === link)) return;

    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    // svg target is an object and its desired value is in .baseVal property
    if (svg ? el.target.baseVal : el.target) return;

    // x-origin
    // note: svg links that are not relative don't call click events (and skip page.js)
    // consequently, all svg links tested inside page.js are relative and in the same origin
    if (!svg && !sameOrigin(el.href)) return;

    // rebuild path
    // There aren't .pathname and .search properties in svg links, so we use href
    // Also, svg href is an object and its desired value is in .baseVal property
    var path = svg ? el.href.baseVal : (el.pathname + el.search + (el.hash || ''));

    path = path[0] !== '/' ? '/' + path : path;

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (hasProcess && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;
    var pageBase = getBase();

    if (path.indexOf(pageBase) === 0) {
      path = path.substr(base.length);
    }

    if (hashbang) path = path.replace('#!', '');

    if (pageBase && orig === path) return;

    e.preventDefault();
    page.show(orig);
  }

  /**
   * Event button.
   */

  function which(e) {
    e = e || (hasWindow && window.event);
    return null == e.which ? e.button : e.which;
  }

  /**
   * Convert to a URL object
   */
  function toURL(href) {
    if(typeof URL === 'function' && isLocation) {
      return new URL(href, location.toString());
    } else if (hasDocument) {
      var anc = document.createElement('a');
      anc.href = href;
      return anc;
    }
  }

  /**
   * Check if `href` is the same origin.
   */

  function sameOrigin(href) {
    if(!href || !isLocation) return false;
    var url = toURL(href);

    var loc = pageWindow.location;
    return loc.protocol === url.protocol &&
      loc.hostname === url.hostname &&
      loc.port === url.port;
  }

  function samePath(url) {
    if(!isLocation) return false;
    var loc = pageWindow.location;
    return url.pathname === loc.pathname &&
      url.search === loc.search;
  }

  /**
   * Gets the `base`, which depends on whether we are using History or
   * hashbang routing.
   */
  function getBase() {
    if(!!base) return base;
    var loc = hasWindow && pageWindow && pageWindow.location;
    return (hasWindow && hashbang && loc && loc.protocol === 'file:') ? loc.pathname : base;
  }

  page.sameOrigin = sameOrigin;

return page_js;

})));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"qs":{"package.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/package.json                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "qs",
  "version": "6.6.0",
  "main": "lib/index.js"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/lib/index.js                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

var stringify = require('./stringify');
var parse = require('./parse');
var formats = require('./formats');

module.exports = {
    formats: formats,
    parse: parse,
    stringify: stringify
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"stringify.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/lib/stringify.js                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

var utils = require('./utils');
var formats = require('./formats');

var arrayPrefixGenerators = {
    brackets: function brackets(prefix) { // eslint-disable-line func-name-matching
        return prefix + '[]';
    },
    indices: function indices(prefix, key) { // eslint-disable-line func-name-matching
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) { // eslint-disable-line func-name-matching
        return prefix;
    }
};

var isArray = Array.isArray;
var push = Array.prototype.push;
var pushToArray = function (arr, valueOrArray) {
    push.apply(arr, isArray(valueOrArray) ? valueOrArray : [valueOrArray]);
};

var toISO = Date.prototype.toISOString;

var defaults = {
    addQueryPrefix: false,
    allowDots: false,
    charset: 'utf-8',
    charsetSentinel: false,
    delimiter: '&',
    encode: true,
    encoder: utils.encode,
    encodeValuesOnly: false,
    // deprecated
    indices: false,
    serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var stringify = function stringify( // eslint-disable-line func-name-matching
    object,
    prefix,
    generateArrayPrefix,
    strictNullHandling,
    skipNulls,
    encoder,
    filter,
    sort,
    allowDots,
    serializeDate,
    formatter,
    encodeValuesOnly,
    charset
) {
    var obj = object;
    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate(obj);
    }

    if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset) : prefix;
        }

        obj = '';
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {
        if (encoder) {
            var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset);
            return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
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

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }

        if (Array.isArray(obj)) {
            pushToArray(values, stringify(
                obj[key],
                generateArrayPrefix(prefix, key),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly,
                charset
            ));
        } else {
            pushToArray(values, stringify(
                obj[key],
                prefix + (allowDots ? '.' + key : '[' + key + ']'),
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly,
                charset
            ));
        }
    }

    return values;
};

module.exports = function (object, opts) {
    var obj = object;
    var options = opts ? utils.assign({}, opts) : {};

    if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
    var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
    var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
    var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
    var encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder;
    var sort = typeof options.sort === 'function' ? options.sort : null;
    var allowDots = typeof options.allowDots === 'undefined' ? defaults.allowDots : !!options.allowDots;
    var serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate;
    var encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly;
    var charset = options.charset || defaults.charset;
    if (typeof options.charset !== 'undefined' && options.charset !== 'utf-8' && options.charset !== 'iso-8859-1') {
        throw new Error('The charset option must be either utf-8, iso-8859-1, or undefined');
    }

    if (typeof options.format === 'undefined') {
        options.format = formats['default'];
    } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
        throw new TypeError('Unknown format option provided.');
    }
    var formatter = formats.formatters[options.format];
    var objKeys;
    var filter;

    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if (Array.isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    var keys = [];

    if (typeof obj !== 'object' || obj === null) {
        return '';
    }

    var arrayFormat;
    if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
    } else if ('indices' in options) {
        arrayFormat = options.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = 'indices';
    }

    var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (sort) {
        objKeys.sort(sort);
    }

    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
            continue;
        }
        pushToArray(keys, stringify(
            obj[key],
            key,
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encode ? encoder : null,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly,
            charset
        ));
    }

    var joined = keys.join(delimiter);
    var prefix = options.addQueryPrefix === true ? '?' : '';

    if (options.charsetSentinel) {
        if (charset === 'iso-8859-1') {
            // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
            prefix += 'utf8=%26%2310003%3B&';
        } else {
            // encodeURIComponent('✓')
            prefix += 'utf8=%E2%9C%93&';
        }
    }

    return joined.length > 0 ? prefix + joined : '';
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/lib/utils.js                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

var has = Object.prototype.hasOwnProperty;

var hexTable = (function () {
    var array = [];
    for (var i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }

    return array;
}());

var compactQueue = function compactQueue(queue) {
    while (queue.length > 1) {
        var item = queue.pop();
        var obj = item.obj[item.prop];

        if (Array.isArray(obj)) {
            var compacted = [];

            for (var j = 0; j < obj.length; ++j) {
                if (typeof obj[j] !== 'undefined') {
                    compacted.push(obj[j]);
                }
            }

            item.obj[item.prop] = compacted;
        }
    }
};

var arrayToObject = function arrayToObject(source, options) {
    var obj = options && options.plainObjects ? Object.create(null) : {};
    for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }

    return obj;
};

var merge = function merge(target, source, options) {
    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (Array.isArray(target)) {
            target.push(source);
        } else if (typeof target === 'object') {
            if ((options && (options.plainObjects || options.allowPrototypes)) || !has.call(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [target, source];
        }

        return target;
    }

    if (typeof target !== 'object') {
        return [target].concat(source);
    }

    var mergeTarget = target;
    if (Array.isArray(target) && !Array.isArray(source)) {
        mergeTarget = arrayToObject(target, options);
    }

    if (Array.isArray(target) && Array.isArray(source)) {
        source.forEach(function (item, i) {
            if (has.call(target, i)) {
                if (target[i] && typeof target[i] === 'object') {
                    target[i] = merge(target[i], item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }

    return Object.keys(source).reduce(function (acc, key) {
        var value = source[key];

        if (has.call(acc, key)) {
            acc[key] = merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
};

var assign = function assignSingleSource(target, source) {
    return Object.keys(source).reduce(function (acc, key) {
        acc[key] = source[key];
        return acc;
    }, target);
};

var decode = function (str, decoder, charset) {
    var strWithoutPlus = str.replace(/\+/g, ' ');
    if (charset === 'iso-8859-1') {
        // unescape never throws, no try...catch needed:
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
    }
    // utf-8
    try {
        return decodeURIComponent(strWithoutPlus);
    } catch (e) {
        return strWithoutPlus;
    }
};

var encode = function encode(str, defaultEncoder, charset) {
    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    var string = typeof str === 'string' ? str : String(str);

    if (charset === 'iso-8859-1') {
        return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
            return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
        });
    }

    var out = '';
    for (var i = 0; i < string.length; ++i) {
        var c = string.charCodeAt(i);

        if (
            c === 0x2D // -
            || c === 0x2E // .
            || c === 0x5F // _
            || c === 0x7E // ~
            || (c >= 0x30 && c <= 0x39) // 0-9
            || (c >= 0x41 && c <= 0x5A) // a-z
            || (c >= 0x61 && c <= 0x7A) // A-Z
        ) {
            out += string.charAt(i);
            continue;
        }

        if (c < 0x80) {
            out = out + hexTable[c];
            continue;
        }

        if (c < 0x800) {
            out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        if (c < 0xD800 || c >= 0xE000) {
            out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
            continue;
        }

        i += 1;
        c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
        out += hexTable[0xF0 | (c >> 18)]
            + hexTable[0x80 | ((c >> 12) & 0x3F)]
            + hexTable[0x80 | ((c >> 6) & 0x3F)]
            + hexTable[0x80 | (c & 0x3F)];
    }

    return out;
};

var compact = function compact(value) {
    var queue = [{ obj: { o: value }, prop: 'o' }];
    var refs = [];

    for (var i = 0; i < queue.length; ++i) {
        var item = queue[i];
        var obj = item.obj[item.prop];

        var keys = Object.keys(obj);
        for (var j = 0; j < keys.length; ++j) {
            var key = keys[j];
            var val = obj[key];
            if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                queue.push({ obj: obj, prop: key });
                refs.push(val);
            }
        }
    }

    compactQueue(queue);

    return value;
};

var isRegExp = function isRegExp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

var isBuffer = function isBuffer(obj) {
    if (obj === null || typeof obj === 'undefined') {
        return false;
    }

    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};

var combine = function combine(a, b) {
    return [].concat(a, b);
};

module.exports = {
    arrayToObject: arrayToObject,
    assign: assign,
    combine: combine,
    compact: compact,
    decode: decode,
    encode: encode,
    isBuffer: isBuffer,
    isRegExp: isRegExp,
    merge: merge
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"formats.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/lib/formats.js                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

var replace = String.prototype.replace;
var percentTwenties = /%20/g;

module.exports = {
    'default': 'RFC3986',
    formatters: {
        RFC1738: function (value) {
            return replace.call(value, percentTwenties, '+');
        },
        RFC3986: function (value) {
            return value;
        }
    },
    RFC1738: 'RFC1738',
    RFC3986: 'RFC3986'
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"parse.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/lib/parse.js                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

var utils = require('./utils');

var has = Object.prototype.hasOwnProperty;

var defaults = {
    allowDots: false,
    allowPrototypes: false,
    arrayLimit: 20,
    charset: 'utf-8',
    charsetSentinel: false,
    decoder: utils.decode,
    delimiter: '&',
    depth: 5,
    ignoreQueryPrefix: false,
    interpretNumericEntities: false,
    parameterLimit: 1000,
    parseArrays: true,
    plainObjects: false,
    strictNullHandling: false
};

var interpretNumericEntities = function (str) {
    return str.replace(/&#(\d+);/g, function ($0, numberStr) {
        return String.fromCharCode(parseInt(numberStr, 10));
    });
};

// This is what browsers will submit when the ✓ character occurs in an
// application/x-www-form-urlencoded body and the encoding of the page containing
// the form is iso-8859-1, or when the submitted form has an accept-charset
// attribute of iso-8859-1. Presumably also with other charsets that do not contain
// the ✓ character, such as us-ascii.
var isoSentinel = 'utf8=%26%2310003%3B'; // encodeURIComponent('&#10003;')

// These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.
var charsetSentinel = 'utf8=%E2%9C%93'; // encodeURIComponent('✓')

var parseValues = function parseQueryStringValues(str, options) {
    var obj = {};
    var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
    var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
    var parts = cleanStr.split(options.delimiter, limit);
    var skipIndex = -1; // Keep track of where the utf8 sentinel was found
    var i;

    var charset = options.charset;
    if (options.charsetSentinel) {
        for (i = 0; i < parts.length; ++i) {
            if (parts[i].indexOf('utf8=') === 0) {
                if (parts[i] === charsetSentinel) {
                    charset = 'utf-8';
                } else if (parts[i] === isoSentinel) {
                    charset = 'iso-8859-1';
                }
                skipIndex = i;
                i = parts.length; // The eslint settings do not allow break;
            }
        }
    }

    for (i = 0; i < parts.length; ++i) {
        if (i === skipIndex) {
            continue;
        }
        var part = parts[i];

        var bracketEqualsPos = part.indexOf(']=');
        var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

        var key, val;
        if (pos === -1) {
            key = options.decoder(part, defaults.decoder, charset);
            val = options.strictNullHandling ? null : '';
        } else {
            key = options.decoder(part.slice(0, pos), defaults.decoder, charset);
            val = options.decoder(part.slice(pos + 1), defaults.decoder, charset);
        }

        if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
            val = interpretNumericEntities(val);
        }
        if (has.call(obj, key)) {
            obj[key] = utils.combine(obj[key], val);
        } else {
            obj[key] = val;
        }
    }

    return obj;
};

var parseObject = function (chain, val, options) {
    var leaf = val;

    for (var i = chain.length - 1; i >= 0; --i) {
        var obj;
        var root = chain[i];

        if (root === '[]' && options.parseArrays) {
            obj = [].concat(leaf);
        } else {
            obj = options.plainObjects ? Object.create(null) : {};
            var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
            var index = parseInt(cleanRoot, 10);
            if (!options.parseArrays && cleanRoot === '') {
                obj = { 0: leaf };
            } else if (
                !isNaN(index)
                && root !== cleanRoot
                && String(index) === cleanRoot
                && index >= 0
                && (options.parseArrays && index <= options.arrayLimit)
            ) {
                obj = [];
                obj[index] = leaf;
            } else {
                obj[cleanRoot] = leaf;
            }
        }

        leaf = obj;
    }

    return leaf;
};

var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    var brackets = /(\[[^[\]]*])/;
    var child = /(\[[^[\]]*])/g;

    // Get the parent

    var segment = brackets.exec(key);
    var parent = segment ? key.slice(0, segment.index) : key;

    // Stash the parent if it exists

    var keys = [];
    if (parent) {
        // If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
        if (!options.plainObjects && has.call(Object.prototype, parent)) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(parent);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while ((segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return parseObject(keys, val, options);
};

module.exports = function (str, opts) {
    var options = opts ? utils.assign({}, opts) : {};

    if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
        throw new TypeError('Decoder has to be a function.');
    }

    options.ignoreQueryPrefix = options.ignoreQueryPrefix === true;
    options.delimiter = typeof options.delimiter === 'string' || utils.isRegExp(options.delimiter) ? options.delimiter : defaults.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : defaults.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults.arrayLimit;
    options.parseArrays = options.parseArrays !== false;
    options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults.decoder;
    options.allowDots = typeof options.allowDots === 'undefined' ? defaults.allowDots : !!options.allowDots;
    options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults.plainObjects;
    options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults.allowPrototypes;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults.parameterLimit;
    options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;

    if (typeof options.charset !== 'undefined' && options.charset !== 'utf-8' && options.charset !== 'iso-8859-1') {
        throw new Error('The charset option must be either utf-8, iso-8859-1, or undefined');
    }
    if (typeof options.charset === 'undefined') {
        options.charset = defaults.charset;
    }

    if (str === '' || str === null || typeof str === 'undefined') {
        return options.plainObjects ? Object.create(null) : {};
    }

    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newObj = parseKeys(key, tempObj[key], options);
        obj = utils.merge(obj, newObj, options);
    }

    return utils.compact(obj);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/ostrio:flow-router-extra/client/_init.js");

/* Exports */
Package._define("ostrio:flow-router-extra", exports);

})();
