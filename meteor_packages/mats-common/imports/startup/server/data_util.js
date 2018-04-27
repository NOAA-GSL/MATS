import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';

//this function checks if two JSON objects are identical
const areObjectsEqual = function (o, p) {
    if ((o && !p) || (p && !o)) {
        return false;
    }
    if (JSON.stringify(o) === JSON.stringify(p)) {
        return true;
    } else {
        return false;
    }
};

//this function checks if values of subArray are also in superArray
const arrayContainsArray = function (superArray, subArray) {
    superArray.sort(function (a, b) {
        return Number(a) - Number(b);
    });
    subArray.sort(function (a, b) {
        return Number(a) - Number(b);
    });
    var i, j;
    for (i = 0, j = 0; i < superArray.length && j < subArray.length;) {
        if (superArray[i] < subArray[j]) {
            ++i;
        } else if (superArray[i] === subArray[j]) {
            ++i;
            ++j;
        } else {
            // subArray[j] not in superArray, so superArray does not contain all elements of subArray
            return false;
        }
    }
    // make sure there are no elements left in sub
    return j === subArray.length;
};

//this function checks if the entire array subArray is contained in superArray
const arrayContainsSubArray = function (superArray, subArray) {
    var i, j, current;
    for(i = 0; i < superArray.length; ++i){
        if(subArray.length === superArray[i].length){
            current = superArray[i];
            for(j = 0; j < subArray.length && subArray[j] === current[j]; ++j);
            if(j === subArray.length)
                return true;
        }
    }
    return false;
};

//this function checks if two arrays are identical
const arraysEqual = function (a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

//utility for calculating the average of an array
const average = function (data){
    var sum = data.reduce(function(sum, value){
        return value == null ? sum : sum + value;
    }, 0);
    var avg = sum / data.length;
    return avg;
};

//this function makes sure date strings are in the correct format
const dateConvert = function (dStr) {
    if (dStr === undefined || dStr === " ") {
        var now = new Date();
        var date = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
        var yr = date.getUTCFullYear();
        var day = date.getUTCDate();
        var month = date.getUTCMonth();
        var hour = date.getUTCHours();
        var minute = date.getUTCMinutes();
        return month + "/" + day + '/' + yr + ' ' + hour + ":" + minute;
    }
    var dateParts = dStr.split(' ');
    var dateArray = dateParts[0].split(/[\-\/]/);  // split on - or /    01-01-2017 OR 01/01/2017
    var month = dateArray[0];
    var day = dateArray[1];
    var yr = dateArray[2];
    var hour = 0;
    var minute = 0;
    if (dateParts[1]) {
        var timeArray = dateParts[1].split(":");
        hour = timeArray[0];
        minute = timeArray[1];
    }
    return month + "/" + day + '/' + yr + ' ' + hour + ":" + minute;
};

//function to manage authorized logins for MATS
const doAuthorization = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Authorization.remove({});
    }
    if (matsCollections.Authorization.find().count() == 0) {
        matsCollections.Authorization.insert({email: "randy.pierce@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "kirk.l.holub@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "jeffrey.a.hamilton@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "bonny.strong@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "molly.b.smith@noaa.gov", roles: ["administrator"]});
        matsCollections.Authorization.insert({email: "mats.gsd@noaa.gov", roles: ["administrator"]});
    }
};

//master list of colors for MATS curves
const doColorScheme = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.ColorScheme.remove({});
    }
    if (matsCollections.ColorScheme.find().count() == 0) {
        matsCollections.ColorScheme.insert({
            colors: [
                "rgb(255,0,0)",
                "rgb(0,0,255)",
                "rgb(255,165,0)",
                "rgb(128,128,128)",
                "rgb(238,130,238)",

                "rgb(238,130,238)",
                "rgb(0,0,139)",
                "rgb(148,0,211)",
                "rgb(105,105,105)",
                "rgb(255,140,0)",

                "rgb(235,92,92)",
                "rgb(82,92,245)",
                "rgb(133,143,143)",
                "rgb(235,143,92)",
                "rgb(190,120,120)",

                "rgb(225,82,92)",
                "rgb(72,82,245)",
                "rgb(123,133,143)",
                "rgb(225,133,92)",
                "rgb(180,120,120)"
            ]
        });
    }
};

