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
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var Accounts = Package['accounts-base'].Accounts;
var Template = Package['templating-runtime'].Template;
var Session = Package.session.Session;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Blaze = Package.blaze.Blaze;
var UI = Package.blaze.UI;
var Handlebars = Package.blaze.Handlebars;
var Spacebars = Package.spacebars.Spacebars;
var HTML = Package.htmljs.HTML;

/* Package-scope variables */
var str;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-ui-unstyled":{"accounts_ui.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/accounts_ui.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  passwordSignupFields: () => passwordSignupFields
});

/**
 * @summary Accounts UI
 * @namespace
 * @memberOf Accounts
 * @importFromPackage accounts-base
 */
Accounts.ui = {
  _options: {
    requestPermissions: Object.create(null),
    requestOfflineToken: Object.create(null),
    forceApprovalPrompt: Object.create(null)
  }
};
const VALID_OPTIONS = new Set().add('passwordSignupFields').add('requestPermissions').add('requestOfflineToken').add('forceApprovalPrompt');
const VALID_PASSWORD_SIGNUP_FIELDS = new Set().add("USERNAME_AND_EMAIL").add("USERNAME_AND_OPTIONAL_EMAIL").add("USERNAME_ONLY").add("EMAIL_ONLY");

function isValidPasswordSignupField(field) {
  return VALID_PASSWORD_SIGNUP_FIELDS.has(field);
}
/**
 * @summary Configure the behavior of [`{{> loginButtons}}`](#accountsui).
 * @locus Client
 * @param {Object} options
 * @param {Object} options.requestPermissions Which [permissions](#requestpermissions) to request from the user for each external service.
 * @param {Object} options.requestOfflineToken To ask the user for permission to act on their behalf when offline, map the relevant external service to `true`. Currently only supported with Google. See [Meteor.loginWithExternalService](#meteor_loginwithexternalservice) for more details.
 * @param {Object} options.forceApprovalPrompt If true, forces the user to approve the app's permissions, even if previously approved. Currently only supported with Google.
 * @param {String} options.passwordSignupFields Which fields to display in the user creation form. One of '`USERNAME_AND_EMAIL`', '`USERNAME_AND_OPTIONAL_EMAIL`', '`USERNAME_ONLY`', or '`EMAIL_ONLY`' (default).
 * @importFromPackage accounts-base
 */


Accounts.ui.config = options => {
  Object.keys(options).forEach(key => {
    if (!VALID_OPTIONS.has(key)) {
      throw new Error("Accounts.ui.config: Invalid option: ".concat(key));
    }
  });
  handlePasswordSignupFields(options);
  handleRequestPermissions(options);
  handleRequestOfflineToken(options);
  handleForceApprovalPrompt(options);
};

function handlePasswordSignupFields(options) {
  let {
    passwordSignupFields
  } = options;

  if (passwordSignupFields) {
    const reportInvalid = () => {
      throw new Error("Accounts.ui.config: Invalid option for `passwordSignupFields`: ".concat(passwordSignupFields));
    };

    if (typeof passwordSignupFields === "string") {
      module.runSetters(passwordSignupFields = [passwordSignupFields]);
    } else if (!Array.isArray(passwordSignupFields)) {
      reportInvalid();
    }

    if (passwordSignupFields.every(isValidPasswordSignupField)) {
      if (Accounts.ui._options.passwordSignupFields) {
        throw new Error("Accounts.ui.config: Can't set `passwordSignupFields` more than once");
      }

      Object.assign(Accounts.ui._options, {
        passwordSignupFields
      });
      return;
    }

    reportInvalid();
  }
}

function passwordSignupFields() {
  const {
    passwordSignupFields
  } = Accounts.ui._options;

  if (Array.isArray(passwordSignupFields)) {
    return passwordSignupFields;
  }

  if (typeof passwordSignupFields === 'string') {
    return [passwordSignupFields];
  }

  return ["EMAIL_ONLY"];
}

function handleRequestPermissions(_ref) {
  let {
    requestPermissions
  } = _ref;

  if (requestPermissions) {
    Object.keys(requestPermissions).forEach(service => {
      if (Accounts.ui._options.requestPermissions[service]) {
        throw new Error("Accounts.ui.config: Can't set `requestPermissions` more than once for ".concat(service));
      }

      const scope = requestPermissions[service];

      if (!Array.isArray(scope)) {
        throw new Error("Accounts.ui.config: Value for `requestPermissions` must be an array");
      }

      Accounts.ui._options.requestPermissions[service] = scope;
    });
  }
}

function handleRequestOfflineToken(_ref2) {
  let {
    requestOfflineToken
  } = _ref2;

  if (requestOfflineToken) {
    Object.keys(requestOfflineToken).forEach(service => {
      if (service !== 'google') {
        throw new Error("Accounts.ui.config: `requestOfflineToken` only supported for Google login at the moment.");
      }

      if (Accounts.ui._options.requestOfflineToken[service]) {
        throw new Error("Accounts.ui.config: Can't set `requestOfflineToken` more than once for ".concat(service));
      }

      Accounts.ui._options.requestOfflineToken[service] = requestOfflineToken[service];
    });
  }
}

function handleForceApprovalPrompt(_ref3) {
  let {
    forceApprovalPrompt
  } = _ref3;

  if (forceApprovalPrompt) {
    Object.keys(forceApprovalPrompt).forEach(service => {
      if (service !== 'google') {
        throw new Error("Accounts.ui.config: `forceApprovalPrompt` only supported for Google login at the moment.");
      }

      if (Accounts.ui._options.forceApprovalPrompt[service]) {
        throw new Error("Accounts.ui.config: Can't set `forceApprovalPrompt` more than once for ".concat(service));
      }

      Accounts.ui._options.forceApprovalPrompt[service] = forceApprovalPrompt[service];
    });
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.login_buttons.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/template.login_buttons.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("loginButtons");
Template["loginButtons"] = new Template("Template.loginButtons", (function() {
  var view = this;
  return HTML.DIV({
    id: "login-buttons",
    class: function() {
      return [ "login-buttons-dropdown-align-", Spacebars.mustache(view.lookup("align")) ];
    }
  }, "\n    ", Blaze.If(function() {
    return Spacebars.call(view.lookup("currentUser"));
  }, function() {
    return [ "\n      ", Blaze.If(function() {
      return Spacebars.call(view.lookup("loggingInOrOut"));
    }, function() {
      return [ "\n        \n        ", Blaze.If(function() {
        return Spacebars.call(view.lookup("dropdown"));
      }, function() {
        return [ "\n          ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggingIn")), "\n        " ];
      }, function() {
        return [ "\n          ", HTML.DIV({
          class: "login-buttons-with-only-one-button"
        }, "\n            ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggingInSingleLoginButton")), "\n          "), "\n        " ];
      }), "\n      " ];
    }, function() {
      return [ "\n        ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedIn")), "\n      " ];
    }), "\n    " ];
  }, function() {
    return [ "\n      ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedOut")), "\n    " ];
  }), "\n  ");
}));

Template.__checkName("_loginButtonsLoggedIn");
Template["_loginButtonsLoggedIn"] = new Template("Template._loginButtonsLoggedIn", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("dropdown"));
  }, function() {
    return [ "\n    ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedInDropdown")), "\n  " ];
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "login-buttons-with-only-one-button"
    }, "\n      ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedInSingleLogoutButton")), "\n    "), "\n  " ];
  });
}));

Template.__checkName("_loginButtonsLoggedOut");
Template["_loginButtonsLoggedOut"] = new Template("Template._loginButtonsLoggedOut", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("services"));
  }, function() {
    return [ " \n    ", Blaze.If(function() {
      return Spacebars.call(view.lookup("configurationLoaded"));
    }, function() {
      return [ "\n      ", Blaze.If(function() {
        return Spacebars.call(view.lookup("dropdown"));
      }, function() {
        return [ " \n        ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedOutDropdown")), "\n      " ];
      }, function() {
        return [ "\n        ", Spacebars.With(function() {
          return Spacebars.call(view.lookup("singleService"));
        }, function() {
          return [ " \n          ", HTML.DIV({
            class: "login-buttons-with-only-one-button"
          }, "\n            ", Blaze.If(function() {
            return Spacebars.call(view.lookup("loggingIn"));
          }, function() {
            return [ "\n              ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggingInSingleLoginButton")), "\n            " ];
          }, function() {
            return [ "\n              ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedOutSingleLoginButton")), "\n            " ];
          }), "\n          "), "\n        " ];
        }), "\n      " ];
      }), "\n    " ];
    }), "\n  " ];
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "no-services"
    }, "No login services configured"), "\n  " ];
  });
}));

