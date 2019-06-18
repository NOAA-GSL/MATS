(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Accounts = Package['accounts-base'].Accounts;
var Google = Package['google-oauth'].Google;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-google":{"notice.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/accounts-google/notice.js                                                                    //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
if (Package['accounts-ui'] && !Package['service-configuration'] && !Object.prototype.hasOwnProperty.call(Package, 'google-config-ui')) {
  console.warn("Note: You're using accounts-ui and accounts-google,\n" + "but didn't install the configuration UI for the Google\n" + "OAuth. You can install it with:\n" + "\n" + "    meteor add google-config-ui" + "\n");
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////

},"google.js":function(require){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/accounts-google/google.js                                                                    //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

Accounts.oauth.registerService('google');

if (Meteor.isClient) {
  const loginWithGoogle = (options, callback) => {
    // support a callback without options
    if (!callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    if (Meteor.isCordova && Google.signIn) {
      // After 20 April 2017, Google OAuth login will no longer work from
      // a WebView, so Cordova apps must use Google Sign-In instead.
      // https://github.com/meteor/meteor/issues/8253
      Google.signIn(options, callback);
      return;
    } // Use Google's domain-specific login page if we want to restrict creation to
    // a particular email domain. (Don't use it if restrictCreationByEmailDomain
    // is a function.) Note that all this does is change Google's UI ---
    // accounts-base/accounts_server.js still checks server-side that the server
    // has the proper email address after the OAuth conversation.


    if (typeof Accounts._options.restrictCreationByEmailDomain === 'string') {
      options = (0, _objectSpread2.default)({}, options);
      options.loginUrlParameters = (0, _objectSpread2.default)({}, options.loginUrlParameters);
      options.loginUrlParameters.hd = Accounts._options.restrictCreationByEmailDomain;
    }

    const credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    Google.requestCredential(options, credentialRequestCompleteCallback);
  };

  Accounts.registerClientLoginFunction('google', loginWithGoogle);

  Meteor.loginWithGoogle = (...args) => Accounts.applyLoginFunction('google', args);
} else {
  Accounts.addAutopublishFields({
    forLoggedInUser: // publish access token since it can be used from the client (if
    // transmitted over ssl or on
    // localhost). https://developers.google.com/accounts/docs/OAuth2UserAgent
    // refresh token probably shouldn't be sent down.
    Google.whitelistedFields.concat(['accessToken', 'expiresAt']).map(subfield => `services.google.${subfield}` // don't publish refresh token
    ),
    forOtherUsers: // even with autopublish, no legitimate web app should be
    // publishing all users' emails
    Google.whitelistedFields.filter(field => field !== 'email' && field !== 'verified_email').map(subfield => `services.google${subfield}`)
  });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/accounts-google/notice.js");
require("/node_modules/meteor/accounts-google/google.js");

/* Exports */
Package._define("accounts-google");

})();

//# sourceURL=meteor://💻app/packages/accounts-google.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtZ29vZ2xlL25vdGljZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtZ29vZ2xlL2dvb2dsZS5qcyJdLCJuYW1lcyI6WyJQYWNrYWdlIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiY29uc29sZSIsIndhcm4iLCJBY2NvdW50cyIsIm9hdXRoIiwicmVnaXN0ZXJTZXJ2aWNlIiwiTWV0ZW9yIiwiaXNDbGllbnQiLCJsb2dpbldpdGhHb29nbGUiLCJvcHRpb25zIiwiY2FsbGJhY2siLCJpc0NvcmRvdmEiLCJHb29nbGUiLCJzaWduSW4iLCJfb3B0aW9ucyIsInJlc3RyaWN0Q3JlYXRpb25CeUVtYWlsRG9tYWluIiwibG9naW5VcmxQYXJhbWV0ZXJzIiwiaGQiLCJjcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlQ2FsbGJhY2siLCJjcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlSGFuZGxlciIsInJlcXVlc3RDcmVkZW50aWFsIiwicmVnaXN0ZXJDbGllbnRMb2dpbkZ1bmN0aW9uIiwiYXJncyIsImFwcGx5TG9naW5GdW5jdGlvbiIsImFkZEF1dG9wdWJsaXNoRmllbGRzIiwiZm9yTG9nZ2VkSW5Vc2VyIiwid2hpdGVsaXN0ZWRGaWVsZHMiLCJjb25jYXQiLCJtYXAiLCJzdWJmaWVsZCIsImZvck90aGVyVXNlcnMiLCJmaWx0ZXIiLCJmaWVsZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsT0FBTyxDQUFDLGFBQUQsQ0FBUCxJQUNHLENBQUNBLE9BQU8sQ0FBQyx1QkFBRCxDQURYLElBRUcsQ0FBQ0MsTUFBTSxDQUFDQyxTQUFQLENBQWlCQyxjQUFqQixDQUFnQ0MsSUFBaEMsQ0FBcUNKLE9BQXJDLEVBQThDLGtCQUE5QyxDQUZSLEVBRTJFO0FBQ3pFSyxTQUFPLENBQUNDLElBQVIsQ0FDRSwwREFDQSwwREFEQSxHQUVBLG1DQUZBLEdBR0EsSUFIQSxHQUlBLGlDQUpBLEdBS0EsSUFORjtBQVFELEM7Ozs7Ozs7Ozs7Ozs7OztBQ1hEQyxRQUFRLENBQUNDLEtBQVQsQ0FBZUMsZUFBZixDQUErQixRQUEvQjs7QUFFQSxJQUFJQyxNQUFNLENBQUNDLFFBQVgsRUFBcUI7QUFDbkIsUUFBTUMsZUFBZSxHQUFHLENBQUNDLE9BQUQsRUFBVUMsUUFBVixLQUF1QjtBQUM3QztBQUNBLFFBQUksQ0FBRUEsUUFBRixJQUFjLE9BQU9ELE9BQVAsS0FBbUIsVUFBckMsRUFBaUQ7QUFDL0NDLGNBQVEsR0FBR0QsT0FBWDtBQUNBQSxhQUFPLEdBQUcsSUFBVjtBQUNEOztBQUVELFFBQUlILE1BQU0sQ0FBQ0ssU0FBUCxJQUNBQyxNQUFNLENBQUNDLE1BRFgsRUFDbUI7QUFDakI7QUFDQTtBQUNBO0FBQ0FELFlBQU0sQ0FBQ0MsTUFBUCxDQUFjSixPQUFkLEVBQXVCQyxRQUF2QjtBQUNBO0FBQ0QsS0FkNEMsQ0FnQjdDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBLFFBQUksT0FBT1AsUUFBUSxDQUFDVyxRQUFULENBQWtCQyw2QkFBekIsS0FBMkQsUUFBL0QsRUFBeUU7QUFDdkVOLGFBQU8sbUNBQVFBLE9BQVIsQ0FBUDtBQUNBQSxhQUFPLENBQUNPLGtCQUFSLG1DQUFrQ1AsT0FBTyxDQUFDTyxrQkFBMUM7QUFDQVAsYUFBTyxDQUFDTyxrQkFBUixDQUEyQkMsRUFBM0IsR0FBZ0NkLFFBQVEsQ0FBQ1csUUFBVCxDQUFrQkMsNkJBQWxEO0FBQ0Q7O0FBQ0QsVUFBTUcsaUNBQWlDLEdBQUdmLFFBQVEsQ0FBQ0MsS0FBVCxDQUFlZSxnQ0FBZixDQUFnRFQsUUFBaEQsQ0FBMUM7QUFDQUUsVUFBTSxDQUFDUSxpQkFBUCxDQUF5QlgsT0FBekIsRUFBa0NTLGlDQUFsQztBQUNELEdBNUJEOztBQTZCQWYsVUFBUSxDQUFDa0IsMkJBQVQsQ0FBcUMsUUFBckMsRUFBK0NiLGVBQS9DOztBQUNBRixRQUFNLENBQUNFLGVBQVAsR0FDRSxDQUFDLEdBQUdjLElBQUosS0FBYW5CLFFBQVEsQ0FBQ29CLGtCQUFULENBQTRCLFFBQTVCLEVBQXNDRCxJQUF0QyxDQURmO0FBRUQsQ0FqQ0QsTUFpQ087QUFDTG5CLFVBQVEsQ0FBQ3FCLG9CQUFULENBQThCO0FBQzVCQyxtQkFBZSxFQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0FiLFVBQU0sQ0FBQ2MsaUJBQVAsQ0FBeUJDLE1BQXpCLENBQWdDLENBQUMsYUFBRCxFQUFnQixXQUFoQixDQUFoQyxFQUE4REMsR0FBOUQsQ0FDRUMsUUFBUSxJQUFLLG1CQUFrQkEsUUFBUyxFQUQxQyxDQUM0QztBQUQ1QyxLQU4wQjtBQVU1QkMsaUJBQWEsRUFDWDtBQUNBO0FBQ0FsQixVQUFNLENBQUNjLGlCQUFQLENBQXlCSyxNQUF6QixDQUNFQyxLQUFLLElBQUlBLEtBQUssS0FBSyxPQUFWLElBQXFCQSxLQUFLLEtBQUssZ0JBRDFDLEVBRUVKLEdBRkYsQ0FHRUMsUUFBUSxJQUFLLGtCQUFpQkEsUUFBUyxFQUh6QztBQWIwQixHQUE5QjtBQW1CRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9hY2NvdW50cy1nb29nbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpZiAoUGFja2FnZVsnYWNjb3VudHMtdWknXVxuICAgICYmICFQYWNrYWdlWydzZXJ2aWNlLWNvbmZpZ3VyYXRpb24nXVxuICAgICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoUGFja2FnZSwgJ2dvb2dsZS1jb25maWctdWknKSkge1xuICBjb25zb2xlLndhcm4oXG4gICAgXCJOb3RlOiBZb3UncmUgdXNpbmcgYWNjb3VudHMtdWkgYW5kIGFjY291bnRzLWdvb2dsZSxcXG5cIiArXG4gICAgXCJidXQgZGlkbid0IGluc3RhbGwgdGhlIGNvbmZpZ3VyYXRpb24gVUkgZm9yIHRoZSBHb29nbGVcXG5cIiArXG4gICAgXCJPQXV0aC4gWW91IGNhbiBpbnN0YWxsIGl0IHdpdGg6XFxuXCIgK1xuICAgIFwiXFxuXCIgK1xuICAgIFwiICAgIG1ldGVvciBhZGQgZ29vZ2xlLWNvbmZpZy11aVwiICtcbiAgICBcIlxcblwiXG4gICk7XG59XG4iLCJBY2NvdW50cy5vYXV0aC5yZWdpc3RlclNlcnZpY2UoJ2dvb2dsZScpO1xuXG5pZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gIGNvbnN0IGxvZ2luV2l0aEdvb2dsZSA9IChvcHRpb25zLCBjYWxsYmFjaykgPT4ge1xuICAgIC8vIHN1cHBvcnQgYSBjYWxsYmFjayB3aXRob3V0IG9wdGlvbnNcbiAgICBpZiAoISBjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoTWV0ZW9yLmlzQ29yZG92YSAmJlxuICAgICAgICBHb29nbGUuc2lnbkluKSB7XG4gICAgICAvLyBBZnRlciAyMCBBcHJpbCAyMDE3LCBHb29nbGUgT0F1dGggbG9naW4gd2lsbCBubyBsb25nZXIgd29yayBmcm9tXG4gICAgICAvLyBhIFdlYlZpZXcsIHNvIENvcmRvdmEgYXBwcyBtdXN0IHVzZSBHb29nbGUgU2lnbi1JbiBpbnN0ZWFkLlxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzgyNTNcbiAgICAgIEdvb2dsZS5zaWduSW4ob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFVzZSBHb29nbGUncyBkb21haW4tc3BlY2lmaWMgbG9naW4gcGFnZSBpZiB3ZSB3YW50IHRvIHJlc3RyaWN0IGNyZWF0aW9uIHRvXG4gICAgLy8gYSBwYXJ0aWN1bGFyIGVtYWlsIGRvbWFpbi4gKERvbid0IHVzZSBpdCBpZiByZXN0cmljdENyZWF0aW9uQnlFbWFpbERvbWFpblxuICAgIC8vIGlzIGEgZnVuY3Rpb24uKSBOb3RlIHRoYXQgYWxsIHRoaXMgZG9lcyBpcyBjaGFuZ2UgR29vZ2xlJ3MgVUkgLS0tXG4gICAgLy8gYWNjb3VudHMtYmFzZS9hY2NvdW50c19zZXJ2ZXIuanMgc3RpbGwgY2hlY2tzIHNlcnZlci1zaWRlIHRoYXQgdGhlIHNlcnZlclxuICAgIC8vIGhhcyB0aGUgcHJvcGVyIGVtYWlsIGFkZHJlc3MgYWZ0ZXIgdGhlIE9BdXRoIGNvbnZlcnNhdGlvbi5cbiAgICBpZiAodHlwZW9mIEFjY291bnRzLl9vcHRpb25zLnJlc3RyaWN0Q3JlYXRpb25CeUVtYWlsRG9tYWluID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9O1xuICAgICAgb3B0aW9ucy5sb2dpblVybFBhcmFtZXRlcnMgPSB7IC4uLm9wdGlvbnMubG9naW5VcmxQYXJhbWV0ZXJzIH07XG4gICAgICBvcHRpb25zLmxvZ2luVXJsUGFyYW1ldGVycy5oZCA9IEFjY291bnRzLl9vcHRpb25zLnJlc3RyaWN0Q3JlYXRpb25CeUVtYWlsRG9tYWluO1xuICAgIH1cbiAgICBjb25zdCBjcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlQ2FsbGJhY2sgPSBBY2NvdW50cy5vYXV0aC5jcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlSGFuZGxlcihjYWxsYmFjayk7XG4gICAgR29vZ2xlLnJlcXVlc3RDcmVkZW50aWFsKG9wdGlvbnMsIGNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayk7XG4gIH07XG4gIEFjY291bnRzLnJlZ2lzdGVyQ2xpZW50TG9naW5GdW5jdGlvbignZ29vZ2xlJywgbG9naW5XaXRoR29vZ2xlKTtcbiAgTWV0ZW9yLmxvZ2luV2l0aEdvb2dsZSA9IFxuICAgICguLi5hcmdzKSA9PiBBY2NvdW50cy5hcHBseUxvZ2luRnVuY3Rpb24oJ2dvb2dsZScsIGFyZ3MpO1xufSBlbHNlIHtcbiAgQWNjb3VudHMuYWRkQXV0b3B1Ymxpc2hGaWVsZHMoe1xuICAgIGZvckxvZ2dlZEluVXNlcjpcbiAgICAgIC8vIHB1Ymxpc2ggYWNjZXNzIHRva2VuIHNpbmNlIGl0IGNhbiBiZSB1c2VkIGZyb20gdGhlIGNsaWVudCAoaWZcbiAgICAgIC8vIHRyYW5zbWl0dGVkIG92ZXIgc3NsIG9yIG9uXG4gICAgICAvLyBsb2NhbGhvc3QpLiBodHRwczovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS9hY2NvdW50cy9kb2NzL09BdXRoMlVzZXJBZ2VudFxuICAgICAgLy8gcmVmcmVzaCB0b2tlbiBwcm9iYWJseSBzaG91bGRuJ3QgYmUgc2VudCBkb3duLlxuICAgICAgR29vZ2xlLndoaXRlbGlzdGVkRmllbGRzLmNvbmNhdChbJ2FjY2Vzc1Rva2VuJywgJ2V4cGlyZXNBdCddKS5tYXAoXG4gICAgICAgIHN1YmZpZWxkID0+IGBzZXJ2aWNlcy5nb29nbGUuJHtzdWJmaWVsZH1gIC8vIGRvbid0IHB1Ymxpc2ggcmVmcmVzaCB0b2tlblxuICAgICAgKSwgXG5cbiAgICBmb3JPdGhlclVzZXJzOiBcbiAgICAgIC8vIGV2ZW4gd2l0aCBhdXRvcHVibGlzaCwgbm8gbGVnaXRpbWF0ZSB3ZWIgYXBwIHNob3VsZCBiZVxuICAgICAgLy8gcHVibGlzaGluZyBhbGwgdXNlcnMnIGVtYWlsc1xuICAgICAgR29vZ2xlLndoaXRlbGlzdGVkRmllbGRzLmZpbHRlcihcbiAgICAgICAgZmllbGQgPT4gZmllbGQgIT09ICdlbWFpbCcgJiYgZmllbGQgIT09ICd2ZXJpZmllZF9lbWFpbCdcbiAgICAgICkubWFwKFxuICAgICAgICBzdWJmaWVsZCA9PiBgc2VydmljZXMuZ29vZ2xlJHtzdWJmaWVsZH1gXG4gICAgICApLFxuICB9KTtcbn1cbiJdfQ==
