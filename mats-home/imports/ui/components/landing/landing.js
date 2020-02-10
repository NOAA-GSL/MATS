import { Groups } from '/imports/api/groups.js';
import { Meteor } from 'meteor/meteor';
import './landing.html';
import fontawesome from '@fortawesome/fontawesome';
import regular from '@fortawesome/fontawesome-free-regular';
import solid from '@fortawesome/fontawesome-free-solid';
import brands from '@fortawesome/fontawesome-free-brands';
import { Session } from 'meteor/session';

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
    return app.app;
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
    return document.location.href;
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

