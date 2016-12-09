import {matsCollections} from 'meteor/randyp:mats-common';
import { matsMethods } from 'meteor/randyp:mats-common';

Template.databases.onRendered(function () {
    reset();
});
Template.databases.helpers({
    databases : function() {
        dbs = matsCollections.Databases.find({}).fetch();
        dbs.unshift({name:"New Database"});
        return dbs;
    },
    errorMessage: function() {
        return Session.get("databaseErrorMessage");
    },
    errorTypeIs: function(type) {
        return Session.get("databaseErrorType") === type;
    }


});
var reset = function(){
    document.getElementById("database-selection").value = "";
    document.getElementById("database-name").value = "";
    document.getElementById("database-role-model").checked = false;
    document.getElementById("database-role-ua").checked = false;
    document.getElementById("database-status-standby").checked = false;
    document.getElementById("database-status-active").checked = false;
    document.getElementById("database-host").value = "";
    document.getElementById("database-database").value = "";
    document.getElementById("database-user").value = "";
    document.getElementById("database-password").value = "";
    document.getElementById("database-verify").value = "";
    resetError();
};
var resetError = function() {
    errorMessage = "";
    Session.set("databaseErrorMessage","");
    Session.set("databaseErrorType","");
    if (document.getElementById("errorMessage")) {
        document.getElementById("errorMessage").style.display = "none";
    }
};
var setError = function(type,message) {
    Session.set("databaseErrorMessage", message);
    Session.set("databaseErrorType", type);

    document.getElementById("errorMessage").style.display = "block";
};

Template.databases.events({
    'click .database': function() {
        resetError();
        var dbName = document.getElementById("database-selection").value;
        if (dbName == "New Database") {
            reset();
            return false;
        }
        var db = matsCollections.Databases.findOne({name:dbName});
        document.getElementById("database-selection").value = "";
        document.getElementById("database-name").value = db.name;
        document.getElementById("database-role-model").checked = db.role == "model";
        document.getElementById("database-role-ua").checked = db.role == "ua";
        document.getElementById("database-status-standby").checked = db.status == "standby";
        document.getElementById("database-status-active").checked = db.status == "active";
        document.getElementById("database-host").value = db.host;
        document.getElementById("database-database").value = db.database;
        document.getElementById("database-user").value = db.user;
        document.getElementById("database-password").value = db.password;
        document.getElementById("database-verify").value = db.password;
    },
    'click .apply-database': function () {
        var settings = {};
        resetError();
        settings.name = document.getElementById("database-name").value;
        if (document.getElementById("database-role-model").checked === true) {
            settings.role = "model";
        } else if (document.getElementById("database-role-ua").checked === true) {
            settings.role = "ua";
        }
        if (document.getElementById("database-status-standby").checked === true) {
            settings.status = "standby";
        } else if (document.getElementById("database-status-active").checked === true) {
            // set any other database with this role to standby
            matsCollections.Databases.upsert({});
            settings.status = "active";
        }
        settings.host = document.getElementById("database-host").value;
        settings.database = document.getElementById("database-database").value;
        settings.user = document.getElementById("database-user").value;
        settings.password = document.getElementById("database-password").value;
        var verify = document.getElementById("database-verify").value;
        if (settings.password != verify) {
            setError('password',"Password and Verify do not match!");
            return false;
        }
        if (settings.name === "") {
            setError("name","you have to set a name");
            return false;
        }
        // ONLY ONE CAN BE ACTIVE FOR A GIVEN ROLE
        //if (settings.role === "") {
        //    setError(role,"you have to set a role");
        //    return false;
        //}
        if (settings.host === ""){
            setError('host',"you have to set a host");
            return false;
        }
        if (settings.database === ""){
            setError('database',"you have to set a database");
            return false;
        }
        if (settings.user === ""){
            setError('user',"you have to set a user");
            return false;
        }

        matsMethods.applyDatabaseSettings.call( settings, function (error) {
            if (error) {
                setError(new error('matsMethods.applyDatabaseSettings from Template.databases.events: 121 error:' + error.message));
                return false;
            }
        });
        reset();
        $("#databasesModal").modal('hide');
        return false;
    },
    'click .remove-database': function() {
        var dbName = document.getElementById("database-name").value;
        matsMethods.removeDatabase.call( dbName, function (error) {
            if (error) {
                setError(new Error('matsMethods.removeDatabase from Template.databases.events: 121 error:' + error.message));
            }
        });
        reset();
        $("#databasesModal").modal('hide');
        return false;
    },
    'click .cancel-database': function() {
        reset();
    }
});


