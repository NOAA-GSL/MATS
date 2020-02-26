import {Groups} from '/imports/api/groups.js';
import {Meteor} from 'meteor/meteor';
import './landing.html';
import {Session} from 'meteor/session';


const baseUrl = function() {
    var base_arr = document.location.href.split('/');
    base_arr.pop();
    return( base_arr.join('/') );
};

const getHref = function (app) {
  if (app) {
    // assume it isn't active
    var href = baseUrl() + "/" + app.app + "/status";
    //var href = baseUrl() + "/" + "home" + "/status";
    var request = new XMLHttpRequest();
    request.onload = function () {
      if (this.status != 200) {
        // no success
        //return("");
        Session.set('href-' + app.app, "");
      } else {
        // success - but might still be not running
        if (this.responseText.includes("Running")) {
          // it is there and running - set it active
          //return baseUrl() + "/" + app.app;
          Session.set('href-' + app.app, baseUrl() + "/" + app.app);
        } else {
          // was not running
          //return "";
          Session.set('href-' + app.app, "");
        }
      }
    };
    request.open("GET", href);
    request.send();

  }
}

const getClass = function (app) {
  if (app) {
    // assume it isn't active
    var href = baseUrl() + "/" + app.app + "/status";
    //var href = baseUrl() + "/" + "home" + "/status";
    var request = new XMLHttpRequest();
    request.onload = function () {
      if (this.status != 200) {
        // no success
        return "btn-sm";
        Session.set('class-' + app.app, "btn-sm");
      } else {
        // success - but might still be not running
        if (this.responseText.includes("Running")) {
          // it is there and running - set it active
          //return "btn-sm btn-primary";
          Session.set('class-' + app.app, "btn-sm btn-primary");
        } else {
          // was not running
          //return "btn-sm";
          Session.set('class-' + app.app, "btn-sm");
        }
      }
    };
    request.open("GET", href);
    request.send();
  }
}

Template.landing.onCreated(function () {
  Meteor.subscribe('groups');
  Meteor.call('getEnvironment', (error, result) => {
    if (error) {
      alert(error);
      Session.set('deployment_environment', 'unknown');
    } else {
      Session.set('deployment_environment', result);
    }
  });
});

Template.landing.helpers({
  setHref: function(app) {
    getHref(app);
  },
  setClass: function(app){
    getClass(app);
  },
  href: function(app) {
    if (app) {
      return Session.get('href-' + app.app);
    } else {
      return "";
    }
  },
  class: function(app) {
    if (app) {
      return Session.get('class-' + app.app);
    } else {
      return 'btn-sm';
    }
  },
  groupIsVisible: function(groupName) {
    //return Session.get(groupName + "-visible") == true ? "block" : "none";
    return "block";
  },
  transparentGif: function() {
    var loc = document.location.href.replace(/#$/g, '');;

    return  loc + "/img/noaa_transparent.gif";
  },
  homeUrl: function() {
    return  document.location.href;
  },
  groups() {
    const groups = Groups.find({}, {sort: {groupOrder: '1'}}).fetch();
    return groups;
  },
  noGroups() {
    const groupsSize = Groups.find({}).count();
    return groupsSize == 0;
  },
  groupName() {
    this.groupName;
  },
  appReference(app) {
    if (app) {
      return app.app;
    }
  },
  title(app) {
    return app.title;
  },
  proxy_prefix(app) {
    return app.proxy_prefix;
  },
  color(app) {
    return app.color;
  },
  home(app) {
    return app.home;
  },
  baseUrl() {
    return baseUrl();
  },
  environment() {
      return Session.get('deployment_environment');
  },
  isMats() {
      switch (Session.get('deployment_environment')) {
        case 'development':
        case 'integration':
        case 'production':
          return true;
          break;
        case 'metexpress':
          return false;
          break;
        default:
          return true;
      }
  },
  isNWS() {
      switch (Session.get('deployment_environment')) {
        case 'development':
        case 'integration':
        case 'production':
          return false;
          break;
        case 'metexpress':
          return true;
          break;
        default:
          return false;
      }
    }
});

