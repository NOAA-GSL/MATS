/*
 * Copyright (c) 2020 Colorado State University and Regents of the University of Colorado. All rights reserved.
 */

import {matsTypes} from 'meteor/randyp:mats-common';
import {matsCollections} from 'meteor/randyp:mats-common';
import {matsPlotUtils} from 'meteor/randyp:mats-common';

// this function checks if two JSON objects are identical
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

// this function checks if values of subArray are also in superArray
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

// this function checks if the entire array subArray is contained in superArray
const arrayContainsSubArray = function (superArray, subArray) {
    var i, j, current;
    for (i = 0; i < superArray.length; ++i) {
        if (subArray.length === superArray[i].length) {
            current = superArray[i];
            for (j = 0; j < subArray.length && subArray[j] === current[j]; ++j) ;
            if (j === subArray.length)
                return true;
        }
    }
    return false;
};

// this function checks if two arrays are identical
const arraysEqual = function (a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

const arrayUnique = function (a) {
    var arr = [];
    for (var i = 0; i < a.length; i++) {
        if (!arr.includes(a[i])) {
            arr.push(a[i]);
        }
    }
    return arr;
};

// this function finds the position of the array subArray in superArray
const findArrayInSubArray = function (superArray, subArray) {
    var i, j, current;
    for (i = 0; i < superArray.length; ++i) {
        if (subArray.length === superArray[i].length) {
            current = superArray[i];
            for (j = 0; j < subArray.length && subArray[j] === current[j]; ++j) ;
            if (j === subArray.length)
                return i;
        }
    }
    return -1;
};

// this function checks if an object is a value in another object
const objectContainsObject = function (superObject, subObject) {
    const superObjectKeys = Object.keys(superObject);
    var currentObject;
    for (var i = 0; i < superObjectKeys.length; i++) {
        currentObject = superObject[superObjectKeys[i]];
        if (areObjectsEqual(subObject, currentObject)) {
            return true;
        }
    }
    // if the loop completes, the subObject was not found
    return false;
};

// utility for calculating the average of an array
const average = function (data) {
    if(data.length === 0) return null;
    var sum = data.reduce(function (sum, value) {
        return value == null ? sum : sum + value;
    }, 0);
    return sum / data.length;
};

// utility for calculating the median of an array
const median = function (data) {
    if(data.length === 0) return null;
    data.sort(function(a,b){
        return a-b;
    });
    var half = Math.floor(data.length / 2);
    if (data.length % 2)
        return data[half];
    return (data[half - 1] + data[half]) / 2.0;
};

// utility for calculating the stdev of an array
const stdev = function (data) {
    if(data.length === 0) return 0;
    var avg = average(data);
    var squareDiffs = data.map(function (value) {
        var diff = value - avg;
        return diff * diff;
    });
    var avgSquareDiff = average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
};

// this function makes sure date strings are in the correct format
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

// splits the date range string from the date selector into standardized fromDate/toDate strings,
//  plus the epochs for the fromDate and toDate
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

// this function converts a date string into an epoch
const secsConvert = function (dStr) {
    if (dStr === undefined || dStr === " ") {
        var now = new Date();
        return now.getTime() / 1000;
    } else {
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
    // return date_in_secs/1000 -3600*6;
    return date_in_secs / 1000;
};

// function to manage authorized logins for MATS
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

// master list of colors for MATS curves
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

// utility for google login capabilities in MATS -- broken for esrl.noaa.gov/gsd/mats?
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

// another utility to assist at logging into MATS
const doRoles = function () {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Roles.remove({});
    }
    if (matsCollections.Roles.find().count() == 0) {
        matsCollections.Roles.insert({name: "administrator", description: "administrator privileges"});
    }
};

// for use in matsMethods.resetApp() to establish default settings
const doSettings = function (title, version, buildDate, appType) {
    if (matsCollections.Settings.findOne({}) === undefined || matsCollections.Settings.findOne({}).resetFromCode === undefined || matsCollections.Settings.findOne({}).resetFromCode == true) {
        matsCollections.Settings.remove({});
    }
    if (matsCollections.Settings.find().count() == 0) {
        matsCollections.Settings.insert({
            LabelPrefix: "Curve",
            Title: title,
            appVersion: version,
            buildDate: buildDate,
            appType: appType,
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

// calculates mean, stdev, and other statistics for curve data points in all apps and plot types
const get_err = function (sVals, sSecs, sLevs, appParams) {
    /* refer to perl error_library.pl sub  get_stats
     to see the perl implementation of these statics calculations.
     These should match exactly those, except that they are processed in reverse order.
     */
    const autocorr_limit = 0.95;
    const hasLevels = appParams.hasLevels;
    var outlierQCParam;
    if (appParams.outliers !== "all") {
        outlierQCParam = Number(appParams.outliers);
    } else {
        outlierQCParam = 100;
    }

    var subVals = [];
    var subSecs = [];
    var subLevs = [];
    var n = sVals.length;
    var n_good = 0;
    var sum_d = 0;
    var sum2_d = 0;
    var error = "";
    var i;
    for (i = 0; i < n; i++) {
        if (sVals[i] !== null && !isNaN(sVals[i])) {
            sVals[i] = Number(sVals[i]);
            n_good = n_good + 1;
            sum_d = sum_d + sVals[i];
            sum2_d = sum2_d + sVals[i] * sVals[i];
            subVals.push(sVals[i]);
            subSecs.push(sSecs[i]);
            if (hasLevels) {
                subLevs.push(sLevs[i]);
            }
        }
    }
    var d_mean = sum_d / n_good;
    var sd2 = sum2_d / n_good - d_mean * d_mean;
    var sd = sd2 > 0 ? Math.sqrt(sd2) : sd2;
    var sd_limit = outlierQCParam * sd;
    // console.log("see error_library.pl l208 These are processed in reverse order to the perl code -  \nmean is " + d_mean + " sd_limit is +/- " + sd_limit + " n_good is " + n_good + " sum_d is" + sum_d + " sum2_d is " + sum2_d);

    // find minimum delta_time, if any value missing, set null
    var last_secs = 0;
    var minDelta = Number.MAX_VALUE;
    var minSecs = Number.MAX_VALUE;
    var max_secs = Number.MIN_VALUE;
    var minVal = Number.MAX_VALUE;
    var maxVal = -1 * Number.MAX_VALUE;
    var secs;
    var delta;
    for (i = 0; i < subSecs.length; i++) {
        secs = (subSecs[i]);
        delta = Math.abs(secs - last_secs);
        if (delta > 0 && delta < minDelta) {
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
            minVal = minVal < subVals[i] ? minVal : subVals[i];
            maxVal = maxVal > subVals[i] ? maxVal : subVals[i];
            sum += subVals[i];
            sum2 += subVals[i] * subVals[i];
            n_good++;
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
    // console.log("new mean after throwing away outliers is " + sd + " n_good is " + n_good + " sum is " + sum  + " sum2 is " + sum2 + " d_mean is " + d_mean);

    // look for gaps
    var lastSecond = -1 * Number.MAX_VALUE;
    var lastPressure = -1 * Number.MAX_VALUE;
    var n_pressures;
    if (hasLevels) {
        n_pressures = arrayUnique(subLevs).length;
    } else {
        n_pressures = 1;
    }
    // set lag1_t to the first time the time changes from its initial value + 1 (data zero based)
    // set lag1_p to the first time the pressure changes from its initial value + 1 (data zero based)
    var lag1_t = 0;
    var lag1_p = 0;
    var r1_t = 0;			// autocorrelation for time
    var r1_p = 0;			// autocorrelation for pressure
    var j = 0;              // i is loop index without gaps; j is loop index with gaps
    var n_deltas = 0;

    for (i = 0; i < subSecs.length; i++) {
        var sec = subSecs[i];
        var lev;
        if (hasLevels) {
            lev = subLevs[i];
            // find first time the pressure changes
            if (lag1_p === 0 && lastPressure > 0) {
                if (lev !== lastPressure) {
                    lag1_p = j;
                }
            }
        }
        if (lastSecond >= 0) {
            if (lag1_t === 0 && sec !== lastSecond) {
                lag1_t = j;
            }
            if (Math.abs(sec - lastSecond) > minDelta) {
                n_deltas = (Math.abs(sec - lastSecond) / minDelta - 1) * n_pressures;
                // for the Autocorrelation at lag 1, it doesn't matter how many missing
                // data we put in within gaps! (But for the other AC's it does.)
                // since we're using only the AC at lag 1 for calculating std err, let's
                // save cpu time and only put in one missing datum per gap, no matter
                // how long. WRM 2/22/2019
                // but if we're using a different lag, which could happen, we'll need
                // to insert all the missing data in each gap. WRM 2/22/2019
                // $n_deltas=1;
                for (var count = 0; count < n_deltas; count++) {
                    data_wg.push(null);
                    n_gaps++;
                    j++;
                }
            }
        }
        lastSecond = sec;
        if (hasLevels) {
            lastPressure = lev;
        }
        data_wg.push(subVals[i]);
        j++;
    }

    // from http://www.itl.nist.gov/div898/handbook/eda/section3/eda35c.htm
    var r = [];
    var lag_by_r = {};
    var lag1_max = lag1_p > lag1_t ? lag1_p : lag1_t;
    var r_sum = 0;
    var n_r = 0;
    var n_in_lag;
    var lag;
    var t;
    for (lag = 0; lag <= lag1_max; lag++) {
        r[lag] = 0;
        n_in_lag = 0;
        for (t = 0; t < ((n + n_gaps) - lag); t++) {
            if (data_wg[t] != null && data_wg[t + lag] != null) {
                r[lag] += +(data_wg[t] - d_mean) * (data_wg[t + lag] - d_mean);
                n_in_lag++;
            }
        }
        if (n_in_lag > 0 && sd > 0) {
            r[lag] /= (n_in_lag * sd * sd);
            r_sum += r[lag];
            n_r++;
        } else {
            r[lag] = null;
        }
        if (lag >= 1 && lag < (n + n_gaps) / 2) {
            lag_by_r[r[lag]] = lag;
        }
    }
    if (lag1_t > 0) {
        r1_t = r[lag1_t] !== undefined ? r[lag1_t] : 0;
    }
    if (lag1_p > 0) {
        r1_p = r[lag1_p] !== undefined ? r[lag1_p] : 0;
    }

    // Betsy Weatherhead's correction, based on lag 1, augmented by the highest
    // lag > 1 and < n/2
    if (r1_p >= autocorr_limit) {
        r1_p = autocorr_limit;
    }
    if (r1_t >= autocorr_limit) {
        r1_t = autocorr_limit;
    }

    const betsy = Math.sqrt((n_good - 1) * (1. - r1_p) * (1. - r1_t));
    var stde_betsy;
    if (betsy !== 0) {
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
        minVal: minVal,
        maxVal: maxVal,
        sum: sum_d,
        qaCorrected: qaCorrected
    };
    // console.log("stats are " + JSON.stringify(stats));
    // stde_betsy is standard error with auto correlation
    // console.log("---------\n\n");
    return stats;
};

// use a student's t-test to see if a point on a contour diff is statistically significant
const checkDiffContourSignificance = function (x1, x2, s1, s2, n1, n2, sigType) {
    const t = getTValue(x1, x2, s1, s2, n1, n2);
    const df = getDfValue(x1, x2, s1, s2, n1, n2);
    return isStudentTTestValueSignificant(t, df, sigType);
};

// calculate the t value for a student's t-test
const getTValue = function (x1, x2, s1, s2, n1, n2) {
    return Math.abs(x1 - x2) / Math.sqrt((Math.pow(s1, 2) / n1) + (Math.pow(s2, 2) / n2));
};

// calculate the degrees of freedom for a student's t-test
const getDfValue = function (x1, x2, s1, s2, n1, n2) {
    return Math.pow(((Math.pow(s1, 2) / n1) + (Math.pow(s2, 2) / n2)), 2) / ((1 / (n1 - 1)) * Math.pow((Math.pow(s1, 2) / n1), 2) + (1 / (n2 - 1)) * Math.pow((Math.pow(s2, 2) / n2), 2));
};

// checks if a t value an degrees of freedom combo is significant
const isStudentTTestValueSignificant = function (t, df, sigType) {
    const sigThreshs = {
        1: 12.706,
        2: 4.303,
        3: 3.182,
        4: 2.776,
        5: 2.571,
        6: 2.477,
        7: 2.365,
        8: 2.306,
        9: 2.262,
        10: 2.228,
        11: 2.201,
        12: 2.179,
        13: 2.160,
        14: 2.145,
        15: 2.131,
        16: 2.120,
        17: 2.110,
        18: 2.101,
        19: 2.093,
        20: 2.086,
        21: 2.080,
        22: 2.074,
        23: 2.069,
        24: 2.064,
        25: 2.060,
        26: 2.056,
        27: 2.052,
        28: 2.048,
        29: 2.043,
        30: 2.042
    };

    var sigThresh;
    if (sigType === 'standard') {
        if (df <= 30) {
            sigThresh = sigThreshs[df];
        } else if (df <= 40) {
            sigThresh = 2.021;
        } else if (df <= 60) {
            sigThresh = 2.000
        } else if (df <= 120) {
            sigThresh = 1.980
        } else {
            sigThresh = 1.960
        }
    } else {
        sigThresh = 1.960
    }

    return t > sigThresh
};

// utility to process the user-input histogram customization controls
const setHistogramParameters = function (plotParams) {
    var yAxisFormat = plotParams['histogram-yaxis-controls'];
    var binType = plotParams['histogram-bin-controls'];
    var binNum = 12;    // default bin number
    var binStart = undefined;    // default is no mandated bin start
    var binStride = undefined;         // default is no mandated stride
    var pivotVal = undefined;      // default is not to shift the bins over to a pivot
    var binBounds = []; // default is no specified bin bounds -- our algorithm will figure them out if this array stays empty

    switch (binType) {
        case "Set number of bins":
            // get the user's chosen number of bins
            binNum = Number(plotParams['bin-number']);
            if (isNaN(binNum)) {
                throw new Error("Error parsing bin number: please enter the desired number of bins.");
            }
            break;

        case "Make zero a bin bound":
            // let the histogram routine know that we want the bins shifted over to zero
            pivotVal = 0;
            break;

        case "Choose a bin bound":
            // let the histogram routine know that we want the bins shifted over to whatever was input
            pivotVal = Number(plotParams['bin-pivot']);
            if (isNaN(pivotVal)) {
                throw new Error("Error parsing bin pivot: please enter the desired bin pivot.");
            }
            break;

        case "Set number of bins and make zero a bin bound":
            // get the user's chosen number of bins and let the histogram routine know that we want the bins shifted over to zero
            binNum = Number(plotParams['bin-number']);
            if (isNaN(binNum)) {
                throw new Error("Error parsing bin number: please enter the desired number of bins.");
            }
            pivotVal = 0;
            break;

        case "Set number of bins and choose a bin bound":
            // get the user's chosen number of bins and let the histogram routine know that we want the bins shifted over to whatever was input
            binNum = Number(plotParams['bin-number']);
            if (isNaN(binNum)) {
                throw new Error("Error parsing bin number: please enter the desired number of bins.");
            }
            pivotVal = Number(plotParams['bin-pivot']);
            if (isNaN(pivotVal)) {
                throw new Error("Error parsing bin pivot: please enter the desired bin pivot.");
            }
            break;

        case "Manual bins":
            // try to parse whatever we've been given for bin bounds. Throw an error if they didn't follow directions to enter a comma-separated list of numbers.
            try {
                binBounds = plotParams['bin-bounds'].split(",").map(function (item) {
                    item.trim();
                    item = Number(item);
                    if (!isNaN(item)) {
                        return item
                    } else {
                        throw new Error("Error parsing bin bounds: please enter  at least two numbers delimited by commas.");
                    }
                });
                binNum = binBounds.length + 1; // add 1 because these are inner bin bounds
            } catch (e) {
                throw new Error("Error parsing bin bounds: please enter  at least two numbers delimited by commas.");
            }
            // make sure that we've been given at least two good bin bounds (enough to make one bin).
            if (binNum < 3) {
                throw new Error("Error parsing bin bounds: please enter at least two numbers delimited by commas.");
            }
            break;

        case "Manual bin start, number, and stride":
            // get the bin start, number, and stride.
            binNum = Number(plotParams['bin-number']);
            if (isNaN(binNum)) {
                throw new Error("Error parsing bin number: please enter the desired number of bins.");
            }
            binStart = Number(plotParams['bin-start']);
            if (isNaN(binStart)) {
                throw new Error("Error parsing bin start: please enter the desired bin start.");
            }
            binStride = Number(plotParams['bin-stride']);
            if (isNaN(binStride)) {
                throw new Error("Error parsing bin stride: please enter the desired bin stride.");
            }
            break;

        case "Default bins":
        default:
            break;
    }
    return {
        yAxisFormat: yAxisFormat,
        binNum: binNum,
        binStart: binStart,
        binStride: binStride,
        pivotVal: pivotVal,
        binBounds: binBounds
    };
};

// utility that takes arrays of seconds and values and produces a data structure containing bin information for histogram plotting
const calculateHistogramBins = function (curveSubStats, curveSubSecs, binParams, appParams) {

    // binStart and binStride will only be defined if the user wants to specify the bin spacing.
    // otherwise, we'll use the mean and standard deviation of the data to space the bins.

    // pivotVal will only be defined if the user wants to shift the bin limits to align with a certain value.
    // otherwise, we'll keep everything aligned with the data mean.

    var binStats = {};
    var binUpBounds = [];
    var binLowBounds = [];
    var binMeans = [];

    // calculate the global stats across all of the data
    const globalStats = get_err(curveSubStats, curveSubSecs, [], {hasLevels: false, outliers: appParams.outliers});   // we don't need levels for the mean or sd calculations, so just pass in an empty array
    const glob_mean = globalStats.d_mean;
    const glob_sd = globalStats.sd;

    var fullLowBound;
    var fullUpBound;
    var fullRange;
    var binInterval;

    if (binParams.binStart === undefined || binParams.binStride === undefined) {
        // use the global stats to determine the bin bounds -- should be based on dividing up +/- 3*sd from the mean into requested number of bins
        fullLowBound = glob_mean - 3 * glob_sd;
        fullUpBound = glob_mean + 3 * glob_sd;
        fullRange = 6 * glob_sd;
        binInterval = fullRange / (binParams.binNum - 2);   // take off two bins from the total number of requested bins to represent values either less than - 3*sd from the mean or greater than 3*sd from the mean
    } else {
        // use the user-defined start, number, and stride to determine the bin bounds
        fullLowBound = binParams.binStart;
        fullUpBound = binParams.binStart + (binParams.binNum - 2) * binParams.binStride;  // take off two bins from the total number of requested bins to represent values that fall outside of the prescribed range
        fullRange = (binParams.binNum - 2) * binParams.binStride;
        binInterval = binParams.binStride;
    }

    // store an array of the upper and lower bounding values for each bin.
    binUpBounds[0] = fullLowBound; // the first upper bound should be exactly - 3*sd from the mean, or the previously calculated fullLowBound
    binLowBounds[0] = -1 * Number.MAX_VALUE;
    binMeans[0] = fullLowBound - binInterval / 2;
    for (var b_idx = 1; b_idx < binParams.binNum - 1; b_idx++) {
        binUpBounds[b_idx] = binUpBounds[b_idx - 1] + binInterval; // increment from fullLowBound to get the rest of the bin upper limits
        binLowBounds[b_idx] = binUpBounds[b_idx - 1];
        binMeans[b_idx] = binUpBounds[b_idx - 1] + binInterval / 2;
    }
    binUpBounds[binParams.binNum - 1] = Number.MAX_VALUE; // the last bin should have everything too large to fit into the previous bins, so make its upper bound the max number value
    binLowBounds[binParams.binNum - 1] = fullUpBound;
    binMeans[binParams.binNum - 1] = fullUpBound + binInterval / 2;

    if (binParams.pivotVal !== undefined && !isNaN(binParams.pivotVal)) {
        // need to shift the bounds and means over so that one of the bounds is on the chosen pivot
        var closestBoundToPivot = binLowBounds.reduce(function (prev, curr) {
            return (Math.abs(curr - binParams.pivotVal) < Math.abs(prev - binParams.pivotVal) ? curr : prev);
        });
        binUpBounds = binUpBounds.map(function (val) {
            return val - (closestBoundToPivot - binParams.pivotVal);
        });
        binLowBounds = binLowBounds.map(function (val) {
            return val - (closestBoundToPivot - binParams.pivotVal);
        });
        binMeans = binMeans.map(function (val) {
            return val - (closestBoundToPivot - binParams.pivotVal);
        });
    }

    // calculate the labels for each bin, based on the data bounding range, for the graph x-axis later
    var binLabels = [];
    var lowSdFromMean;
    var upSdFromMean;
    for (b_idx = 0; b_idx < binParams.binNum; b_idx++) {
        lowSdFromMean = (binLowBounds[b_idx]).toFixed(2);
        upSdFromMean = (binUpBounds[b_idx]).toFixed(2);
        if (b_idx === 0) {
            binLabels[b_idx] = "< " + upSdFromMean;
        } else if (b_idx === binParams.binNum - 1) {
            binLabels[b_idx] = "> " + lowSdFromMean;
        } else {
            binLabels[b_idx] = lowSdFromMean + "-" + upSdFromMean;
        }
    }

    binStats['glob_mean'] = glob_mean;
    binStats['glob_sd'] = glob_sd;
    binStats['binUpBounds'] = binUpBounds;
    binStats['binLowBounds'] = binLowBounds;
    binStats['binMeans'] = binMeans;
    binStats['binLabels'] = binLabels;

    return {'binStats': binStats};
};

// utility that takes an array of user-defined bin bounds and produces a data structure containing bin information for histogram plotting
const prescribeHistogramBins = function (curveSubStats, curveSubSecs, binParams, appParams) {

    var binStats = {};

    // calculate the global stats across all of the data
    const globalStats = get_err(curveSubStats, curveSubSecs, [], {hasLevels: false, outliers: appParams.outliers});   // we don't need levels for the mean or sd calculations, so just pass in an empty array
    const glob_mean = globalStats.d_mean;
    const glob_sd = globalStats.sd;

    // make sure the user-defined bins are in order from least to greatest
    binParams.binBounds = binParams.binBounds.sort(function (a, b) {
        return Number(a) - Number(b);
    });

    // store an array of the upper and lower bounding values for each bin.
    var binUpBounds = [];
    var binLowBounds = [];
    var binMeans = [];
    var binIntervalSum = 0;
    for (var b_idx = 1; b_idx < binParams.binNum - 1; b_idx++) {
        binUpBounds[b_idx] = binParams.binBounds[b_idx];
        binLowBounds[b_idx] = binParams.binBounds[b_idx - 1];
        binMeans[b_idx] = (binUpBounds[b_idx] + binLowBounds[b_idx]) / 2;
        binIntervalSum = binIntervalSum + (binUpBounds[b_idx] - binLowBounds[b_idx]);
    }
    const binIntervalAverage = binIntervalSum / (binParams.binNum - 2);
    binUpBounds[0] = binLowBounds[1];
    binLowBounds[0] = -1 * Number.MAX_VALUE; // the first bin should have everything too small to fit into the other bins, so make its lower bound -1 * the max number value
    binMeans[0] = binLowBounds[1] - binIntervalAverage / 2; // the bin means for the edge bins is a little arbitrary, so base it on the average bin width
    binUpBounds[binParams.binNum - 1] = Number.MAX_VALUE; // the last bin should have everything too large to fit into the previous bins, so make its upper bound the max number value
    binLowBounds[binParams.binNum - 1] = binUpBounds[binParams.binNum - 2];
    binMeans[binParams.binNum - 1] = binUpBounds[binParams.binNum - 2] + binIntervalAverage / 2; // the bin means for the edge bins is a little arbitrary, so base it on the average bin width

    // calculate the labels for each bin, based on the data bounding range, for the graph x-axis later
    var binLabels = [];
    var lowSdFromMean;
    var upSdFromMean;
    for (b_idx = 0; b_idx < binParams.binNum; b_idx++) {
        lowSdFromMean = (binLowBounds[b_idx]).toFixed(2);
        upSdFromMean = (binUpBounds[b_idx]).toFixed(2);
        if (b_idx === 0) {
            binLabels[b_idx] = "< " + upSdFromMean;
        } else if (b_idx === binParams.binNum - 1) {
            binLabels[b_idx] = "> " + lowSdFromMean;
        } else {
            binLabels[b_idx] = lowSdFromMean + "-" + upSdFromMean;
        }
    }

    binStats['glob_mean'] = glob_mean;
    binStats['glob_sd'] = glob_sd;
    binStats['binUpBounds'] = binUpBounds;
    binStats['binLowBounds'] = binLowBounds;
    binStats['binMeans'] = binMeans;
    binStats['binLabels'] = binLabels;

    return {'binStats': binStats};
};

// utility that takes arrays of seconds, values, and optionally levels, and produces a data structure for histogram data
// processing. Used in the initial histogram DB query and in matching.
const sortHistogramBins = function (curveSubStats, curveSubSecs, curveSubLevs, binNum, masterBinStats, appParams, d) {

    // need maps to hold the sub values and seconds (and levels) for each bin, after the bin bounds are calculated.
    var binSubStats = {};
    var binSubSecs = {};
    var binSubLevs = {};

    for (var b_idx = 0; b_idx < binNum; b_idx++) {
        binSubStats[b_idx] = [];
        binSubSecs[b_idx] = [];
        binSubLevs[b_idx] = [];
    }

    // calculate the global stats across all of the data
    var globalStats;
    globalStats = get_err(curveSubStats, curveSubSecs, curveSubLevs, appParams);
    const glob_mean = globalStats.d_mean;
    const glob_sd = globalStats.sd;
    const glob_n = globalStats.n_good;
    const glob_max = globalStats.maxVal;
    const glob_min = globalStats.minVal;

    // sort data into bins
    const binUpBounds = masterBinStats.binUpBounds;
    const binLowBounds = masterBinStats.binLowBounds;
    const binMeans = masterBinStats.binMeans;
    const binLabels = masterBinStats.binLabels;

    for (var d_idx = 0; d_idx < curveSubStats.length; d_idx++) {
        // iterate through all of the bins until we find one where the upper limit is greater than our datum.
        for (b_idx = 0; b_idx < binNum; b_idx++) {
            if (curveSubStats[d_idx] <= binUpBounds[b_idx]) {
                binSubStats[b_idx].push(curveSubStats[d_idx]);
                binSubSecs[b_idx].push(curveSubSecs[d_idx]);
                if (appParams.hasLevels) {
                    binSubLevs[b_idx].push(curveSubLevs[d_idx]);
                }
                break;
            }
        }
    }

    // calculate the statistics for each bin
    // we are especially interested in the number of values in each bin, as that is the plotted stat in a histogram
    var binStats;
    var bin_mean;
    var bin_sd;
    var bin_n;
    var bin_rf;

    var sum = 0;
    var count = 0;
    for (b_idx = 0; b_idx < binNum; b_idx++) {
        binStats = get_err(binSubStats[b_idx], binSubSecs[b_idx], binSubLevs[b_idx], appParams);
        bin_mean = binStats.d_mean;
        bin_sd = binStats.sd;
        bin_n = binStats.n_good;
        bin_rf = bin_n / glob_n;

        /*
        var d = {// d will contain the curve data
            x: [], // placeholder
            y: [], // placeholder
            error_x: [], // unused
            error_y: [], // unused
            subVals: [],
            subSecs: [],
            subLevs: [],
            glob_stats: {}, // placeholder
            bin_stats: [], // placeholder
            text: [], // placeholder
            xmax: Number.MIN_VALUE,
            xmin: Number.MAX_VALUE,
            ymax: Number.MIN_VALUE,
            ymin: Number.MAX_VALUE
        };
        */

        d.x.push(binMeans[b_idx]);
        d.y.push(bin_n);
        d.subVals.push(binSubStats[b_idx]);
        d.subSecs.push(binSubSecs[b_idx]);
        d.bin_stats.push({
            'bin_mean': bin_mean,
            'bin_sd': bin_sd,
            'bin_n': bin_n,
            'bin_rf': bin_rf,
            'binLowBound': binLowBounds[b_idx],
            'binUpBound': binUpBounds[b_idx],
            'binLabel': binLabels[b_idx]
        });
        d.text.push(null);

        if (appParams.hasLevels) {
            d.subLevs.push(binSubLevs[b_idx]);
        }

        // set axis limits based on returned data
        if (d.y[b_idx] !== null) {
            sum = sum + d.y[b_idx];
            count++;
            d.ymin = d.ymin < d.y[b_idx] ? d.ymin : d.y[b_idx];
            d.ymax = d.ymax > d.y[b_idx] ? d.ymax : d.y[b_idx];
        }

    }
    d.glob_stats = {
        'glob_mean': glob_mean,
        'glob_sd': glob_sd,
        'glob_n': glob_n,
        'glob_max': glob_max,
        'glob_min': glob_min
    };
    d.xmin = d.x[0];
    d.xmax = d.x[binNum - 1];

    return {d: d};
};

// utility that takes the curve params for two contour plots and collapses them into the curve params for one diff contour.
const getDiffContourCurveParams = function (curves) {

    var newCurve = {};
    const curveKeys = Object.keys(curves[0]);
    var currKey;
    for (var ckidx = 0; ckidx < curveKeys.length; ckidx++) {
        currKey = curveKeys[ckidx];
        if (currKey === 'color') {
            newCurve['color'] = "rgb(255,165,0)";
        } else if (curves[0][currKey] === curves[1][currKey]) {
            newCurve[currKey] = curves[0][currKey];
        } else {
            newCurve[currKey] = curves[1][currKey] + "-" + curves[0][currKey];
        }
    }
    return [newCurve];
};

// used for sorting arrays
const sortFunction = function (a, b) {
    if (a[0] === b[0]) {
        return 0;
    } else {
        return (a[0] < b[0]) ? -1 : 1;
    }
};

export default matsDataUtils = {

    areObjectsEqual: areObjectsEqual,
    arrayContainsArray: arrayContainsArray,
    arrayContainsSubArray: arrayContainsSubArray,
    arraysEqual: arraysEqual,
    arrayUnique: arrayUnique,
    findArrayInSubArray: findArrayInSubArray,
    objectContainsObject: objectContainsObject,
    average: average,
    median: median,
    stdev: stdev,
    dateConvert: dateConvert,
    getDateRange: getDateRange,
    secsConvert: secsConvert,
    doAuthorization: doAuthorization,
    doColorScheme: doColorScheme,
    doCredentials: doCredentials,
    doRoles: doRoles,
    doSettings: doSettings,
    get_err: get_err,
    checkDiffContourSignificance: checkDiffContourSignificance,
    setHistogramParameters: setHistogramParameters,
    calculateHistogramBins: calculateHistogramBins,
    prescribeHistogramBins: prescribeHistogramBins,
    sortHistogramBins: sortHistogramBins,
    getDiffContourCurveParams: getDiffContourCurveParams,
    sortFunction: sortFunction,

}