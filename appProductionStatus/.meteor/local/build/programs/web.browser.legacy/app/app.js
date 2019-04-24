var require = meteorInstall({"imports":{"ui":{"layouts":{"versions.html":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/layouts/versions.html                                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("./template.versions.js", { "*": "*+" });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.versions.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/layouts/template.versions.js                                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //

Template.__checkName("versions");
Template["versions"] = new Template("Template.versions", (function() {
  var view = this;
  return HTML.DIV({
    id: "versions",
    class: "category",
    style: "display:block;"
  }, "\n        ", HTML.DIV({
    class: "container-fluid"
  }, "\n            ", HTML.Raw("<h3>Deployed Versions</h3>"), "\n            ", HTML.Raw('<div class="row" style="background-color: aliceblue">\n                <div class="col-sm-3">Title</div>\n                <div class="col-sm-2">Build Date</div>\n                <div class="col-sm-3">Build Version</div>\n                <div class="col-sm-2">Last Test Results</div>\n                <div class="col-sm-2">Last Test Run Date</div>\n            </div>'), "\n\n            ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("deployments"));
  }, function() {
    return [ "\n                ", HTML.H4(Blaze.View("lookup:environment", function() {
      return Spacebars.mustache(view.lookup("environment"));
    })), "\n                ", Blaze.Each(function() {
      return Spacebars.call(view.lookup("apps"));
    }, function() {
      return [ "\n                    ", HTML.DIV({
        class: "row",
        style: "background-color: aliceblue; margin-bottom: 2px;"
      }, "\n                        ", HTML.DIV({
        class: "col-sm-3"
      }, Blaze.View("lookup:title", function() {
        return Spacebars.mustache(view.lookup("title"));
      })), "\n                        ", HTML.DIV({
        class: "col-sm-2"
      }, Blaze.View("lookup:buildDate", function() {
        return Spacebars.mustache(view.lookup("buildDate"));
      })), "\n                        ", HTML.DIV({
        class: "col-sm-3"
      }, Blaze.View("lookup:version", function() {
        return Spacebars.mustache(view.lookup("version"));
      })), "\n                        ", HTML.DIV({
        class: "col-sm-2"
      }, Blaze.View("lookup:lastTestStatus", function() {
        return Spacebars.mustache(view.lookup("lastTestStatus"));
      })), "\n                        ", HTML.DIV({
        class: "col-sm-2"
      }, Blaze.View("lookup:lastTestRundate", function() {
        return Spacebars.mustache(view.lookup("lastTestRundate"));
      })), "\n                    "), "\n                " ];
    }), "\n            " ];
  }), "\n        "), "\n    ");
}));

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"versions.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/layouts/versions.js                                                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var Template;
module.link("meteor/templating", {
  Template: function (v) {
    Template = v;
  }
}, 1);
var FlowRouter;
module.link("meteor/kadira:flow-router", {
  FlowRouter: function (v) {
    FlowRouter = v;
  }
}, 2);
var Deployments;
module.link("../../api/deployments.js", {
  Deployments: function (v) {
    Deployments = v;
  }
}, 3);
module.link("./versions.html");
Template.versions.onCreated(function () {
  function bodyOnCreated() {
    Meteor.subscribe('Deployments');
    document.getElementById('topNav').style.display = "none";
  }

  return bodyOnCreated;
}());
Template.versions.helpers({
  deployments: function () {
    var deployments = Deployments.find({}, {
      sort: {
        deployment_environment: 1
      }
    });
    return deployments;
  },
  environment: function () {
    return this.deployment_environment;
  },
  apps: function () {
    return this.apps;
  },
  title: function () {
    return this.title;
  },
  buildDate: function () {
    return this.buildDate;
  },
  version: function () {
    return this.version;
  },
  lastTestStatus: function () {
    return this.last_test_status;
  },
  lastTestRunDate: function () {
    return this.last_test_run;
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"body.html":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/body.html                                                                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("./template.body.js", { "*": "*+" });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.body.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/template.body.js                                                                                      //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //

Template.body.addContent((function() {
  var view = this;
  return HTML.DIV({
    class: "container"
  }, "\n   ", HTML.DIV({
    class: "row",
    id: "topNav"
  }, "\n       ", HTML.H1("MATS Application Production Status ", HTML.SPAN({
    style: "float: right;"
  }, Spacebars.include(view.lookupTemplate("loginButtons")))), "\n    ", HTML.Raw('<div class="btn-group col-lg-6">\n        <button type="button" class="btn btn-primary category">Versions</button>\n        <button type="button" class="btn btn-primary category">Configurations</button>\n        <button type="button" class="btn btn-primary category">Deployments</button>\n    </div>'), "\n   "), "\n    ", HTML.DIV({
    id: "deployments",
    class: "category",
    style: "display:none;"
  }, "\n        ", HTML.Raw("<h3>Deployments</h3>"), "\n        ", HTML.DIV({
    class: "btn-group"
  }, "\n            ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("deployments"));
  }, function() {
    return [ "\n                ", HTML.BUTTON({
      type: "button",
      id: function() {
        return [ "deployment-", Spacebars.mustache(view.lookup("deployment_environment")) ];
      },
      class: "btn btn-primary toggle-deployment"
    }, " ", Blaze.View("lookup:deployment_environment", function() {
      return Spacebars.mustache(view.lookup("deployment_environment"));
    }), " "), "\n            " ];
  }), "\n        "), "\n        ", HTML.DIV("\n            ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("deployments"));
  }, function() {
    return [ "\n                ", Spacebars.include(view.lookupTemplate("deployment")), "\n            " ];
  }), "\n        "), "\n    "), "\n    ", HTML.DIV({
    id: "configurations",
    class: "category",
    style: "display:none;"
  }, "\n        ", HTML.Raw("<h3>Build Configurations</h3>"), "\n        ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("configurations"));
  }, function() {
    return [ "\n            ", HTML.BUTTON({
      type: "button",
      id: function() {
        return [ "configuration-", Spacebars.mustache(view.lookup("deployment_environment")) ];
      },
      class: "btn btn-primary toggle-configuration"
    }, " ", Blaze.View("lookup:deployment_environment", function() {
      return Spacebars.mustache(view.lookup("deployment_environment"));
    }), " "), "\n        " ];
  }), "\n        ", HTML.UL("\n            ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("configurations"));
  }, function() {
    return [ "\n                ", Spacebars.include(view.lookupTemplate("configuration")), "\n            " ];
  }), "\n        "), "\n    "), "\n    ", HTML.DIV({
    id: "versions",
    class: "category",
    style: "display:none;"
  }, "\n        ", HTML.DIV({
    class: "container-fluid"
  }, "\n            ", HTML.Raw("<h3>Deployed Versions</h3>"), "\n            ", HTML.Raw('<div class="row" style="background-color: aliceblue">\n                <div class="col-sm-3">Title</div>\n                <div class="col-sm-2">Build Date</div>\n                <div class="col-sm-3">Build Version</div>\n                <div class="col-sm-2">Last Test Results</div>\n                <div class="col-sm-2">Last Test Run Date</div>\n            </div>'), "\n\n            ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("deployments"));
  }, function() {
    return [ "\n                ", HTML.H4(Blaze.View("lookup:environment", function() {
      return Spacebars.mustache(view.lookup("environment"));
    })), "\n                ", Blaze.Each(function() {
      return Spacebars.call(view.lookup("apps"));
    }, function() {
      return [ "\n                    ", HTML.DIV({
        class: "row",
        style: "background-color: aliceblue; margin-bottom: 2px;"
      }, "\n                        ", HTML.DIV({
        class: "col-sm-3"
      }, Blaze.View("lookup:title", function() {
        return Spacebars.mustache(view.lookup("title"));
      })), "\n                        ", HTML.DIV({
        class: "col-sm-2"
      }, Blaze.View("lookup:buildDate", function() {
        return Spacebars.mustache(view.lookup("buildDate"));
      })), "\n                        ", HTML.DIV({
        class: "col-sm-3"
      }, Blaze.View("lookup:version", function() {
        return Spacebars.mustache(view.lookup("version"));
      })), "\n                        ", HTML.DIV({
        class: "col-sm-2"
      }, Blaze.View("lookup:lastTestStatus", function() {
        return Spacebars.mustache(view.lookup("lastTestStatus"));
      })), "\n                        ", HTML.DIV({
        class: "col-sm-2"
      }, Blaze.View("lookup:lastTestRunDate", function() {
        return Spacebars.mustache(view.lookup("lastTestRunDate"));
      })), "\n                    "), "\n                " ];
    }), "\n            " ];
  }), "\n        "), "\n    "), "\n");
}));
Meteor.startup(Template.body.renderToDocument);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"configuration.html":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/configuration.html                                                                                    //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("./template.configuration.js", { "*": "*+" });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.configuration.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/template.configuration.js                                                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //

