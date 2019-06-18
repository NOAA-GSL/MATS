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
var Reload = Package.reload.Reload;
var Base64 = Package.base64.Base64;
var URL = Package.url.URL;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var OAuth, Oauth;

var require = meteorInstall({"node_modules":{"meteor":{"oauth":{"oauth_client.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth/oauth_client.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// credentialToken -> credentialSecret. You must provide both the
// credentialToken and the credentialSecret to retrieve an access token from
// the _pendingCredentials collection.
const credentialSecrets = {};
OAuth = {};

OAuth.showPopup = (url, callback, dimensions) => {
  throw new Error("OAuth.showPopup must be implemented on this arch.");
}; // Determine the login style (popup or redirect) for this login flow.
//
//


OAuth._loginStyle = (service, config, options) => {
  if (Meteor.isCordova) {
    return "popup";
  }

  let loginStyle = options && options.loginStyle || config.loginStyle || 'popup';
  if (!["popup", "redirect"].includes(loginStyle)) throw new Error("Invalid login style: ".concat(loginStyle)); // If we don't have session storage (for example, Safari in private
  // mode), the redirect login flow won't work, so fallback to the
  // popup style.

  if (loginStyle === 'redirect') {
    try {
      sessionStorage.setItem('Meteor.oauth.test', 'test');
      sessionStorage.removeItem('Meteor.oauth.test');
    } catch (e) {
      loginStyle = 'popup';
    }
  }

  return loginStyle;
};

OAuth._stateParam = (loginStyle, credentialToken, redirectUrl) => {
  const state = {
    loginStyle,
    credentialToken,
    isCordova: Meteor.isCordova
  };
  if (loginStyle === 'redirect') state.redirectUrl = redirectUrl || '' + window.location; // Encode base64 as not all login services URI-encode the state
  // parameter when they pass it back to us.
  // Use the 'base64' package here because 'btoa' isn't supported in IE8/9.

  return Base64.encode(JSON.stringify(state));
}; // At the beginning of the redirect login flow, before we redirect to
// the login service, save the credential token for this login attempt
// in the reload migration data.
//


OAuth.saveDataForRedirect = (loginService, credentialToken) => {
  Reload._onMigrate('oauth', () => [true, {
    loginService,
    credentialToken
  }]);

  Reload._migrate(null, {
    immediateMigration: true
  });
}; // At the end of the redirect login flow, when we've redirected back
// to the application, retrieve the credentialToken and (if the login
// was successful) the credentialSecret.
//
// Called at application startup.  Returns null if this is normal
// application startup and we weren't just redirected at the end of
// the login flow.
//


OAuth.getDataAfterRedirect = () => {
  const migrationData = Reload._migrationData('oauth');

  if (!(migrationData && migrationData.credentialToken)) return null;
  const {
    credentialToken
  } = migrationData;
  const key = OAuth._storageTokenPrefix + credentialToken;
  let credentialSecret;

  try {
    credentialSecret = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
  } catch (e) {
    Meteor._debug('error retrieving credentialSecret', e);
  }

  return {
    loginService: migrationData.loginService,
    credentialToken,
    credentialSecret
  };
}; // Launch an OAuth login flow.  For the popup login style, show the
// popup.  For the redirect login style, save the credential token for
// this login attempt in the reload migration data, and redirect to
// the service for the login.
//
// options:
//  loginService: "facebook", "google", etc.
//  loginStyle: "popup" or "redirect"
//  loginUrl: The URL at the login service provider to start the OAuth flow.
//  credentialRequestCompleteCallback: for the popup flow, call when the popup
//    is closed and we have the credential from the login service.
//  credentialToken: our identifier for this login flow.
//


OAuth.launchLogin = options => {
  if (!options.loginService) throw new Error('loginService required');

  if (options.loginStyle === 'popup') {
    OAuth.showPopup(options.loginUrl, options.credentialRequestCompleteCallback.bind(null, options.credentialToken), options.popupOptions);
  } else if (options.loginStyle === 'redirect') {
    OAuth.saveDataForRedirect(options.loginService, options.credentialToken);
    window.location = options.loginUrl;
  } else {
    throw new Error('invalid login style');
  }
}; // XXX COMPAT WITH 0.7.0.1
// Private interface but probably used by many oauth clients in atmosphere.


OAuth.initiateLogin = (credentialToken, url, callback, dimensions) => {
  OAuth.showPopup(url, callback.bind(null, credentialToken), dimensions);
}; // Called by the popup when the OAuth flow is completed, right before
// the popup closes.


OAuth._handleCredentialSecret = (credentialToken, secret) => {
  check(credentialToken, String);
  check(secret, String);

  if (!Object.prototype.hasOwnProperty.call(credentialSecrets, credentialToken)) {
    credentialSecrets[credentialToken] = secret;
  } else {
    throw new Error("Duplicate credential token from OAuth login");
  }
}; // Used by accounts-oauth, which needs both a credentialToken and the
// corresponding to credential secret to call the `login` method over DDP.


OAuth._retrieveCredentialSecret = credentialToken => {
  // First check the secrets collected by OAuth._handleCredentialSecret,
  // then check localStorage. This matches what we do in
  // end_of_login_response.html.
  let secret = credentialSecrets[credentialToken];

  if (!secret) {
    const localStorageKey = OAuth._storageTokenPrefix + credentialToken;
    secret = Meteor._localStorage.getItem(localStorageKey);

    Meteor._localStorage.removeItem(localStorageKey);
  } else {
    delete credentialSecrets[credentialToken];
  }

  return secret;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oauth_browser.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth/oauth_browser.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Browser specific code for the OAuth package.
// Open a popup window, centered on the screen, and call a callback when it
// closes.
//
// @param url {String} url to show
// @param callback {Function} Callback function to call on completion. Takes no
//   arguments.
// @param dimensions {optional Object(width, height)} The dimensions of
//   the popup. If not passed defaults to something sane.
OAuth.showPopup = (url, callback, dimensions) => {
  // default dimensions that worked well for facebook and google
  const popup = openCenteredPopup(url, dimensions && dimensions.width || 650, dimensions && dimensions.height || 331);
  const checkPopupOpen = setInterval(() => {
    let popupClosed;

    try {
      // Fix for #328 - added a second test criteria (popup.closed === undefined)
      // to humour this Android quirk:
      // http://code.google.com/p/android/issues/detail?id=21061
      popupClosed = popup.closed || popup.closed === undefined;
    } catch (e) {
      // For some unknown reason, IE9 (and others?) sometimes (when
      // the popup closes too quickly?) throws "SCRIPT16386: No such
      // interface supported" when trying to read 'popup.closed'. Try
      // again in 100ms.
      return;
    }

    if (popupClosed) {
      clearInterval(checkPopupOpen);
      callback();
    }
  }, 100);
};

const openCenteredPopup = function (url, width, height) {
  const screenX = typeof window.screenX !== 'undefined' ? window.screenX : window.screenLeft;
  const screenY = typeof window.screenY !== 'undefined' ? window.screenY : window.screenTop;
  const outerWidth = typeof window.outerWidth !== 'undefined' ? window.outerWidth : document.body.clientWidth;
  const outerHeight = typeof window.outerHeight !== 'undefined' ? window.outerHeight : document.body.clientHeight - 22; // XXX what is the 22?
  // Use `outerWidth - width` and `outerHeight - height` for help in
  // positioning the popup centered relative to the current window

  const left = screenX + (outerWidth - width) / 2;
  const top = screenY + (outerHeight - height) / 2;
  const features = "width=".concat(width, ",height=").concat(height) + ",left=".concat(left, ",top=").concat(top, ",scrollbars=yes'");
  const newwindow = window.open(url, 'Login', features);

  if (typeof newwindow === 'undefined') {
    // blocked by a popup blocker maybe?
    const err = new Error("The login popup was blocked by the browser");
    err.attemptedUrl = url;
    throw err;
  }

  if (newwindow.focus) newwindow.focus();
  return newwindow;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oauth_common.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth/oauth_common.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

OAuth._storageTokenPrefix = "Meteor.oauth.credentialSecret-";

OAuth._redirectUri = (serviceName, config, params, absoluteUrlOptions) => {
  // XXX COMPAT WITH 0.9.0
  // The redirect URI used to have a "?close" query argument.  We
  // detect whether we need to be backwards compatible by checking for
  // the absence of the `loginStyle` field, which wasn't used in the
  // code which had the "?close" argument.
  // This logic is duplicated in the tool so that the tool can do OAuth
  // flow with <= 0.9.0 servers (tools/auth.js).
  const query = config.loginStyle ? null : "close"; // Clone because we're going to mutate 'params'. The 'cordova' and
  // 'android' parameters are only used for picking the host of the
  // redirect URL, and not actually included in the redirect URL itself.

  let isCordova = false;
  let isAndroid = false;

  if (params) {
    params = (0, _objectSpread2.default)({}, params);
    isCordova = params.cordova;
    isAndroid = params.android;
    delete params.cordova;
    delete params.android;

    if (Object.keys(params).length === 0) {
      params = undefined;
    }
  }

  if (Meteor.isServer && isCordova) {
    const url = Npm.require('url');

    let rootUrl = process.env.MOBILE_ROOT_URL || __meteor_runtime_config__.ROOT_URL;

    if (isAndroid) {
      // Match the replace that we do in cordova boilerplate
      // (boilerplate-generator package).
      // XXX Maybe we should put this in a separate package or something
      // that is used here and by boilerplate-generator? Or maybe
      // `Meteor.absoluteUrl` should know how to do this?
      const parsedRootUrl = url.parse(rootUrl);

      if (parsedRootUrl.hostname === "localhost") {
        parsedRootUrl.hostname = "10.0.2.2";
        delete parsedRootUrl.host;
      }

      rootUrl = url.format(parsedRootUrl);
    }

    absoluteUrlOptions = (0, _objectSpread2.default)({}, absoluteUrlOptions, {
      // For Cordova clients, redirect to the special Cordova root url
      // (likely a local IP in development mode).
      rootUrl
    });
  }

  return URL._constructUrl(Meteor.absoluteUrl("_oauth/".concat(serviceName), absoluteUrlOptions), query, params);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deprecated.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth/deprecated.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// XXX COMPAT WITH 0.8.0
Oauth = OAuth;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/oauth/oauth_client.js");
require("/node_modules/meteor/oauth/oauth_browser.js");
require("/node_modules/meteor/oauth/oauth_common.js");
require("/node_modules/meteor/oauth/deprecated.js");

/* Exports */
Package._define("oauth", {
  OAuth: OAuth,
  Oauth: Oauth
});

})();
