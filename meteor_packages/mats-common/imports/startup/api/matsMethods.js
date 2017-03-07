import { Meteor } from "meteor/meteor";
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { fs } from 'fs';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import  { matsCollections }   from 'meteor/randyp:mats-common';

const saveResultData = function(result){
    var publicDir = "/web/static/";
    var graphDataDir = ".graphData/";
    var publicGraphDir = publicDir + "/" + graphDataDir;
    var fs = require('fs');
    try {
        if (!fs.existsSync(publicGraphDir)) {
            fs.mkdirSync(publicGraphDir);
        }
    } catch (e) {
        console.log('api.matsMethods.saveResultData', "error: " + e);
        return "Error creating directory " + publicGraphDir + " <br>" + e;
    }
    var user = Meteor.userId() == null ? "anonymous" : Meteor.userId();
    var tStamp = moment(new Date()).utc().format();
    var datFileName = user + "-" + tStamp +".json";
    var fName = publicGraphDir + datFileName;
    var link = "file:///web/static/" + graphDataDir + datFileName;
    var files = fs.readdirSync(publicGraphDir);
    files.sort(function(a, b) {
        return fs.statSync(publicGraphDir + a).mtime.getTime() -
            fs.statSync(publicGraphDir + b).mtime.getTime();
    });
    // bin the files based on user
    var fileBin = {};
    for (var fIndex = 0; fIndex < files.length; fIndex++) {
        var f = files[fIndex];
        var u = f.split('-')[0];
        fileBin[u] = fileBin[u] == undefined ? [] : fileBin[u];
        fileBin[u].push (f);
    }
    var removeThese = [];
    var fBins = Object.keys(fileBin);
    for (fIndex = 0; fIndex < fBins.length; fIndex++) {
        if (fileBin[fBins[fIndex]].length > 20) {
            var oldOnes = fileBin[fBins[fIndex]].slice(0,fileBin[fBins[fIndex]].length - 20);
            removeThese = removeThese.concat(oldOnes);
        }
    }
    for (fIndex = 0; fIndex < removeThese.length; fIndex++) {
        var path = publicGraphDir + removeThese[fIndex];
        fs.unlink(path, function(err){
            if (err) {
                console.log('api.matsMethods.saveResultData', "could not remove file: " + path);
                return "console.log('api.matsMethods.saveResultData could not remove file: <br>" + path + " <br>" + err;
            }
        });
    }
    fs.writeFile(fName, JSON.stringify(result, null, 2), function (err) {
        if (err) {
            console.log('api.matsMethods.saveResultData', "could not write file: " + fName + "error: " + err);
            return "api.matsMethods.saveResultData could not write file: <BR>" + fName + " <BR> error: " + err;
        }
    });
    return link;
};


const getDataFunctionFileList = new ValidatedMethod({
    name: 'matsMethods.getDataFunctionFileList',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
            // var future = require('fibers/future');
            // var fs = require('fs');
            // fs.readdir("/web/static/dataFunctions/", function (err, files) {
            //     if (err) {
            //         console.log("getDataFunctionFileList error: " + err);
            //         return (err);
            //     }
            //     console.log("getDataFunctionFileList files are " + files);
            //     future["return"](files);
            // });
            // return future.wait();
        }
    }
});

const getGraphFunctionFileList = new ValidatedMethod({
    name: 'matsMethods.getGraphFunctionFileList',
    validate: new SimpleSchema({}).validator(),
    run() {
        if (Meteor.isServer) {
            // var future = require('fibers/future');
            // var fs = require('fs');
            // fs.readdir("/web/static/displayFunctions/", function (err, files) {
            //     if (err) {
            //         console.log("getDataFunctionFileList error: " + err);
            //         return (err);
            //     }
            //     console.log("getGraphFunctionFileList files are " + files);
            //     future["return"](files);
            // });
            // return future.wait();
        }
    }
});

