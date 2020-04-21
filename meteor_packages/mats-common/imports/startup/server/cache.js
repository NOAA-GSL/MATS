/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {Meteor} from "meteor/meteor";
import {matsCollections} from 'meteor/randyp:mats-common';
if (Meteor.isServer) {
    const Results = require('node-file-cache').create({file:'fileCache', life: 8 * 3600});
    var getResult = function (key) {
        //console.log('asked to get result from cache for key:', key);
        var result = Results.get(key);
        return result === null ? undefined : result;
    }
    var storeResult = function (key, result) {
        //console.log('asked to set result in cache for app: ',process.env.PWD, ' key:', key);
        Results.set(key, result);
        //console.log('set result in cache for app: ', process.env.PWD, 'key:', key);
    }
    var clear = function () {
        //console.log('asked to clear result cache');
        Results.clear();
    }
    var expireKey = function(key) {
        //console.log('asked to clear result cache for key ', key);
        Results.expire(key);
    }
}


export default
    matsCache = {
        getResult: getResult,
        storeResult: storeResult,
        clear: clear,
        expireKey: expireKey
    }