Template.__checkName("_loginButtonsMessages");
Template["_loginButtonsMessages"] = new Template("Template._loginButtonsMessages", (function() {
  var view = this;
  return [ Blaze.If(function() {
    return Spacebars.call(view.lookup("errorMessage"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "message error-message"
    }, Blaze.View("lookup:errorMessage", function() {
      return Spacebars.mustache(view.lookup("errorMessage"));
    })), "\n  " ];
  }), "\n  ", Blaze.If(function() {
    return Spacebars.call(view.lookup("infoMessage"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "message info-message"
    }, Blaze.View("lookup:infoMessage", function() {
      return Spacebars.mustache(view.lookup("infoMessage"));
    })), "\n  " ];
  }) ];
}));

Template.__checkName("_loginButtonsLoggingIn");
Template["_loginButtonsLoggingIn"] = new Template("Template._loginButtonsLoggingIn", (function() {
  var view = this;
  return [ Spacebars.include(view.lookupTemplate("_loginButtonsLoggingInPadding")), HTML.Raw('\n  <div class="loading">&nbsp;</div>\n  '), Spacebars.include(view.lookupTemplate("_loginButtonsLoggingInPadding")) ];
}));

Template.__checkName("_loginButtonsLoggingInPadding");
Template["_loginButtonsLoggingInPadding"] = new Template("Template._loginButtonsLoggingInPadding", (function() {
  var view = this;
  return Blaze.Unless(function() {
    return Spacebars.call(view.lookup("dropdown"));
  }, function() {
    return [ "\n    \n    ", HTML.DIV({
      class: "login-buttons-padding"
    }, "\n      ", HTML.DIV({
      class: "login-button single-login-button",
      style: "visibility: hidden;",
      id: "login-buttons-logout"
    }, HTML.CharRef({
      html: "&nbsp;",
      str: " "
    })), "\n    "), "\n  " ];
  }, function() {
    return [ "\n    \n    ", HTML.DIV({
      class: "login-buttons-padding"
    }), "\n  " ];
  });
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.login_buttons_single.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/template.login_buttons_single.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("_loginButtonsLoggedOutSingleLoginButton");
Template["_loginButtonsLoggedOutSingleLoginButton"] = new Template("Template._loginButtonsLoggedOutSingleLoginButton", (function() {
  var view = this;
  return HTML.DIV({
    class: "login-text-and-button"
  }, "\n    ", HTML.DIV({
    class: function() {
      return [ "login-button single-login-button ", Blaze.Unless(function() {
        return Spacebars.call(view.lookup("configured"));
      }, function() {
        return "configure-button";
      }) ];
    },
    id: function() {
      return [ "login-buttons-", Spacebars.mustache(view.lookup("name")) ];
    }
  }, "\n      ", Blaze.If(function() {
    return Spacebars.call(view.lookup("cannotConfigure"));
  }, function() {
    return [ "\n        ", HTML.SPAN({
      class: ""
    }, Blaze.View("lookup:capitalizedName", function() {
      return Spacebars.mustache(view.lookup("capitalizedName"));
    }), " not configured"), "\n      " ];
  }, function() {
    return [ "\n        ", HTML.DIV({
      class: "login-image",
      id: function() {
        return [ "login-buttons-image-", Spacebars.mustache(view.lookup("name")) ];
      }
    }), "\n        ", Blaze.If(function() {
      return Spacebars.call(view.lookup("configured"));
    }, function() {
      return [ "\n          ", HTML.SPAN({
        class: function() {
          return [ "text-besides-image sign-in-text-", Spacebars.mustache(view.lookup("name")) ];
        }
      }, "Sign in with ", Blaze.View("lookup:capitalizedName", function() {
        return Spacebars.mustache(view.lookup("capitalizedName"));
      })), "\n        " ];
    }, function() {
      return [ "\n            ", HTML.SPAN({
        class: function() {
          return [ "text-besides-image configure-text-", Spacebars.mustache(view.lookup("name")) ];
        }
      }, "Configure ", Blaze.View("lookup:capitalizedName", function() {
        return Spacebars.mustache(view.lookup("capitalizedName"));
      }), " Login"), "\n        " ];
    }), "\n      " ];
  }), "\n    "), "\n  ");
}));

Template.__checkName("_loginButtonsLoggingInSingleLoginButton");
Template["_loginButtonsLoggingInSingleLoginButton"] = new Template("Template._loginButtonsLoggingInSingleLoginButton", (function() {
  var view = this;
  return HTML.DIV({
    class: "login-text-and-button"
  }, "\n    ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggingIn")), "\n  ");
}));

Template.__checkName("_loginButtonsLoggedInSingleLogoutButton");
Template["_loginButtonsLoggedInSingleLogoutButton"] = new Template("Template._loginButtonsLoggedInSingleLogoutButton", (function() {
  var view = this;
  return HTML.DIV({
    class: "login-text-and-button"
  }, "\n    ", HTML.DIV({
    class: "login-display-name"
  }, "\n      ", Blaze.View("lookup:displayName", function() {
    return Spacebars.mustache(view.lookup("displayName"));
  }), "\n    "), HTML.Raw('\n    <div class="login-button single-login-button" id="login-buttons-logout">Sign Out</div>\n  '));
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.login_buttons_dropdown.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/template.login_buttons_dropdown.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.__checkName("_loginButtonsLoggedInDropdown");
Template["_loginButtonsLoggedInDropdown"] = new Template("Template._loginButtonsLoggedInDropdown", (function() {
  var view = this;
  return HTML.DIV({
    class: "login-link-and-dropdown-list"
  }, "\n    ", HTML.A({
    class: "login-link-text",
    id: "login-name-link"
  }, "\n      ", Blaze.View("lookup:displayName", function() {
    return Spacebars.mustache(view.lookup("displayName"));
  }), " ▾\n    "), "\n\n    ", Blaze.If(function() {
    return Spacebars.call(view.lookup("dropdownVisible"));
  }, function() {
    return [ "\n      ", HTML.DIV({
      id: "login-dropdown-list",
      class: "accounts-dialog"
    }, "\n        ", HTML.A({
      class: "login-close-text"
    }, "Close"), "\n        ", HTML.DIV({
      class: "login-close-text-clear"
    }), "\n\n        ", Blaze.If(function() {
      return Spacebars.call(view.lookup("inMessageOnlyFlow"));
    }, function() {
      return [ "\n          ", Spacebars.include(view.lookupTemplate("_loginButtonsMessages")), "\n        " ];
    }, function() {
      return [ "\n          ", Blaze.If(function() {
        return Spacebars.call(view.lookup("inChangePasswordFlow"));
      }, function() {
        return [ "\n            ", Spacebars.include(view.lookupTemplate("_loginButtonsChangePassword")), "\n          " ];
      }, function() {
        return [ "\n            ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedInDropdownActions")), "\n          " ];
      }), "\n        " ];
    }), "\n      "), "\n    " ];
  }), "\n  ");
}));

Template.__checkName("_loginButtonsLoggedInDropdownActions");
Template["_loginButtonsLoggedInDropdownActions"] = new Template("Template._loginButtonsLoggedInDropdownActions", (function() {
  var view = this;
  return [ Blaze.If(function() {
    return Spacebars.call(view.lookup("allowChangingPassword"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "login-button",
      id: "login-buttons-open-change-password"
    }, "\n      Change password\n    "), "\n  " ];
  }), HTML.Raw('\n\n  <div class="login-button" id="login-buttons-logout">\n    Sign out\n  </div>\n\n  '), Spacebars.include(view.lookupTemplate("_loginButtonsMessages")) ];
}));

Template.__checkName("_loginButtonsLoggedOutDropdown");
Template["_loginButtonsLoggedOutDropdown"] = new Template("Template._loginButtonsLoggedOutDropdown", (function() {
  var view = this;
  return HTML.DIV({
    class: function() {
      return [ "login-link-and-dropdown-list ", Spacebars.mustache(view.lookup("additionalClasses")) ];
    }
  }, "\n    ", Blaze.If(function() {
    return Spacebars.call(view.lookup("dropdownVisible"));
  }, function() {
    return [ "\n      \n      ", HTML.A({
      class: "login-link-text",
      id: "login-sign-in-link"
    }, "Sign in ▾"), "\n      ", HTML.DIV({
      id: "login-dropdown-list",
      class: "accounts-dialog"
    }, "\n        ", HTML.A({
      class: "login-close-text"
    }, "Close"), "\n        ", Blaze.If(function() {
      return Spacebars.call(view.lookup("loggingIn"));
    }, function() {
      return [ "\n          ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggingIn")), "\n        " ];
    }), "\n        ", HTML.DIV({
      class: "login-close-text-clear"
    }), "\n        ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedOutAllServices")), "\n      "), "\n    " ];
  }, function() {
    return [ "\n      ", Blaze.If(function() {
      return Spacebars.call(view.lookup("loggingIn"));
    }, function() {
      return [ "\n        \n        ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggingIn")), "\n      " ];
    }, function() {
      return [ "\n        ", HTML.A({
        class: "login-link-text",
        id: "login-sign-in-link"
      }, "Sign in ▾"), "\n      " ];
    }), "\n    " ];
  }), "\n  ");
}));

