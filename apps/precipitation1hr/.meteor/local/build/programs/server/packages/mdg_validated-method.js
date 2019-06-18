(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var check = Package.check.check;
var Match = Package.check.Match;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var options, callback, args, ValidatedMethod;

var require = meteorInstall({"node_modules":{"meteor":{"mdg:validated-method":{"validated-method.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/mdg_validated-method/validated-method.js                                                //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
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

  _execute(methodInvocation = {}, args) {
    // Add `this.name` to reference the Method name
    methodInvocation.name = this.name;
    const validateResult = this.validate.bind(methodInvocation)(args);

    if (typeof validateResult !== 'undefined') {
      throw new Error(`Returning from validate doesn't do anything; \
perhaps you meant to throw an error?`);
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
        msg = `The function '${functionName[1]}'`;
      }

      throw new Error(`Error in ${name} method: ${msg} didn't return the options object.`);
    }
  });
  return args;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////

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

//# sourceURL=meteor://💻app/packages/mdg_validated-method.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWRnOnZhbGlkYXRlZC1tZXRob2QvdmFsaWRhdGVkLW1ldGhvZC5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJWYWxpZGF0ZWRNZXRob2QiLCJjaGVjayIsIk1hdGNoIiwibGluayIsInYiLCJjb25zdHJ1Y3RvciIsIm9wdGlvbnMiLCJtaXhpbnMiLCJGdW5jdGlvbiIsIm5hbWUiLCJTdHJpbmciLCJhcHBseU1peGlucyIsImNvbm5lY3Rpb24iLCJNZXRlb3IiLCJ2YWxpZGF0ZSIsImFwcGx5T3B0aW9ucyIsIk9iamVjdEluY2x1ZGluZyIsInJ1biIsIk9iamVjdCIsImRlZmF1bHRBcHBseU9wdGlvbnMiLCJyZXR1cm5TdHViVmFsdWUiLCJ0aHJvd1N0dWJFeGNlcHRpb25zIiwiYXNzaWduIiwibWV0aG9kIiwibWV0aG9kcyIsImFyZ3MiLCJBbnkiLCJtZXRob2RJbnZvY2F0aW9uIiwiX2V4ZWN1dGUiLCJjYWxsIiwiY2FsbGJhY2siLCJhcHBseSIsImVyciIsInZhbGlkYXRlUmVzdWx0IiwiYmluZCIsIkVycm9yIiwiZm9yRWFjaCIsIm1peGluIiwidGVzdCIsImZ1bmN0aW9uTmFtZSIsInRvU3RyaW5nIiwibWF0Y2giLCJtc2ciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUFDQyxpQkFBZSxFQUFDLE1BQUlBO0FBQXJCLENBQWQ7QUFBcUQsSUFBSUMsS0FBSixFQUFVQyxLQUFWO0FBQWdCSixNQUFNLENBQUNLLElBQVAsQ0FBWSxjQUFaLEVBQTJCO0FBQUNGLE9BQUssQ0FBQ0csQ0FBRCxFQUFHO0FBQUNILFNBQUssR0FBQ0csQ0FBTjtBQUFRLEdBQWxCOztBQUFtQkYsT0FBSyxDQUFDRSxDQUFELEVBQUc7QUFBQ0YsU0FBSyxHQUFDRSxDQUFOO0FBQVE7O0FBQXBDLENBQTNCLEVBQWlFLENBQWpFOztBQUU5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TCxDQUFjb0IsSUFBZCxDQUFtQlAsZ0JBQW5CLEVBQXFDRixJQUFyQyxDQUF2Qjs7QUFFQSxRQUFJLE9BQU9RLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDekMsWUFBTSxJQUFJRSxLQUFKLENBQVc7cUNBQVgsQ0FBTjtBQUVEOztBQUVELFdBQU8sS0FBS2xCLEdBQUwsQ0FBU2lCLElBQVQsQ0FBY1AsZ0JBQWQsRUFBZ0NGLElBQWhDLENBQVA7QUFDRDs7QUE1RjBCOztBQTZGNUIsQyxDQUVEOztBQUNBLFNBQVNkLFdBQVQsQ0FBcUJjLElBQXJCLEVBQTJCbEIsTUFBM0IsRUFBbUM7QUFDakM7QUFDQSxRQUFNO0FBQUVFO0FBQUYsTUFBV2dCLElBQWpCO0FBRUFsQixRQUFNLENBQUM2QixPQUFQLENBQWdCQyxLQUFELElBQVc7QUFDeEJaLFFBQUksR0FBR1ksS0FBSyxDQUFDWixJQUFELENBQVo7O0FBRUEsUUFBRyxDQUFDdkIsS0FBSyxDQUFDb0MsSUFBTixDQUFXYixJQUFYLEVBQWlCUCxNQUFqQixDQUFKLEVBQThCO0FBQzVCLFlBQU1xQixZQUFZLEdBQUdGLEtBQUssQ0FBQ0csUUFBTixHQUFpQkMsS0FBakIsQ0FBdUIsaUJBQXZCLENBQXJCO0FBQ0EsVUFBSUMsR0FBRyxHQUFHLG1CQUFWOztBQUVBLFVBQUdILFlBQUgsRUFBaUI7QUFDZkcsV0FBRyxHQUFJLGlCQUFnQkgsWUFBWSxDQUFDLENBQUQsQ0FBSSxHQUF2QztBQUNEOztBQUVELFlBQU0sSUFBSUosS0FBSixDQUFXLFlBQVcxQixJQUFLLFlBQVdpQyxHQUFJLG9DQUExQyxDQUFOO0FBQ0Q7QUFDRixHQWJEO0FBZUEsU0FBT2pCLElBQVA7QUFDRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9tZGdfdmFsaWRhdGVkLW1ldGhvZC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNoZWNrLCBNYXRjaCB9IGZyb20gJ21ldGVvci9jaGVjayc7XG5cbmV4cG9ydCBjbGFzcyBWYWxpZGF0ZWRNZXRob2Qge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgLy8gRGVmYXVsdCB0byBubyBtaXhpbnNcbiAgICBvcHRpb25zLm1peGlucyA9IG9wdGlvbnMubWl4aW5zIHx8IFtdO1xuICAgIGNoZWNrKG9wdGlvbnMubWl4aW5zLCBbRnVuY3Rpb25dKTtcbiAgICBjaGVjayhvcHRpb25zLm5hbWUsIFN0cmluZyk7XG4gICAgb3B0aW9ucyA9IGFwcGx5TWl4aW5zKG9wdGlvbnMsIG9wdGlvbnMubWl4aW5zKTtcblxuICAgIC8vIGNvbm5lY3Rpb24gYXJndW1lbnQgZGVmYXVsdHMgdG8gTWV0ZW9yLCB3aGljaCBpcyB3aGVyZSBNZXRob2RzIGFyZSBkZWZpbmVkIG9uIGNsaWVudCBhbmRcbiAgICAvLyBzZXJ2ZXJcbiAgICBvcHRpb25zLmNvbm5lY3Rpb24gPSBvcHRpb25zLmNvbm5lY3Rpb24gfHwgTWV0ZW9yO1xuXG4gICAgLy8gQWxsb3cgdmFsaWRhdGU6IG51bGwgc2hvcnRoYW5kIGZvciBtZXRob2RzIHRoYXQgdGFrZSBubyBhcmd1bWVudHNcbiAgICBpZiAob3B0aW9ucy52YWxpZGF0ZSA9PT0gbnVsbCkge1xuICAgICAgb3B0aW9ucy52YWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIH1cblxuICAgIC8vIElmIHRoaXMgaXMgbnVsbC91bmRlZmluZWQsIG1ha2UgaXQgYW4gZW1wdHkgb2JqZWN0XG4gICAgb3B0aW9ucy5hcHBseU9wdGlvbnMgPSBvcHRpb25zLmFwcGx5T3B0aW9ucyB8fCB7fTtcblxuICAgIGNoZWNrKG9wdGlvbnMsIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgICBuYW1lOiBTdHJpbmcsXG4gICAgICB2YWxpZGF0ZTogRnVuY3Rpb24sXG4gICAgICBydW46IEZ1bmN0aW9uLFxuICAgICAgbWl4aW5zOiBbRnVuY3Rpb25dLFxuICAgICAgY29ubmVjdGlvbjogT2JqZWN0LFxuICAgICAgYXBwbHlPcHRpb25zOiBPYmplY3QsXG4gICAgfSkpO1xuXG4gICAgLy8gRGVmYXVsdCBvcHRpb25zIHBhc3NlZCB0byBNZXRlb3IuYXBwbHksIGNhbiBiZSBvdmVycmlkZGVuIHdpdGggYXBwbHlPcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdEFwcGx5T3B0aW9ucyA9IHtcbiAgICAgIC8vIE1ha2UgaXQgcG9zc2libGUgdG8gZ2V0IHRoZSBJRCBvZiBhbiBpbnNlcnRlZCBpdGVtXG4gICAgICByZXR1cm5TdHViVmFsdWU6IHRydWUsXG5cbiAgICAgIC8vIERvbid0IGNhbGwgdGhlIHNlcnZlciBtZXRob2QgaWYgdGhlIGNsaWVudCBzdHViIHRocm93cyBhbiBlcnJvciwgc28gdGhhdCB3ZSBkb24ndCBlbmRcbiAgICAgIC8vIHVwIGRvaW5nIHZhbGlkYXRpb25zIHR3aWNlXG4gICAgICB0aHJvd1N0dWJFeGNlcHRpb25zOiB0cnVlLFxuICAgIH07XG5cbiAgICBvcHRpb25zLmFwcGx5T3B0aW9ucyA9IHtcbiAgICAgIC4uLmRlZmF1bHRBcHBseU9wdGlvbnMsXG4gICAgICAuLi5vcHRpb25zLmFwcGx5T3B0aW9uc1xuICAgIH07XG5cbiAgICAvLyBBdHRhY2ggYWxsIG9wdGlvbnMgdG8gdGhlIFZhbGlkYXRlZE1ldGhvZCBpbnN0YW5jZVxuICAgIE9iamVjdC5hc3NpZ24odGhpcywgb3B0aW9ucyk7XG5cbiAgICBjb25zdCBtZXRob2QgPSB0aGlzO1xuICAgIHRoaXMuY29ubmVjdGlvbi5tZXRob2RzKHtcbiAgICAgIFtvcHRpb25zLm5hbWVdKGFyZ3MpIHtcbiAgICAgICAgLy8gU2lsZW5jZSBhdWRpdC1hcmd1bWVudC1jaGVja3Mgc2luY2UgYXJndW1lbnRzIGFyZSBhbHdheXMgY2hlY2tlZCB3aGVuIHVzaW5nIHRoaXMgcGFja2FnZVxuICAgICAgICBjaGVjayhhcmdzLCBNYXRjaC5BbnkpO1xuICAgICAgICBjb25zdCBtZXRob2RJbnZvY2F0aW9uID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbWV0aG9kLl9leGVjdXRlKG1ldGhvZEludm9jYXRpb24sIGFyZ3MpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY2FsbChhcmdzLCBjYWxsYmFjaykge1xuICAgIC8vIEFjY2VwdCBjYWxsaW5nIHdpdGgganVzdCBhIGNhbGxiYWNrXG4gICAgaWYgKCB0eXBlb2YgYXJncyA9PT0gJ2Z1bmN0aW9uJyApIHtcbiAgICAgIGNhbGxiYWNrID0gYXJncztcbiAgICAgIGFyZ3MgPSB7fTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdGlvbi5hcHBseSh0aGlzLm5hbWUsIFthcmdzXSwgdGhpcy5hcHBseU9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAvLyBHZXQgZXJyb3JzIGZyb20gdGhlIHN0dWIgaW4gdGhlIHNhbWUgd2F5IGFzIGZyb20gdGhlIHNlcnZlci1zaWRlIG1ldGhvZFxuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm8gY2FsbGJhY2sgcGFzc2VkLCB0aHJvdyBpbnN0ZWFkIG9mIHNpbGVudGx5IGZhaWxpbmc7IHRoaXMgaXMgd2hhdFxuICAgICAgICAvLyBcIm5vcm1hbFwiIE1ldGhvZHMgZG8gaWYgeW91IGRvbid0IHBhc3MgYSBjYWxsYmFjay5cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIF9leGVjdXRlKG1ldGhvZEludm9jYXRpb24gPSB7fSwgYXJncykge1xuICAgIC8vIEFkZCBgdGhpcy5uYW1lYCB0byByZWZlcmVuY2UgdGhlIE1ldGhvZCBuYW1lXG4gICAgbWV0aG9kSW52b2NhdGlvbi5uYW1lID0gdGhpcy5uYW1lO1xuXG4gICAgY29uc3QgdmFsaWRhdGVSZXN1bHQgPSB0aGlzLnZhbGlkYXRlLmJpbmQobWV0aG9kSW52b2NhdGlvbikoYXJncyk7XG5cbiAgICBpZiAodHlwZW9mIHZhbGlkYXRlUmVzdWx0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZXR1cm5pbmcgZnJvbSB2YWxpZGF0ZSBkb2Vzbid0IGRvIGFueXRoaW5nOyBcXFxucGVyaGFwcyB5b3UgbWVhbnQgdG8gdGhyb3cgYW4gZXJyb3I/YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVuLmJpbmQobWV0aG9kSW52b2NhdGlvbikoYXJncyk7XG4gIH1cbn07XG5cbi8vIE1peGlucyBnZXQgYSBjaGFuY2UgdG8gdHJhbnNmb3JtIHRoZSBhcmd1bWVudHMgYmVmb3JlIHRoZXkgYXJlIHBhc3NlZCB0byB0aGUgYWN0dWFsIE1ldGhvZFxuZnVuY3Rpb24gYXBwbHlNaXhpbnMoYXJncywgbWl4aW5zKSB7XG4gIC8vIFNhdmUgbmFtZSBvZiB0aGUgbWV0aG9kIGhlcmUsIHNvIHdlIGNhbiBhdHRhY2ggaXQgdG8gcG90ZW50aWFsIGVycm9yIG1lc3NhZ2VzXG4gIGNvbnN0IHsgbmFtZSB9ID0gYXJncztcblxuICBtaXhpbnMuZm9yRWFjaCgobWl4aW4pID0+IHtcbiAgICBhcmdzID0gbWl4aW4oYXJncyk7XG5cbiAgICBpZighTWF0Y2gudGVzdChhcmdzLCBPYmplY3QpKSB7XG4gICAgICBjb25zdCBmdW5jdGlvbk5hbWUgPSBtaXhpbi50b1N0cmluZygpLm1hdGNoKC9mdW5jdGlvblxccyhcXHcrKS8pO1xuICAgICAgbGV0IG1zZyA9ICdPbmUgb2YgdGhlIG1peGlucyc7XG5cbiAgICAgIGlmKGZ1bmN0aW9uTmFtZSkge1xuICAgICAgICBtc2cgPSBgVGhlIGZ1bmN0aW9uICcke2Z1bmN0aW9uTmFtZVsxXX0nYDtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvciBpbiAke25hbWV9IG1ldGhvZDogJHttc2d9IGRpZG4ndCByZXR1cm4gdGhlIG9wdGlvbnMgb2JqZWN0LmApO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGFyZ3M7XG59XG4iXX0=
