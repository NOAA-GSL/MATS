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

  Meteor.loginWithGoogle = function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return Accounts.applyLoginFunction('google', args);
  };
} else {
  Accounts.addAutopublishFields({
    forLoggedInUser: // publish access token since it can be used from the client (if
    // transmitted over ssl or on
    // localhost). https://developers.google.com/accounts/docs/OAuth2UserAgent
    // refresh token probably shouldn't be sent down.
    Google.whitelistedFields.concat(['accessToken', 'expiresAt']).map(subfield => "services.google.".concat(subfield) // don't publish refresh token
    ),
    forOtherUsers: // even with autopublish, no legitimate web app should be
    // publishing all users' emails
    Google.whitelistedFields.filter(field => field !== 'email' && field !== 'verified_email').map(subfield => "services.google".concat(subfield))
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