//utility for google login capabilities in MATS -- broken for esrl.noaa.gov/gsd/mats?
const doCredentials = function () {
// the gmail account for the credentials is mats.mail.daemon@gmail.com - pwd mats2015!
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Credentials.remove({});
    }
    if (matsCollections.Credentials.find().count() == 0) {
        matsCollections.Credentials.insert({
            name: "oauth_google",
            clientId: "499180266722-aai2tddo8s9edv4km1pst88vebpf9hec.apps.googleusercontent.com",
            clientSecret: "xdU0sc7SbdOOEzSyID_PTIRE",
            refresh_token: "1/3bhWyvCMMfwwDdd4F3ftlJs3-vksgg7G8POtiOBwYnhIgOrJDtdun6zK6XiATCKT"
        });
    }
};

//another utility to assist at logging into MATS
const doRoles = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Roles.remove({});
    }
    if (matsCollections.Roles.find().count() == 0) {
        matsCollections.Roles.insert({name: "administrator", description: "administrator privileges"});
    }
};

//for use in matsMethods.resetApp() to establish default settings
const doSettings = function (title, version, buildDate) {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Settings.remove({});
    }
    if (matsCollections.Settings.find().count() == 0) {
        matsCollections.Settings.insert({
            LabelPrefix: "Curve",
            Title: title,
            appVersion: version,
            buildDate: buildDate,
            LineWidth: 3.5,
            NullFillString: "---",
            resetFromCode: false
        });
    }
    // always update the version, roles, and the hostname, not just if it doesn't exist...
    var settings = matsCollections.Settings.findOne({});
    const deploymentRoles = {
        "mats-dev": "development",
        "mats-int": "integration",
        "mats": "production"
    };
    var settingsId = settings._id;
    var os = Npm.require('os');
    var hostname = os.hostname().split('.')[0];
    settings['appVersion'] = version;
    settings['hostname'] = hostname;
    settings['deploymentRoles'] = JSON.stringify(deploymentRoles);
    matsCollections.Settings.update(settingsId, {$set: settings});
};

//this function finds the position of the array subArray in superArray
const findArrayInSubArray = function (superArray, subArray) {
    var i, j, current;
    for(i = 0; i < superArray.length; ++i){
        if(subArray.length === superArray[i].length){
            current = superArray[i];
            for(j = 0; j < subArray.length && subArray[j] === current[j]; ++j);
            if(j === subArray.length)
                return i;
        }
    }
    return -1;
};

//splits the date range string from the date selector into standardized fromDate/toDate strings,
// plus the epochs for the fromDate and toDate
const getDateRange = function (dateRange) {
    var dates = dateRange.split(' - ');
    var fromDateStr = dates[0];
    var fromDate = dateConvert(fromDateStr);
    var toDateStr = dates[1];
    var toDate = dateConvert(toDateStr);
    var fromSecs = secsConvert(fromDateStr);
    var toSecs = secsConvert(toDateStr);
    return {
        fromDate: fromDate,
        toDate: toDate,
        fromSeconds: fromSecs,
        toSeconds: toSecs
    }
};

//Utility for transferring client-side parameters to the server-side methods via the "PlotParams" object in the stack.
//Add values to this object in the 'click .submit-params' event handler in plot_list.js
const getPlotParamsFromStack = function() {
    var params = {};
    const err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    const stack = err.stack;
    const stackElems = stack.split("\n")
    for (si = 0; si < stackElems.length; si++) {
        const sElem = stackElems[si].trim();
        if (sElem.indexOf('dataFunctions') !== -1 && sElem.startsWith("at data")) {
            const dataFunctionName = sElem.split('at ')[1];
            try {
                params = global[sElem.split('at ')[1].split(' ')[0]].arguments[0]
            } catch (noJoy){}
            break;
        }
    }
    return params;
};