Template.__checkName("_loginButtonsLoggedOutAllServices");
Template["_loginButtonsLoggedOutAllServices"] = new Template("Template._loginButtonsLoggedOutAllServices", (function() {
  var view = this;
  return [ Blaze.Each(function() {
    return Spacebars.call(view.lookup("services"));
  }, function() {
    return [ "\n    ", Blaze.If(function() {
      return Spacebars.call(view.lookup("isPasswordService"));
    }, function() {
      return [ "\n      ", Blaze.If(function() {
        return Spacebars.call(view.lookup("hasOtherServices"));
      }, function() {
        return [ " \n        ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedOutPasswordServiceSeparator")), "\n      " ];
      }), "\n      ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedOutPasswordService")), "\n    " ];
    }, function() {
      return [ "\n      ", Spacebars.include(view.lookupTemplate("_loginButtonsLoggedOutSingleLoginButton")), "\n    " ];
    }), "\n  " ];
  }), "\n\n  ", Blaze.Unless(function() {
    return Spacebars.call(view.lookup("hasPasswordService"));
  }, function() {
    return [ "\n    ", Spacebars.include(view.lookupTemplate("_loginButtonsMessages")), "\n  " ];
  }) ];
}));

Template.__checkName("_loginButtonsLoggedOutPasswordServiceSeparator");
Template["_loginButtonsLoggedOutPasswordServiceSeparator"] = new Template("Template._loginButtonsLoggedOutPasswordServiceSeparator", (function() {
  var view = this;
  return HTML.Raw('<div class="or">\n    <span class="hline">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>\n    <span class="or-text">or</span>\n    <span class="hline">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>\n  </div>');
}));

Template.__checkName("_loginButtonsLoggedOutPasswordService");
Template["_loginButtonsLoggedOutPasswordService"] = new Template("Template._loginButtonsLoggedOutPasswordService", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("inForgotPasswordFlow"));
  }, function() {
    return [ "\n    ", Spacebars.include(view.lookupTemplate("_forgotPasswordForm")), "\n  " ];
  }, function() {
    return [ "\n    ", HTML.FORM({
      class: "login-form login-password-form"
    }, "\n      ", Blaze.Each(function() {
      return Spacebars.call(view.lookup("fields"));
    }, function() {
      return [ "\n        ", Spacebars.include(view.lookupTemplate("_loginButtonsFormField")), "\n      " ];
    }), "\n\n      ", Spacebars.include(view.lookupTemplate("_loginButtonsMessages")), "\n\n      ", HTML.BUTTON({
      class: "login-button login-button-form-submit",
      id: "login-buttons-password"
    }, "\n        ", Blaze.If(function() {
      return Spacebars.call(view.lookup("inSignupFlow"));
    }, function() {
      return "\n          Create account\n        ";
    }, function() {
      return "\n          Sign in\n        ";
    }), "\n      "), "\n\n      ", Blaze.If(function() {
      return Spacebars.call(view.lookup("inLoginFlow"));
    }, function() {
      return [ "\n        ", Blaze.If(function() {
        return Spacebars.call(view.lookup("showCreateAccountLink"));
      }, function() {
        return [ "\n          ", HTML.DIV({
          class: "additional-link-container"
        }, "\n            ", HTML.A({
          id: "signup-link",
          class: "additional-link"
        }, "Create account"), "\n          "), "\n        " ];
      }), "\n\n        ", Blaze.If(function() {
        return Spacebars.call(view.lookup("showForgotPasswordLink"));
      }, function() {
        return [ "\n          ", HTML.DIV({
          class: "additional-link-container"
        }, "\n            ", HTML.A({
          id: "forgot-password-link",
          class: "additional-link"
        }, "Forgot password"), "\n          "), "\n        " ];
      }), "\n      " ];
    }), "\n\n      ", Blaze.If(function() {
      return Spacebars.call(view.lookup("inSignupFlow"));
    }, function() {
      return [ "\n        ", Spacebars.include(view.lookupTemplate("_loginButtonsBackToLoginLink")), "\n      " ];
    }), "\n    "), "\n  " ];
  });
}));

Template.__checkName("_forgotPasswordForm");
Template["_forgotPasswordForm"] = new Template("Template._forgotPasswordForm", (function() {
  var view = this;
  return HTML.FORM({
    class: "login-form"
  }, HTML.Raw('\n    <div id="forgot-password-email-label-and-input"> \n      <label id="forgot-password-email-label" for="forgot-password-email">Email</label>\n      <input id="forgot-password-email" type="email" autocomplete="email">\n    </div>\n\n    '), Spacebars.include(view.lookupTemplate("_loginButtonsMessages")), HTML.Raw('\n\n    <div class="login-button login-button-form-submit" id="login-buttons-forgot-password">\n      Reset password\n    </div>\n\n    '), Spacebars.include(view.lookupTemplate("_loginButtonsBackToLoginLink")), "\n  ");
}));

Template.__checkName("_loginButtonsBackToLoginLink");
Template["_loginButtonsBackToLoginLink"] = new Template("Template._loginButtonsBackToLoginLink", (function() {
  var view = this;
  return HTML.Raw('<div class="additional-link-container">\n    <a id="back-to-login-link" class="additional-link">Sign in</a>\n  </div>');
}));

Template.__checkName("_loginButtonsFormField");
Template["_loginButtonsFormField"] = new Template("Template._loginButtonsFormField", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("visible"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      id: function() {
        return [ "login-", Spacebars.mustache(view.lookup("fieldName")), "-label-and-input" ];
      },
      style: function() {
        return Spacebars.mustache(view.lookup("fieldStyle"));
      }
    }, "\n      ", HTML.LABEL({
      id: function() {
        return [ "login-", Spacebars.mustache(view.lookup("fieldName")), "-label" ];
      },
      for: function() {
        return [ "login-", Spacebars.mustache(view.lookup("fieldName")) ];
      }
    }, "\n        ", Blaze.View("lookup:fieldLabel", function() {
      return Spacebars.mustache(view.lookup("fieldLabel"));
    }), "\n      "), "\n      ", HTML.INPUT({
      id: function() {
        return [ "login-", Spacebars.mustache(view.lookup("fieldName")) ];
      },
      type: function() {
        return Spacebars.mustache(view.lookup("inputType"));
      },
      value: function() {
        return Spacebars.mustache(view.lookup("fieldValue"));
      },
      autocomplete: function() {
        return Spacebars.mustache(view.lookup("autocomplete"));
      }
    }), "\n    "), "\n  " ];
  });
}));

Template.__checkName("_loginButtonsChangePassword");
Template["_loginButtonsChangePassword"] = new Template("Template._loginButtonsChangePassword", (function() {
  var view = this;
  return HTML.FORM({
    class: "login-form"
  }, "\n\n    ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("fields"));
  }, function() {
    return [ "\n      ", Spacebars.include(view.lookupTemplate("_loginButtonsFormField")), "\n    " ];
  }), "\n\n    ", Spacebars.include(view.lookupTemplate("_loginButtonsMessages")), HTML.Raw('\n\n    <div class="login-button login-button-form-submit" id="login-buttons-do-change-password">\n      Change password\n    </div>\n  '));
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.login_buttons_dialogs.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/template.login_buttons_dialogs.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

Template.body.addContent((function() {
  var view = this;
  return [ Spacebars.include(view.lookupTemplate("_resetPasswordDialog")), "\n  ", Spacebars.include(view.lookupTemplate("_justResetPasswordDialog")), "\n  ", Spacebars.include(view.lookupTemplate("_enrollAccountDialog")), "\n  ", Spacebars.include(view.lookupTemplate("_justVerifiedEmailDialog")), "\n  ", Spacebars.include(view.lookupTemplate("_configureLoginServiceDialog")), "\n  ", Spacebars.include(view.lookupTemplate("_configureLoginOnDesktopDialog")), "\n\n  \n  ", Spacebars.include(view.lookupTemplate("_loginButtonsMessagesDialog")) ];
}));
Meteor.startup(Template.body.renderToDocument);

Template.__checkName("_resetPasswordDialog");
Template["_resetPasswordDialog"] = new Template("Template._resetPasswordDialog", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("inResetPasswordFlow"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "hide-background"
    }), "\n\n    ", HTML.FORM({
      class: "accounts-dialog accounts-centered-dialog"
    }, "\n      ", HTML.LABEL({
      id: "reset-password-username-email-label",
      for: "reset-password-username-email",
      style: "display: none;"
    }, "\n        Username or email\n      "), " \n\n      ", HTML.DIV({
      class: "reset-password-username-email-wrapper",
      style: "display: none;"
    }, "\n        ", HTML.INPUT({
      id: "reset-password-username-email",
      type: "text",
      value: function() {
        return Spacebars.mustache(view.lookup("displayName"));
      },
      autocomplete: "username email",
      disabled: ""
    }), "\n      "), "\n\n      ", HTML.LABEL({
      id: "reset-password-new-password-label",
      for: "reset-password-new-password"
    }, "\n        New password\n      "), "      \n\n      ", HTML.DIV({
      class: "reset-password-new-password-wrapper"
    }, "\n        ", HTML.INPUT({
      id: "reset-password-new-password",
      type: "password",
      autocomplete: "new-password"
    }), "\n      "), "\n\n      ", Spacebars.include(view.lookupTemplate("_loginButtonsMessages")), "\n\n      ", HTML.DIV({
      class: "login-button login-button-form-submit",
      id: "login-buttons-reset-password-button"
    }, "\n        Set password\n      "), "\n\n      ", HTML.A({
      class: "accounts-close",
      id: "login-buttons-cancel-reset-password"
    }, HTML.CharRef({
      html: "&times;",
      str: "×"
    })), "\n    "), "\n  " ];
  });
}));