Template.__checkName("configuration");
Template["configuration"] = new Template("Template.configuration", (function() {
  var view = this;
  return HTML.DIV({
    class: "container-fluiid",
    id: function() {
      return [ Spacebars.mustache(view.lookup("environment")), "-config" ];
    },
    style: "display:none"
  }, "\n        ", HTML.H3("Configuration Environment: ", Blaze.View("lookup:environment", function() {
    return Spacebars.mustache(view.lookup("environment"));
  })), "\n        ", HTML.H4("Server:  ", Blaze.View("lookup:server", function() {
    return Spacebars.mustache(view.lookup("server"));
  })), "\n        ", HTML.H4("Deployment Status for Server ", Blaze.View("lookup:server", function() {
    return Spacebars.mustache(view.lookup("server"));
  }), ": ", HTML.SPAN({
    style: function() {
      return [ "color: ", Spacebars.mustache(view.lookup("serverDeploymentStatusColor")), ";font-size: x-large;" ];
    }
  }, Blaze.View("lookup:serverDeploymentStatus", function() {
    return Spacebars.mustache(view.lookup("serverDeploymentStatus"));
  }))), "\n        ", HTML.BUTTON({
    type: "button",
    class: "btn configuration-status-toggle"
  }, Blaze.View("lookup:server", function() {
    return Spacebars.mustache(view.lookup("server"));
  }), " --- [", Blaze.View("lookup:statusToggle", function() {
    return Spacebars.mustache(view.lookup("statusToggle"));
  }), "]"), "\n        ", HTML.DIV({
    class: "row container-fluid",
    style: "border:inset;background-color: aliceblue"
  }, "\n            ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("otherParams"));
  }, function() {
    return [ "\n                ", HTML.DIV({
      class: "row"
    }, "\n                    ", HTML.DIV({
      class: "col-sm-2"
    }, Blaze.View("lookup:param", function() {
      return Spacebars.mustache(view.lookup("param"));
    })), "\n                    ", HTML.DIV({
      class: "col-sm-2"
    }, Blaze.View("lookup:value", function() {
      return Spacebars.mustache(view.lookup("value"));
    })), "\n                "), "\n            " ];
  }), "\n        "), "\n        ", HTML.DIV({
    class: "row container-fluid",
    style: "border:inset;"
  }, "\n            ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("configurationApps"));
  }, function() {
    return [ "\n                ", HTML.DIV({
      class: "row",
      style: "background-color: aliceblue;margin-bottom: 2px;"
    }, "\n                    ", HTML.DIV({
      class: "col-sm-3"
    }, Blaze.View("lookup:displayName", function() {
      return Spacebars.mustache(view.lookup("displayName"));
    })), "\n                    ", HTML.DIV({
      class: "col-sm-3"
    }, Blaze.View("lookup:appReference", function() {
      return Spacebars.mustache(view.lookup("appReference"));
    })), "\n                    ", HTML.DIV({
      class: "col-sm-3"
    }, "\n                        ", HTML.BUTTON({
      type: "button",
      class: function() {
        return [ "btn ", Spacebars.mustache(view.lookup("deploymentBtnClass")), " deployment-status-toggle" ];
      }
    }, HTML.I({
      class: function() {
        return Spacebars.mustache(view.lookup("deploymentStatusFace"));
      }
    }, " "), "  ", Blaze.View("lookup:deploymentStatusState", function() {
      return Spacebars.mustache(view.lookup("deploymentStatusState"));
    })), "\n                    "), "\n                    ", HTML.DIV({
      class: "col-sm-3"
    }, "\n                        ", HTML.BUTTON(HTML.Attrs({
      type: "button",
      class: function() {
        return [ "btn ", Spacebars.mustache(view.lookup("buildBtnClass")), " build-status-toggle" ];
      }
    }, function() {
      return Spacebars.attrMustache(view.lookup("buildBtnAbility"));
    }), HTML.I({
      class: function() {
        return Spacebars.mustache(view.lookup("buildStatusFace"));
      }
    }, " "), "  ", Blaze.View("lookup:buildStatusState", function() {
      return Spacebars.mustache(view.lookup("buildStatusState"));
    })), "\n                    "), "\n                "), "\n            " ];
  }), "\n        "), "\n    ");
}));

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deployment.html":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/deployment.html                                                                                       //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("./template.deployment.js", { "*": "*+" });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.deployment.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/template.deployment.js                                                                                //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //

Template.__checkName("deployment");
Template["deployment"] = new Template("Template.deployment", (function() {
  var view = this;
  return HTML.DIV({
    class: "container-fluiid",
    id: function() {
      return [ Spacebars.mustache(view.lookup("environment")), "-deploy" ];
    },
    style: "display:none"
  }, "\n            ", HTML.H3("Deployment Environment: ", Blaze.View("lookup:environment", function() {
    return Spacebars.mustache(view.lookup("environment"));
  })), "\n            ", HTML.H4("Servers:  ", Blaze.View("lookup:servers", function() {
    return Spacebars.mustache(view.lookup("servers"));
  })), HTML.Raw('\n            <div class="row container-fluid" style="border:inset;background-color: aliceblue">\n                <div class="col-sm-2">Title</div>\n                <div class="col-sm-4">Deployment Version</div>\n                <div class="col-sm-2">Build Date</div>\n                <div class="col-sm-2">Last Test Run</div>\n                <div class="col-sm-2">Last Test Status</div>\n            </div>\n            '), HTML.DIV({
    class: "row container-fluid",
    style: "border:inset;"
  }, "\n            ", Blaze.Each(function() {
    return Spacebars.call(view.lookup("deploymentApps"));
  }, function() {
    return [ "\n                ", HTML.DIV({
      class: "row",
      style: "background-color: aliceblue;margin-bottom: 2px;"
    }, "\n                    ", HTML.DIV({
      class: "col-sm-2"
    }, Blaze.View("lookup:appTitle", function() {
      return Spacebars.mustache(view.lookup("appTitle"));
    })), "\n                    ", HTML.DIV({
      class: "col-sm-4"
    }, Blaze.View("lookup:appVersion", function() {
      return Spacebars.mustache(view.lookup("appVersion"));
    })), "\n                    ", HTML.DIV({
      class: "col-sm-2"
    }, Blaze.View("lookup:appBuildDate", function() {
      return Spacebars.mustache(view.lookup("appBuildDate"));
    })), "\n                    ", HTML.DIV({
      class: "col-sm-2"
    }, Blaze.View("lookup:lastTestRun", function() {
      return Spacebars.mustache(view.lookup("lastTestRun"));
    })), "\n                    ", HTML.DIV({
      class: "col-sm-2"
    }, Blaze.View("lookup:lastTestStatus", function() {
      return Spacebars.mustache(view.lookup("lastTestStatus"));
    })), "\n                "), "\n            " ];
  }), "\n            "), "\n        ");
}));

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"body.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/body.js                                                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var Template;
module.link("meteor/templating", {
  Template: function (v) {
    Template = v;
  }
}, 1);
var BuildConfiguration;
module.link("../api/buildConfiguration.js", {
  BuildConfiguration: function (v) {
    BuildConfiguration = v;
  }
}, 2);
var Deployments;
module.link("../api/deployments.js", {
  Deployments: function (v) {
    Deployments = v;
  }
}, 3);
module.link("./configuration.js");
module.link("./deployment.js");
module.link("./body.html");
Template.body.onCreated(function () {
  function bodyOnCreated() {
    Meteor.subscribe('Deployments');
    Meteor.subscribe('BuildConfiguration');
  }

  return bodyOnCreated;
}());
Template.body.helpers({
  configurations: function () {
    var configs = BuildConfiguration.find({}, {
      sort: {
        deployment_environment: 1
      }
    });
    return configs;
  },
  deployments: function () {
    var deployments = Deployments.find({}, {
      sort: {
        deployment_environment: 1
      }
    });
    return deployments;
  },
  environments: function () {
    var deployments = Deployments.find({}, {
      sort: {
        deployment_environment: 1
      }
    });
  },
  environment: function () {
    return this.deployment_environment;
  },
  apps: function () {
    return this.apps;
  },
  title: function () {
    return this.title;
  },
  buildDate: function () {
    return this.buildDate;
  },
  version: function () {
    return this.version;
  },
  lastTestStatus: function () {
    return this.last_test_status;
  },
  lastTestRunDate: function () {
    return this.last_test_run;
  }
});
Template.body.events({
  'click .toggle-deployment': function (e) {
    var environments = Deployments.find({}, {
      sort: {
        deployment_environment: 1
      }
    }).fetch();

    for (var eIndex = 0; eIndex < environments.length; eIndex++) {
      var eid = environments[eIndex].deployment_environment + '-deploy';

      if (environments[eIndex].deployment_environment.trim() === e.currentTarget.textContent.trim()) {
        document.getElementById(eid).style.display = document.getElementById(eid).style.display == "block" ? "none" : "block";
      } else {
        document.getElementById(eid).style.display = "none";
      }
    }

    return false;
  },
  'click .toggle-configuration': function (e) {
    var environments = BuildConfiguration.find({}, {
      sort: {
        deployment_environment: 1
      }
    }).fetch();

    for (var eIndex = 0; eIndex < environments.length; eIndex++) {
      var eid = environments[eIndex].deployment_environment + '-config';

      if (environments[eIndex].deployment_environment.trim() === e.currentTarget.textContent.trim()) {
        document.getElementById(eid).style.display = document.getElementById(eid).style.display == "block" ? "none" : "block";
      } else {
        document.getElementById(eid).style.display = "none";
      }
    }

    return false;
  },
  'click .category': function (e) {
    var categoryDivs = $("div[class='category']");

    for (var cIndex = 0; cIndex < categoryDivs.length; cIndex++) {
      var cDiv = categoryDivs[cIndex];

      if (e.currentTarget.textContent.toLowerCase().trim() === cDiv.id) {
        cDiv.style.display = cDiv.style.display === "none" ? "block" : "none";
      } else {
        cDiv.style.display = "none";
      }
    }

    return false;
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"configuration.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/configuration.js                                                                                      //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var Template;
module.link("meteor/templating", {
  Template: function (v) {
    Template = v;
  }
}, 1);
var BuildConfiguration;
module.link("../api/buildConfiguration.js", {
  BuildConfiguration: function (v) {
    BuildConfiguration = v;
  }
}, 2);
module.link("./configuration.html");
Template.configuration.helpers({
  environment: function () {
    return this.deployment_environment;
  },
  appReference: function () {
    return this.app;
  },
  server: function () {
    return this.server;
  },
  serverDeploymentStatus: function () {
    return this.deployment_status;
  },
  serverDeploymentStatusColor: function () {
    return this.deployment_status === "active" ? "lightgreen" : "red";
  },
  deploymentStatusState: function () {
    return this.deploymentStatus === "enabled" ? "click to disable Deployment" : "click to enable Deployment";
  },
  deploymentStatusFace: function () {
    return this.deploymentStatus === "enabled" ? "fa fa-smile-o fa-lg" : "fa fa-frown-o fa-lg";
  },
  deploymentBtnClass: function () {
    if (this.deploymentStatus === undefined) {
      return "btn-default";
    }

    return this.deploymentStatus === "enabled" ? "btn-success" : "btn-danger";
  },
  buildStatusState: function () {
    if (this.buildStatus === undefined) {
      return "unavailable";
    }

    return this.buildStatus === "enabled" ? "click to disable Build" : "click to enable Build";
  },
  buildStatusFace: function () {
    return this.buildStatus === "enabled" ? "fa fa-smile-o fa-lg" : "fa fa-frown-o fa-lg";
  },
  buildBtnClass: function () {
    if (this.buildStatus === undefined) {
      return "btn-default";
    }

    return this.buildStatus === "enabled" ? "btn-success" : "btn-danger";
  },
  buildBtnAbility: function () {
    return this.buildStatus === undefined ? "disabled" : "";
  },
  otherParams: function () {
    var excluded = ['_id', 'deployment_environment', 'server', 'deployment_status', 'app_list'];
    var params = [];
    var keys = Object.keys(this);

    for (var i = 0; i < keys.length; i++) {
      if (excluded.indexOf(keys[i]) == -1) {
        params.push([keys[i], this[keys[i]]]);
      }
    }

    ;
    return params;
  },
  param: function () {
    return this[0];
  },
  value: function () {
    return this[1];
  },
  statusToggle: function () {
    if (this.deployment_status == 'active') {
      return 'deactivate';
    } else {
      return 'activate';
    }
  },
  configurationApps: function () {
    return this.app_list;
  }
});
Template.configuration.events({
  'click .configuration-status-toggle': function () {
    if (this.deployment_status == 'active') {
      BuildConfiguration.update({
        '_id': this._id
      }, {
        $set: {
          deployment_status: 'not active'
        }
      });
    } else {
      BuildConfiguration.update({
        '_id': this._id
      }, {
        $set: {
          deployment_status: 'active'
        }
      });
    }

    return false;
  },
  'click .deployment-status-toggle': function (e) {
    var id = Template.currentData()._id;

    var app_list = BuildConfiguration.findOne({
      _id: id
    }).app_list;

    for (var ali = 0; ali < app_list.length; ali++) {
      if (app_list[ali].app == this.app) {
        app_list[ali].deploymentStatus = this.deploymentStatus === 'enabled' ? 'disabled' : 'enabled';
        break;
      }
    }

    BuildConfiguration.update({
      _id: id
    }, {
      $set: {
        app_list: app_list
      }
    });
    return false;
  },
  'click .build-status-toggle': function (e) {
    var id = Template.currentData()._id;

    var app_list = BuildConfiguration.findOne({
      _id: id
    }).app_list;

    for (var ali = 0; ali < app_list.length; ali++) {
      if (app_list[ali].app == this.app) {
        app_list[ali].buildStatus = this.buildStatus === 'enabled' ? 'disabled' : 'enabled';
        break;
      }
    }

    BuildConfiguration.update({
      _id: id
    }, {
      $set: {
        app_list: app_list
      }
    });
    return false;
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deployment.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/ui/deployment.js                                                                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var Template;
module.link("meteor/templating", {
  Template: function (v) {
    Template = v;
  }
}, 1);
var Deployments;
module.link("../api/deployments.js", {
  Deployments: function (v) {
    Deployments = v;
  }
}, 2);
module.link("./deployment.html");
Template.deployment.helpers({
  servers: function () {
    return this.servers;
  },
  deploymentApps: function () {
    return this.apps;
  },
  appTitle: function () {
    return this.title;
  },
  appVersion: function () {
    return this.version;
  },
  appBuildDate: function () {
    return this.buildDate;
  },
  lastTestRun: function () {
    return this.last_test_run;
  },
  lastTestStatus: function () {
    return this.last_test_status;
  },
  environment: function () {
    return this.deployment_environment;
  }
});
Template.deployment.events({});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"both":{"accounts-config.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/startup/both/accounts-config.js                                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var Accounts;
module.link("meteor/accounts-base", {
  Accounts: function (v) {
    Accounts = v;
  }
}, 0);
Accounts.ui.config({
  passwordSignupFields: 'USERNAME_ONLY'
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/startup/both/index.js                                                                                    //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("./accounts-config.js");
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"client":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/startup/client/index.js                                                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("./routes.js");
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"routes.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/startup/client/routes.js                                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var FlowRouter;
module.link("meteor/kadira:flow-router", {
  FlowRouter: function (v) {
    FlowRouter = v;
  }
}, 0);
var BlazeLayout;
module.link("meteor/kadira:blaze-layout", {
  BlazeLayout: function (v) {
    BlazeLayout = v;
  }
}, 1);
module.link("../../ui/layouts/versions.js");
FlowRouter.route('/versions', {
  name: 'versions',
  action: function () {
    BlazeLayout.render('versions', {
      main: 'versions'
    });
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"api":{"buildConfiguration.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/buildConfiguration.js                                                                                //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  BuildConfiguration: function () {
    return BuildConfiguration;
  },
  AllowedUsers: function () {
    return AllowedUsers;
  }
});
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var Mongo;
module.link("meteor/mongo", {
  Mongo: function (v) {
    Mongo = v;
  }
}, 1);
var BuildConfiguration = new Mongo.Collection('buildConfiguration');
var AllowedUsers = new Mongo.Collection('allowedUsers');

if (Meteor.isServer) {
  Meteor.publish('BuildConfiguration', function () {
    function buildConfigurationPublication() {
      var user = null;

      if (this.userId !== undefined && Meteor.users.findOne({
        _id: this.userId
      }) !== undefined) {
        user = Meteor.users.findOne({
          _id: this.userId
        }).username;
      }

      if (!user || !AllowedUsers.findOne({
        user: user
      })) {
        return this.ready();
      }

      BuildConfiguration.allow({
        insert: function (doc) {
          return true;
        },
        update: function (doc, fieldNames, modifier) {
          return true;
        },
        remove: function (doc) {
          return true;
        }
      });
      return BuildConfiguration.find({});
    }

    return buildConfigurationPublication;
  }());
}

Meteor.methods({// 'buildConfiguration.insert'(text) {
  //   check(text, String);
  //
  //   BuildConfiguration.insert({
  //     text,
  //     createdAt: new Date(),
  //     owner: this.userId,
  //     username: Meteor.users.findOne(this.userId).username,
  //   });
  // }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deployments.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/deployments.js                                                                                       //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  Deployments: function () {
    return Deployments;
  }
});
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var Mongo;
module.link("meteor/mongo", {
  Mongo: function (v) {
    Mongo = v;
  }
}, 1);
var Deployments = new Mongo.Collection('deployment');

if (Meteor.isServer) {
  Meteor.publish('Deployments', function () {
    function deploymentsPublication() {
      Deployments.deny({
        insert: function (doc) {
          return true;
        },
        update: function (doc, fieldNames, modifier) {
          return true;
        },
        remove: function (doc) {
          return true;
        }
      });
      return Deployments.find({});
    }

    return deploymentsPublication;
  }()); // server side route for rest API
  // define some server side routes

  Picker.route('/:app/getStableDeployment/:deployment', function (params, req, res, next) {
    Picker.middleware(_getStableDeployment2(params, req, res, next));
  });
  Picker.route('/gsd/mats/:app/getStableDeployment/:deployment', function (params, req, res, next) {
    Picker.middleware(_getStableDeployment2(params, req, res, next));
  });
  Picker.route('/:app/getStableDeploymentAppList/:deployment', function (params, req, res, next) {
    Picker.middleware(_getStableDeploymentAppList2(params, req, res, next));
  });
  Picker.route('/gsd/mats/:app/getStableDeploymentAppList/:deployment', function (params, req, res, next) {
    Picker.middleware(_getStableDeploymentAppList2(params, req, res, next));
  });
  Picker.route('/:app/getDeploymentEnvironments', function (params, req, res, next) {
    Picker.middleware(_getDeploymentEnvironments2(params, req, res, next));
  });
  Picker.route('/:app/getDeploymentEnvironments', function (params, req, res, next) {
    Picker.middleware(_getDeploymentEnvironments2(params, req, res, next));
  }); // private middleware for _getDeploymentEnvironments route

  var _getDeploymentEnvironments2 = function (params, req, res, next) {
    var rawdata = Deployments.find({}, {
      fields: {
        'deployment_environment': 1,
        '_id': 0
      }
    }).fetch();
    var data = rawdata.map(function (a) {
      return a.deployment_environment;
    });
    var jsonData = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.write(jsonData);
    res.end();
  }; // private middleware for _getProductionDeploymentAppsForServer route


  var _getStableDeployment2 = function (params, req, res, next) {
    var data = Deployments.findOne({
      deployment_environment: params.deployment
    }, {
      "apps.app": 1,
      "apps.title": 1,
      "apps.version": 1,
      _id: 0
    });

    if (data == null || data._id == null) {
      data = {
        "error": "cannot find such a deployment, try .../getStableDeploymentBundle/production"
      };
    }

    delete data._id;
    delete data.servers;

    if (data.apps != null) {
      data.apps.forEach(function (e) {
        delete e.last_test_run;
        delete e.last_test_status;
        delete e.buildDate;
      });
    }

    var jsonData = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.write(jsonData);
    res.end();
  }; // private middleware for _getProductionDeploymentAppsForServer route


  var _getStableDeploymentAppList2 = function (params, req, res, next) {
    var data = Deployments.findOne({
      deployment_environment: params.deployment
    }, {
      "apps.app": 1,
      "apps.title": 1,
      "apps.version": 1,
      _id: 0
    });

    if (data == null || data._id == null) {
      data = {
        "error": "cannot find such a deployment, try .../getStableDeploymentBundle/production"
      };
    }

    var jsonData = JSON.stringify(data.apps, ["apps", "app", "title", "group"], 2);
    res.setHeader('Content-Type', 'application/json');
    res.write(jsonData);
    res.end();
  };
}

Meteor.methods({});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"client":{"main.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// client/main.js                                                                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.link("../imports/ui/body.js");
module.link("/imports/startup/client");
module.link("/imports/startup/both");
module.link("bootstrap");
module.link("bootstrap/dist/css/bootstrap.css");
module.link("bootstrap/dist/css/bootstrap-theme.css");
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".html",
    ".css"
  ]
});

require("/client/main.js");