const readFunctionFile = new ValidatedMethod({
    name:'matsMethods.readFunctionFile',
    validate:  new SimpleSchema({}).validator(),
    run (){
        if (Meteor.isServer) {
            var future = require('fibers/future');
            var fs = require('fs');
            var path = "";
            var fData;
            if (type == "data") {
                path = "/web/static/dataFunctions/" + file;
                console.log('exporting data file: ' + path);
            } else if (type == "graph") {
                path = "/web/static/displayFunctions/" + file;
                console.log('exporting graph file: ' + path);
            } else {
                return ("error - wrong type");
            }
            fs.readFile(path, function (err, data) {
                if (err) throw err;
                fData = data.toString();
            });
            future.wait();
            return fData;
        }
    }
});

const readDataFile = new ValidatedMethod({
    name:'matsMethods.readDataFile',
    validate: new SimpleSchema({
        path: {type: String},
    }).validator(),

    run(params){
        if (Meteor.isServer) {
            var fs = require('fs');
            readSyncFunc = Meteor.wrapAsync(fs.readFile);
            var fData = readSyncFunc(params.path);
            return fData.toString();
        }
    }
});

const restoreFromFile = new ValidatedMethod({
        name: 'matsMethods.restoreFromFile',
        validate: new SimpleSchema({
            type: {type: String},
            name: {type: String},
            data: {type: Object, blackbox:true}
        }).validator(),

        run(params){
            if (Meteor.isServer) {
                console.log("restoring " + params.type + " file " + params.name);
                var path = "";
                if (params.type == "data") {
                    path = "/web/static/dataFunctions/" + params.name;
                } else if (params.ype == "graph") {
                    path = "/web/static/displayFunctions/" + params.name;
                } else {
                    return ("error - wrong tyoe");
                }
                console.log('importing ' + params.type + ' file: ' + path);
                var fs = Npm.require('fs');
                fs.writeFile(path, params.data.toString(), function (err) {
                    if (err) {
                        return (err.toLocaleString());
                    }
                    console.log('imported ' + params.type + ' file: ' + path);
                });
            }
        }
    });

const restoreFromParameterFile = new ValidatedMethod({
    name: 'matsMethods.restoreFromParameterFile',
    validate: new SimpleSchema({
        name: {type:String},
        data: {type: Object, blackbox:true}
    }).validator(),
    run (params) {
        var data = params.data;
        if (Meteor.isServer) {
            var d = [];
            if (data.CurveParams) {
                matsCollections.CurveParams.remove({});
                d = _.map(data.CurveParams, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.CurveParams.insert(o);
                });
            }
            if (data.PlotParams) {
                matsCollections.PlotParams.remove({});
                d = _.map(data.PlotParams, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.PlotParams.insert(o);
                });
            }
            if (data.PlotGraphFunctions) {
                matsCollections.PlotGraphFunctions.remove({});
                d = _.map(data.PlotGraphFunctions, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.PlotGraphFunctions.insert(o);
                });
            }
            if (data.Settings) {
                matsCollections.Settings.remove({});
                d = _.map(data.Settings, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Settings.insert(o);
                });
            }
            if (data.ColorScheme) {
                matsCollections.ColorScheme.remove({});
                d = _.map(data.ColorScheme, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.ColorScheme.insert(o);
                });
            }
            if (data.Authorization) {
                matsCollections.Authorization.remove({});
                d = _.map(data.Authorization, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Authorization.insert(o);
                });
            }
            if (data.Roles) {
                matsCollections.Roles.remove({});
                d = _.map(data.Roles, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Roles.insert(o);
                });
            }
            if (data.Databases) {
                matsCollections.Databases.remove({});
                d = _.map(data.Databases, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Databases.insert(o);
                });
            }
            if (data.Credentials) {
                matsCollections.Credentials.remove({});
                d = _.map(data.Credentials, function (o) {
                    return _.omit(o, '_id');
                });
                d.forEach(function (o) {
                    matsCollections.Credentials.insert(o);
                });
            }
         }
    }
});

const getUserAddress = new ValidatedMethod({
    name: 'matsMethods.getUserAddress',
    validate: new SimpleSchema({}).validator(),
    run (){
        if (Meteor.isServer) {
            return Meteor.user().services.google.email.toLowerCase();
        }
    }
});