Template.__checkName("_justResetPasswordDialog");
Template["_justResetPasswordDialog"] = new Template("Template._justResetPasswordDialog", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("visible"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "accounts-dialog accounts-centered-dialog"
    }, "\n      Password reset.\n      You are now logged in as ", Blaze.View("lookup:displayName", function() {
      return Spacebars.mustache(view.lookup("displayName"));
    }), ".\n      ", HTML.DIV({
      class: "login-button",
      id: "just-verified-dismiss-button"
    }, "Dismiss"), "\n    "), "\n  " ];
  });
}));

Template.__checkName("_enrollAccountDialog");
Template["_enrollAccountDialog"] = new Template("Template._enrollAccountDialog", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("inEnrollAccountFlow"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "hide-background"
    }), "\n\n    ", HTML.FORM({
      class: "accounts-dialog accounts-centered-dialog"
    }, "\n      ", HTML.LABEL({
      id: "enroll-account-username-email-label",
      for: "enroll-account-username-email",
      style: "display: none;"
    }, "\n        Username or email\n      "), " \n\n      ", HTML.DIV({
      class: "enroll-account-username-email-wrapper",
      style: "display: none;"
    }, "\n        ", HTML.INPUT({
      id: "enroll-account-username-email",
      type: "text",
      value: function() {
        return Spacebars.mustache(view.lookup("displayName"));
      },
      autocomplete: "username email",
      disabled: ""
    }), "\n      "), "\n\n      ", HTML.LABEL({
      id: "enroll-account-password-label",
      for: "enroll-account-password"
    }, "\n        Choose a password\n      "), "\n\n      ", HTML.DIV({
      class: "enroll-account-password-wrapper"
    }, "\n        ", HTML.INPUT({
      id: "enroll-account-password",
      type: "password",
      autocomplete: "new-password"
    }), "\n      "), "\n\n      ", Spacebars.include(view.lookupTemplate("_loginButtonsMessages")), "\n\n      ", HTML.DIV({
      class: "login-button login-button-form-submit",
      id: "login-buttons-enroll-account-button"
    }, "\n        Create account\n      "), "\n\n      ", HTML.A({
      class: "accounts-close",
      id: "login-buttons-cancel-enroll-account"
    }, HTML.CharRef({
      html: "&times;",
      str: "×"
    })), "\n    "), "\n  " ];
  });
}));

Template.__checkName("_justVerifiedEmailDialog");
Template["_justVerifiedEmailDialog"] = new Template("Template._justVerifiedEmailDialog", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("visible"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "accounts-dialog accounts-centered-dialog"
    }, "\n      Email verified.\n      You are now logged in as ", Blaze.View("lookup:displayName", function() {
      return Spacebars.mustache(view.lookup("displayName"));
    }), ".\n      ", HTML.DIV({
      class: "login-button",
      id: "just-verified-dismiss-button"
    }, "Dismiss"), "\n    "), "\n  " ];
  });
}));

Template.__checkName("_configureLoginServiceDialog");
Template["_configureLoginServiceDialog"] = new Template("Template._configureLoginServiceDialog", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("visible"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      id: "configure-login-service-dialog",
      class: "accounts-dialog accounts-centered-dialog"
    }, "\n      ", Spacebars.include(view.lookupTemplate("configurationSteps")), "\n\n      ", HTML.P("\n        Now, copy over some details.\n      "), "\n      ", HTML.P("\n        ", HTML.TABLE("\n          ", HTML.COLGROUP("\n            ", HTML.COL({
      span: "1",
      class: "configuration_labels"
    }), "\n            ", HTML.COL({
      span: "1",
      class: "configuration_inputs"
    }), "\n          "), "\n          ", Blaze.Each(function() {
      return Spacebars.call(view.lookup("configurationFields"));
    }, function() {
      return [ "\n            ", HTML.TR("\n              ", HTML.TD("\n                ", HTML.LABEL({
        for: function() {
          return [ "configure-login-service-dialog-", Spacebars.mustache(view.lookup("property")) ];
        }
      }, Blaze.View("lookup:label", function() {
        return Spacebars.mustache(view.lookup("label"));
      })), "\n              "), "\n              ", HTML.TD("\n                ", HTML.INPUT({
        id: function() {
          return [ "configure-login-service-dialog-", Spacebars.mustache(view.lookup("property")) ];
        },
        type: "text"
      }), "\n              "), "\n            "), "\n          " ];
    }), "\n        "), "\n      "), "\n      ", HTML.P({
      class: "new-section"
    }, "\n        Choose the login style:\n      "), "\n      ", HTML.P("\n        ", HTML.CharRef({
      html: "&emsp;",
      str: " "
    }), HTML.INPUT({
      id: "configure-login-service-dialog-popupBasedLogin",
      type: "radio",
      checked: "checked",
      name: "loginStyle",
      value: "popup"
    }), "\n        ", HTML.LABEL({
      for: "configure-login-service-dialog-popupBasedLogin"
    }, "Popup-based login (recommended for most applications)"), "\n\n        ", HTML.BR(), HTML.CharRef({
      html: "&emsp;",
      str: " "
    }), HTML.INPUT({
      id: "configure-login-service-dialog-redirectBasedLogin",
      type: "radio",
      name: "loginStyle",
      value: "redirect"
    }), "\n        ", HTML.LABEL({
      for: "configure-login-service-dialog-redirectBasedLogin"
    }, "\n          Redirect-based login (special cases explained\n          ", HTML.A({
      href: "https://github.com/meteor/meteor/wiki/OAuth-for-mobile-Meteor-clients#popup-versus-redirect-flow",
      target: "_blank"
    }, "here"), ")\n        "), "\n      "), "\n      ", HTML.DIV({
      class: "new-section"
    }, "\n        ", HTML.DIV({
      class: "login-button configure-login-service-dismiss-button"
    }, "\n          I'll do this later\n        "), "\n        ", HTML.A({
      class: "accounts-close configure-login-service-dismiss-button"
    }, HTML.CharRef({
      html: "&times;",
      str: "×"
    })), "\n\n        ", HTML.DIV({
      class: function() {
        return [ "login-button login-button-configure ", Blaze.If(function() {
          return Spacebars.call(view.lookup("saveDisabled"));
        }, function() {
          return "login-button-disabled";
        }) ];
      },
      id: "configure-login-service-dialog-save-configuration"
    }, "\n          Save Configuration\n        "), "\n      "), "\n    "), "\n  " ];
  });
}));

Template.__checkName("_loginButtonsMessagesDialog");
Template["_loginButtonsMessagesDialog"] = new Template("Template._loginButtonsMessagesDialog", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("visible"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "accounts-dialog accounts-centered-dialog",
      id: "login-buttons-message-dialog"
    }, "\n      ", Spacebars.include(view.lookupTemplate("_loginButtonsMessages")), "\n      ", HTML.DIV({
      class: "login-button",
      id: "messages-dialog-dismiss-button"
    }, "Dismiss"), "\n    "), "\n  " ];
  });
}));

Template.__checkName("_configureLoginOnDesktopDialog");
Template["_configureLoginOnDesktopDialog"] = new Template("Template._configureLoginOnDesktopDialog", (function() {
  var view = this;
  return Blaze.If(function() {
    return Spacebars.call(view.lookup("visible"));
  }, function() {
    return [ "\n    ", HTML.DIV({
      class: "accounts-dialog accounts-centered-dialog",
      id: "configure-on-desktop-dialog"
    }, "\n      ", HTML.P("\n        Please configure login on a desktop browser.\n      "), "\n      ", HTML.DIV({
      class: "login-button",
      id: "configure-on-desktop-dismiss-button"
    }, "Dismiss"), "\n    "), "\n  " ];
  });
}));

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"login_buttons_session.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/login_buttons_session.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const VALID_KEYS = ['dropdownVisible', // XXX consider replacing these with one key that has an enum for values.
'inSignupFlow', 'inForgotPasswordFlow', 'inChangePasswordFlow', 'inMessageOnlyFlow', 'errorMessage', 'infoMessage', // dialogs with messages (info and error)
'resetPasswordToken', 'enrollAccountToken', 'justVerifiedEmail', 'justResetPassword', 'configureLoginServiceDialogVisible', 'configureLoginServiceDialogServiceName', 'configureLoginServiceDialogSaveDisabled', 'configureOnDesktopVisible'];

