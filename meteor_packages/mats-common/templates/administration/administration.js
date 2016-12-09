import { Meteor } from 'meteor/meteor';
import { Hooks } from 'meteor/differential:event-hooks';
import {matsTypes } from 'meteor/randyp:mats-common';
import {matsCollections } from 'meteor/randyp:mats-common';
import {matsMethods } from 'meteor/randyp:mats-common';

Accounts.onLogin(function() {
        matsMethods.getAuthorizations.call(function(error, result) {
            if (error !== undefined) {
                Session.set('roles', []);
                setError(new Error(error.toLocaleString()));
                return false;
            }
            authList = result;
            for (var ai = 0; ai < authList.length; ai++){
                var roles = authList[ai];
                Session.set('roles', roles);
                Session.set('signedIn', new Date().getTime());// force re-render after sign in success
            }
        });
});

Hooks.onLoggedOut = function (userid){
    Session.set('roles',[]);
    var adminContainerDiv = document.getElementById('adminContainer');
    var adminDiv = document.getElementById("administration");
    var userDiv = document.getElementById("administration");
    adminContainerDiv.style.display = "none";
    adminDiv.style.display = "none";
    userDiv.style.display = "none";
};

Template.administration.helpers({
    adminChanged: function() {
      return Session.get('adminChanged');
    },
    signedIn: function(){
        var d = new Date(Session.get('signedIn'));
        return (d.toDateString() + " " +d.toTimeString()).split("+")[0];
    },
    showAdministratorDiv: function(){
        var roles = Session.get('roles');
        if ( roles !== undefined && roles.indexOf('administrator') > -1) {
            return  "block";
        } else {
            return "none"
        }
    },
    showAuthenticatedDiv: function(){
        var roles = Session.get('roles');
        if ( roles !== undefined && (roles.indexOf('user') > -1) || roles !== undefined && (roles.indexOf('administrator') > -1)) {
            return  "block";
        } else {
            return "none"
        }
    },
    showResetNow: function() {
        var adminChanged = Session.get('adminChanged');
        var settings = matsCollections.Settings.findOne({});
        if (document.getElementById("ResetFromCode") == null) {
            return "none";
        }
        var resetEnabled =  settings === undefined ? false : document.getElementById("ResetFromCode").checked;
        var roles = Session.get('roles');
        if (roles !== undefined && (roles.indexOf('administrator') > -1) && resetEnabled) {
            return  "block";
        } else {
            return "none"
        }
    }

});

Template.administration.events({
    'click .authorization': function () {
        $("#authorizationModal").modal('show');
    },
    'click .credentials': function () {
        $("#mailCredentialsModal").modal('show');
    },
    'click .database': function () {
        $("#databasesModal").modal('show');
    },
    'click .colors': function () {
        $("#colorSchemeModal").modal('show');
    },
    'click .settings': function () {
        $("#settingsModal").modal('show');
    },
    'click .curveParams': function () {
        var params = matsCollections.CurveParams.find({}, {sort: {displayOrder:1}}).fetch();
        Session.set('params',params);
        $("#curveParamsModal").modal('show');
    },
    'click .plotGraphFunctions': function () {
        $("#plotGraphFunctionsModal").modal('show');
    },
    'click .export': function () {
        $("#exportModal").modal('show');
    },
    'click .import': function () {
        $("#importModal").modal('show');
    },
    'click .adminControl': function() {
        var adminContainerDiv = document.getElementById('adminContainer');
        var adminDiv = document.getElementById("administration");
        var userDiv = document.getElementById("administration");

        if (adminContainerDiv.style.display == "none") {
            adminContainerDiv.style.display = "block";
            var roles = Session.get('roles');
            if (roles !== undefined && Session.get('roles').indexOf('administrator') > -1) {
                adminDiv.style.display = "block";
                userDiv.style.display = "block";
            } else if(roles !== undefined && Session.get('roles').indexOf('user') > -1) {
                userDiv.style.display = "block";
            } else {
                adminContainerDiv.style.display = "none";
                adminDiv.style.display = "none";
                userDiv.style.display = "none";
            }
        } else {
            adminContainerDiv.style.display = "none";
            adminDiv.style.display = "none";
            userDiv.style.display = "none";
        }
    },
    'click .resetNow': function() {
        $("#resetModal").modal('show');
        document.getElementById("ResetFromCode").checked = false;

        var settings = matsCollections.Settings.findOne({});
        settings.resetFromCode = false;
        matsMethods.setSettings.call({settings:settings}, function (error) {
            if (error) {
                setError(new error(error.message));
            }
        });
    }
});