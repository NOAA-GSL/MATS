import {Meteor} from "meteor/meteor";
import {matsCollections} from 'meteor/randyp:mats-common';
if (Meteor.isServer) {
    const Results = require('node-file-cache').create({file:'fileCache', life: 8 * 3600000});
    var getResult = function (key) {
        console.log('asked to get result from cache for key:', key);
        var result = Results.get(key);
        return result === null ? undefined : result;
    }
    var storeResult = function (key, result) {

        console.log('asked to set result in cache for app: ',process.env.PWD, ' key:', key);
        Results.set(key, result);
        console.log('set result in cache for app: ', process.env.PWD, 'key:', key);
    }
}

export default
    matsCache = {
        getResult: getResult,
        storeResult: storeResult
    }
