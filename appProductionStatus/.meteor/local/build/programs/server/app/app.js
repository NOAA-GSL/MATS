var require = meteorInstall({"imports":{"api":{"buildConfiguration.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// imports/api/buildConfiguration.js                                                                        //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.export({
  BuildConfiguration: () => BuildConfiguration,
  AllowedUsers: () => AllowedUsers
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 1);
const BuildConfiguration = new Mongo.Collection('buildConfiguration');
const AllowedUsers = new Mongo.Collection('allowedUsers');

if (Meteor.isServer) {
  Meteor.publish('BuildConfiguration', function buildConfigurationPublication() {
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
  });
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deployments.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// imports/api/deployments.js                                                                               //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.export({
  Deployments: () => Deployments
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 1);
const Deployments = new Mongo.Collection('deployment');

if (Meteor.isServer) {
  Meteor.publish('Deployments', function deploymentsPublication() {
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
  }); // server side route for rest API
  // define some server side routes

  Picker.route('/:app/getStableDeployment/:deployment', function (params, req, res, next) {
    Picker.middleware(_getStableDeployment(params, req, res, next));
  });
  Picker.route('/gsd/mats/:app/getStableDeployment/:deployment', function (params, req, res, next) {
    Picker.middleware(_getStableDeployment(params, req, res, next));
  });
  Picker.route('/:app/getStableDeploymentAppList/:deployment', function (params, req, res, next) {
    Picker.middleware(_getStableDeploymentAppList(params, req, res, next));
  });
  Picker.route('/gsd/mats/:app/getStableDeploymentAppList/:deployment', function (params, req, res, next) {
    Picker.middleware(_getStableDeploymentAppList(params, req, res, next));
  });
  Picker.route('/:app/getDeploymentEnvironments', function (params, req, res, next) {
    Picker.middleware(_getDeploymentEnvironments(params, req, res, next));
  });
  Picker.route('/gsd/mats/:app/getDeploymentEnvironments', function (params, req, res, next) {
    Picker.middleware(_getDeploymentEnvironments(params, req, res, next));
  }); // private middleware for _getDeploymentEnvironments route

  const _getDeploymentEnvironments = function (params, req, res, next) {
    var rawdata = Deployments.find({}, {
      fields: {
        'deployment_environment': 1,
        '_id': 0
      }
    }).fetch();
    var data = rawdata.map(a => a.deployment_environment);
    var jsonData = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.write(jsonData);
    res.end();
  }; // private middleware for _getProductionDeploymentAppsForServer route


  const _getStableDeployment = function (params, req, res, next) {
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


  const _getStableDeploymentAppList = function (params, req, res, next) {
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"main.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// server/main.js                                                                                           //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.link("../imports/api/buildConfiguration.js");
module.link("../imports/api/deployments.js");
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYnVpbGRDb25maWd1cmF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9kZXBsb3ltZW50cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL21haW4uanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiQnVpbGRDb25maWd1cmF0aW9uIiwiQWxsb3dlZFVzZXJzIiwiTWV0ZW9yIiwibGluayIsInYiLCJNb25nbyIsIkNvbGxlY3Rpb24iLCJpc1NlcnZlciIsInB1Ymxpc2giLCJidWlsZENvbmZpZ3VyYXRpb25QdWJsaWNhdGlvbiIsInVzZXIiLCJ1c2VySWQiLCJ1bmRlZmluZWQiLCJ1c2VycyIsImZpbmRPbmUiLCJfaWQiLCJ1c2VybmFtZSIsInJlYWR5IiwiYWxsb3ciLCJpbnNlcnQiLCJkb2MiLCJ1cGRhdGUiLCJmaWVsZE5hbWVzIiwibW9kaWZpZXIiLCJyZW1vdmUiLCJmaW5kIiwibWV0aG9kcyIsIkRlcGxveW1lbnRzIiwiZGVwbG95bWVudHNQdWJsaWNhdGlvbiIsImRlbnkiLCJQaWNrZXIiLCJyb3V0ZSIsInBhcmFtcyIsInJlcSIsInJlcyIsIm5leHQiLCJtaWRkbGV3YXJlIiwiX2dldFN0YWJsZURlcGxveW1lbnQiLCJfZ2V0U3RhYmxlRGVwbG95bWVudEFwcExpc3QiLCJfZ2V0RGVwbG95bWVudEVudmlyb25tZW50cyIsInJhd2RhdGEiLCJmaWVsZHMiLCJmZXRjaCIsImRhdGEiLCJtYXAiLCJhIiwiZGVwbG95bWVudF9lbnZpcm9ubWVudCIsImpzb25EYXRhIiwiSlNPTiIsInN0cmluZ2lmeSIsInNldEhlYWRlciIsIndyaXRlIiwiZW5kIiwiZGVwbG95bWVudCIsInNlcnZlcnMiLCJhcHBzIiwiZm9yRWFjaCIsImUiLCJsYXN0X3Rlc3RfcnVuIiwibGFzdF90ZXN0X3N0YXR1cyIsImJ1aWxkRGF0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQUEsTUFB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QU0sQ0FBQ0ssSUFBUCxDQUFZLCtCQUFaLEUiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIENvbG9yYWRvIFN0YXRlIFVuaXZlcnNpdHkgYW5kIFJlZ2VudHMgb2YgdGhlIFVuaXZlcnNpdHkgb2YgQ29sb3JhZG8uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKi9cblxuaW1wb3J0IHtNZXRlb3J9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHtNb25nb30gZnJvbSAnbWV0ZW9yL21vbmdvJztcblxuZXhwb3J0IGNvbnN0IEJ1aWxkQ29uZmlndXJhdGlvbiA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdidWlsZENvbmZpZ3VyYXRpb24nKTtcbmV4cG9ydCBjb25zdCBBbGxvd2VkVXNlcnMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignYWxsb3dlZFVzZXJzJyk7XG5pZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gICAgTWV0ZW9yLnB1Ymxpc2goJ0J1aWxkQ29uZmlndXJhdGlvbicsIGZ1bmN0aW9uIGJ1aWxkQ29uZmlndXJhdGlvblB1YmxpY2F0aW9uKCkge1xuICAgICAgICB2YXIgdXNlciA9IG51bGw7XG4gICAgICAgIGlmICh0aGlzLnVzZXJJZCAhPT0gdW5kZWZpbmVkICYmIE1ldGVvci51c2Vycy5maW5kT25lKHtfaWQ6dGhpcy51c2VySWR9KSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoe19pZDp0aGlzLnVzZXJJZH0pLnVzZXJuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdXNlciB8fCAhQWxsb3dlZFVzZXJzLmZpbmRPbmUoe3VzZXI6dXNlcn0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yZWFkeSgpO1xuICAgICAgICB9XG4gICAgICAgIEJ1aWxkQ29uZmlndXJhdGlvbi5hbGxvdyh7XG4gICAgICAgICAgICBpbnNlcnQ6IGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKGRvYywgZmllbGROYW1lcywgbW9kaWZpZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlbW92ZTogZnVuY3Rpb24gKGRvYykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIEJ1aWxkQ29uZmlndXJhdGlvbi5maW5kKHt9KTtcbiAgICB9KTtcbn1cblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgIC8vICdidWlsZENvbmZpZ3VyYXRpb24uaW5zZXJ0Jyh0ZXh0KSB7XG4gICAgLy8gICBjaGVjayh0ZXh0LCBTdHJpbmcpO1xuICAgIC8vXG4gICAgLy8gICBCdWlsZENvbmZpZ3VyYXRpb24uaW5zZXJ0KHtcbiAgICAvLyAgICAgdGV4dCxcbiAgICAvLyAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxuICAgIC8vICAgICBvd25lcjogdGhpcy51c2VySWQsXG4gICAgLy8gICAgIHVzZXJuYW1lOiBNZXRlb3IudXNlcnMuZmluZE9uZSh0aGlzLnVzZXJJZCkudXNlcm5hbWUsXG4gICAgLy8gICB9KTtcbiAgICAvLyB9XG59KTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIENvbG9yYWRvIFN0YXRlIFVuaXZlcnNpdHkgYW5kIFJlZ2VudHMgb2YgdGhlIFVuaXZlcnNpdHkgb2YgQ29sb3JhZG8uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKi9cblxuaW1wb3J0IHtNZXRlb3J9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHtNb25nb30gZnJvbSAnbWV0ZW9yL21vbmdvJztcbmV4cG9ydCBjb25zdCBEZXBsb3ltZW50cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdkZXBsb3ltZW50Jyk7XG5pZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gICAgTWV0ZW9yLnB1Ymxpc2goJ0RlcGxveW1lbnRzJywgZnVuY3Rpb24gZGVwbG95bWVudHNQdWJsaWNhdGlvbigpIHtcbiAgICAgICAgRGVwbG95bWVudHMuZGVueSh7XG4gICAgICAgICAgICBpbnNlcnQ6IGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uIChkb2MsIGZpZWxkTmFtZXMsIG1vZGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gRGVwbG95bWVudHMuZmluZCh7fSk7XG4gICAgfSk7XG4gICAgLy8gc2VydmVyIHNpZGUgcm91dGUgZm9yIHJlc3QgQVBJXG4gICAgLy8gZGVmaW5lIHNvbWUgc2VydmVyIHNpZGUgcm91dGVzXG4gICAgUGlja2VyLnJvdXRlKCcvOmFwcC9nZXRTdGFibGVEZXBsb3ltZW50LzpkZXBsb3ltZW50JywgZnVuY3Rpb24gKHBhcmFtcywgcmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgUGlja2VyLm1pZGRsZXdhcmUoX2dldFN0YWJsZURlcGxveW1lbnQocGFyYW1zLCByZXEsIHJlcywgbmV4dCkpO1xuICAgIH0pO1xuICAgIFBpY2tlci5yb3V0ZSgnL2dzZC9tYXRzLzphcHAvZ2V0U3RhYmxlRGVwbG95bWVudC86ZGVwbG95bWVudCcsIGZ1bmN0aW9uIChwYXJhbXMsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIFBpY2tlci5taWRkbGV3YXJlKF9nZXRTdGFibGVEZXBsb3ltZW50KHBhcmFtcywgcmVxLCByZXMsIG5leHQpKTtcbiAgICB9KTtcblxuICAgIFBpY2tlci5yb3V0ZSgnLzphcHAvZ2V0U3RhYmxlRGVwbG95bWVudEFwcExpc3QvOmRlcGxveW1lbnQnLCBmdW5jdGlvbiAocGFyYW1zLCByZXEsIHJlcywgbmV4dCkge1xuICAgICAgICBQaWNrZXIubWlkZGxld2FyZShfZ2V0U3RhYmxlRGVwbG95bWVudEFwcExpc3QocGFyYW1zLCByZXEsIHJlcywgbmV4dCkpO1xuICAgIH0pO1xuICAgIFBpY2tlci5yb3V0ZSgnL2dzZC9tYXRzLzphcHAvZ2V0U3RhYmxlRGVwbG95bWVudEFwcExpc3QvOmRlcGxveW1lbnQnLCBmdW5jdGlvbiAocGFyYW1zLCByZXEsIHJlcywgbmV4dCkge1xuICAgICAgICBQaWNrZXIubWlkZGxld2FyZShfZ2V0U3RhYmxlRGVwbG95bWVudEFwcExpc3QocGFyYW1zLCByZXEsIHJlcywgbmV4dCkpO1xuICAgIH0pO1xuXG4gICAgUGlja2VyLnJvdXRlKCcvOmFwcC9nZXREZXBsb3ltZW50RW52aXJvbm1lbnRzJywgZnVuY3Rpb24gKHBhcmFtcywgcmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgUGlja2VyLm1pZGRsZXdhcmUoX2dldERlcGxveW1lbnRFbnZpcm9ubWVudHMocGFyYW1zLCByZXEsIHJlcywgbmV4dCkpO1xuICAgIH0pO1xuICAgIFBpY2tlci5yb3V0ZSgnL2dzZC9tYXRzLzphcHAvZ2V0RGVwbG95bWVudEVudmlyb25tZW50cycsIGZ1bmN0aW9uIChwYXJhbXMsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIFBpY2tlci5taWRkbGV3YXJlKF9nZXREZXBsb3ltZW50RW52aXJvbm1lbnRzKHBhcmFtcywgcmVxLCByZXMsIG5leHQpKTtcbiAgICB9KTtcblxuICAgIC8vIHByaXZhdGUgbWlkZGxld2FyZSBmb3IgX2dldERlcGxveW1lbnRFbnZpcm9ubWVudHMgcm91dGVcbiAgICBjb25zdCBfZ2V0RGVwbG95bWVudEVudmlyb25tZW50cyA9IGZ1bmN0aW9uIChwYXJhbXMsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIHZhciByYXdkYXRhID0gRGVwbG95bWVudHMuZmluZCh7fSx7ZmllbGRzOnsnZGVwbG95bWVudF9lbnZpcm9ubWVudCc6MSwnX2lkJzowfX0pLmZldGNoKCk7XG4gICAgICAgIHZhciBkYXRhID0gcmF3ZGF0YS5tYXAoYSA9PiBhLmRlcGxveW1lbnRfZW52aXJvbm1lbnQpO1xuICAgICAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLDIpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICByZXMud3JpdGUoanNvbkRhdGEpO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgfVxuXG4gICAgLy8gcHJpdmF0ZSBtaWRkbGV3YXJlIGZvciBfZ2V0UHJvZHVjdGlvbkRlcGxveW1lbnRBcHBzRm9yU2VydmVyIHJvdXRlXG4gICAgY29uc3QgX2dldFN0YWJsZURlcGxveW1lbnQgPSBmdW5jdGlvbiAocGFyYW1zLCByZXEsIHJlcywgbmV4dCkge1xuICAgICAgICB2YXIgZGF0YSA9IERlcGxveW1lbnRzLmZpbmRPbmUoe2RlcGxveW1lbnRfZW52aXJvbm1lbnQ6IHBhcmFtcy5kZXBsb3ltZW50fSx7XCJhcHBzLmFwcFwiOjEsXCJhcHBzLnRpdGxlXCI6MSxcImFwcHMudmVyc2lvblwiOjEsX2lkOjB9KTtcbiAgICAgICAgaWYgKGRhdGEgPT0gbnVsbCB8fCBkYXRhLl9pZCA9PSBudWxsKSB7XG4gICAgICAgICAgICBkYXRhID0ge1wiZXJyb3JcIjpcImNhbm5vdCBmaW5kIHN1Y2ggYSBkZXBsb3ltZW50LCB0cnkgLi4uL2dldFN0YWJsZURlcGxveW1lbnRCdW5kbGUvcHJvZHVjdGlvblwifTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgZGF0YS5faWQ7XG4gICAgICAgIGRlbGV0ZSBkYXRhLnNlcnZlcnM7XG4gICAgICAgIGlmIChkYXRhLmFwcHMgIT0gbnVsbCkge1xuICAgICAgICAgICAgZGF0YS5hcHBzLmZvckVhY2goZnVuY3Rpb24oZSl7IGRlbGV0ZSBlLmxhc3RfdGVzdF9ydW47IGRlbGV0ZSBlLmxhc3RfdGVzdF9zdGF0dXM7IGRlbGV0ZSBlLmJ1aWxkRGF0ZTt9KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIganNvbkRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLDIpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICByZXMud3JpdGUoanNvbkRhdGEpO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgfVxuICAgIC8vIHByaXZhdGUgbWlkZGxld2FyZSBmb3IgX2dldFByb2R1Y3Rpb25EZXBsb3ltZW50QXBwc0ZvclNlcnZlciByb3V0ZVxuICAgIGNvbnN0IF9nZXRTdGFibGVEZXBsb3ltZW50QXBwTGlzdCA9IGZ1bmN0aW9uIChwYXJhbXMsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgIHZhciBkYXRhID0gRGVwbG95bWVudHMuZmluZE9uZSh7ZGVwbG95bWVudF9lbnZpcm9ubWVudDogcGFyYW1zLmRlcGxveW1lbnR9LHtcImFwcHMuYXBwXCI6MSxcImFwcHMudGl0bGVcIjoxLFwiYXBwcy52ZXJzaW9uXCI6MSxfaWQ6MH0pO1xuICAgICAgICBpZiAoZGF0YSA9PSBudWxsIHx8IGRhdGEuX2lkID09IG51bGwpIHtcbiAgICAgICAgICAgIGRhdGEgPSB7XCJlcnJvclwiOlwiY2Fubm90IGZpbmQgc3VjaCBhIGRlcGxveW1lbnQsIHRyeSAuLi4vZ2V0U3RhYmxlRGVwbG95bWVudEJ1bmRsZS9wcm9kdWN0aW9uXCJ9O1xuICAgICAgICB9XG4gICAgICAgIHZhciBqc29uRGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEuYXBwcywgW1wiYXBwc1wiLFwiYXBwXCIsXCJ0aXRsZVwiLFwiZ3JvdXBcIl0sMik7XG5cbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgcmVzLndyaXRlKGpzb25EYXRhKTtcbiAgICAgICAgcmVzLmVuZCgpO1xuICAgIH1cblxufVxuTWV0ZW9yLm1ldGhvZHMoe1xufSk7XG4iLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDE5LiBDb2xvcmFkbyBTdGF0ZSBVbml2ZXJzaXR5IGFuZCBSZWdlbnRzIG9mIHRoZSBVbml2ZXJzaXR5IG9mIENvbG9yYWRvLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICovXG5cbmltcG9ydCAnLi4vaW1wb3J0cy9hcGkvYnVpbGRDb25maWd1cmF0aW9uLmpzJztcbmltcG9ydCAnLi4vaW1wb3J0cy9hcGkvZGVwbG95bWVudHMuanMnO1xuIl19