const reset = new ValidatedMethod({
    name: 'matsMethods.reset',
    validate: new SimpleSchema({}).validator(),
    run (){
        if (Meteor.isServer) {
            matsCollections.Roles.remove({});
            matsDataUtils.doRoles();
            matsCollections.Authorization.remove({});
            matsDataUtils.doAuthorization();
            matsCollections.Credentials.remove({});
            matsDataUtils.doCredentials();
            matsCollections.PlotGraphFunctions.remove({});
            doPlotGraph();
            matsCollections.ColorScheme.remove({});
            matsDataUtils.doColorScheme();
            matsCollections.Settings.remove({});
            matsDataUtils.doSettings('Upper Air', Assets.getText('version'));
            matsCollections.CurveParams.remove({});
            doCurveParams();
            matsCollections.PlotParams.remove({});
            doPlotParams();
            matsCollections.CurveTextPatterns.remove({});
            doCurveTextPatterns();
        }
    }
});

const applyDatabaseSettings = new ValidatedMethod({
        name: 'matsMethods.applyDatabaseSettings',
        validate: new SimpleSchema({
            settings: {type: Object, blackbox:true}
        }).validator(),

        run(settings){
            if (Meteor.isServer) {
                if (settings.name) {
                    matsCollections.Databases.upsert({name: settings.name}, {
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
            }
        }
});

const removeDatabase = new ValidatedMethod({
        name: 'matsMethods.removeDatabase',
        validate: new SimpleSchema({
            dbName: {type: String}
        }).validator(),
        run(dbName){
            if (Meteor.isServer) {
                matsCollections.Databases.remove({name: dbName});
            }
        }
    });

const insertColor = new ValidatedMethod({
        name: 'matsMethods.insertColor',
        validate: new SimpleSchema({
            newColor: {type: String},
            insertAfterIndex: {type: Number}
        }).validator(),
        run(params){
            if (params.newColor == "rgb(255,255,255)") {
                return false;
            }
            var colorScheme = matsCollections.ColorScheme.findOne({});
            colorScheme.colors.splice(params.insertAfterIndex, 0, newColor);
            matsCollections.update({}, colorScheme);
            return false;
        }
    });

const removeColor = new ValidatedMethod({
        name: 'matsMethods.removeColor',
        validate: new SimpleSchema({
            removeColor: {type: String}
        }).validator(),
        run(removeColor){
            var colorScheme = matsCollections.ColorScheme.findOne({});
            var removeIndex = colorScheme.colors.indexOf(removeColor);
            colorScheme.colors.splice(removeIndex, 1);
            matsCollections.ColorScheme.update({}, colorScheme);
            return false;
        }
    });

const setSettings = new ValidatedMethod({
        name: 'matsMethods.setSettings',
        validate: new SimpleSchema({
            settings: {type: Object, blackbox:true}
        }).validator(),
        run(params){
            if (Meteor.isServer) {
                var settings = params.settings;
                var labelPrefix = settings.labelPrefix;
                var title = settings.title;
                var lineWidth = settings.lineWidth;
                var nullFillString = settings.nullFillString;
                var resetFromCode = settings.resetFromCode;
                matsCollections.Settings.update({}, {
                    $set: {
                        LabelPrefix: labelPrefix,
                        Title: title,
                        LineWidth: lineWidth,
                        NullFillString: nullFillString,
                        resetFromCode: resetFromCode
                    }
                });
            }
            return false;
        }
    });


const setSelectParamOptions = new ValidatedMethod({
        name: 'matsMethods.setSelectParamOptions',
        validate: new SimpleSchema({
            name: {type: String},
            options: {type: [String]},
            optionIndex: {type: Number, optional:true}
        }).validator( { clean: true, filter: false } ),
        run(params){
            var param = matsCollections.CurveParams.findOne({name: params.name});
            if (params.optionIndex === undefined) {
                params.optionIndex = 0;
            }
            if (param) {
                param.options = params.options;
                var param_id = param._id;
                matsCollections.CurveParams.update(param_id, {$set: {options: params.options, default:params.options[params.optionIndex]}});
            }
            return false;
        }
    });

const setCredentials = new ValidatedMethod({
    name: 'matsMethods.setCredentials',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox:true}
    }).validator(),
    run(settings){
        if (Meteor.isServer) {
            var name = settings.name;
            var clientId = settings.clientId;
            var clientSecret = settings.clientSecret;
            var clientRefreshToken = settings.clientRefreshToken;
            matsCollections.Credentials.update({}, {
                $set: {
                    name: name,
                    clientId: clientId,
                    clientSecret: clientSecret,
                    refresh_token: clientRefreshToken
                }
            });
            return false;
        }
    }
});

