/**
 * Created by pierce on 8/31/16.
 */
import '../imports/startup/server/index.js';
import '../imports/startup/both/index.js';


var setGoogleCred = function () {
    /*
     from developer console:
     console.developers.google.apis
     */
    if (Meteor.isServer) {
        var os = Npm.require('os');
        var hostname = os.hostname();
        var cid = "";
        var cSecret = "";
        var gid = "";
        var gSecret = "";
        var _id = "";
        var cred;
        try {
            cred = matsCollections.ServiceConfiguration.findOne({});
            if (cred) {
                cid = cred.clientId;
                cSecret = cred.secret;
                _id = cred._id;
            }
        } catch (ignore) {
        }
        switch (hostname.split('.')[0]) {
            case "mats":
                gid = "499180266722-d4rn615s4s8tenra4tdisbl1i34uvu82.apps.googleusercontent.com";
                gSecret = "FrIhQ0kZWei2z5RPLAq-84BI";
                break;
            case "mats-dev":
                gid = "499180266722-m8qusll2n5sc57u0hdefans35noqkt13.apps.googleusercontent.com";
                gSecret = "bEgiYA-8vBddG0aLmzLq74gR";
                break;
            default:
                gid = "499180266722-vm8bc8213app5027fqob0v4omk70hogm.apps.googleusercontent.com";
                gSecret = "W1VBGFeYEdoOdmMcZYkzKTQu";
                break;
        }
        if (gid != cid || gSecret != cSecret) {
            // reset gid and gSecret
            if (cred) {
                matsCollections.ServiceConfiguration.update(_id, {$set: {secret: gSecret, clientId: gid}});
            } else {
                matsCollections.ServiceConfiguration.insert({secret: gSecret, clientId: gid});
            }
        }
    }
};

setGoogleCred();