const validateKey = key => {
  if (!VALID_KEYS.includes(key)) throw new Error("Invalid key in loginButtonsSession: ".concat(key));
};

const KEY_PREFIX = "Meteor.loginButtons."; // XXX This should probably be package scope rather than exported
// (there was even a comment to that effect here from before we had
// namespacing) but accounts-ui-viewer uses it, so leave it as is for
// now

const set = (key, value) => {
  validateKey(key);
  if (['errorMessage', 'infoMessage'].includes(key)) throw new Error("Don't set errorMessage or infoMessage directly. Instead, use errorMessage() or infoMessage().");

  _set(key, value);
};

const _set = (key, value) => Session.set(KEY_PREFIX + key, value);

const get = key => {
  validateKey(key);
  return Session.get(KEY_PREFIX + key);
};

const closeDropdown = () => {
  set('inSignupFlow', false);
  set('inForgotPasswordFlow', false);
  set('inChangePasswordFlow', false);
  set('inMessageOnlyFlow', false);
  set('dropdownVisible', false);
  resetMessages();
};

const infoMessage = message => {
  _set("errorMessage", null);

  _set("infoMessage", message);

  ensureMessageVisible();
};

const errorMessage = message => {
  _set("errorMessage", message);

  _set("infoMessage", null);

  ensureMessageVisible();
}; // is there a visible dialog that shows messages (info and error)


const isMessageDialogVisible = () => {
  return get('resetPasswordToken') || get('enrollAccountToken') || get('justVerifiedEmail');
}; // ensure that somethings displaying a message (info or error) is
// visible. If a dialog with messages is open, do nothing;
// otherwise open the dropdown.
//
// Notably this doesn't matter when only displaying a single login
// button since then we have an explicit message dialog
// (_loginButtonsMessageDialog), and dropdownVisible is ignored in
// this case.


const ensureMessageVisible = () => {
  if (!isMessageDialogVisible()) set("dropdownVisible", true);
};

const resetMessages = () => {
  _set("errorMessage", null);

  _set("infoMessage", null);
};

const configureService = name => {
  if (Meteor.isCordova) {
    set('configureOnDesktopVisible', true);
  } else {
    set('configureLoginServiceDialogVisible', true);
    set('configureLoginServiceDialogServiceName', name);
    set('configureLoginServiceDialogSaveDisabled', true);
  }
};

Accounts._loginButtonsSession = {
  set,
  _set,
  get,
  closeDropdown,
  infoMessage,
  errorMessage,
  isMessageDialogVisible,
  ensureMessageVisible,
  resetMessages,
  configureService
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"login_buttons.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/login_buttons.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  displayName: () => displayName,
  getLoginServices: () => getLoginServices,
  hasPasswordService: () => hasPasswordService,
  dropdown: () => dropdown,
  validateUsername: () => validateUsername,
  validateEmail: () => validateEmail,
  validatePassword: () => validatePassword
});
let passwordSignupFields;
module.link("./accounts_ui.js", {
  passwordSignupFields(v) {
    passwordSignupFields = v;
  }

}, 0);
// for convenience
const loginButtonsSession = Accounts._loginButtonsSession; // shared between dropdown and single mode

Template.loginButtons.events({
  'click #login-buttons-logout': () => Meteor.logout(() => loginButtonsSession.closeDropdown())
});
Template.registerHelper('loginButtons', () => {
  throw new Error("Use {{> loginButtons}} instead of {{loginButtons}}");
}); //
// helpers
//

const displayName = () => {
  const user = Meteor.user();
  if (!user) return '';
  if (user.profile && user.profile.name) return user.profile.name;
  if (user.username) return user.username;
  if (user.emails && user.emails[0] && user.emails[0].address) return user.emails[0].address;
  return '';
};

const getLoginServices = () => {
  // First look for OAuth services.
  const services = Package['accounts-oauth'] ? Accounts.oauth.serviceNames() : []; // Be equally kind to all login services. This also preserves
  // backwards-compatibility. (But maybe order should be
  // configurable?)

  services.sort(); // Add password, if it's there; it must come last.

  if (hasPasswordService()) services.push('password');
  return services.map(name => ({
    name
  }));
};

const hasPasswordService = () => !!Package['accounts-password'];

const dropdown = () => hasPasswordService() || getLoginServices().length > 1;

const validateUsername = username => {
  if (username.length >= 3) {
    return true;
  } else {
    loginButtonsSession.errorMessage("Username must be at least 3 characters long");
    return false;
  }
};

const validateEmail = email => {
  if (passwordSignupFields() === "USERNAME_AND_OPTIONAL_EMAIL" && email === '') return true;

  if (email.includes('@')) {
    return true;
  } else {
    loginButtonsSession.errorMessage("Invalid email");
    return false;
  }
};

const validatePassword = password => {
  if (password.length >= 6) {
    return true;
  } else {
    loginButtonsSession.errorMessage("Password must be at least 6 characters long");
    return false;
  }
};

//
// loginButtonLoggedOut template
//
Template._loginButtonsLoggedOut.helpers({
  dropdown,
  services: getLoginServices,
  singleService: () => {
    const services = getLoginServices();
    if (services.length !== 1) throw new Error("Shouldn't be rendering this template with more than one configured service");
    return services[0];
  },
  configurationLoaded: () => Accounts.loginServicesConfigured()
}); //
// loginButtonsLoggedIn template
//
// decide whether we should show a dropdown rather than a row of
// buttons


Template._loginButtonsLoggedIn.helpers({
  dropdown
}); //
// loginButtonsLoggedInSingleLogoutButton template
//


Template._loginButtonsLoggedInSingleLogoutButton.helpers({
  displayName
}); //
// loginButtonsMessage template
//


Template._loginButtonsMessages.helpers({
  errorMessage: () => loginButtonsSession.get('errorMessage')
});

Template._loginButtonsMessages.helpers({
  infoMessage: () => loginButtonsSession.get('infoMessage')
}); //
// loginButtonsLoggingInPadding template
//


