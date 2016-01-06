Accounts.onLogin(function() {
    Meteor.call('getUserAddress', function (error, result) {
        if (error !== undefined) {
            Session.set('roles', []);
            setError(error.toLocaleString());
            return false;
        }
        var roles = ['user']; // everyone who signs in is a user
        var auth = Authorization.findOne({email: result});
        if (auth) {
            roles = roles.concat(auth.roles);
        }
        Session.set('roles', roles);
        Session.set('signedIn', new Date().getTime());// force re-render after sign in success
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
        var settings = Settings.findOne({});
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
        var params = CurveParams.find({}, {sort: {displayOrder:1}}).fetch();
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

        var settings = Settings.findOne({});
        settings.resetFromCode = false;
        Meteor.call('setSettings', settings, function (error) {
            if (error) {
                setError(error.message);
            }
        });
    }
});