const removeAuthorization = new ValidatedMethod({
    name: 'matsMethods.removeAuthorization',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox:true}
    }).validator(),
    run(settings){
        if (Meteor.isServer) {
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
                matsCollections.Authorization.update({email: email}, {$pull: {roles: roleName}});
            }
            // if user and no role remove the user
            if (email && !roleName) {
                matsCollections.Authorization.remove({email: email});
            }
            // if role and no user remove role and remove role from all users
            if (roleName && !email) {
                // remove the role
                matsCollections.Roles.remove({name: roleName});
                // remove the roleName role from all the authorizations
                matsCollections.Authorization.update({roles: roleName}, {$pull: {roles: roleName}}, {multi: true});
            }
            return false;
        }
    }
});



const applyAuthorization = new ValidatedMethod({
    name: 'matsMethods.applyAuthorization',
    validate: new SimpleSchema({
        settings: {type: Object, blackbox:true}
    }).validator(),
    run(settings){
        if (Meteor.isServer) {
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
                var role = matsCollections.Roles.findOne({name: userRoleName});
                if (role === undefined) {
                    // need to add new role using description
                    matsCollections.Roles.upsert({name: userRoleName}, {$set: {description: userRoleDescription}});
                    roleName = userRoleName;
                } else {
                    // see if the description matches...
                    roleName = role.name;
                    var description = role.description;
                    if (description != userRoleDescription) {
                        // have to update the description
                        matsCollections.Roles.upsert({name: userRoleName}, {$set: {description: userRoleDescription}});
                    }
                }
            }
            // now we have a role roleName - now we need an email
            if (existingUserEmail) {
                // existing user -  no need to verify as the selection list came from the database
                // see if it already has the role
                authorization = matsCollections.Authorization.findOne({email: existingUserEmail});
                roles = authorization.roles;
                if (roles.indexOf(roleName) == -1) {
                    // have to add the role
                    if (roleName) {
                        roles.push(roleName);
                    }
                    matsCollections.Authorization.upsert({email: existingUserEmail}, {$set: {roles: roles}});
                }
            } else if (newUserEmail) {
                // possible new authorization - see if it happens to exist
                authorization = matsCollections.Authorization.findOne({email: newUserEmail});
                if (authorization !== undefined) {
                    // authorization exists - add role to roles if necessary
                    roles = authorization.roles;
                    if (roles.indexOf(roleName) == -1) {
                        // have to add the role
                        if (roleName) {
                            roles.push(roleName);
                        }
                        matsCollections.Authorization.upsert({email: existingUserEmail}, {$set: {roles: roles}});
                    }
                } else {
                    // need a new authorization
                    roles = [];
                    if (roleName) {
                        roles.push(roleName);
                    }
                    if (newUserEmail) {
                        matsCollections.Authorization.upsert({email: newUserEmail}, {$set: {roles: roles}});
                    }
                }
            }
            return false;
        }
    }
});

const getAuthorizations = new ValidatedMethod({
    name: 'matsMethods.getAuthorizations',
    validate: new SimpleSchema({
    }).validator(),
    run (){
        var roles = [];
        if (Meteor.isServer) {
            var userEmail = Meteor.user().services.google.email.toLowerCase();
            roles = matsCollections.Authorization.findOne({email: userEmail}).roles;
        }
        return roles;
    }
});