Template._loginButtonsLoggingInPadding.helpers({
  dropdown
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"login_buttons_single.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/login_buttons_single.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let getLoginServices;
module.link("./login_buttons.js", {
  getLoginServices(v) {
    getLoginServices = v;
  }

}, 0);
// for convenience
const loginButtonsSession = Accounts._loginButtonsSession;

const loginResultCallback = (serviceName, err) => {
  if (!err) {
    loginButtonsSession.closeDropdown();
  } else if (err instanceof Accounts.LoginCancelledError) {// do nothing
  } else if (err instanceof ServiceConfiguration.ConfigError) {
    if (Template._configureLoginServiceDialog.templateForService(serviceName)) {
      loginButtonsSession.configureService(serviceName);
    } else {
      loginButtonsSession.errorMessage("No configuration for ".concat(capitalize(serviceName), ".\n") + "Use `ServiceConfiguration` to configure it or " + "install the `".concat(serviceName, "-config-ui` package."));
    }
  } else {
    loginButtonsSession.errorMessage(err.reason || "Unknown error");
  }
}; // In the login redirect flow, we'll have the result of the login
// attempt at page load time when we're redirected back to the
// application.  Register a callback to update the UI (i.e. to close
// the dialog on a successful login or display the error on a failed
// login).
//


Accounts.onPageLoadLogin(attemptInfo => {
  // Ignore if we have a left over login attempt for a service that is no longer registered.
  if (getLoginServices().map(service => service.name).includes(attemptInfo.type)) loginResultCallback(attemptInfo.type, attemptInfo.error);
});

Template._loginButtonsLoggedOutSingleLoginButton.events({
  'click .login-button': function () {
    const serviceName = this.name;
    loginButtonsSession.resetMessages(); // XXX Service providers should be able to specify their
    // `Meteor.loginWithX` method name.

    const loginWithService = Meteor["loginWith".concat(serviceName === 'meteor-developer' ? 'MeteorDeveloperAccount' : capitalize(serviceName))];
    const options = {}; // use default scope unless specified

    if (Accounts.ui._options.requestPermissions[serviceName]) options.requestPermissions = Accounts.ui._options.requestPermissions[serviceName];
    if (Accounts.ui._options.requestOfflineToken[serviceName]) options.requestOfflineToken = Accounts.ui._options.requestOfflineToken[serviceName];
    if (Accounts.ui._options.forceApprovalPrompt[serviceName]) options.forceApprovalPrompt = Accounts.ui._options.forceApprovalPrompt[serviceName];
    loginWithService(options, err => {
      loginResultCallback(serviceName, err);
    });
  }
});

Template._loginButtonsLoggedOutSingleLoginButton.helpers({
  // not configured and has no config UI
  cannotConfigure: function () {
    return !ServiceConfiguration.configurations.findOne({
      service: this.name
    }) && !Template._configureLoginServiceDialog.templateForService(this.name);
  },
  configured: function () {
    return !!ServiceConfiguration.configurations.findOne({
      service: this.name
    });
  },
  capitalizedName: function () {
    if (this.name === 'github') // XXX we should allow service packages to set their capitalized name
      return 'GitHub';else if (this.name === 'meteor-developer') return 'Meteor';else return capitalize(this.name);
  }
}); // XXX from http://epeli.github.com/underscore.string/lib/underscore.string.js


const capitalize = input => {
  str = input == null ? '' : String(input);
  return str.charAt(0).toUpperCase() + str.slice(1);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"login_buttons_dropdown.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/login_buttons_dropdown.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let passwordSignupFields;
module.link("./accounts_ui.js", {
  passwordSignupFields(v) {
    passwordSignupFields = v;
  }

}, 0);
let displayName, getLoginServices, hasPasswordService, validateUsername, validateEmail, validatePassword;
module.link("./login_buttons.js", {
  displayName(v) {
    displayName = v;
  },

  getLoginServices(v) {
    getLoginServices = v;
  },

  hasPasswordService(v) {
    hasPasswordService = v;
  },

  validateUsername(v) {
    validateUsername = v;
  },

  validateEmail(v) {
    validateEmail = v;
  },

  validatePassword(v) {
    validatePassword = v;
  }

}, 1);
// for convenience
const loginButtonsSession = Accounts._loginButtonsSession; //
// helpers
//

const elementValueById = id => {
  const element = document.getElementById(id);
  if (!element) return null;else return element.value;
};

const trimmedElementValueById = id => {
  const element = document.getElementById(id);
  if (!element) return null;else return element.value.replace(/^\s*|\s*$/g, ""); // trim() doesn't work on IE8;
};

const loginOrSignup = () => {
  if (loginButtonsSession.get('inSignupFlow')) signup();else login();
};

const login = () => {
  loginButtonsSession.resetMessages();
  const username = trimmedElementValueById('login-username');
  const email = trimmedElementValueById('login-email');
  const usernameOrEmail = trimmedElementValueById('login-username-or-email'); // notably not trimmed. a password could (?) start or end with a space

  const password = elementValueById('login-password');
  let loginSelector;

  if (username !== null) {
    if (!validateUsername(username)) return;else loginSelector = {
      username: username
    };
  } else if (email !== null) {
    if (!validateEmail(email)) return;else loginSelector = {
      email: email
    };
  } else if (usernameOrEmail !== null) {
    // XXX not sure how we should validate this. but this seems good enough (for now),
    // since an email must have at least 3 characters anyways
    if (!validateUsername(usernameOrEmail)) return;else loginSelector = usernameOrEmail;
  } else {
    throw new Error("Unexpected -- no element to use as a login user selector");
  }

  Meteor.loginWithPassword(loginSelector, password, (error, result) => {
    if (error) {
      loginButtonsSession.errorMessage(error.reason || "Unknown error");
    } else {
      loginButtonsSession.closeDropdown();
    }
  });
};

const signup = () => {
  loginButtonsSession.resetMessages();
  const options = {}; // to be passed to Accounts.createUser

  const username = trimmedElementValueById('login-username');

  if (username !== null) {
    if (!validateUsername(username)) return;else options.username = username;
  }

  const email = trimmedElementValueById('login-email');

  if (email !== null) {
    if (!validateEmail(email)) return;else options.email = email;
  } // notably not trimmed. a password could (?) start or end with a space


  const password = elementValueById('login-password');
  if (!validatePassword(password)) return;else options.password = password;
  if (!matchPasswordAgainIfPresent()) return;
  Accounts.createUser(options, error => {
    if (error) {
      loginButtonsSession.errorMessage(error.reason || "Unknown error");
    } else {
      loginButtonsSession.closeDropdown();
    }
  });
};

const forgotPassword = () => {
  loginButtonsSession.resetMessages();
  const email = trimmedElementValueById("forgot-password-email");

  if (email.includes('@')) {
    Accounts.forgotPassword({
      email: email
    }, error => {
      if (error) loginButtonsSession.errorMessage(error.reason || "Unknown error");else loginButtonsSession.infoMessage("Email sent");
    });
  } else {
    loginButtonsSession.errorMessage("Invalid email");
  }
};

const changePassword = () => {
  loginButtonsSession.resetMessages(); // notably not trimmed. a password could (?) start or end with a space

  const oldPassword = elementValueById('login-old-password'); // notably not trimmed. a password could (?) start or end with a space

  const password = elementValueById('login-password');
  if (!validatePassword(password)) return;
  if (!matchPasswordAgainIfPresent()) return;
  Accounts.changePassword(oldPassword, password, error => {
    if (error) {
      loginButtonsSession.errorMessage(error.reason || "Unknown error");
    } else {
      loginButtonsSession.set('inChangePasswordFlow', false);
      loginButtonsSession.set('inMessageOnlyFlow', true);
      loginButtonsSession.infoMessage("Password changed");
    }
  });
};

const matchPasswordAgainIfPresent = () => {
  // notably not trimmed. a password could (?) start or end with a space
  const passwordAgain = elementValueById('login-password-again');

  if (passwordAgain !== null) {
    // notably not trimmed. a password could (?) start or end with a space
    const password = elementValueById('login-password');

    if (password !== passwordAgain) {
      loginButtonsSession.errorMessage("Passwords don't match");
      return false;
    }
  }

  return true;
}; // Utility containment function that works with both arrays and single values


const isInPasswordSignupFields = fieldOrFields => {
  const signupFields = passwordSignupFields();

  if (Array.isArray(fieldOrFields)) {
    return signupFields.reduce((prev, field) => prev && fieldOrFields.includes(field), true);
  }

  return signupFields.includes(fieldOrFields);
}; // events shared between loginButtonsLoggedOutDropdown and
// loginButtonsLoggedInDropdown


Template.loginButtons.events({
  'click #login-name-link, click #login-sign-in-link': () => loginButtonsSession.set('dropdownVisible', true),
  'click .login-close-text': loginButtonsSession.closeDropdown
}); //
// loginButtonsLoggedInDropdown template and related
//

Template._loginButtonsLoggedInDropdown.events({
  'click #login-buttons-open-change-password': () => {
    loginButtonsSession.resetMessages();
    loginButtonsSession.set('inChangePasswordFlow', true);
  }
});

Template._loginButtonsLoggedInDropdown.helpers({
  displayName,
  inChangePasswordFlow: () => loginButtonsSession.get('inChangePasswordFlow'),
  inMessageOnlyFlow: () => loginButtonsSession.get('inMessageOnlyFlow'),
  dropdownVisible: () => loginButtonsSession.get('dropdownVisible')
});

Template._loginButtonsLoggedInDropdownActions.helpers({
  allowChangingPassword: () => {
    // it would be more correct to check whether the user has a password set,
    // but in order to do that we'd have to send more data down to the client,
    // and it'd be preferable not to send down the entire service.password document.
    //
    // instead we use the heuristic: if the user has a username or email set.
    const user = Meteor.user();
    return user.username || user.emails && user.emails[0] && user.emails[0].address;
  }
}); //
// loginButtonsLoggedOutDropdown template and related
//


Template._loginButtonsLoggedOutDropdown.events({
  'click #login-buttons-password': event => {
    event.preventDefault();
    loginOrSignup();
  },
  'keypress #forgot-password-email': event => {
    if (event.keyCode === 13) forgotPassword();
  },
  'click #login-buttons-forgot-password': forgotPassword,
  'click #signup-link': () => {
    loginButtonsSession.resetMessages(); // store values of fields before swtiching to the signup form

    const username = trimmedElementValueById('login-username');
    const email = trimmedElementValueById('login-email');
    const usernameOrEmail = trimmedElementValueById('login-username-or-email'); // notably not trimmed. a password could (?) start or end with a space

    const password = elementValueById('login-password');
    loginButtonsSession.set('inSignupFlow', true);
    loginButtonsSession.set('inForgotPasswordFlow', false); // force the ui to update so that we have the approprate fields to fill in

    Tracker.flush(); // update new fields with appropriate defaults

    if (username !== null) document.getElementById('login-username').value = username;else if (email !== null) document.getElementById('login-email').value = email;else if (usernameOrEmail !== null) if (!usernameOrEmail.includes('@')) document.getElementById('login-username').value = usernameOrEmail;else document.getElementById('login-email').value = usernameOrEmail;
    if (password !== null) document.getElementById('login-password').value = password; // Force redrawing the `login-dropdown-list` element because of
    // a bizarre Chrome bug in which part of the DIV is not redrawn
    // in case you had tried to unsuccessfully log in before
    // switching to the signup form.
    //
    // Found tip on how to force a redraw on
    // http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes/3485654#3485654

    const redraw = document.getElementById('login-dropdown-list');
    redraw.style.display = 'none';
    redraw.offsetHeight; // it seems that this line does nothing but is necessary for the redraw to work

    redraw.style.display = 'block';
  },
  'click #forgot-password-link': () => {
    loginButtonsSession.resetMessages(); // store values of fields before swtiching to the signup form

    const email = trimmedElementValueById('login-email');
    const usernameOrEmail = trimmedElementValueById('login-username-or-email');
    loginButtonsSession.set('inSignupFlow', false);
    loginButtonsSession.set('inForgotPasswordFlow', true); // force the ui to update so that we have the approprate fields to fill in

    Tracker.flush(); // update new fields with appropriate defaults

    if (email !== null) document.getElementById('forgot-password-email').value = email;else if (usernameOrEmail !== null) if (usernameOrEmail.includes('@')) document.getElementById('forgot-password-email').value = usernameOrEmail;
  },
  'click #back-to-login-link': () => {
    loginButtonsSession.resetMessages();
    const username = trimmedElementValueById('login-username');
    const email = trimmedElementValueById('login-email') || trimmedElementValueById('forgot-password-email'); // Ughh. Standardize on names?
    // notably not trimmed. a password could (?) start or end with a space

    const password = elementValueById('login-password');
    loginButtonsSession.set('inSignupFlow', false);
    loginButtonsSession.set('inForgotPasswordFlow', false); // force the ui to update so that we have the approprate fields to fill in

    Tracker.flush();
    if (document.getElementById('login-username') && username !== null) document.getElementById('login-username').value = username;
    if (document.getElementById('login-email') && email !== null) document.getElementById('login-email').value = email;
    const usernameOrEmailInput = document.getElementById('login-username-or-email');

    if (usernameOrEmailInput) {
      if (email !== null) usernameOrEmailInput.value = email;
      if (username !== null) usernameOrEmailInput.value = username;
    }

    if (password !== null) document.getElementById('login-password').value = password;
  },
  'keypress #login-username, keypress #login-email, keypress #login-username-or-email, keypress #login-password, keypress #login-password-again': event => {
    if (event.keyCode === 13) loginOrSignup();
  }
});

Template._loginButtonsLoggedOutDropdown.helpers({
  // additional classes that can be helpful in styling the dropdown
  additionalClasses: () => {
    if (!hasPasswordService()) {
      return false;
    } else {
      if (loginButtonsSession.get('inSignupFlow')) {
        return 'login-form-create-account';
      } else if (loginButtonsSession.get('inForgotPasswordFlow')) {
        return 'login-form-forgot-password';
      } else {
        return 'login-form-sign-in';
      }
    }
  },
  dropdownVisible: () => loginButtonsSession.get('dropdownVisible'),
  hasPasswordService
}); // return all login services, with password last


Template._loginButtonsLoggedOutAllServices.helpers({
  services: getLoginServices,
  isPasswordService: function () {
    return this.name === 'password';
  },
  hasOtherServices: () => getLoginServices().length > 1,
  hasPasswordService
});

Template._loginButtonsLoggedOutPasswordService.helpers({
  fields: () => {
    const loginFields = [{
      fieldName: 'username-or-email',
      fieldLabel: 'Username or Email',
      autocomplete: 'username email',
      visible: () => isInPasswordSignupFields(["USERNAME_AND_EMAIL", "USERNAME_AND_OPTIONAL_EMAIL"])
    }, {
      fieldName: 'username',
      fieldLabel: 'Username',
      autocomplete: 'username',
      visible: () => isInPasswordSignupFields("USERNAME_ONLY")
    }, {
      fieldName: 'email',
      fieldLabel: 'Email',
      inputType: 'email',
      autocomplete: 'email',
      visible: () => isInPasswordSignupFields("EMAIL_ONLY")
    }, {
      fieldName: 'password',
      fieldLabel: 'Password',
      inputType: 'password',
      autocomplete: 'current-password',
      visible: () => true
    }];
    const signupFields = [{
      fieldName: 'username',
      fieldLabel: 'Username',
      autocomplete: 'username',
      visible: () => isInPasswordSignupFields(["USERNAME_AND_EMAIL", "USERNAME_AND_OPTIONAL_EMAIL", "USERNAME_ONLY"])
    }, {
      fieldName: 'email',
      fieldLabel: 'Email',
      inputType: 'email',
      autocomplete: 'email',
      visible: () => isInPasswordSignupFields(["USERNAME_AND_EMAIL", "EMAIL_ONLY"])
    }, {
      fieldName: 'email',
      fieldLabel: 'Email (optional)',
      inputType: 'email',
      autocomplete: 'email',
      visible: () => isInPasswordSignupFields("USERNAME_AND_OPTIONAL_EMAIL")
    }, {
      fieldName: 'password',
      fieldLabel: 'Password',
      inputType: 'password',
      autocomplete: 'new-password',
      visible: () => true
    }, {
      fieldName: 'password-again',
      fieldLabel: 'Password (again)',
      inputType: 'password',
      autocomplete: 'new-password',
      // No need to make users double-enter their password if
      // they'll necessarily have an email set, since they can use
      // the "forgot password" flow.
      visible: () => isInPasswordSignupFields(["USERNAME_AND_OPTIONAL_EMAIL", "USERNAME_ONLY"])
    }];
    return loginButtonsSession.get('inSignupFlow') ? signupFields : loginFields;
  },
  inForgotPasswordFlow: () => loginButtonsSession.get('inForgotPasswordFlow'),
  inLoginFlow: () => !loginButtonsSession.get('inSignupFlow') && !loginButtonsSession.get('inForgotPasswordFlow'),
  inSignupFlow: () => loginButtonsSession.get('inSignupFlow'),
  showCreateAccountLink: () => !Accounts._options.forbidClientAccountCreation,
  showForgotPasswordLink: () => isInPasswordSignupFields(["USERNAME_AND_EMAIL", "USERNAME_AND_OPTIONAL_EMAIL", "EMAIL_ONLY"])
});

Template._loginButtonsFormField.helpers({
  inputType: function () {
    return this.inputType || "text";
  }
}); //
// loginButtonsChangePassword template
//


Template._loginButtonsChangePassword.events({
  'keypress #login-old-password, keypress #login-password, keypress #login-password-again': event => {
    if (event.keyCode === 13) changePassword();
  },
  'click #login-buttons-do-change-password': changePassword
});

Template._loginButtonsChangePassword.helpers({
  fields: () => {
    const {
      username,
      emails
    } = Meteor.user();
    let email;

    if (emails) {
      email = emails[0].address;
    }

    return [// The username and email fields are included here to address an
    // accessibility warning in Chrome, but the fields don't actually display.
    // The warning states that there should be an optionally hidden
    // username/email field on password forms.
    // XXX I think we should not use a CSS class here because this is the
    // `unstyled` package. So instead we apply an inline style.
    {
      fieldName: 'username',
      fieldLabel: 'Username',
      autocomplete: 'username',
      fieldStyle: 'display: none;',
      fieldValue: username,
      visible: () => isInPasswordSignupFields(["USERNAME_AND_EMAIL", "USERNAME_AND_OPTIONAL_EMAIL", "USERNAME_ONLY"])
    }, {
      fieldName: 'email',
      fieldLabel: 'Email',
      inputType: 'email',
      autocomplete: 'email',
      fieldStyle: 'display: none;',
      fieldValue: email,
      visible: () => isInPasswordSignupFields(["USERNAME_AND_EMAIL", "EMAIL_ONLY"])
    }, {
      fieldName: 'old-password',
      fieldLabel: 'Current Password',
      inputType: 'password',
      autocomplete: 'current-password',
      visible: () => true
    }, {
      fieldName: 'password',
      fieldLabel: 'New Password',
      inputType: 'password',
      autocomplete: 'new-password',
      visible: () => true
    }, {
      fieldName: 'password-again',
      fieldLabel: 'New Password (again)',
      inputType: 'password',
      autocomplete: 'new-password',
      // No need to make users double-enter their password if
      // they'll necessarily have an email set, since they can use
      // the "forgot password" flow.
      visible: () => isInPasswordSignupFields(["USERNAME_AND_OPTIONAL_EMAIL", "USERNAME_ONLY"])
    }];
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"login_buttons_dialogs.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-ui-unstyled/login_buttons_dialogs.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let displayName, dropdown, validatePassword;
module.link("./login_buttons.js", {
  displayName(v) {
    displayName = v;
  },

  dropdown(v) {
    dropdown = v;
  },

  validatePassword(v) {
    validatePassword = v;
  }

}, 0);
// for convenience
const loginButtonsSession = Accounts._loginButtonsSession; // since we don't want to pass around the callback that we get from our event
// handlers, we just make it a variable for the whole file

let doneCallback;
Accounts.onResetPasswordLink((token, done) => {
  loginButtonsSession.set("resetPasswordToken", token);
  doneCallback = done;
});
Accounts.onEnrollmentLink((token, done) => {
  loginButtonsSession.set("enrollAccountToken", token);
  doneCallback = done;
});
Accounts.onEmailVerificationLink((token, done) => {
  Accounts.verifyEmail(token, error => {
    if (!error) {
      loginButtonsSession.set('justVerifiedEmail', true);
    }

    done(); // XXX show something if there was an error.
  });
}); //
// resetPasswordDialog template
//

Template._resetPasswordDialog.events({
  'click #login-buttons-reset-password-button': () => resetPassword(),
  'keypress #reset-password-new-password': event => {
    if (event.keyCode === 13) resetPassword();
  },
  'click #login-buttons-cancel-reset-password': () => {
    loginButtonsSession.set('resetPasswordToken', null);
    if (doneCallback) doneCallback();
  }
});

const resetPassword = () => {
  loginButtonsSession.resetMessages();
  const newPassword = document.getElementById('reset-password-new-password').value;
  if (!validatePassword(newPassword)) return;
  Accounts.resetPassword(loginButtonsSession.get('resetPasswordToken'), newPassword, error => {
    if (error) {
      loginButtonsSession.errorMessage(error.reason || "Unknown error");
    } else {
      loginButtonsSession.set('resetPasswordToken', null);
      loginButtonsSession.set('justResetPassword', true);
      if (doneCallback) doneCallback();
    }
  });
};

Template._resetPasswordDialog.helpers({
  displayName,
  inResetPasswordFlow: () => loginButtonsSession.get('resetPasswordToken')
}); //
// justResetPasswordDialog template
//


Template._justResetPasswordDialog.events({
  'click #just-verified-dismiss-button': () => loginButtonsSession.set('justResetPassword', false)
});

Template._justResetPasswordDialog.helpers({
  visible: () => loginButtonsSession.get('justResetPassword'),
  displayName
}); //
// enrollAccountDialog template
//


const enrollAccount = () => {
  loginButtonsSession.resetMessages();
  const password = document.getElementById('enroll-account-password').value;
  if (!validatePassword(password)) return;
  Accounts.resetPassword(loginButtonsSession.get('enrollAccountToken'), password, error => {
    if (error) {
      loginButtonsSession.errorMessage(error.reason || "Unknown error");
    } else {
      loginButtonsSession.set('enrollAccountToken', null);
      if (doneCallback) doneCallback();
    }
  });
};

Template._enrollAccountDialog.events({
  'click #login-buttons-enroll-account-button': enrollAccount,
  'keypress #enroll-account-password': event => {
    if (event.keyCode === 13) enrollAccount();
  },
  'click #login-buttons-cancel-enroll-account': () => {
    loginButtonsSession.set('enrollAccountToken', null);
    if (doneCallback) doneCallback();
  }
});

Template._enrollAccountDialog.helpers({
  displayName,
  inEnrollAccountFlow: () => loginButtonsSession.get('enrollAccountToken')
}); //
// justVerifiedEmailDialog template
//


Template._justVerifiedEmailDialog.events({
  'click #just-verified-dismiss-button': () => loginButtonsSession.set('justVerifiedEmail', false)
});

Template._justVerifiedEmailDialog.helpers({
  visible: () => loginButtonsSession.get('justVerifiedEmail'),
  displayName
}); //
// loginButtonsMessagesDialog template
//


Template._loginButtonsMessagesDialog.events({
  'click #messages-dialog-dismiss-button': () => loginButtonsSession.resetMessages()
});

Template._loginButtonsMessagesDialog.helpers({
  visible: () => {
    const hasMessage = loginButtonsSession.get('infoMessage') || loginButtonsSession.get('errorMessage');
    return !dropdown() && hasMessage;
  }
}); //
// configureLoginServiceDialog template
//


Template._configureLoginServiceDialog.events({
  'click .configure-login-service-dismiss-button': () => loginButtonsSession.set('configureLoginServiceDialogVisible', false),
  'click #configure-login-service-dialog-save-configuration': () => {
    if (loginButtonsSession.get('configureLoginServiceDialogVisible') && !loginButtonsSession.get('configureLoginServiceDialogSaveDisabled')) {
      // Prepare the configuration document for this login service
      const serviceName = loginButtonsSession.get('configureLoginServiceDialogServiceName');
      const configuration = {
        service: serviceName
      }; // Fetch the value of each input field

      configurationFields().forEach(field => {
        configuration[field.property] = document.getElementById("configure-login-service-dialog-".concat(field.property)).value.replace(/^\s*|\s*$/g, ""); // trim() doesnt work on IE8;
      }); // Replacement of single use of jQuery in this package so we can remove
      // the dependency

      const inputs = [].slice.call( // Because HTMLCollections aren't arrays
      document.getElementById('configure-login-service-dialog').getElementsByTagName('input'));
      configuration.loginStyle = document.querySelector('#configure-login-service-dialog input[name="loginStyle"]:checked').value; // Configure this login service

      Accounts.connection.call("configureLoginService", configuration, (error, result) => {
        if (error) Meteor._debug("Error configuring login service ".concat(serviceName), error);else loginButtonsSession.set('configureLoginServiceDialogVisible', false);
      });
    }
  },
  // IE8 doesn't support the 'input' event, so we'll run this on the keyup as
  // well. (Keeping the 'input' event means that this also fires when you use
  // the mouse to change the contents of the field, eg 'Cut' menu item.)
  'input, keyup input': event => {
    // if the event fired on one of the configuration input fields,
    // check whether we should enable the 'save configuration' button
    if (event.target.id.indexOf('configure-login-service-dialog') === 0) updateSaveDisabled();
  }
}); // check whether the 'save configuration' button should be enabled.
// this is a really strange way to implement this and a Forms
// Abstraction would make all of this reactive, and simpler.


const updateSaveDisabled = () => {
  const anyFieldEmpty = configurationFields().reduce((prev, field) => prev || document.getElementById("configure-login-service-dialog-".concat(field.property)).value === '', false);
  loginButtonsSession.set('configureLoginServiceDialogSaveDisabled', anyFieldEmpty);
}; // Returns the appropriate template for this login service.  This
// template should be defined in the service's package


Template._configureLoginServiceDialog.templateForService = serviceName => {
  serviceName = serviceName || loginButtonsSession.get('configureLoginServiceDialogServiceName'); // XXX Service providers should be able to specify their configuration
  // template name.

  return Template["configureLoginServiceDialogFor".concat(serviceName === 'meteor-developer' ? 'MeteorDeveloper' : capitalize(serviceName))];
};

const configurationFields = () => {
  const template = Template._configureLoginServiceDialog.templateForService();

  return template.fields();
};

Template._configureLoginServiceDialog.helpers({
  configurationFields,
  visible: () => loginButtonsSession.get('configureLoginServiceDialogVisible'),
  // renders the appropriate template
  configurationSteps: () => Template._configureLoginServiceDialog.templateForService(),
  saveDisabled: () => loginButtonsSession.get('configureLoginServiceDialogSaveDisabled')
}); // XXX from http://epeli.github.com/underscore.string/lib/underscore.string.js


const capitalize = str => {
  str = str == null ? '' : String(str);
  return str.charAt(0).toUpperCase() + str.slice(1);
};

Template._configureLoginOnDesktopDialog.helpers({
  visible: () => loginButtonsSession.get('configureOnDesktopVisible')
});

Template._configureLoginOnDesktopDialog.events({
  'click #configure-on-desktop-dismiss-button': () => loginButtonsSession.set('configureOnDesktopVisible', false)
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json",
    ".html",
    ".less"
  ]
});

require("/node_modules/meteor/accounts-ui-unstyled/accounts_ui.js");
require("/node_modules/meteor/accounts-ui-unstyled/template.login_buttons.js");
require("/node_modules/meteor/accounts-ui-unstyled/template.login_buttons_single.js");
require("/node_modules/meteor/accounts-ui-unstyled/template.login_buttons_dropdown.js");
require("/node_modules/meteor/accounts-ui-unstyled/template.login_buttons_dialogs.js");
require("/node_modules/meteor/accounts-ui-unstyled/login_buttons_session.js");
require("/node_modules/meteor/accounts-ui-unstyled/login_buttons.js");
require("/node_modules/meteor/accounts-ui-unstyled/login_buttons_single.js");
require("/node_modules/meteor/accounts-ui-unstyled/login_buttons_dropdown.js");
require("/node_modules/meteor/accounts-ui-unstyled/login_buttons_dialogs.js");

/* Exports */
Package._define("accounts-ui-unstyled");

})();