//calculates mean, stdev, and other statistics for curve data points in all apps and plot types
const get_err = function (sVals, sSecs) {
    /* refer to perl error_library.pl sub  get_stats
     to see the perl implementation of these statics calculations.
     These should match exactly those, except that they are processed in reverse order.
     */

    const plotParams = getPlotParamsFromStack();
    var outlierQCParam;
    if (plotParams["outliers"] !== "all") {
        outlierQCParam = Number(plotParams["outliers"]);
    } else {
        outlierQCParam = 100;
    }

    var subVals = [];
    var subSecs = [];
    var sVals = sVals;
    var sSecs = sSecs;
    var n = sVals.length;
    var n_good = 0;
    var sum_d = 0;
    var sum2_d = 0;
    var error = "";
    var i;
    for (i = 0; i < n; i++) {
        if (sVals[i] !== null && !isNaN(sVals[i])) {
            n_good = n_good + 1;
            sum_d = sum_d + sVals[i];
            sum2_d = sum2_d + sVals[i] * sVals[i];
            subVals.push(sVals[i]);
            subSecs.push(sSecs[i]);
        }
    }
    var d_mean = sum_d / n_good;
    var sd2 = sum2_d / n_good - d_mean * d_mean;
    var sd = sd2 > 0 ? Math.sqrt(sd2) : sd2;
    var sd_limit = outlierQCParam * sd;
    //console.log("see error_library.pl l208 These are processed in reverse order to the perl code -  \nmean is " + d_mean + " sd_limit is +/- " + sd_limit + " n_good is " + n_good + " sum_d is" + sum_d + " sum2_d is " + sum2_d);

    // find minimum delta_time, if any value missing, set null
    var last_secs = Number.MIN_VALUE;
    var minDelta = Number.MAX_VALUE;
    var minSecs = Number.MAX_VALUE;
    var max_secs = Number.MIN_VALUE;
    for (i = 0; i < subSecs.length; i++) {
        var secs = (subSecs[i]);
        var delta = Math.abs(secs - last_secs);
        if (delta < minDelta) {
            minDelta = delta;
        }
        if (secs < minSecs) {
            minSecs = secs;
        }
        if (secs > max_secs) {
            max_secs = secs;
        }
        last_secs = secs;
    }

    var data_wg = [];
    var n_gaps = 0;
    n_good = 0;
    var sum = 0;
    var sum2 = 0;
    var loopTime = minSecs;
    if (minDelta < 0) {
        error = ("Invalid time interval - minDelta: " + minDelta);
        console.log("matsDataUtil.getErr: Invalid time interval - minDelta: " + minDelta)
    }
    // remove data more than $sd_limit from mean
    var qaCorrected = [];
    for (i = 0; i < subVals.length; i++) {
        if (Math.abs(subVals[i] - d_mean) > sd_limit) {
            qaCorrected.push("removing datum " + i + " with value " + subVals[i] + " because it exceeds " + outlierQCParam + " standard deviations from the mean - mean: " + d_mean + " " + outlierQCParam + " * sd: " + sd_limit + " delta: " + (subVals[i] - d_mean));
            // console.log(qaCorrected.join('\n'));
            subVals[i] = null;
        } else {
            n_good++;
            sum += subVals[i];
            sum2 += subVals[i] * subVals[i];
        }
    }
    if (n_good < 1) {
        return {d_mean: null, stde_betsy: null, sd: null, n_good: n_good, lag1: null, min: null, max: null, sum: null};
    }

    // recalculate if we threw anything away.
    d_mean = sum / n_good;
    sd2 = sum2 / n_good - d_mean * d_mean;
    sd = 0;
    if (sd2 > 0) {
        sd = Math.sqrt(sd2);
    }
    //console.log("new mean after throwing away outliers is " + sd + " n_good is " + n_good + " sum is " + sum  + " sum2 is " + sum2 + " d_mean is " + d_mean);
    // look for gaps.... per Bill, we only need one gap per series of gaps...
    var lastSecond = Number.MIN_VALUE;

    for (i = 0; i < subSecs.length; i++) {
        var sec = subSecs[i];
        if (lastSecond >= 0) {
            if (sec - lastSecond > minDelta) {
                // insert a gap
                data_wg.push(null);
                n_gaps++;
            }
        }
        lastSecond = sec;
        data_wg.push(subVals[i]);
    }
    //console.log ("n_gaps: " + n_gaps +  " time gaps in subseries");

    //from http://www.itl.nist.gov/div898/handbook/eda/section3/eda35c.htm
    var r = [];
    for (var lag = 0; lag <= 1; lag++) {
        r[lag] = 0;
        var n_in_lag = 0;
        for (var t = 0; t < ((n + n_gaps) - lag); t++) {
            if (data_wg[t] != null && data_wg[t + lag] != null) {
                r[lag] += +(data_wg[t] - d_mean) * (data_wg[t + lag] - d_mean);
                n_in_lag++;
            }
        }
        if (n_in_lag > 0 && sd > 0) {
            r[lag] /= (n_in_lag * sd * sd);
        } else {
            r[lag] = null;
        }
        //console.log('r for lag ' + lag + " is " + r[lag] + " n_in_lag is " + n_in_lag + " n_good is " + n_good);
    }
    // Betsy Weatherhead's correction, based on lag 1
    if (r[1] >= 1) {
        r[1] = .99999;
    }
    const betsy = Math.sqrt((n_good - 1) * (1 - r[1]));
    var stde_betsy;
    if (betsy != 0) {
        stde_betsy = sd / betsy;
    } else {
        stde_betsy = null;
    }
    const stats = {
        d_mean: d_mean,
        stde_betsy: stde_betsy,
        sd: sd,
        n_good: n_good,
        lag1: r[1],
        min: minSecs,
        max: max_secs,
        sum: sum_d,
        qaCorrected: qaCorrected
    };
    //console.log("stats are " + JSON.stringify(stats));
    // stde_betsy is standard error with auto correlation
    //console.log("---------\n\n");
    return stats;
};

