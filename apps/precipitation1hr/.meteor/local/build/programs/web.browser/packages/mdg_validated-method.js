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
var DDP = Package['ddp-client'].DDP;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var options, callback, args, ValidatedMethod;

var require = meteorInstall({"node_modules":{"meteor":{"mdg:validated-method":{"validated-method.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/mdg_validated-method/validated-method.js                                                            //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

module.export({
  ValidatedMethod: () => ValidatedMethod
});
let check, Match;
module.link("meteor/check", {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 0);

class ValidatedMethod {
  constructor(options) {
    // Default to no mixins
    options.mixins = options.mixins || [];
    check(options.mixins, [Function]);
    check(options.name, String);
    options = applyMixins(options, options.mixins); // connection argument defaults to Meteor, which is where Methods are defined on client and
    // server

    options.connection = options.connection || Meteor; // Allow validate: null shorthand for methods that take no arguments

    if (options.validate === null) {
      options.validate = function () {};
    } // If this is null/undefined, make it an empty object


    options.applyOptions = options.applyOptions || {};
    check(options, Match.ObjectIncluding({
      name: String,
      validate: Function,
      run: Function,
      mixins: [Function],
      connection: Object,
      applyOptions: Object
    })); // Default options passed to Meteor.apply, can be overridden with applyOptions

    const defaultApplyOptions = {
      // Make it possible to get the ID of an inserted item
      returnStubValue: true,
      // Don't call the server method if the client stub throws an error, so that we don't end
      // up doing validations twice
      throwStubExceptions: true
    };
    options.applyOptions = (0, _objectSpread2.default)({}, defaultApplyOptions, options.applyOptions); // Attach all options to the ValidatedMethod instance

    Object.assign(this, options);
    const method = this;
    this.connection.methods({
      [options.name](args) {
        // Silence audit-argument-checks since arguments are always checked when using this package
        check(args, Match.Any);
        const methodInvocation = this;
        return method._execute(methodInvocation, args);
      }

    });
  }

  call(args, callback) {
    // Accept calling with just a callback
    if (typeof args === 'function') {
      callback = args;
      args = {};
    }

    try {
      return this.connection.apply(this.name, [args], this.applyOptions, callback);
    } catch (err) {
      if (callback) {
        // Get errors from the stub in the same way as from the server-side method
        callback(err);
      } else {
        // No callback passed, throw instead of silently failing; this is what
        // "normal" Methods do if you don't pass a callback.
        throw err;
      }
    }
  }

  _execute() {
    let methodInvocation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    let args = arguments.length > 1 ? arguments[1] : undefined;
    // Add `this.name` to reference the Method name
    methodInvocation.name = this.name;
    const validateResult = this.validate.bind(methodInvocation)(args);

    if (typeof validateResult !== 'undefined') {
      throw new Error("Returning from validate doesn't do anything; perhaps you meant to throw an error?");
    }

    return this.run.bind(methodInvocation)(args);
  }

}

; // Mixins get a chance to transform the arguments before they are passed to the actual Method

function applyMixins(args, mixins) {
  // Save name of the method here, so we can attach it to potential error messages
  const {
    name
  } = args;
  mixins.forEach(mixin => {
    args = mixin(args);

    if (!Match.test(args, Object)) {
      const functionName = mixin.toString().match(/function\s(\w+)/);
      let msg = 'One of the mixins';

      if (functionName) {
        msg = "The function '".concat(functionName[1], "'");
      }

      throw new Error("Error in ".concat(name, " method: ").concat(msg, " didn't return the options object."));
    }
  });
  return args;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/mdg:validated-method/validated-method.js");

/* Exports */
Package._define("mdg:validated-method", exports, {
  ValidatedMethod: ValidatedMethod
});

})();
