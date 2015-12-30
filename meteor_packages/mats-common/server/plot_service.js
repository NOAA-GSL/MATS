Future = Npm.require('fibers/future');

var authorizedForRole = function (role) {
    if (!Meteor.userId()) {
        return false;
    }
    var email = Meteor.user().services.google.email.toLowerCase();
    var found = Authorization.findOne({email:email});
    if (found === undefined) {
        return false;
    }
    return (found.roles.indexOf(role) !== -1);
};

Meteor.methods({
    getDataFunctionFileList: function() {
        var future = new Future();
        var fs = Npm.require('fs');
        //console.log("Going to read directory ../web.browser/app/lib/dataFunctions");
        fs.readdir("../web.browser/app/lib/dataFunctions/",function(err, files){
            if (err) {
                return (err);
            }
            files.forEach( function (file){
                console.log( file );
            });
            future["return"](files);
            //return files
        });
        return future.wait();
    },
    getGraphFunctionFileList: function() {
        var future = new Future();
        var fs = Npm.require('fs');
        //console.log("Going to read directory ../web.browser/app/lib/displayFunctions/");
        fs.readdir("../web.browser/app/lib/displayFunctions/",function(err, files){
            if (err) {
                return (err);
            }
            files.forEach( function (file){
                console.log( file );
            });
            future["return"](files);
            //return files
        });
        return future.wait();
    },
    readFunctionFile: function(type,file) {
        var future = new Future();
        var fs = Npm.require('fs');
        var path = "";
        if (type == "data") {
            path = "../web.browser/app/lib/dataFunctions/" + file;
            console.log('exporting data file: ' + path);
        } else if (type == "graph") {
            path = "../web.browser/app/lib/displayFunctions/" + file;
            console.log('exporting graph file: ' + path);
        } else {
            return ("error - wrong tyoe");
        }
        fs.readFile(path, function (err, data) {
            if (err) throw err;
            future["return"](data.toString());
        });
        return future.wait();
    },
    restoreFromFile: function(type, name, data) {
        console.log("restoring " + type + " file " + name);
        var path = "";
        if (type == "data") {
            path = "../web.browser/app/lib/dataFunctions/" + name;
        } else if (type == "graph") {
            path = "../web.browser/app/lib/displayFunctions/" + name;
        } else {
            return ("error - wrong tyoe");
        }
        console.log('importing ' + type + ' file: ' + path);
        var fs = Npm.require('fs');
        fs.writeFile(path, data.toString(), function (err) {
            if (err) {
                return (err.toLocaleString());
            }
            console.log('imported ' + type + ' file: ' + path);
        });
    },
    restoreFromParameterFile: function(data) {
        var d = [];
        if (data.CurveParams) {
            CurveParams.remove({});
            d = _.map(data.CurveParams, function(o) { return _.omit(o, '_id'); });
            d.forEach(function(o){
                CurveParams.insert(o);
            });
        }
        if (data.PlotParams) {
            PlotParams.remove({});
            d = _.map(data.PlotParams, function(o) { return _.omit(o, '_id'); });
            d.forEach(function(o){
                PlotParams.insert(o);
            });
        }
        if (data.PlotGraphFunctions) {
            PlotGraphFunctions.remove({});
            d = _.map(data.PlotGraphFunctions, function(o) { return _.omit(o, '_id'); });
            d.forEach(function(o){
                PlotGraphFunctions.insert(o);
            });
        }
        if (data.Settings) {
            Settings.remove({});
            d = _.map(data.Settings, function(o) { return _.omit(o, '_id'); });
            d.forEach(function(o){
                Settings.insert(o);
            });
        }
        if (data.ColorScheme) {
            ColorScheme.remove({});
            d = _.map(data.ColorScheme, function(o) { return _.omit(o, '_id'); });
            d.forEach(function(o){
                ColorScheme.insert(o);
            });
        }
        if (data.Authorization) {
            Authorization.remove({});
            d = _.map(data.Authorization, function(o) { return _.omit(o, '_id'); });
            d.forEach(function(o){
                Authorization.insert(o);
            });
        }
        if (data.Roles) {
            Roles.remove({});
            d = _.map(data.Roles, function(o) { return _.omit(o, '_id'); });
            d.forEach(function(o){
                Roles.insert(o);
            });
        }
        if (data.Databases) {
            Databases.remove({});
            d = _.map(data.Databases, function(o) { return _.omit(o, '_id'); });
            d.forEach(function(o){
                Databases.insert(o);
            });
        }
        if (data.Credentials) {
            Credentials.remove({});
            d = _.map(data.Credentials, function(o) { return _.omit(o, '_id'); });
            d.forEach(function(o){
                Credentials.insert(o);
            });
        }
    },
    getUserAddress: function() {
        return Meteor.user().services.google.email.toLowerCase();
    },
    reset: function() {
        Roles.remove({});
        roles();
        Authorization.remove({});
        authorization();
        Credentials.remove({});
        credentials();
        PlotGraphFunctions.remove({});
        plotGraph();
        ColorScheme.remove({});
        colorScheme();
        Settings.remove({});
        settings();
        CurveParams.remove({});
        curveParams();
        PlotParams.remove({});
        plotParams();
    },
    applyDatabaseSettings: function(settings) {
        if (settings.name) {
            Databases.upsert({name: settings.name}, {
                $set: {
                    name: settings.name,
                    role: settings.role,
                    status: settings.status,
                    host: settings.host,
                    database: settings.database,
                    user: settings.user,
                    password: settings.password
                }
            });
        }
        return false;
    },
    removeDatabase: function(dbName) {
        Databases.remove({name:dbName});
    },
    insertColor: function(newColor,insertAfterIndex) {
        if (newColor == "rgb(255,255,255)") {
            return false;
        }
        var colorScheme = ColorScheme.findOne({});
        colorScheme.colors.splice(insertAfterIndex, 0, newColor);
        ColorScheme.update({},colorScheme);
        return false;
    },
    removeColor: function(removeColor) {
        var colorScheme = ColorScheme.findOne({});
        var removeIndex = colorScheme.colors.indexOf(removeColor);
        colorScheme.colors.splice(removeIndex, 1);
        ColorScheme.update({},colorScheme);
        return false;
    },
    setSettings: function(settings) {
        var labelPrefix = settings.labelPrefix;
        var title = settings.title;
        var lineWidth = settings.lineWidth;
        var nullFillString = settings.nullFillString;
        var resetFromCode = settings.resetFromCode;
        Settings.update({},{$set:{LabelPrefix:labelPrefix,Title:title,LineWidth:lineWidth,NullFillString:nullFillString,resetFromCode:resetFromCode}});
        return false;
    },

    setCredentials: function(settings) {
        var name = settings.name;
        var clientId = settings.clientId;
        var clientSecret = settings.clientSecret;
        var clientRefreshToken = settings.clientRefreshToken;
        Credentials.update({},{$set:{name:name,clientId:clientId,clientSecret:clientSecret,refresh_token:clientRefreshToken}});
        return false;
    },
    removeAuthorization: function(settings) {
        var email;
        var roleName;
        var userRoleName = settings.userRoleName;
        var authorizationRole = settings.authorizationRole;
        var newUserEmail = settings.newUserEmail;
        var existingUserEmail = settings.existingUserEmail;
        if (authorizationRole) {
            // existing role - the role roleName - no need to verify as the selection list came from the database
            roleName = authorizationRole;
        } else if (userRoleName) {
            roleName = userRoleName;
        }
        if (existingUserEmail) {
            email = existingUserEmail;
        } else {
            email = newUserEmail;
        }

        // if user and role remove the role from the user
        if (email && roleName) {
            Authorization.update({email:email},{$pull:{roles:roleName}});
        }
        // if user and no role remove the user
        if (email && !roleName) {
            Authorization.remove({email:email});
        }
        // if role and no user remove role and remove role from all users
        if (roleName && !email) {
            // remove the role
            Roles.remove({name:roleName});
            // remove the roleName role from all the authorizations
            Authorization.update({roles:roleName},{$pull:{roles:roleName}},{multi:true});
        }
        return false;
    },
    applyAuthorization: function(settings) {
        var roles;
        var roleName;
        var authorization;

        var userRoleName = settings.userRoleName;
        var userRoleDescription = settings.userRoleDescription;
        var authorizationRole = settings.authorizationRole;
        var newUserEmail = settings.newUserEmail;
        var existingUserEmail = settings.existingUserEmail;

        if (authorizationRole) {
            // existing role - the role roleName - no need to verify as the selection list came from the database
            roleName = authorizationRole;
        } else if (userRoleName && userRoleDescription) {
            // possible new role - see if it happens to already exist
            var role = Roles.findOne({name: userRoleName});
            if (role === undefined) {
                // need to add new role using description
                Roles.upsert({name:userRoleName},{$set: {description:userRoleDescription}});
                roleName = userRoleName;
            } else {
                // see if the description matches...
                roleName = role.name;
                var description = role.description;
                if (description != userRoleDescription) {
                    // have to update the description
                    Roles.upsert({name:userRoleName},{$set: {description:userRoleDescription}});
                }
            }
        }
        // now we have a role roleName - now we need an email
        if (existingUserEmail) {
            // existing user -  no need to verify as the selection list came from the database
            // see if it already has the role
            authorization = Authorization.findOne({email:existingUserEmail});
            roles = authorization.roles;
            if (roles.indexOf(roleName) == -1) {
                // have to add the role
                if (roleName) {
                    roles.push(roleName);
                }
                Authorization.upsert({email:existingUserEmail},{$set:{roles:roles}});
            }
        } else if (newUserEmail) {
            // possible new authorization - see if it happens to exist
            authorization = Authorization.findOne({email:newUserEmail});
            if (authorization !== undefined) {
                // authorization exists - add role to roles if necessary
                roles = authorization.roles;
                if (roles.indexOf(roleName) == -1) {
                    // have to add the role
                    if (roleName) {
                        roles.push(roleName);
                    }
                    Authorization.upsert({email:existingUserEmail},{$set:{roles:roles}});
                }
            } else {
                // need a new authorization
                roles = [];
                if (roleName) {
                    roles.push(roleName);
                }
                if (newUserEmail) {
                    Authorization.upsert({email: newUserEmail}, {$set: {roles: roles}});
                }
            }
        }
        return false;
    },
    userHasRole: function(role) {
        return authorizedForRole(role);
    },
    // refer to https://github.com/flot/flot/blob/master/API.md
    getGraphData: function(plotParams, plotType) {
        var future = new Future();
        var plotGraphFunction = PlotGraphFunctions.findOne({plotType:plotType});
        var dataFunction = plotGraphFunction.dataFunction;
        global[ dataFunction ](plotParams, function(results){
            //console.log('error:' + results.error + ' results.options: ' + results.options + ' results.data: ' + results.data);
            future["return"](results);
        });
        return future.wait();
    },
    saveSettings: function(saveAs,p, permission) {
        if (! Meteor.userId()) {
            throw new Meteor.Error("not-logged-in");
        }
        CurveSettings.upsert({name:saveAs},{name: saveAs, data:p, owner: Meteor.userId(), permission:permission, savedAt: new Date(), savedBy:Meteor.user().services.google.email.toLowerCase()});
    },
    addSentAddress: function(toAddress) {
        if (!Meteor.userId()) {
            throw new Meteor.Error(401,"not-logged-in");
        }
        SentAddresses.upsert({address:toAddress},{address: toAddress, userId:Meteor.userId()});
        return false;
    },

    emailImage: function(imageStr, toAddress, subject) {

        if (!Meteor.userId()) {
            throw new Meteor.Error(401,"not-logged-in");
        }

        var fromAddress = Meteor.user().services.google.email;
        // these come from google - see
        // http://masashi-k.blogspot.fr/2013/06/sending-mail-with-gmail-using-xoauth2.html
        //http://stackoverflow.com/questions/24098461/nodemailer-gmail-what-exactly-is-a-refresh-token-and-how-do-i-get-one/24123550

        // the gmail account for the credentials is mats.mail.daemon@gmail.com - pwd mats2015!
        //var clientId = "339389735380-382sf11aicmgdgn7e72p4end5gnm9sad.apps.googleusercontent.com";
        //var clientSecret = "7CfNN-tRl5QAL595JTW2TkRl";
        //var refresh_token = "1/PDql7FR01N2gmq5NiTfnrT-OlCYC3U67KJYYDNPeGnA";
        var credentials = Credentials.findOne({name:"oauth_google"},{clientId:1,clientSecret:1,refresh_token:1});
        var clientId = credentials.clientId;
        var clientSecret = credentials.clientSecret;
        var refresh_token = credentials.refresh_token;

        var smtpTransporter;
        try {
            smtpTransporter = Nodemailer.createTransport("SMTP", {
                service: "Gmail",
                auth: {
                    XOAuth2: {
                        user: "mats.gsd@noaa.gov",
                        clientId: clientId,
                        clientSecret: clientSecret,
                        refreshToken: refresh_token
                    }
                }
            });

        } catch (e) {
            throw new Meteor.Error(401, "Transport error " + e.message());
        }
        try {
            var mailOptions = {
                sender: fromAddress,
                replyTo: fromAddress,
                from: fromAddress,
                to: toAddress,
                subject: subject,
                attachments: [
                    {
                        filename: "graph.png",
                        contents: new Buffer(imageStr.split("base64,")[1], "base64")
                    }
                ]
            };

            smtpTransporter.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log("smtpTransporter error " + error + " from:" + fromAddress + " to:" + toAddress);
                } else {
                    console.log(response + " from:" + fromAddress + " to:" + toAddress);
                }
                smtpTransporter.close();
            });
        } catch (e) {
            throw new Meteor.Error(401, "Send error " + e.message());
        }
        return false;
    }
});


