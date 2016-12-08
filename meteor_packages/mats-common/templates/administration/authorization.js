import { Meteor } from 'meteor/meteor';
import {matsCollections} from 'meteor/randyp:mats-common';

Template.authorization.helpers({
    roleOptions : function() {
        return matsCollections.Roles.find({}).fetch();
    },
    emailOptions: function(){
        return matsCollections.Authorization.find({}).fetch();
    }
});

Template.authorization.events({
    'click .apply_authorization': function () {
        var userRoleName = document.getElementById("userRoleName").value;
        var userRoleDescription = document.getElementById("userRoleDescription").value;
        var authorizationRole = document.getElementById("authorizationRole").value;
        var newUserEmail = document.getElementById("newUserEmail").value;
        var existingUserEmail = document.getElementById("existingUserEmail").value;
        var settings = {};
        settings.userRoleName=userRoleName;
        settings.userRoleDescription=userRoleDescription;
        settings.authorizationRole=authorizationRole;
        settings.newUserEmail=newUserEmail;
        settings.existingUserEmail=existingUserEmail;

        Meteor.call('applyAuthorization', settings, function (error) {
            if (error) {
                setError(new Error(error.message));
            }
        });
        // reset modal
        document.getElementById("userRoleName").value = "";
        document.getElementById("userRoleDescription").value = "";
        document.getElementById("authorizationRole").value = "";
        document.getElementById("newUserEmail").value = "";
        document.getElementById("existingUserEmail").value ="";

        $("#authorizationModal").modal('hide');
        return false;
    },
    'click .remove_authorization': function () {
        var userRoleName = document.getElementById("userRoleName").value;
        var userRoleDescription = document.getElementById("userRoleDescription").value;
        var authorizationRole = document.getElementById("authorizationRole").value;
        var newUserEmail = document.getElementById("newUserEmail").value;
        var existingUserEmail = document.getElementById("existingUserEmail").value;
        var settings = {};
        settings.userRoleName=userRoleName;
        settings.userRoleDescription=userRoleDescription;
        settings.authorizationRole=authorizationRole;
        settings.newUserEmail=newUserEmail;
        settings.existingUserEmail=existingUserEmail;

        Meteor.call('removeAuthorization', settings, function (error) {
            if (error) {
                setError(new Error(error.message));
            }
        });
        // reset modal
        document.getElementById("userRoleName").value = "";
        document.getElementById("userRoleDescription").value = "";
        document.getElementById("authorizationRole").value = "";
        document.getElementById("newUserEmail").value = "";
        document.getElementById("existingUserEmail").value ="";

        $("#authorizationModal").modal('hide');
        return false;
    },
    'click .cancel-authorization': function() {
        // reset the form
        document.getElementById("userRoleName").value = "";
        document.getElementById("userRoleDescription").value = "";
        document.getElementById("authorizationRole").value = "";
        document.getElementById("newUserEmail").value = "";
        document.getElementById("existingUserEmail").value ="";
    },
    'click .user_role_description': function() {
        document.getElementById('authorizationRole').value = '';
    },
    'click .user_role_name': function() {
        document.getElementById('authorizationRole').value = '';
    },
    'change .role-select': function() {
        document.getElementById('userRoleName').value = '';
        document.getElementById('userRoleDescription').value = '';
    },
    'click .user-email': function() {
        document.getElementById('existingUserEmail').value = '';
    },
    'change .user-select': function() {
        document.getElementById('newUserEmail').value = '';
    }
});