const getGraphData = new ValidatedMethod({
    name: 'matsMethods.getGraphData',
    validate: new SimpleSchema({
        plotParams: {
            type: Object,
            blackbox: true
        },
        plotType: {
            type: String
        }
    }).validator(),
    run(params){
        if (Meteor.isServer) {
            var Future = require('fibers/future');
            var future = new Future();
            var plotGraphFunction = matsCollections.PlotGraphFunctions.findOne({plotType: params.plotType});
            var dataFunction = plotGraphFunction.dataFunction;
            try {
                global[dataFunction](params.plotParams, function (results) {
                    if (process.env.NODE_ENV === "development") {
                        results.basis['dataLink'] = saveResultData(results);
                    }
                    future["return"](results);
                });
            } catch(dataFunctionError) {
                //throw new Meteor.Error(dataFunctionError.message,"Error in getGraphData function:" + dataFunction);
                if ( dataFunctionError.toLocaleString().indexOf( "INFO:" ) !== -1) {
                    throw new Meteor.Error(dataFunctionError.message);
                } else {
                    throw new Meteor.Error(dataFunctionError.message,"Error in getGraphData function:" + dataFunction);
                }
            }
            return future.wait();
        }
    }
});

const saveSettings = new ValidatedMethod({
    name: 'matsMethods.saveSettings',
    validate: new SimpleSchema({
        saveAs: {
            type: String
        },
        p: {
            type: Object,
            blackbox:true
        },
        permission: {
            type: String
        }
    }).validator(),
    run(params){
        var user = "anonymous";
        matsCollections.CurveSettings.upsert({name: params.saveAs}, {
            name: params.saveAs,
            data: params.p,
            owner: Meteor.userId() == null ? "anonymous" : Meteor.userId(),
            permission: params.permission,
            savedAt: new Date(),
            savedBy: Meteor.user() == null ? "anonymous" : user
        });
    }
});

const deleteSettings = new ValidatedMethod({
    name: 'matsMethods.deleteSettings',
    validate: new SimpleSchema({
        name: {
            type: String
        }
    }).validator(),
    run(params){
        if (!Meteor.userId()) {
             throw new Meteor.Error("not-logged-in");
        }
        if (Meteor.isServer) {
            matsCollections.CurveSettings.remove({name: params.name});
        }
    }
});

const addSentAddress = new ValidatedMethod({
    name: 'matsMethods.addSentAddress',
    validate: new SimpleSchema({
        toAddress: {type: String}
    }).validator(),
    run(toAddress){
        if (!Meteor.userId()) {
            throw new Meteor.Error(401, "not-logged-in");
        }
        matsCollections.SentAddresses.upsert({address: toAddress}, {address: toAddress, userId: Meteor.userId()});
        return false;
    }
});

const emailImage = new ValidatedMethod({
    name: 'matsMethods.emailImage',
    validate: new SimpleSchema({
        imageStr: {type: String},
        toAddress: {type: String},
        subject: {type: String}
    }).validator(),
    run(params){
        var imageStr = params.imageStr;
        var toAddress = params.toAddress;
        var subject = params.subject;
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
        var credentials = matsCollections.Credentials.findOne({name:"oauth_google"},{clientId:1,clientSecret:1,refresh_token:1});
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


export default matsMethods = {
    getDataFunctionFileList:getDataFunctionFileList,
    getGraphFunctionFileList:getGraphFunctionFileList,
    readDataFile:readDataFile,
    readFunctionFile:readFunctionFile,
    restoreFromFile:restoreFromFile,
    restoreFromParameterFile:restoreFromParameterFile,
    getUserAddress:getUserAddress,
    reset:reset,
    applyDatabaseSettings:applyDatabaseSettings,
    removeDatabase:removeDatabase,
    insertColor:insertColor,
    removeColor:removeColor,
    setSettings:setSettings,
    setSelectParamOptions:setSelectParamOptions,
    setCredentials:setCredentials,
    removeAuthorization:removeAuthorization,
    getAuthorizations:getAuthorizations,
    applyAuthorization:applyAuthorization,
    getGraphData:getGraphData,
    saveSettings:saveSettings,
    deleteSettings:deleteSettings,
    addSentAddress:addSentAddress,
    emailImage:emailImage
};