Meteor.publish("CurveParams", function () {
    return CurveParams.find();
});
Meteor.publish("CurveTextPatterns", function () {
    return CurveTextPatterns.find();
});
Meteor.publish("SavedCurveParams", function () {
    return SavedCurveParams.find();
});
Meteor.publish("PlotParams", function () {
    return PlotParams.find();
});
Meteor.publish("PlotGraphFunctions", function () {
    return PlotGraphFunctions.find();
});
Meteor.publish("RegionsPerModel", function () {
    return RegionsPerModel.find();
});
Meteor.publish("RegionDescriptions", function () {
    return RegionDescriptions.find();
});
Meteor.publish("Models", function () {
    return Models.find();
});
Meteor.publish("FcstLensPerModel", function () {
    return FcstLensPerModel.find();
});
Meteor.publish("ColorScheme", function () {
    return ColorScheme.find();
});
Meteor.publish("Settings", function () {
    return Settings.find();
});
Meteor.publish("CurveSettings", function () {
    return CurveSettings.find();
});
Meteor.publish("SentAddresses", function () {
    return SentAddresses.find({userId:this.userId});
});
Meteor.publish("Roles", function () {
    return Roles.find();
});
Meteor.publish("Authorization", function () {
    return Authorization.find();
});
Meteor.publish("Credentials", function () {
    return Credentials.find();
});
Meteor.publish("Databases", function () {
    return Databases.find();
});