//this function converts a date string into an epoch
const secsConvert = function (dStr) {
    if (dStr === undefined || dStr === " ") {
        var now = new Date();
        return now.getTime() / 1000;
    }
    else {
        var dateParts = dStr.split(' ');
        var dateArray = dateParts[0].split(/[\-\/]/);  // split on - or /    01-01-2017 OR 01/01/2017
        var month = dateArray[0];
        var day = dateArray[1];
        var yr = dateArray[2];
        var hour = 0;
        var minute = 0;
        if (dateParts[1]) {
            var timeArray = dateParts[1].split(":");
            hour = timeArray[0];
            minute = timeArray[1];
        }
        var my_date = new Date(Date.UTC(yr, month - 1, day, hour, minute, 0));
        // to UTC time, not local time
        var date_in_secs = my_date.getTime();
    }
    // to UTC time, not local time
    //return date_in_secs/1000 -3600*6;
    return date_in_secs / 1000;
};

//used for sorting arrays
const sortFunction = function (a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
};

export default matsDataUtils = {

    areObjectsEqual: areObjectsEqual,
    arrayContainsArray: arrayContainsArray,
    arrayContainsSubArray: arrayContainsSubArray,
    arraysEqual: arraysEqual,
    average: average,
    dateConvert: dateConvert,
    doAuthorization: doAuthorization,
    doColorScheme: doColorScheme,
    doCredentials: doCredentials,
    doRoles: doRoles,
    doSettings: doSettings,
    findArrayInSubArray: findArrayInSubArray,
    getDateRange: getDateRange,
    get_err: get_err,
    getPlotParamsFromStack: getPlotParamsFromStack,
    secsConvert: secsConvert,
    sortFunction: sortFunction

}