import {Groups} from '/imports/api/groups.js';
import {Meteor} from 'meteor/meteor';
import './landing.html';
import {Session} from 'meteor/session';


const baseUrl = function() {
    var base_arr = document.location.href.split('/');
    base_arr.pop();
    return( base_arr.join('/') );
};

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
  appDisabled: function(app) {
    if (app) {
      var href = baseUrl() + "/" + app.app;
      $.ajax({
        type: 'GET',
        url: {href},
        statusCode: {
          200: function (responseObject, textStatus, jqXHR) {
            console.log('success for url: ', href, + ' : ', responseObject.status);
            document.getElementById(app.app + "-button").href=href;
            document.getElementById(app.app + "-button").classList.add("btn-primary");
          },
          404: function (responseObject, textStatus, jqXHR) {
            // No content found (404)
            console.log('not found for url: ', href, + ' : ', responseObject.status);
            document.getElementById(app.app + "-button").href="";
            document.getElementById(app.app + "-button").classList.remove("btn-primary");
          },
          503: function (responseObject, textStatus, errorThrown) {
            // Service Unavailable (503)
            console.log('unavailable for url: ', href, + ' : ', responseObject.status);
            document.getElementById(app.app + "-button").href="";
            document.getElementById(app.app + "-button").classList.remove("btn-primary");
          }
        }
      });
    }
  },
  groupIsVisible: function(groupName) {
    //return Session.get(groupName + "-visible") == true ? "block" : "none";
    return "block";
  },
  transparentGif: function() {
    return  document.location.href + "img/noaa_transparent.gif";
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

